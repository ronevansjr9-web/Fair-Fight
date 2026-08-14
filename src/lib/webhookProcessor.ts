/**
 * Stripe webhook event processing — the durable entitlement path.
 *
 * Kept as a pure, dependency-injected module so the full decision tree is
 * unit-testable with mocks (no real Stripe/DB required). The route
 * (src/routes/api/stripe/webhook.ts) is responsible for the fail-closed gate
 * and signature verification; this module is only reached for a
 * signature-verified event.
 *
 * Fail-closed rules enforced here:
 * - Idempotency: an event id already in the webhook_events ledger is a replay
 *   and is ignored (Stripe redelivers the SAME id on retry).
 * - Exact product: amount_total must be 9900 (USD), currency 'usd', mode
 *   'payment', payment_status 'paid', and the session's line-item price id
 *   must equal the configured STRIPE_PRO_PRICE_ID. Anything else is rejected
 *   without writing an entitlement.
 * - Ownership: the case in metadata must belong to the user in metadata
 *   (server-side DB check). Mismatched/malformed metadata is rejected.
 * - Refunds: any charge refund marks the payment 'refunded', which revokes
 *   access (hasCaseEntitlement only honors status='succeeded') and cannot be
 *   resurrected by a replayed checkout.session.completed event (the payment
 *   insert is first-write-wins / ON CONFLICT DO NOTHING).
 */
import type Stripe from "stripe";
import {
  checkoutPolicy,
  paymentFromCheckoutSession,
} from "~/lib/payment";

export interface WebhookDeps {
  /** Server-side ownership check: does `caseId` belong to `userId`? */
  isCaseOwner(userId: string, caseId: string): Promise<boolean>;
  payment: {
    recordSuccessfulPayment(payment: {
      checkoutSessionId: string;
      paymentIntentId?: string;
      userId: string;
      caseId: string;
      amountCents: number;
      currency: string;
    }): Promise<void>;
    recordWebhookEvent(eventId: string, eventType: string): Promise<boolean>;
    hasWebhookEvent(eventId: string): Promise<boolean>;
    markPaymentRefunded(paymentIntentId: string): Promise<void>;
  };
  stripe: {
    /** Fetch the checkout session's first line-item price id (with expansion). Null on failure. */
    retrieveCheckoutLineItemPriceId(sessionId: string): Promise<string | null>;
  };
  env: { STRIPE_PRO_PRICE_ID?: string };
}

export interface WebhookOutcome {
  handled: boolean;
  recorded: boolean;
  skippedReason?: string;
}

function extractPaymentIntentId(obj: Stripe.Charge | Stripe.Refund): string | null {
  if (typeof obj.payment_intent === "string") return obj.payment_intent;
  if (obj.object === "charge" && typeof obj.payment_intent === "string") return obj.payment_intent;
  return null;
}

export async function processCheckoutCompleted(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  const session = event.data.object as Stripe.Checkout.Session;

  // Replay idempotency — this event id was already fully processed.
  if (await deps.payment.hasWebhookEvent(event.id)) {
    return { handled: true, recorded: false, skippedReason: "replay" };
  }

  // Exact-product validation. The session in the event does not carry line
  // items, so fetch them (expanded) and check the price id server-side.
  const lineItemPriceId = await deps.stripe.retrieveCheckoutLineItemPriceId(session.id);
  const policy = checkoutPolicy({
    amountTotal: session.amount_total,
    currency: session.currency,
    mode: session.mode,
    paymentStatus: session.payment_status,
    lineItemPriceId,
    configuredPriceId: deps.env.STRIPE_PRO_PRICE_ID,
  });
  if (!policy.ok) {
    return { handled: true, recorded: false, skippedReason: policy.reason };
  }

  const record = paymentFromCheckoutSession(session);
  if (!record) {
    return { handled: true, recorded: false, skippedReason: "malformed metadata" };
  }

  // Exact ownership: the paid case must actually belong to the paying user.
  if (!(await deps.isCaseOwner(record.userId, record.caseId))) {
    return { handled: true, recorded: false, skippedReason: "case not owned by user" };
  }

  await deps.payment.recordSuccessfulPayment(record);
  await deps.payment.recordWebhookEvent(event.id, event.type);
  return { handled: true, recorded: true };
}

export async function processRefundEvent(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  const object = event.data.object as Stripe.Charge | Stripe.Refund;

  if (await deps.payment.hasWebhookEvent(event.id)) {
    return { handled: true, recorded: false, skippedReason: "replay" };
  }

  const paymentIntentId = extractPaymentIntentId(object);
  if (!paymentIntentId) {
    return { handled: true, recorded: false, skippedReason: "no payment intent" };
  }

  // Any refund revokes the entitlement (refund/reversal policy).
  await deps.payment.markPaymentRefunded(paymentIntentId);
  await deps.payment.recordWebhookEvent(event.id, event.type);
  return { handled: true, recorded: true };
}
