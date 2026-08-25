import { describe, expect, test } from "bun:test";
import {
  checkoutPolicy,
  checkoutReturnUrls,
  getPublicOrigin,
  paymentFromCheckoutSession,
  FAIR_FIGHT_PRICE_CENTS,
  FAIR_FIGHT_CURRENCY,
} from "./payment";

describe("payment completion", () => {
  test("uses explicit origin and never localhost in production", () => {
    expect(getPublicOrigin({ NODE_ENV: "production", PUBLIC_SITE_URL: "https://fairfight.example/" })).toBe("https://fairfight.example");
    expect(() => getPublicOrigin({ NODE_ENV: "production" })).toThrow();
  });
  test("constructs safe Stripe return URLs", () => {
    const urls = checkoutReturnUrls({ NODE_ENV: "development", PUBLIC_SITE_URL: "https://fairfight.example" });
    expect(urls.success_url).toContain("session_id={CHECKOUT_SESSION_ID}");
    expect(urls.cancel_url).toBe("https://fairfight.example/dashboard?checkout=cancelled");
  });
  test("request host wins over a stale PUBLIC_SITE_URL (no stranded buyer)", () => {
    const req = new Request("https://fairfight.ctonew.app/analysis?caseId=c1", {
      headers: { host: "fairfight.ctonew.app" },
    });
    // The live pod might still have PUBLIC_SITE_URL pointing at a dead dev
    // subdomain; the incoming host must take precedence so return URLs resolve
    // to the origin the buyer is actually on.
    const env = { NODE_ENV: "production", PUBLIC_SITE_URL: "https://fairfight-dev.ctonew.app" };
    expect(getPublicOrigin(env, req)).toBe("https://fairfight.ctonew.app");
    const urls = checkoutReturnUrls(env, { request: req, caseId: "case_1" });
    expect(urls.success_url).toBe("https://fairfight.ctonew.app/analysis?caseId=case_1&checkout=success&session_id={CHECKOUT_SESSION_ID}");
    expect(urls.cancel_url).toBe("https://fairfight.ctonew.app/analysis?caseId=case_1&checkout=cancelled");
  });
  test("case-bound checkout returns go straight to the analysis workspace", () => {
    const env = { NODE_ENV: "production", PUBLIC_SITE_URL: "https://fairfight.example" };
    const urls = checkoutReturnUrls(env, { caseId: "case_42" });
    expect(urls.success_url).toBe("https://fairfight.example/analysis?caseId=case_42&checkout=success&session_id={CHECKOUT_SESSION_ID}");
    expect(urls.cancel_url).toBe("https://fairfight.example/analysis?caseId=case_42&checkout=cancelled");
  });
  test("localhost request host falls back to env origin (dev)", () => {
    const req = new Request("http://localhost:3000/dashboard", { headers: { host: "localhost:3000" } });
    expect(getPublicOrigin({ NODE_ENV: "development", PUBLIC_SITE_URL: "https://fairfight.example" }, req)).toBe("https://fairfight.example");
  });
  test("malformed host headers are rejected, not trusted", () => {
    const req = new Request("https://fairfight.ctonew.app/", {
      headers: { host: "evil.com/path" },
    });
    expect(getPublicOrigin({ NODE_ENV: "production", PUBLIC_SITE_URL: "https://fairfight.example" }, req)).toBe("https://fairfight.example");
  });
  test("only paid, case-bound sessions with valid metadata become records", () => {
    const base = { id: "cs_1", payment_status: "paid", metadata: { userId: "u1", caseId: "c1" }, amount_total: 9900, currency: "usd", payment_intent: "pi_1" } as any;
    expect(paymentFromCheckoutSession(base)?.caseId).toBe("c1");
    expect(paymentFromCheckoutSession({ ...base, payment_status: "unpaid" })).toBeNull();
    expect(paymentFromCheckoutSession({ ...base, metadata: { userId: "u1" } })).toBeNull();
    expect(paymentFromCheckoutSession({ ...base, metadata: { userId: "u1", caseId: "bad id!" } })).toBeNull();
    expect(paymentFromCheckoutSession({ ...base, metadata: { userId: "", caseId: "c1" } })).toBeNull();
    expect(paymentFromCheckoutSession({ ...base, id: undefined })).toBeNull();
  });
});

describe("checkoutPolicy — exact $99 one-time product", () => {
  const base = {
    amountTotal: FAIR_FIGHT_PRICE_CENTS,
    currency: FAIR_FIGHT_CURRENCY,
    mode: "payment",
    paymentStatus: "paid",
    lineItemPriceId: "price_pro",
    configuredPriceId: "price_pro",
  };
  test("exact match passes", () => {
    expect(checkoutPolicy(base)).toEqual({ ok: true });
  });
  test("wrong amount fails", () => {
    expect(checkoutPolicy({ ...base, amountTotal: FAIR_FIGHT_PRICE_CENTS + 1 }).ok).toBe(false);
    expect(checkoutPolicy({ ...base, amountTotal: 0 }).ok).toBe(false);
  });
  test("wrong currency fails", () => {
    expect(checkoutPolicy({ ...base, currency: "eur" }).ok).toBe(false);
  });
  test("wrong mode fails", () => {
    expect(checkoutPolicy({ ...base, mode: "subscription" }).ok).toBe(false);
  });
  test("unpaid fails", () => {
    expect(checkoutPolicy({ ...base, paymentStatus: "unpaid" }).ok).toBe(false);
  });
  test("wrong price id fails", () => {
    expect(checkoutPolicy({ ...base, lineItemPriceId: "price_other" }).ok).toBe(false);
  });
  test("missing configured price id fails closed", () => {
    expect(checkoutPolicy({ ...base, configuredPriceId: "" }).ok).toBe(false);
  });
  test("missing line item price id fails closed", () => {
    expect(checkoutPolicy({ ...base, lineItemPriceId: null }).ok).toBe(false);
  });
});
