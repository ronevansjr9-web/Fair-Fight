/**
 * Unit tests for the webhook entitlement processor (the path that runs AFTER
 * the fail-closed gate is cleared and the signature is verified). All
 * database and Stripe surfaces are mocked — no real Stripe or database
 * verification is claimed; that remains a blocked integration step.
 */
import { describe, expect, test } from "bun:test";
import type Stripe from "stripe";
import { processCheckoutCompleted, processRefundEvent, type WebhookDeps } from "./webhookProcessor";

const CONFIGURED_PRICE_ID = "price_ff_pro_99";

function makeDeps(overrides: Partial<WebhookDeps> = {}): WebhookDeps & {
  calls: { recorded: number; refunded: string[]; events: string[]; checks: string[] };
} {
  const calls = { recorded: 0, refunded: [] as string[], events: [] as string[], checks: [] as string[] };
  return {
    isCaseOwner: async (userId, caseId) => {
      calls.checks.push(`${userId}:${caseId}`);
      return userId === "user_1" && caseId === "case_1";
    },
    payment: {
      recordSuccessfulPayment: async () => {
        calls.recorded += 1;
      },
      recordWebhookEvent: async (eventId) => {
        calls.events.push(eventId);
        return true;
      },
      hasWebhookEvent: async () => false,
      markPaymentRefunded: async (pi) => {
        calls.refunded.push(pi);
      },
    },
    stripe: {
      retrieveCheckoutLineItemPriceId: async () => CONFIGURED_PRICE_ID,
    },
    env: { STRIPE_PRO_PRICE_ID: CONFIGURED_PRICE_ID },
    ...overrides,
    calls,
  } as WebhookDeps & { calls: typeof calls };
}

function checkoutEvent(overrides: Record<string, unknown> = {}): Stripe.Event {
  const session = {
    id: "cs_test_1",
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    amount_total: 9900,
    currency: "usd",
    payment_intent: "pi_test_1",
    metadata: { userId: "user_1", caseId: "case_1" },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
  return {
    id: "evt_test_1",
    object: "event",
    type: "checkout.session.completed",
    data: { object: session },
  } as Stripe.Event;
}

describe("processCheckoutCompleted", () => {
  test("valid paid $99 session with owned case records the entitlement and event", async () => {
    const deps = makeDeps();
    const outcome = await processCheckoutCompleted(checkoutEvent(), deps);
    expect(outcome).toEqual({ handled: true, recorded: true });
    expect(deps.calls.recorded).toBe(1);
    expect(deps.calls.events).toEqual(["evt_test_1"]);
    expect(deps.calls.checks).toEqual(["user_1:case_1"]);
  });

  test("unpaid session is rejected without recording", async () => {
    const deps = makeDeps();
    const outcome = await processCheckoutCompleted(checkoutEvent({ payment_status: "unpaid" }), deps);
    expect(outcome.recorded).toBe(false);
    expect(outcome.skippedReason).toContain("not paid");
    expect(deps.calls.recorded).toBe(0);
    expect(deps.calls.events).toEqual([]);
  });

  test("wrong amount is rejected (not $99.00)", async () => {
    const deps = makeDeps();
    const outcome = await processCheckoutCompleted(checkoutEvent({ amount_total: 1 }), deps);
    expect(outcome.recorded).toBe(false);
    expect(outcome.skippedReason).toContain("amount 1");
    expect(deps.calls.recorded).toBe(0);
  });

  test("wrong currency is rejected", async () => {
    const deps = makeDeps();
    const outcome = await processCheckoutCompleted(checkoutEvent({ currency: "eur" }), deps);
    expect(outcome.recorded).toBe(false);
    expect(outcome.skippedReason).toContain("eur");
    expect(deps.calls.recorded).toBe(0);
  });

  test("wrong line-item price id is rejected", async () => {
    const deps = makeDeps({
      stripe: { retrieveCheckoutLineItemPriceId: async () => "price_something_else" },
    });
    const outcome = await processCheckoutCompleted(checkoutEvent(), deps);
    expect(outcome.recorded).toBe(false);
    expect(outcome.skippedReason).toContain("does not match");
    expect(deps.calls.recorded).toBe(0);
  });

  test("unconfigured STRIPE_PRO_PRICE_ID fails closed", async () => {
    const deps = makeDeps({ env: { STRIPE_PRO_PRICE_ID: "" } });
    const outcome = await processCheckoutCompleted(checkoutEvent(), deps);
    expect(outcome.recorded).toBe(false);
    expect(outcome.skippedReason).toContain("not configured");
  });

  test("malformed metadata (missing caseId) is rejected", async () => {
    const deps = makeDeps();
    const outcome = await processCheckoutCompleted(
      checkoutEvent({ metadata: { userId: "user_1" } }),
      deps,
    );
    expect(outcome.recorded).toBe(false);
    expect(outcome.skippedReason).toBe("malformed metadata");
    expect(deps.calls.recorded).toBe(0);
  });

  test("metadata ids that are not owned by the user are rejected", async () => {
    const deps = makeDeps();
    const outcome = await processCheckoutCompleted(
      checkoutEvent({ metadata: { userId: "user_1", caseId: "someone_elses_case" } }),
      deps,
    );
    expect(outcome.recorded).toBe(false);
    expect(outcome.skippedReason).toBe("case not owned by user");
    expect(deps.calls.recorded).toBe(0);
  });

  test("replay of an already-processed event id is a no-op", async () => {
    const deps = makeDeps({
      payment: {
        ...makeDeps().payment,
        hasWebhookEvent: async () => true,
      },
    });
    const outcome = await processCheckoutCompleted(checkoutEvent(), deps);
    expect(outcome).toEqual({ handled: true, recorded: false, skippedReason: "replay" });
    expect(deps.calls.recorded).toBe(0);
    expect(deps.calls.events).toEqual([]);
  });

  test("line-item retrieval failure rejects (fail closed)", async () => {
    const deps = makeDeps({
      stripe: { retrieveCheckoutLineItemPriceId: async () => null },
    });
    const outcome = await processCheckoutCompleted(checkoutEvent(), deps);
    expect(outcome.recorded).toBe(false);
    expect(deps.calls.recorded).toBe(0);
  });
});

describe("processRefundEvent", () => {
  function refundEvent(): Stripe.Event {
    return {
      id: "evt_refund_1",
      object: "event",
      type: "charge.refunded",
      data: {
        object: { id: "ch_1", object: "charge", payment_intent: "pi_test_1", refunded: true },
      },
    } as unknown as Stripe.Event;
  }

  test("refund marks the payment refunded (revokes entitlement) and records the event", async () => {
    const deps = makeDeps();
    const outcome = await processRefundEvent(refundEvent(), deps);
    expect(outcome).toEqual({ handled: true, recorded: true });
    expect(deps.calls.refunded).toEqual(["pi_test_1"]);
    expect(deps.calls.events).toEqual(["evt_refund_1"]);
  });

  test("refund replay is a no-op", async () => {
    const deps = makeDeps({
      payment: { ...makeDeps().payment, hasWebhookEvent: async () => true },
    });
    const outcome = await processRefundEvent(refundEvent(), deps);
    expect(outcome.skippedReason).toBe("replay");
    expect(deps.calls.refunded).toEqual([]);
  });

  test("refund without a payment intent is acknowledged but does nothing", async () => {
    const deps = makeDeps();
    const event = refundEvent();
    (event.data.object as Record<string, unknown>).payment_intent = undefined;
    const outcome = await processRefundEvent(event, deps);
    expect(outcome.skippedReason).toBe("no payment intent");
    expect(deps.calls.refunded).toEqual([]);
  });
});
