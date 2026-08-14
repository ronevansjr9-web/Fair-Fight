/**
 * Checkout tests: ownership, exact $99 product validation, and metadata
 * shape. Stripe and the database are mocked (no real Stripe/database
 * verification is claimed). The fail-closed gate path is also asserted.
 */
import { describe, expect, test, mock } from "bun:test";

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_PRO_PRICE_ID = "price_ff_pro_99";
process.env.NODE_ENV = "development";
process.env.PUBLIC_SITE_URL = "https://fairfight.example";

let createdSessions: Record<string, unknown>[] = [];
let priceConfig: { type: string; unit_amount: number; currency: string } | null = null;
let priceError: Error | null = null;

mock.module("stripe", () => ({
  default: class FakeStripe {
    prices = {
      retrieve: async () => {
        if (priceError) throw priceError;
        return priceConfig ?? { id: "price_ff_pro_99", type: "one_time", unit_amount: 9900, currency: "usd" };
      },
    };
    checkout = {
      sessions: {
        create: async (params: Record<string, unknown>) => {
          createdSessions.push(params);
          return { url: "https://checkout.stripe.example/session" };
        },
      },
    };
  },
}));

mock.module("~/db", () => ({
  sql: () => (strings: TemplateStringsArray, ...params: unknown[]) => {
    // isCaseOwner runs SELECT 1 FROM cases WHERE id=? AND user_id=?; return a
    // row only when the case id is the "owned" one.
    const sqlText = strings.join("?");
    if (sqlText.includes("FROM cases WHERE")) {
      const caseId = params[0];
      return Promise.resolve(caseId === "case_owned" ? [{ "?column?": 1 }] : []);
    }
    return Promise.resolve([]);
  },
}));

const { createCheckoutSession, createCheckoutSessionCore, validateConfiguredProPrice } = await import("~/lib/stripe");
const { TEMP_UNAVAILABLE_MESSAGE } = await import("~/lib/restrictedFeatures");

function reset() {
  createdSessions = [];
  priceConfig = null;
  priceError = null;
}

describe("validateConfiguredProPrice", () => {
  test("accepts the exact one-time $99 USD price", async () => {
    reset();
    priceConfig = { type: "one_time", unit_amount: 9900, currency: "usd" };
    expect(await validateConfiguredProPrice()).toBeNull();
  });
  test("rejects a subscription price", async () => {
    reset();
    priceConfig = { type: "recurring", unit_amount: 9900, currency: "usd" };
    expect(await validateConfiguredProPrice()).toContain("one-time");
  });
  test("rejects a wrong amount", async () => {
    reset();
    priceConfig = { type: "one_time", unit_amount: 9901, currency: "usd" };
    expect(await validateConfiguredProPrice()).toContain("$99");
  });
  test("rejects a wrong currency", async () => {
    reset();
    priceConfig = { type: "one_time", unit_amount: 9900, currency: "eur" };
    expect(await validateConfiguredProPrice()).toContain("USD");
  });
  test("fails closed when the Stripe API errors", async () => {
    reset();
    priceError = new Error("network");
    expect(await validateConfiguredProPrice()).toContain("Failed to validate");
  });
});

describe("createCheckoutSessionCore", () => {
  test("owned case -> session with exact server-derived metadata and $99 price", async () => {
    reset();
    const result = await createCheckoutSessionCore("user_1", "case_owned");
    expect(result).toEqual({ url: "https://checkout.stripe.example/session" });
    expect(createdSessions.length).toBe(1);
    const session = createdSessions[0] as Record<string, unknown>;
    expect(session.mode).toBe("payment");
    expect((session.line_items as { price: string }[])[0].price).toBe("price_ff_pro_99");
    expect((session.line_items as { quantity: number }[])[0].quantity).toBe(1);
    expect(session.metadata).toEqual({ userId: "user_1", caseId: "case_owned" });
    expect(session.allow_promotion_codes).toBe(false);
  });

  test("unowned case is rejected before any Stripe call", async () => {
    reset();
    const result = await createCheckoutSessionCore("user_1", "case_not_mine");
    expect(result).toEqual({ error: "Case not found or not owned by you." });
    expect(createdSessions.length).toBe(0);
  });

  test("malformed case id is rejected", async () => {
    reset();
    expect((await createCheckoutSessionCore("user_1", "bad id!")).error).toBeDefined();
    expect((await createCheckoutSessionCore("user_1", "")).error).toBeDefined();
    expect(createdSessions.length).toBe(0);
  });

  test("wrong configured price blocks session creation", async () => {
    reset();
    priceConfig = { type: "one_time", unit_amount: 500, currency: "usd" };
    const result = await createCheckoutSessionCore("user_1", "case_owned");
    expect(result.error).toContain("$99");
    expect(createdSessions.length).toBe(0);
  });
});

describe("gated entry point", () => {
  test("createCheckoutSession stays fail-closed while the gate is active", async () => {
    reset();
    const result = await createCheckoutSession("user_1", "case_owned");
    expect(result).toEqual({ error: TEMP_UNAVAILABLE_MESSAGE });
    expect(createdSessions.length).toBe(0);
  });
});
