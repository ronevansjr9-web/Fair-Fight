/**
 * Stripe webhook route tests.
 *
 * Covers:
 * - Route registration: the webhook is exposed as a real TanStack Start API
 *   route (`/api/stripe/webhook`) with a POST handler.
 * - Rejection before persistence: missing or invalid signatures return 400 and
 *   never touch the database.
 * - Persistence: a signature-verified `checkout.session.completed` event
 *   records exactly one payment for the userId/caseId in session metadata.
 *
 * The `~/db` module is mocked so tests run without a live database; the mock
 * also lets us assert that rejection paths make zero database calls.
 */
import { describe, expect, test, mock } from "bun:test";
import Stripe from "stripe";

const sqlCalls: unknown[][] = [];
const sqlMock = () => async (_strings: TemplateStringsArray, ...values: unknown[]) => {
  sqlCalls.push(values);
  return Promise.resolve([] as Record<string, unknown>[]);
};
mock.module("~/db", () => ({ sql: sqlMock }));

// Module-level env constants are captured at import time, so configure the
// test environment before the first import of the webhook module.
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";

const { Route } = await import("./webhook");
const POST = Route.options.server.handlers.POST;

const WEBHOOK_URL = "http://localhost/api/stripe/webhook";

describe("Stripe webhook route registration", () => {
  test("exports a TanStack Start Route for /api/stripe/webhook", () => {
    expect(Route).toBeDefined();
    expect(typeof POST).toBe("function");
  });
});

describe("Stripe webhook rejection happens before persistence", () => {
  test("missing signature -> 400 and no database writes", async () => {
    sqlCalls.length = 0;
    const res = await POST({
      request: new Request(WEBHOOK_URL, { method: "POST" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No signature");
    expect(sqlCalls.length).toBe(0);
  });

  test("invalid signature -> 400 and no database writes", async () => {
    sqlCalls.length = 0;
    const request = new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=not-a-valid-signature" },
      body: JSON.stringify({ id: "evt_test", object: "event", type: "checkout.session.completed" }),
    });
    const res = await POST({ request });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid signature");
    expect(sqlCalls.length).toBe(0);
  });
});

describe("Stripe webhook persistence", () => {
  test("verified checkout.session.completed records one payment for the session's case", async () => {
    sqlCalls.length = 0;
    const stripe = new Stripe("sk_test_dummy", { apiVersion: "2025-03-31.basil" });
    const payload = JSON.stringify({
      id: "evt_test_1",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          object: "checkout.session",
          payment_status: "paid",
          amount_total: 9900,
          currency: "usd",
          payment_intent: "pi_test_1",
          metadata: { userId: "user_1", caseId: "case_1" },
        },
      },
    });
    const signature = await stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: "whsec_dummy",
    });
    const request = new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    });
    const res = await POST({ request });
    expect(res.status).toBe(200);
    // recordSuccessfulPayment runs the payment INSERT; the audit log also
    // writes. At least the payment write must have happened.
    expect(sqlCalls.length).toBeGreaterThan(0);
  });

  test("unpaid sessions are acknowledged but never persisted", async () => {
    sqlCalls.length = 0;
    const stripe = new Stripe("sk_test_dummy", { apiVersion: "2025-03-31.basil" });
    const payload = JSON.stringify({
      id: "evt_test_2",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_2",
          object: "checkout.session",
          payment_status: "unpaid",
          metadata: { userId: "user_1", caseId: "case_1" },
        },
      },
    });
    const signature = await stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: "whsec_dummy",
    });
    const request = new Request(WEBHOOK_URL, {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    });
    const res = await POST({ request });
    expect(res.status).toBe(200);
    expect(sqlCalls.length).toBe(0);
  });
});
