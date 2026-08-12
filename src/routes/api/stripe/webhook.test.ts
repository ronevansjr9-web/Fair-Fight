import { describe, expect, test, mock } from "bun:test";

// The webhook gate returns before any database access. Mock `~/db` to throw
// if the handler ever reaches a query — proving no persistence happens.
mock.module("~/db", () => ({
  sql: () => {
    throw new Error("DB must not be touched while the checkout gate is active");
  },
}));

const { Route } = await import("./webhook");
const POST = Route.options.server.handlers.POST;
const { TEMP_UNAVAILABLE_MESSAGE } = await import("~/lib/restrictedFeatures");

const WEBHOOK_URL = "http://localhost/api/stripe/webhook";

describe("Stripe webhook route registration", () => {
  test("exports a TanStack Start Route for /api/stripe/webhook", () => {
    expect(Route).toBeDefined();
    expect(typeof POST).toBe("function");
  });
});

describe("Stripe webhook fail-closed gate (P0 restriction active)", () => {
  test("rejects every delivery with 503 and never touches the database", async () => {
    const res = await POST({
      request: new Request(WEBHOOK_URL, { method: "POST" }),
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });

  test("rejects even a validly-signed checkout.session.completed without persistence", async () => {
    const stripe = new (await import("stripe")).default("sk_test_dummy", {
      apiVersion: "2025-03-31.basil",
    });
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
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });

  test("unpaid sessions are also rejected while the gate is active", async () => {
    const stripe = new (await import("stripe")).default("sk_test_dummy", {
      apiVersion: "2025-03-31.basil",
    });
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
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });
});
