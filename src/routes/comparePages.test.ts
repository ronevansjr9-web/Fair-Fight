import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const siteRoot = resolve(import.meta.dir, "../..");
const read = (p: string) => readFileSync(resolve(siteRoot, p), "utf8");

/**
 * Guardrails for the two comparison landing pages (owner directive 09-20),
 * built from /home/team/shared/marketing/comparison-fact-pack.md (2026-09-20).
 *
 * The tests are source-level (fast, no SSR/DB) and enforce:
 *  - route existence + H1/head content (canonical, title, description)
 *  - honest-posture guardrails: no affirmative guarantees, no outcome
 *    promises, no attorney rate figures (vs-attorney page), no banned
 *    DoNotPay review-figure prices, no internal-only Fair Fight items.
 *
 * Source files wrap JSX text across lines and use HTML entities (&apos;,
 * &ldquo;, &hellip;), so content assertions run against a normalized
 * "flat" copy (entities decoded, whitespace collapsed) unless the assertion
 * is specifically about raw tokens.
 */
const flat = (s: string) =>
  s
    .replace(/&apos;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("comparison pages: fair-fight-vs-hiring-an-attorney", () => {
  const src = read("./src/routes/compare/fair-fight-vs-hiring-an-attorney.tsx");
  const f = flat(src);

  it("route exists with the correct path and an H1", () => {
    expect(src).toContain('createFileRoute("/compare/fair-fight-vs-hiring-an-attorney")');
    expect(src).toContain("CompareAttorneyPage");
    expect(f).toMatch(/<h1[^>]*> Fair Fight vs\. Hiring an Attorney/);
  });

  it("head: canonical URL + title + description + og:url", () => {
    expect(src).toContain('links: [{ rel: "canonical", href: CANONICAL }]');
    expect(src).toContain("https://fairfight.ctonew.app");
    expect(src).toContain("/compare/fair-fight-vs-hiring-an-attorney");
    expect(src).toContain("Fair Fight vs. Hiring an Attorney: Cost, Privilege, and When You Need a Lawyer | Fair Fight");
    expect(f.toLowerCase()).toContain("one-time $99");
    expect(f.toLowerCase()).toContain("not legal advice");
  });

  it("cost rules: attorney pricing is qualitative only (no hourly or flat-fee figures)", () => {
    // The permitted qualitative phrases from fact pack §2.1/§2.3 must appear.
    expect(f).toMatch(/commonly billed hourly/i);
    expect(f).toMatch(/rates vary widely by practice area, experience, and location/i);
    expect(f).toMatch(/flat fees for routine matters/i);
    // No hourly-rate figures ("$X per hour", "$X/hr") anywhere.
    expect(src).not.toMatch(/\$\d[\d,.]*\s*(per hour|\/hour|\/hr)/i);
    // No rate ranges ("$X–$Y", "$X to $Y").
    expect(src).not.toMatch(/\$\d[\d,.]*\s*(–|—|-|to)\s*\$[\d]/);
  });

  it("cost rules: the only real numbers are the two cited filing-fee components, always with both citations adjacent", () => {
    expect(src).toContain("$350");
    expect(src).toContain("$55");
    // Both citations must appear near the figures.
    expect(src).toContain("28 U.S.C. § 1914(a)");
    expect(src).toContain("uscode.house.gov");
    expect(src).toContain("December 1, 2023");
    expect(src).toContain("uscourts.gov");
    // No bare "$405": the only "$405" mention must sit inside the citing
    // paragraph, with both citations in its immediate context.
    const idx405 = f.indexOf("$405");
    expect(idx405).toBeGreaterThan(-1);
    const before = f.slice(Math.max(0, idx405 - 600), idx405);
    expect(before).toMatch(/28 U.S.C\. § 1914\(a\)/);
    expect(before).toMatch(/December 1, 2023/);
  });

  it("honesty content: attorney-client privilege cited verbatim (Cornell LII)", () => {
    expect(f).toContain(
      "Attorney-client privilege protects confidential communications between a lawyer and their client that relate to the client's seeking of legal advice or services"
    );
    expect(src).toContain("law.cornell.edu/wex/attorney-client_privilege");
  });

  it("honesty content: U.S. Courts prohibitions on court staff / non-attorney preparers cited, with scope framing", () => {
    expect(f.toLowerCase()).toContain(
      "court employees and bankruptcy judges are prohibited by law from offering legal advice"
    );
    expect(f.toLowerCase()).toContain(
      "prohibited from providing legal advice, explaining answers to legal questions, or assisting you in bankruptcy court"
    );
    expect(f).toMatch(/authoritative federal example/i);
    expect(src).toContain("filing-without-an-attorney");
  });

  it("honesty content: when an attorney is strongly recommended (complex cases / jail exposure)", () => {
    expect(f).toMatch(
      /for complex cases or cases involving potential jail exposure, an attorney is strongly recommended/i
    );
  });

  it("honesty content: what Fair Fight is NOT", () => {
    expect(f).toContain("Not a law firm, and it does not provide legal advice");
    expect(f).toContain("no outcome guarantees");
    expect(f).toMatch(/not filing-ready documents/);
    expect(f).toMatch(/not secure legal-grade evidence preservation/);
  });

  it("no guarantee/outcome language (no affirmative promises)", () => {
    expect(f).not.toMatch(/\bguarantee\w*\s+(to\s+)?(win|success|result|outcome|recovery|victory)/i);
    expect(f).not.toMatch(/\bwin\s+(your\s+)?case\b/i);
    expect(f).not.toMatch(/lawyer-grade/i);
  });

  it("no user counts, testimonials, or revenue claims", () => {
    expect(f).not.toMatch(/(\d+,?\d*)\s+(users|people|clients)\s+(use|trust|joined)/i);
    expect(f).not.toMatch(/testimonial/i);
    expect(f).not.toMatch(/(trusted by|rated \d|revenue|raised \$)/i);
  });
});

describe("comparison pages: fair-fight-vs-donotpay", () => {
  const src = read("./src/routes/compare/fair-fight-vs-donotpay.tsx");
  const f = flat(src);

  it("route exists with the correct path and an H1", () => {
    expect(src).toContain('createFileRoute("/compare/fair-fight-vs-donotpay")');
    expect(src).toContain("CompareDoNotPayPage");
    expect(f).toMatch(/<h1[^>]*> Fair Fight vs\. DoNotPay/);
  });

  it("head: canonical URL + title + description", () => {
    expect(src).toContain('links: [{ rel: "canonical", href: CANONICAL }]');
    expect(src).toContain("https://fairfight.ctonew.app");
    expect(src).toContain("/compare/fair-fight-vs-donotpay");
    expect(src).toContain("Fair Fight vs. DoNotPay: $99 One-Time vs. $36.00 Every 2 Months | Fair Fight");
    expect(f.toLowerCase()).toContain("not legal advice");
  });

  it("price contrast uses vendor-published figures only, dated", () => {
    expect(f.toLowerCase()).toContain("one-time $99 purchase per case");
    expect(f).toContain("$36.00 every 2 months");
    expect(f).toContain("renews automatically");
    expect(f).toContain("accessed September 20, 2026");
    // Verify-current-pricing note present (competitor pricing changes).
    expect(f).toMatch(/verify the current price/i);
    expect(f).toMatch(/prices and plans change/i);
  });

  it("banned user-review prices are absent", () => {
    expect(src).not.toMatch(/\$12\s*\/\s*month/i);
    expect(src).not.toMatch(/\$3\s*\/\s*month/i);
    expect(src).not.toMatch(/\$36\s*\/\s*3\s*months/i);
    expect(src).not.toContain("$35.99");
  });

  it("DoNotPay claims appear only as attributed quotes, with no quality/outcome characterization", () => {
    expect(f).toContain("The AI that fights for you");
    expect(f).toContain("100+ AI-powered tools");
    // Every claim is marked as DoNotPay's own words.
    expect(f).toContain("DoNotPay (their own published words)");
    expect(f).toMatch(/from its own website and app listings/i);
    // No editorializing about DoNotPay's quality/trustworthiness.
    expect(f).not.toMatch(/(DoNotPay( is|'s)[^.]{0,80}(scam|predatory|untrustworthy|dishonest|fraud))/i);
    expect(f).not.toMatch(/does nothing/i);
  });

  it("DoNotPay 'what it cannot do' uses their TOS words, attributed", () => {
    expect(f).toContain("DoNotPay is not a law firm and does not provide legal advice");
    expect(f).toContain("does not constitute advice");
    expect(f).toContain("apply the law to the facts of your situation");
    expect(f).toContain("may not be protected under the attorney-client privilege doctrine");
    expect(f).toContain("April 20, 2024");
  });

  it("Fair Fight side uses public homepage copy only (no internal-only items)", () => {
    expect(src).not.toContain("price_1U7vdQ86HQsHVK1cAePFgz0u");
    expect(src).not.toMatch(/10 ?MB/i);
    expect(src).not.toMatch(/5 (file|MIME) types?/i);
    // "Evidence upload" generically at most — no export/delete mechanics.
    expect(f.toLowerCase()).toContain("evidence upload");
    // Guardrail applies to the page COPY, not the module's JS syntax (the
    // file necessarily contains "export const Route" to declare the route).
    const body = src.slice(src.indexOf("function CompareDoNotPayPage"));
    expect(body).not.toMatch(/\bexport\b/i);
    expect(body).not.toMatch(/\bdelete\b/i);
  });

  it("no guarantee/outcome language about either product", () => {
    expect(f).not.toMatch(/\bguarantee\w*\s+(to\s+)?(win|success|result|outcome|recovery|victory)/i);
    expect(f).not.toMatch(/\bwin\s+(your\s+)?case\b/i);
  });
});