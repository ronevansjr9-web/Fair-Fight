import { describe, expect, test } from "bun:test";
import { checkoutReturnUrls, getPublicOrigin, paymentFromCheckoutSession } from "./payment";

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
  test("only paid, case-bound sessions become records", () => {
    const base = { id: "cs_1", payment_status: "paid", metadata: { userId: "u1", caseId: "c1" }, amount_total: 9900, currency: "usd", payment_intent: "pi_1" } as any;
    expect(paymentFromCheckoutSession(base)?.caseId).toBe("c1");
    expect(paymentFromCheckoutSession({ ...base, payment_status: "unpaid" })).toBeNull();
    expect(paymentFromCheckoutSession({ ...base, metadata: { userId: "u1" } })).toBeNull();
  });
});
