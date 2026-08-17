import Stripe from "stripe";
import { sql } from "~/db";

export type PaymentRecord = {
  checkoutSessionId: string;
  paymentIntentId?: string;
  userId: string;
  caseId: string;
  amountCents: number;
  currency: string;
};

/**
 * The only sellable product in the MVP: Fair Fight Pro Case Analysis,
 * $99.00 USD one-time per case. The webhook rejects any session that does not
 * match this exact amount/currency, and checkout refuses to create a session
 * from any Stripe price that is not this one-time $99 USD product.
 */
export const FAIR_FIGHT_PRICE_CENTS = 9900;
export const FAIR_FIGHT_CURRENCY = "usd";

/** Safe shape for user/case ids carried in Stripe metadata. */
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function getPublicOrigin(env: Record<string, string | undefined> = process.env): string {
  const configured = env.PUBLIC_SITE_URL?.trim() || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "");
  if (configured) return configured.replace(/\/$/, "");
  if (env.NODE_ENV === "production") throw new Error("PUBLIC_SITE_URL (or VERCEL_URL) must be configured in production");
  return "http://localhost:3000";
}

export function checkoutReturnUrls(env?: Record<string, string | undefined>) {
  const origin = getPublicOrigin(env);
  return {
    success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?checkout=cancelled`,
  };
}

export async function recordSuccessfulPayment(payment: PaymentRecord): Promise<void> {
  const query = sql();
  // First write wins: ON CONFLICT DO NOTHING means a replayed or mismatched
  // delivery for the same checkout session can never overwrite the original
  // amount/currency/status. A later refund explicitly flips status to
  // 'refunded' (see markPaymentRefunded) — a replay of the original
  // checkout.session.completed event cannot resurrect a refunded entitlement.
  await query`
    INSERT INTO payments (checkout_session_id, payment_intent_id, user_id, case_id, amount_cents, currency, status)
    VALUES (${payment.checkoutSessionId}, ${payment.paymentIntentId ?? null}, ${payment.userId}, ${payment.caseId}, ${payment.amountCents}, ${payment.currency}, 'succeeded')
    ON CONFLICT (checkout_session_id) DO NOTHING
  `;
}

/**
 * Refund/reversal policy: a refunded payment must never grant access.
 * `hasCaseEntitlement` only counts status='succeeded', so flipping to
 * 'refunded' revokes the entitlement immediately. Only a succeeded record can
 * be flipped — a record that is already refunded stays refunded.
 */
export async function markPaymentRefunded(paymentIntentId: string): Promise<void> {
  const query = sql();
  await query`
    UPDATE payments SET status = 'refunded', updated_at = NOW()
    WHERE payment_intent_id = ${paymentIntentId} AND status = 'succeeded'
  `;
}

/** Returns true when this event id was newly recorded (false = replay). */
export async function recordWebhookEvent(eventId: string, eventType: string): Promise<boolean> {
  const query = sql();
  const rows = await query`
    INSERT INTO webhook_events (event_id, event_type)
    VALUES (${eventId}, ${eventType})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  return rows.length > 0;
}

export async function hasWebhookEvent(eventId: string): Promise<boolean> {
  const query = sql();
  const rows = await query`SELECT 1 FROM webhook_events WHERE event_id = ${eventId} LIMIT 1`;
  return rows.length > 0;
}

export async function hasCaseEntitlement(userId: string, caseId: string): Promise<boolean> {
  const rows = await sql()`SELECT 1 FROM payments WHERE user_id=${userId} AND case_id=${caseId} AND status='succeeded' LIMIT 1`;
  return rows.length > 0;
}

export async function hasAnyEntitlement(userId: string): Promise<boolean> {
  const rows = await sql()`SELECT 1 FROM payments WHERE user_id=${userId} AND status='succeeded' LIMIT 1`;
  return rows.length > 0;
}

/**
 * Pure checkout-policy validation: does this session (amount/currency/mode)
 * and its line item (price id) match the configured $99 one-time product?
 * The Stripe event's session object never includes line items, so callers
 * must fetch the session with expanded line items and pass the resulting
 * price id here. Env provides the configured STRIPE_PRO_PRICE_ID; when it is
 * unset the policy fails closed (never record an unverifiable purchase).
 */
export function checkoutPolicy(opts: {
  amountTotal: number | null | undefined;
  currency: string | null | undefined;
  mode: string | null | undefined;
  paymentStatus: string | null | undefined;
  lineItemPriceId: string | null | undefined;
  configuredPriceId: string | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (!opts.configuredPriceId) return { ok: false, reason: "STRIPE_PRO_PRICE_ID is not configured" };
  if (opts.paymentStatus !== "paid") return { ok: false, reason: "session is not paid" };
  if (opts.mode && opts.mode !== "payment") return { ok: false, reason: "session is not a one-time payment" };
  if (opts.amountTotal !== FAIR_FIGHT_PRICE_CENTS) {
    return { ok: false, reason: `amount ${opts.amountTotal} does not match ${FAIR_FIGHT_PRICE_CENTS}` };
  }
  if (opts.currency !== FAIR_FIGHT_CURRENCY) {
    return { ok: false, reason: `currency ${opts.currency} is not ${FAIR_FIGHT_CURRENCY}` };
  }
  if (opts.lineItemPriceId !== opts.configuredPriceId) {
    return { ok: false, reason: "line item price does not match the configured Pro price" };
  }
  return { ok: true };
}

export function paymentFromCheckoutSession(session: Stripe.Checkout.Session): PaymentRecord | null {
  const metadata = session.metadata ?? {};
  const userId = metadata.userId;
  const caseId = metadata.caseId;
  if (
    session.payment_status !== "paid" ||
    !session.id ||
    typeof userId !== "string" ||
    typeof caseId !== "string" ||
    !ID_PATTERN.test(userId) ||
    !ID_PATTERN.test(caseId)
  ) {
    return null;
  }
  return {
    checkoutSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
    userId,
    caseId,
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
  };
}
