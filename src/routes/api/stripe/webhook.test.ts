/**
 * Stripe webhook route tests (P0 restriction active).
 *
 * While the checkout/Pro-activation restriction is active, the webhook must
 * fail closed BEFORE any signature verification, persistence, or Stripe
 * client work. Every delivery — missing signature, invalid signature, unpaid
 * `checkout.session.completed`, and paid `checkout.session.completed` — must
 * return 503 with the `feature_restricted` code and make zero database and
 * zero Stripe side-effect calls.
 *
 * Proof strategy:
 * - `~/db` is mocked to count and throw on any query, so the handler reaching
 *   a database call fails the test loudly.
 * - the `stripe` module is mocked to count and throw on instantiation, so the
 *   handler constructing the Stripe client (or calling constructEventAsync)
 *   fails the test loudly.
 * - Valid Stripe signatures are generated with node:crypto HMAC-SHA256 over
 *   `<timestamp>.<payload>`, which is byte-for-byte identical to
 *   `stripe.webhooks.generateTestHeaderStringAsync` (verified), so the
 *   "paid"/"unpaid" cases are genuinely well-signed deliveries.
 */
import { describe, expect, test, mock } from "bun:test";
import { createHmac } from "node:crypto";

let sqlCalls = 0;
mock.module("~/db", () => ({
  sql: () => {
    sqlCalls += 1;
    throw new Error("DB must not be touched while the checkout gate is active");
  },
}));

let stripeInstantiations = 0;
mock.module("stripe", () => ({
  default: class StripePoison {
    constructor() {
      stripeInstantiations += 1;
      throw new Error("Stripe client must not be instantiated while the checkout gate is active");
    }
  },
}));

// Module-level env constants are captured at import time, so configure the
// test environment before the first import of the webhook module.
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";

const { Route } = await import("./webhook");
const POST = Route.options.server.handlers.POST;
const { TEMP_UNAVAILABLE_MESSAGE } = await import("~/lib/restrictedFeatures");

const WEBHOOK_URL = "http://localhost/api/stripe/webhook";
const WEBHOOK_SECRET = "whsec_dummy";
const FEATURE_RESTRICTED_CODE = "feature_restricted";

/** Valid Stripe-style `t=...,v1=...` signature (identical to the SDK's async generator). */
function validStripeSignature(payload: string, secret: string = WEBHOOK_SECRET): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function checkoutEventPayload(paymentStatus: string, idSuffix: string): string {
  return JSON.stringify({
    id: `evt_test_${idSuffix}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${idSuffix}`,
        object: "checkout.session",
        payment_status: paymentStatus,
        amount_total: 9900,
        currency: "usd",
        metadata: { userId: "user_1", caseId: "case_1" },
      },
    },
  });
}

async function expectRestricted(res: Response): Promise<void> {
  expect(res.status).toBe(503);
  const body = (await res.json()) as { error: string; code: string };
  expect(body.code).toBe(FEATURE_RESTRICTED_CODE);
  expect(body.error).toBe(TEMP_UNAVAILABLE_MESSAGE);
}

describe("Stripe webhook route registration", () => {
  test("exports a TanStack Start Route for /api/stripe/webhook", () => {
    expect(Route).toBeDefined();
    expect(typeof POST).toBe("function");
  });
});

describe("Stripe webhook fail-closed gate (P0 restriction active)", () => {
  test("missing signature -> 503 feature_restricted with zero DB/Stripe calls", async () => {
    sqlCalls = 0;
    stripeInstantiations = 0;
    const res = await POST({ request: new Request(WEBHOOK_URL, { method: "POST" }) });
    await expectRestricted(res);
    expect(sqlCalls).toBe(0);
    expect(stripeInstantiations).toBe(0);
  });

  test("invalid signature -> 503 feature_restricted with zero DB/Stripe calls", async () => {
    sqlCalls = 0;
    stripeInstantiations = 0;
    const request = new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=not-a-valid-signature" },
      body: checkoutEventPayload("paid", "1"),
    });
    const res = await POST({ request });
    await expectRestricted(res);
    expect(sqlCalls).toBe(0);
    expect(stripeInstantiations).toBe(0);
  });

  test("unpaid checkout.session.completed -> 503 feature_restricted with zero DB/Stripe calls", async () => {
    sqlCalls = 0;
    stripeInstantiations = 0;
    const payload = checkoutEventPayload("unpaid", "2");
    const request = new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "stripe-signature": validStripeSignature(payload) },
      body: payload,
    });
    const res = await POST({ request });
    await expectRestricted(res);
    expect(sqlCalls).toBe(0);
    expect(stripeInstantiations).toBe(0);
  });

  test("paid checkout.session.completed -> 503 feature_restricted with zero DB/Stripe calls", async () => {
    sqlCalls = 0;
    stripeInstantiations = 0;
    const payload = checkoutEventPayload("paid", "3");
    const request = new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "stripe-signature": validStripeSignature(payload) },
      body: payload,
    });
    const res = await POST({ request });
    await expectRestricted(res);
    expect(sqlCalls).toBe(0);
    expect(stripeInstantiations).toBe(0);
  });

  test("charge.refunded -> 503 feature_restricted with zero DB/Stripe calls", async () => {
    sqlCalls = 0;
    stripeInstantiations = 0;
    const payload = JSON.stringify({
      id: "evt_test_refund",
      object: "event",
      type: "charge.refunded",
      data: { object: { id: "ch_1", object: "charge", payment_intent: "pi_test_1" } },
    });
    const request = new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "stripe-signature": validStripeSignature(payload) },
      body: payload,
    });
    const res = await POST({ request });
    await expectRestricted(res);
    expect(sqlCalls).toBe(0);
    expect(stripeInstantiations).toBe(0);
  });

  test("checkout.session.expired -> 503 feature_restricted with zero DB/Stripe calls", async () => {
    sqlCalls = 0;
    stripeInstantiations = 0;
    const payload = JSON.stringify({
      id: "evt_test_expired",
      object: "event",
      type: "checkout.session.expired",
      data: { object: { id: "cs_test_expired", object: "checkout.session" } },
    });
    const request = new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "stripe-signature": validStripeSignature(payload) },
      body: payload,
    });
    const res = await POST({ request });
    await expectRestricted(res);
    expect(sqlCalls).toBe(0);
    expect(stripeInstantiations).toBe(0);
  });

  test("payment_intent.payment_failed -> 503 feature_restricted with zero DB/Stripe calls", async () => {
    sqlCalls = 0;
    stripeInstantiations = 0;
    const payload = JSON.stringify({
      id: "evt_test_pifail",
      object: "event",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_test_fail", object: "payment_intent", status: "requires_payment_method" } },
    });
    const request = new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "stripe-signature": validStripeSignature(payload) },
      body: payload,
    });
    const res = await POST({ request });
    await expectRestricted(res);
    expect(sqlCalls).toBe(0);
    expect(stripeInstantiations).toBe(0);
  });
});
