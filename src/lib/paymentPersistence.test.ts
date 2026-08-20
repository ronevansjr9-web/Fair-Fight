/**
 * DB-shape tests for payment persistence: first-write-wins recording, refund
 * reversal, and webhook event idempotency. `~/db` is mocked and captures the
 * SQL so we assert the exact statements/behavior without a real database.
 */
import { describe, expect, test, mock } from "bun:test";

type Captured = { sql: string; params: unknown[] }[];
const captured: Captured = [];

mock.module("~/db", () => ({
  sql: () => (strings: TemplateStringsArray, ...params: unknown[]) => {
    captured.push({
      sql: strings.join("?"),
      params,
    });
    return Promise.resolve([]);
  },
}));

const { recordSuccessfulPayment, markPaymentRefunded, recordWebhookEvent, hasWebhookEvent } = await import("./payment");

function reset() {
  captured.length = 0;
}

describe("recordSuccessfulPayment", () => {
  test("inserts succeeded and never updates an existing checkout session (first write wins)", async () => {
    reset();
    await recordSuccessfulPayment({
      checkoutSessionId: "cs_1",
      paymentIntentId: "pi_1",
      userId: "user_1",
      caseId: "case_1",
      amountCents: 9900,
      currency: "usd",
    });
    expect(captured.length).toBe(1);
    const { sql, params } = captured[0];
    expect(sql).toContain("INSERT INTO payments");
    expect(sql).toContain("ON CONFLICT (checkout_session_id) DO NOTHING");
    expect(sql).not.toContain("DO UPDATE");
    expect(sql).toContain("'succeeded'");
    expect(params).toContain("cs_1");
  });
});

describe("markPaymentRefunded", () => {
  test("flips only succeeded records to refunded (revokes entitlement)", async () => {
    reset();
    await markPaymentRefunded("pi_1");
    expect(captured.length).toBe(1);
    const { sql, params } = captured[0];
    expect(sql).toContain("UPDATE payments SET status = 'refunded'");
    expect(sql).toContain("WHERE payment_intent_id = ?");
    expect(sql).toContain("AND status = 'succeeded'");
    expect(params).toContain("pi_1");
  });
});

describe("webhook event idempotency", () => {
  test("recordWebhookEvent inserts with ON CONFLICT DO NOTHING", async () => {
    reset();
    await recordWebhookEvent("evt_1", "checkout.session.completed");
    expect(captured.length).toBe(1);
    const { sql, params } = captured[0];
    expect(sql).toContain("INSERT INTO webhook_events");
    expect(sql).toContain("ON CONFLICT (event_id) DO NOTHING");
    expect(sql).toContain("RETURNING event_id");
    expect(params).toContain("evt_1");
  });
  test("hasWebhookEvent selects by event id", async () => {
    reset();
    await hasWebhookEvent("evt_1");
    expect(captured.length).toBe(1);
    const { sql, params } = captured[0];
    expect(sql).toContain("SELECT 1 FROM webhook_events WHERE event_id = ?");
    expect(params).toContain("evt_1");
  });
});
