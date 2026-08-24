/**
 * Stripe webhook route tests for the open checkout state.
 *
 * The route must reject missing and invalid signatures with 400, then process
 * valid signed events through the real webhook processor. Stripe and database
 * calls are replaced with deterministic test doubles; no real Stripe charge,
 * network request, or webhook delivery is used.
 */
import { describe, expect, test, mock } from "bun:test";
import { createHmac, timingSafeEqual } from "node:crypto";

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";
process.env.STRIPE_PRO_PRICE_ID = "price_ff_pro_99";

const payments = new Map<
  string,
  { paymentIntentId?: string; status: string; userId: string; caseId: string }
>();
const webhookEvents = new Set<string>();
let sqlCalls = 0;

mock.module("~/db", () => ({
  sql:
    () =>
    (strings: TemplateStringsArray, ...params: unknown[]) => {
      sqlCalls += 1;
      const sqlText = strings.join("?");

      if (sqlText.includes("FROM cases WHERE")) {
        return Promise.resolve(
          params[0] === "case_1" ? [{ "?column?": 1 }] : [],
        );
      }

      if (sqlText.includes("FROM webhook_events WHERE")) {
        return Promise.resolve(
          webhookEvents.has(String(params[0])) ? [{ "?column?": 1 }] : [],
        );
      }

      if (sqlText.includes("INSERT INTO payments")) {
        const checkoutSessionId = String(params[0]);
        if (!payments.has(checkoutSessionId)) {
          payments.set(checkoutSessionId, {
            paymentIntentId:
              typeof params[1] === "string" ? params[1] : undefined,
            userId: String(params[2]),
            caseId: String(params[3]),
            status: "succeeded",
          });
        }
        return Promise.resolve([]);
      }

      if (sqlText.includes("INSERT INTO webhook_events")) {
        const eventId = String(params[0]);
        if (webhookEvents.has(eventId)) return Promise.resolve([]);
        webhookEvents.add(eventId);
        return Promise.resolve([{ event_id: eventId }]);
      }

      if (sqlText.includes("UPDATE payments SET status = 'refunded'")) {
        const paymentIntentId = String(params[0]);
        for (const payment of payments.values()) {
          if (
            payment.paymentIntentId === paymentIntentId &&
            payment.status === "succeeded"
          ) {
            payment.status = "refunded";
          }
        }
        return Promise.resolve([]);
      }

      return Promise.resolve([]);
    },
}));

/**
 * Verify the same Stripe-style HMAC format that the SDK accepts while making
 * line-item retrieval deterministic and local. The route still constructs the
 * Stripe client and calls constructEventAsync with the signed request body.
 */
class TestStripe {
  readonly webhooks = {
    constructEventAsync: async (
      payload: string,
      signature: string,
      secret: string,
    ) => {
      const [timestampPart, signaturePart] = signature.split(",");
      const timestamp = timestampPart?.startsWith("t=")
        ? timestampPart.slice(2)
        : "";
      const actual = signaturePart?.startsWith("v1=")
        ? signaturePart.slice(3)
        : "";
      const expected = createHmac("sha256", secret)
        .update(`${timestamp}.${payload}`)
        .digest("hex");
      if (
        !timestamp ||
        !actual ||
        actual.length !== expected.length ||
        !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
      ) {
        throw new Error("Invalid signature");
      }
      return JSON.parse(payload);
    },
  };
  readonly checkout = {
    sessions: {
      retrieve: async () => ({
        line_items: { data: [{ price: { id: "price_ff_pro_99" } }] },
      }),
    },
  };

  constructor(_secretKey: string, _options: unknown) {}
}

mock.module("stripe", () => ({ default: TestStripe }));

const { Route } = await import("./webhook");
const POST = Route.options.server.handlers.POST;

const WEBHOOK_URL = "http://localhost/api/stripe/webhook";
const WEBHOOK_SECRET = "whsec_dummy";

function resetState() {
  payments.clear();
  webhookEvents.clear();
  sqlCalls = 0;
}

/** Valid Stripe-style t=...,v1=... signature over <timestamp>.<payload>. */
function validStripeSignature(
  payload: string,
  secret: string = WEBHOOK_SECRET,
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function requestFor(
  payload: string,
  signature = validStripeSignature(payload),
): Request {
  return new Request(WEBHOOK_URL, {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

function checkoutEventPayload(
  options: { id?: string; paymentStatus?: string } = {},
): string {
  return JSON.stringify({
    id: options.id ?? "evt_test_checkout_1",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_checkout_1",
        object: "checkout.session",
        mode: "payment",
        payment_status: options.paymentStatus ?? "paid",
        amount_total: 9900,
        currency: "usd",
        payment_intent: "pi_test_1",
        metadata: { userId: "user_1", caseId: "case_1" },
      },
    },
  });
}

function refundEventPayload(id = "evt_test_refund_1"): string {
  return JSON.stringify({
    id,
    object: "event",
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_test_1",
        object: "charge",
        payment_intent: "pi_test_1",
      },
    },
  });
}

async function responseBody(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe("Stripe webhook route registration", () => {
  test("exports a TanStack Start Route for /api/stripe/webhook", () => {
    expect(Route).toBeDefined();
    expect(typeof POST).toBe("function");
  });
});

describe("Stripe webhook signature verification", () => {
  test("missing stripe-signature -> 400 before processing", async () => {
    resetState();
    const res = await POST({
      request: new Request(WEBHOOK_URL, { method: "POST" }),
    });
    expect(res.status).toBe(400);
    expect(await responseBody(res)).toEqual({ error: "No signature" });
    expect(sqlCalls).toBe(0);
  });

  test("invalid stripe-signature -> 400 before processing", async () => {
    resetState();
    const payload = checkoutEventPayload();
    const res = await POST({
      request: requestFor(payload, "t=1,v1=not-a-valid-signature"),
    });
    expect(res.status).toBe(400);
    expect(await responseBody(res)).toEqual({ error: "Invalid signature" });
    expect(sqlCalls).toBe(0);
  });
});

describe("Stripe webhook open processing", () => {
  test("valid signed paid checkout.session.completed -> 200 and records exact-case entitlement", async () => {
    resetState();
    const payload = checkoutEventPayload();
    const res = await POST({ request: requestFor(payload) });

    expect(res.status).toBe(200);
    expect(await responseBody(res)).toEqual({ received: true });
    expect(payments.get("cs_test_checkout_1")).toEqual({
      paymentIntentId: "pi_test_1",
      status: "succeeded",
      userId: "user_1",
      caseId: "case_1",
    });
    expect(webhookEvents.has("evt_test_checkout_1")).toBe(true);
  });

  test("valid signed unpaid checkout.session.completed -> 200 without recording entitlement", async () => {
    resetState();
    const payload = checkoutEventPayload({
      id: "evt_test_unpaid",
      paymentStatus: "unpaid",
    });
    const res = await POST({ request: requestFor(payload) });

    expect(res.status).toBe(200);
    expect(await responseBody(res)).toEqual({ received: true });
    expect(payments.size).toBe(0);
    expect(webhookEvents.size).toBe(0);
  });

  test("replaying a valid checkout event is idempotent", async () => {
    resetState();
    const payload = checkoutEventPayload();
    const first = await POST({ request: requestFor(payload) });
    const second = await POST({ request: requestFor(payload) });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(payments.size).toBe(1);
    expect(webhookEvents.size).toBe(1);
  });

  test("valid signed charge.refunded -> 200 and revokes the entitlement", async () => {
    resetState();
    const checkoutPayload = checkoutEventPayload();
    await POST({ request: requestFor(checkoutPayload) });
    expect(payments.get("cs_test_checkout_1")?.status).toBe("succeeded");

    const refundPayload = refundEventPayload();
    const res = await POST({ request: requestFor(refundPayload) });

    expect(res.status).toBe(200);
    expect(await responseBody(res)).toEqual({ received: true });
    expect(payments.get("cs_test_checkout_1")?.status).toBe("refunded");
    expect(webhookEvents.has("evt_test_refund_1")).toBe(true);
  });

  test("replaying a valid refund is idempotent", async () => {
    resetState();
    await POST({ request: requestFor(checkoutEventPayload()) });
    const refundPayload = refundEventPayload();
    await POST({ request: requestFor(refundPayload) });
    const callsAfterFirstRefund = sqlCalls;

    const replay = await POST({ request: requestFor(refundPayload) });

    expect(replay.status).toBe(200);
    expect(payments.get("cs_test_checkout_1")?.status).toBe("refunded");
    expect(sqlCalls).toBe(callsAfterFirstRefund + 1); // only the replay ledger lookup
  });

  test("valid signed ignored event types are acknowledged without entitlement writes", async () => {
    resetState();
    const payload = JSON.stringify({
      id: "evt_test_expired",
      object: "event",
      type: "checkout.session.expired",
      data: { object: { id: "cs_test_expired", object: "checkout.session" } },
    });
    const res = await POST({ request: requestFor(payload) });

    expect(res.status).toBe(200);
    expect(await responseBody(res)).toEqual({ received: true });
    expect(payments.size).toBe(0);
    expect(webhookEvents.size).toBe(0);
  });
});
