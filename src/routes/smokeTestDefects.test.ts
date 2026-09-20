import { describe, expect, it } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const siteRoot = resolve(import.meta.dir, "../..");

/**
 * Regression tests for the live browser-smoke-test defects.
 *
 * These assert the shipped contract of each fix at the source level (fast,
 * no SSR/DB), complementing the browser-level verification performed on the
 * deployed site:
 *
 * 1. /learn/<slug> rendered the guides INDEX body (guide <title> over index
 *    h1) because `learn/$slug.tsx` is a child of `learn.tsx` and the parent
 *    rendered no <Outlet/>. Fix: `/learn` is now a layout that renders
 *    <Outlet/>, and the index UI (incl. the legacy ?article= redirect) lives
 *    in `learn/index.tsx`.
 * 2. /dashboard GET server fn returned empty data for an authenticated user
 *    (GET transport does not carry the Clerk session through getCurrentAuth
 *    in this runtime). Fix: getDashboardData is a POST fn.
 * 3. Case-creation submit silently swallowed failures (no navigation, no
 *    error UI). Fix: try/catch + explicit error UI + finally reset.
 */
describe("smoke-test defect regression contracts", () => {
  it("learn.tsx is a layout that renders <Outlet/> (defect 3)", () => {
    const learn = readFileSync(resolve(siteRoot, "src/routes/learn.tsx"), "utf8");
    expect(learn).toContain('createFileRoute("/learn")');
    expect(learn).toContain("Outlet");
    // The index UI must no longer live in the parent route.
    expect(learn).not.toContain("Public Legal Education Guides");
  });

  it("learn/index.tsx holds the index UI and legacy ?article redirect (defect 3)", () => {
    const index = readFileSync(resolve(siteRoot, "src/routes/learn/index.tsx"), "utf8");
    expect(index).toContain('createFileRoute("/learn/")');
    expect(index).toContain("Public Legal Education Guides");
    expect(index).toContain('to="/learn/$slug"');
    expect(index).toContain("Navigate");
  });

  it("learn/$slug guide route still exists (defect 3)", () => {
    expect(existsSync(resolve(siteRoot, "src/routes/learn/$slug.tsx"))).toBe(true);
  });

  it("dashboard data fn is POST, not GET (defect 2)", () => {
    const dashboard = readFileSync(resolve(siteRoot, "src/routes/dashboard.tsx"), "utf8");
    expect(dashboard).toContain('createServerFn({ method: "POST" })');
    expect(dashboard).not.toContain('createServerFn({ method: "GET" })');
  });

  it("case creation submit surfaces errors and always resets (defect 1)", () => {
    const newCase = readFileSync(resolve(siteRoot, "src/routes/cases/new.tsx"), "utf8");
    expect(newCase).toContain("try {");
    expect(newCase).toContain("result?.success && result.caseId");
    expect(newCase).toContain("catch (err)");
    expect(newCase).toContain("finally {");
    expect(newCase).toContain("Could not reach the server");
    // The authorized response path still navigates to the new case.
    expect(newCase).toContain('to: "/cases/$caseId"');
  });
  it("createCase authenticates FIRST, before validating (defect 1 root fix)", () => {
    const newCase = readFileSync(resolve(siteRoot, "src/routes/cases/new.tsx"), "utf8");
    // The auth gate MUST run before any payload processing, so an
    // unauthenticated createCase refuses even when the payload is invalid.
    const handlerStart = newCase.indexOf(".handler(async");
    const authCall = newCase.indexOf("const auth = await getCurrentAuth();", handlerStart);
    const refuse = newCase.indexOf('return { error: "Sign in required" };', handlerStart);
    const validate = newCase.indexOf("parseCreateCaseInput(data)", handlerStart);
    // no `.validator(` at all — validator-compiled POST fns lose the request
    // lifecycle that getCurrentAuth() needs (production-verified defect 1).
    expect(newCase).not.toMatch(/createServerFn\([^)]*\)\s*\.validator/);
    expect(handlerStart).toBeGreaterThan(-1);
    expect(authCall).toBeGreaterThan(-1);
    expect(refuse).toBeGreaterThan(-1);
    expect(validate).toBeGreaterThan(-1);
    expect(authCall).toBeLessThan(validate);
    expect(refuse).toBeLessThan(validate);
  });
  it("getCase is a no-validator POST fn, auth-gates first, stays ownership-scoped (hard-load /cases/$caseId fails closed otherwise)", () => {
    const caseDetail = readFileSync(resolve(siteRoot, "src/routes/cases/$caseId.tsx"), "utf8");
    // no `.validator(` — validator-compiled POST fns lose the request lifecycle
    // that getCurrentAuth() needs (same root cause as createCase, PR #46).
    expect(caseDetail).not.toMatch(/createServerFn\([^)]*\)\s*\.validator/);
    const handlerStart = caseDetail.indexOf("const getCase = createServerFn");
    const authCall = caseDetail.indexOf("const auth = await getCurrentAuth();", handlerStart);
    const parse = caseDetail.indexOf("parseCaseIdInput(data)", handlerStart);
    const ownerWhere = caseDetail.indexOf("WHERE id = ${caseId} AND user_id = ${auth.userId}", handlerStart);
    expect(handlerStart).toBeGreaterThan(-1);
    expect(authCall).toBeGreaterThan(-1);
    expect(parse).toBeGreaterThan(-1);
    expect(ownerWhere).toBeGreaterThan(-1);
    // Auth gate runs BEFORE per-field validation and the ownership-scoped query
    // is intact — a hard load of a case the session does not own must fail
    // closed (not-found UI), never leak another user's case.
    expect(authCall).toBeLessThan(parse);
    expect(parse).toBeLessThan(ownerWhere);
  });
  it("analysis server fns are no-validator POST fns, auth-gate first (fix: /analysis?caseId= fetch + generation + checkout)", () => {
    const analysis = readFileSync(resolve(siteRoot, "src/routes/analysis.tsx"), "utf8");
    expect(analysis).not.toMatch(/createServerFn\([^)]*\)\s*\.validator/);
    // getAnalysisStatus: auth-gate before parsing, exact ownership scope, and
    // the honest unpaid state per case.
    const statusStart = analysis.indexOf("const getAnalysisStatus = createServerFn");
    const statusAuth = analysis.indexOf("const auth = await getCurrentAuth();", statusStart);
    const statusParse = analysis.indexOf("parseAnalysisCaseId(data)", statusStart);
    expect(statusStart).toBeGreaterThan(-1);
    expect(statusAuth).toBeGreaterThan(-1);
    expect(statusParse).toBeGreaterThan(-1);
    expect(statusAuth).toBeLessThan(statusParse);
    expect(analysis.indexOf("isCaseOwner(auth.userId, caseId)", statusStart)).toBeGreaterThan(-1);
    expect(analysis).toContain("entitled: false");
    // runAnalysis: auth-gate before validation, exact ownership + entitlement
    // enforced server-side before any generation.
    const runStart = analysis.indexOf("const runAnalysis = createServerFn");
    const runAuth = analysis.indexOf("const auth = await getCurrentAuth();", runStart);
    const runParse = analysis.indexOf("parseRunAnalysisInput(data)", runStart);
    expect(runStart).toBeGreaterThan(-1);
    expect(runAuth).toBeGreaterThan(-1);
    expect(runParse).toBeGreaterThan(-1);
    expect(runAuth).toBeLessThan(runParse);
    expect(analysis.indexOf("hasOwnedCaseEntitlement(auth.userId, input.caseId)", runStart)).toBeGreaterThan(runParse);
    // startCheckout: auth-gate before caseId validation.
    const checkoutStart = analysis.indexOf("const startCheckout = createServerFn");
    const checkoutAuth = analysis.indexOf("const auth = await getCurrentAuth();", checkoutStart);
    const checkoutParse = analysis.indexOf("parseAnalysisCaseId(data)", checkoutStart);
    expect(checkoutStart).toBeGreaterThan(-1);
    expect(checkoutAuth).toBeGreaterThan(-1);
    expect(checkoutParse).toBeGreaterThan(-1);
    expect(checkoutAuth).toBeLessThan(checkoutParse);
  });
  it("analysis page keeps the honest $99 unpaid purchase CTA (fail-closed for unpaid, working fetch for the owner's case)", () => {
    const analysis = readFileSync(resolve(siteRoot, "src/routes/analysis.tsx"), "utf8");
    expect(analysis).toContain("Unlock Case Analysis — $99 one-time");
    expect(analysis).toContain("Unlock for $99");
    // getAnalysisStatus must distinguish "not yours" from "yours but unpaid".
    expect(analysis).toContain("{ ok: true; entitled: false; caseTitle: string }");
  });
  it("dashboard fetch is gated on Clerk auth readiness + retries once on unauthorized (hard-load token race)", () => {
    const dashboard = readFileSync(resolve(siteRoot, "src/routes/dashboard.tsx"), "utf8");
    // The client must wait for auth to resolve before the effect fires any
    // authed fetch (previously it fired unconditionally on mount).
    expect(dashboard).toContain("useAuth()");
    expect(dashboard).toContain("auth.isSignedIn !== true");
    // The session token is force-refreshed before/on unauthorized, and the retry
    // happens exactly once via the shared gate.
    expect(dashboard).toContain("fetchAuthedData");
    expect(dashboard).toContain("getToken: auth.getToken");
    expect(dashboard).toContain('reason === "unauthorized"');
    // Server side: the auth gate runs first and still refuses unauthenticated
    // requests, but now with an explicit signal instead of a lossy empty dataset
    // (audit §3.1) so the client can distinguish the race from a real empty
    // dashboard.
    expect(dashboard).toContain('return { ok: false, reason: "unauthorized" };');
    expect(dashboard).toContain('return { ok: false, reason: "unavailable" };');
  });
  it("case detail fetch gets the same auth gate + retry-once-on-unauthorized (hard-load token race)", () => {
    const caseDetail = readFileSync(resolve(siteRoot, "src/routes/cases/$caseId.tsx"), "utf8");
    // No fetch may fire while Clerk auth is hydrating/signed out…
    expect(caseDetail).toContain("shouldFetchForSignedInUser(auth.isSignedIn)");
    // …and a stale/expired __session JWT on a hard load must not strand the
    // user on "Case Not Found": token refresh + exactly one retry via the gate.
    expect(caseDetail).toContain("fetchAuthedData");
    expect(caseDetail).toContain("getToken: auth.getToken");
    expect(caseDetail).toContain('!result.ok && result.reason === "unauthorized"');
  });
  it("analysis initial getAnalysisStatus fetch is gated + retries once on unauthorized (its $99 CTA depends on it)", () => {
    const analysis = readFileSync(resolve(siteRoot, "src/routes/analysis.tsx"), "utf8");
    expect(analysis).toContain("shouldFetchForSignedInUser(auth.isSignedIn)");
    expect(analysis).toContain("fetchAuthedData");
    expect(analysis).toContain("getToken: auth.getToken");
    expect(analysis).toContain('result.reason === "unauthorized"');
    // SPA refresh keeps working (manual retry path is untouched).
    expect(analysis).toContain("const refresh = () => {");
  });
  it("evidence initial listEvidence fetch is gated + retries once on unauthorized (hard-load token race)", () => {
    const evidence = readFileSync(resolve(siteRoot, "src/routes/evidence.tsx"), "utf8");
    // No fetch may fire while Clerk auth is hydrating/signed out…
    expect(evidence).toContain("useAuth()");
    expect(evidence).toContain("auth.isSignedIn !== true");
    // …and a stale/expired __session JWT on a hard load must not strand the
    // user on a false "Sign in required." for ~60s: the shared gate
    // force-refreshes the token and retries exactly once, keyed on the
    // evidence server fn's own unauthorized signal (EVIDENCE_ERRORS.signIn).
    expect(evidence).toContain("fetchAuthedData");
    expect(evidence).toContain("getToken: auth.getToken");
    expect(evidence).toContain('result.error === EVIDENCE_ERRORS.signIn');
  });
  it("referral feature surface is fully removed (honesty backlog: no referral_codes table)", () => {
    expect(existsSync(resolve(siteRoot, "src/components/ReferralCard.tsx"))).toBe(false);
    expect(existsSync(resolve(siteRoot, "src/lib/referral.ts"))).toBe(false);
    const dashboard = readFileSync(resolve(siteRoot, "src/routes/dashboard.tsx"), "utf8");
    expect(dashboard).not.toContain("ReferralCard");
    expect(dashboard).not.toContain("/** Referral */");
    const index = readFileSync(resolve(siteRoot, "src/routes/index.tsx"), "utf8");
    expect(index).not.toContain("~/lib/referral");
    const deleteData = readFileSync(
      resolve(siteRoot, "src/routes/api/user/delete-data.ts"),
      "utf8",
    );
    expect(deleteData).not.toContain("referral_codes");
    expect(deleteData).not.toContain("referral_tracking");
  });
  it("auth-debug logging is env-gated (silent by default) and the nbf-wait is bounded (PR#49)", () => {
    const auth = readFileSync(resolve(siteRoot, "src/lib/auth.ts"), "utf8");
    expect(auth).toContain('process.env.FF_AUTH_DEBUG === "1"');
    expect(auth).toContain("session-token-nbf");
    expect(auth).toContain("60_000");
    // Strip the FF_AUTH_DEBUG-gated blocks; no [auth-debug] output may remain.
    let stripped = auth;
    const gateRe = /if \(process\.env\.FF_AUTH_DEBUG === "1"\) \{/g;
    let m: RegExpExecArray | null;
    while ((m = gateRe.exec(auth)) !== null) {
      let depth = 0;
      let end = m.index;
      for (; end < auth.length; end++) {
        if (auth[end] === "{") depth++;
        else if (auth[end] === "}") {
          depth--;
          if (depth === 0) break;
        }
      }
      stripped = stripped.replace(auth.slice(m.index, end + 1), "");
    }
    expect(stripped).not.toContain("[auth-debug]");
  });
  it("user-facing copy has no stale 'payments not running' or analysis-overpromise strings (honesty audit batch 2)", () => {
    const privacy = readFileSync(resolve(siteRoot, "src/routes/privacy.tsx"), "utf8");
    const root = readFileSync(resolve(siteRoot, "src/routes/__root.tsx"), "utf8");
    const email = readFileSync(resolve(siteRoot, "src/lib/email.ts"), "utf8");
    for (const src of [privacy, root, email]) {
      // Payments are LIVE ($99 checkout open): no copy may claim they are not
      // running or imply access is still gated.
      expect(src).not.toContain("not currently accepting payments");
      expect(src).not.toContain("when payment access is enabled");
      expect(src).not.toContain("paid features resume");
      // The analysis deliverable is summary/issues/arguments/counterarguments/
      // sources — never "practical next steps" or "smart questions".
      expect(src).not.toContain("practical next steps");
      expect(src).not.toContain("Practical next steps");
      expect(src).not.toContain("smart questions");
      expect(src).not.toContain("Smart questions");
    }
    // Truthful replacements are present.
    expect(privacy).toContain("Payments are processed by Stripe");
    expect(privacy).toContain("refund request");
    expect(email).toContain("Plain-English summary of your situation");
    // The root's sitewide FAQPage block was removed (owner directive 09-20,
    // Deliverable 3 — its questions were not visibly rendered on any page),
    // so the truthful deliverable description now lives on the homepage.
    expect(root).toContain("paid Pro Case Analysis");
    expect(root).not.toContain("FAQPage");
    const home = readFileSync(resolve(siteRoot, "src/routes/index.tsx"), "utf8");
    expect(home).toContain("plain-English summary,");
    expect(home).toContain("possible issues, candidate arguments, counterarguments, and traceable public sources");
  });
  it("dashboard renders a neutral state on entitlement-lookup error, never the Unlock CTA (honesty audit batch 2)", () => {
    const dashboard = readFileSync(resolve(siteRoot, "src/routes/dashboard.tsx"), "utf8");
    // The result shape must distinguish "lookup failed" (error) from
    // "definitively not entitled" (ok) so an entitled case can never see a
    // purchase CTA because the entitlement query errored.
    expect(dashboard).toContain('entitlementStatus: "ok" | "error"');
    expect(dashboard).toContain('entitlementStatus = "ok"');
    expect(dashboard).toContain("Unable to verify analysis access");
    // The neutral error state must render before (guard) the Unlock CTA.
    const neutralIdx = dashboard.indexOf("Unable to verify analysis access");
    const ctaIdx = dashboard.indexOf("Unlock $99");
    expect(neutralIdx).toBeGreaterThan(-1);
    expect(ctaIdx).toBeGreaterThan(neutralIdx);
  });

});

describe("admin dashboard honesty contracts (Wave 2)", () => {
  const admin = readFileSync(resolve(siteRoot, "src/routes/admin.tsx"), "utf8");
  it("getAdminStats is a POST fn, not GET (GET transport loses the Clerk session in this runtime)", () => {
    expect(admin).toContain('createServerFn({ method: "POST" })');
    expect(admin).not.toContain('createServerFn({ method: "GET" })');
  });
  it("no-validator POST fn (validator-compiled POST fns lose the request lifecycle getCurrentAuth() needs)", () => {
    expect(admin).not.toMatch(/createServerFn\([^)]*\)\s*\.validator/);
  });
  it("allowlist contract: ADMIN_IDS is derived from process.env.ADMIN_CLERK_IDS, comma-separated, trimmed", () => {
    expect(admin).toContain("process.env.ADMIN_CLERK_IDS");
    expect(admin).toContain('.split(",")');
    expect(admin).toContain(".map((s) => s.trim())");
    expect(admin).toContain(".filter(Boolean)");
  });
  it("auth + allowlist gate runs BEFORE any DB query; unauthorized returns {authorized:false} ONLY", () => {
    const handlerStart = admin.indexOf(".handler(async");
    const authCall = admin.indexOf("const auth = await getCurrentAuth();", handlerStart);
    const allowlistGate = admin.indexOf("!ADMIN_IDS.includes(auth.userId)", handlerStart);
    const unauthorizedReturn = admin.indexOf("return { authorized: false };", handlerStart);
    const sqlCall = admin.indexOf("await sql()", handlerStart);
    expect(handlerStart).toBeGreaterThan(-1);
    expect(authCall).toBeGreaterThan(-1);
    expect(allowlistGate).toBeGreaterThan(-1);
    expect(unauthorizedReturn).toBeGreaterThan(-1);
    // Auth gate first, then the allowlist check, then any query work.
    expect(unauthorizedReturn).toBeLessThan(sqlCall);
    expect(authCall).toBeLessThan(sqlCall);
  });
  it("queries real existing tables only — no users table, no fabricated emails", () => {
    expect(admin).not.toContain("FROM users");
    expect(admin).not.toContain(".email");
    expect(admin).not.toContain("recentUsers");
    expect(admin).toContain("FROM cases");
    expect(admin).toContain("COUNT(DISTINCT user_id)");
    expect(admin).toContain("FROM case_analyses ca");
    expect(admin).toContain("JOIN cases c ON c.id = ca.case_id");
    // The derived-from-cases list is honestly labeled in the UI.
    expect(admin).toContain("Derived from the 10 most recent cases");
    expect(admin).toContain("no users table");
  });
  it("authorized DB failure returns an explicit unavailable state — NEVER zero counts", () => {
    expect(admin).toContain('reason: "unavailable"');
    expect(admin).toContain("ok: true");
    // The client renders the error state instead of zeroes.
    expect(admin).toContain("Admin dashboard unavailable");
    expect(admin).toContain("No data is shown rather than misleading");
  });
  it("client uses fetchAuthedData with the { data: ... } payload and retries once on unauthorized", () => {
    expect(admin).toContain("fetchAuthedData");
    expect(admin).toMatch(/getAdminStats\(\{\s*data:\s*\{\}\s*\}\)/);
    expect(admin).toContain("isUnauthorized: (r) => !r.authorized");
  });
});

describe("Wave 4: evidence uploads (ownership + limits + honest copy)", () => {
  const evidence = readFileSync(resolve(siteRoot, "src/lib/evidence.ts"), "utf8");
  const validation = readFileSync(resolve(siteRoot, "src/lib/evidenceValidation.ts"), "utf8");
  const page = readFileSync(resolve(siteRoot, "src/routes/evidence.tsx"), "utf8");

  it("evidence server fns are no-validator POST fns (PR #46 lifecycle lesson)", () => {
    expect(evidence).toContain('export const listEvidence = createServerFn({ method: "POST" })');
    expect(evidence).toContain('export const uploadEvidence = createServerFn({ method: "POST" })');
    expect(evidence).toContain('export const deleteEvidence = createServerFn({ method: "POST" })');
    expect(evidence).toContain('export const downloadEvidence = createServerFn({ method: "POST" })');
    expect(evidence).not.toMatch(/createServerFn\([^)]*\)\s*\.validator/);
  });

  it("every handler auth-gates first, then parses, then queries (signed-out rejected)", () => {
    for (const fn of ["listEvidence", "uploadEvidence", "deleteEvidence", "downloadEvidence"]) {
      const start = evidence.indexOf(`export const ${fn} = createServerFn`);
      const authCall = evidence.indexOf("const auth = await getCurrentAuth();", start);
      const parse = evidence.indexOf("parseEvidenceCaseId(data)", start);
      const sqlCall = evidence.indexOf("await sql()", start);
      expect(authCall, `${fn} auth`).toBeGreaterThan(-1);
      expect(parse, `${fn} parse`).toBeGreaterThan(-1);
      expect(authCall).toBeLessThan(parse);
      if (sqlCall > -1) expect(authCall).toBeLessThan(sqlCall);
    }
  });

  it("ownership is enforced server-side via cases.user_id joins on every query", () => {
    // List + download: JOIN cases c ON c.id = e.case_id ... c.user_id.
    expect(evidence).toContain("JOIN cases c ON c.id = e.case_id");
    expect(evidence).toContain("c.user_id = ${auth.userId}");
    // Upload: only inserts when the case belongs to the session user.
    expect(evidence).toContain("WHERE EXISTS (SELECT 1 FROM cases WHERE id = ${caseId} AND user_id = ${auth.userId})");
    // Delete: DELETE ... USING cases c WHERE ... c.user_id = ${auth.userId}.
    expect(evidence).toContain("DELETE FROM evidence_files e");
    expect(evidence).toContain("USING cases c");
    expect(evidence).toContain("c.user_id = ${auth.userId}");
  });

  it("limits match the spec: 10 MB cap and the five allowed types, enforced server-side", () => {
    expect(validation).toContain("10 * 1024 * 1024");
    expect(validation).toContain('"application/pdf"');
    expect(validation).toContain('"image/jpeg"');
    expect(validation).toContain('"image/png"');
    expect(validation).toContain('"image/webp"');
    expect(validation).toContain('"text/plain"');
    expect(validation).not.toContain("image/gif");
    expect(validation).not.toContain("image/svg");
    // The size is computed from the DECODED payload, never trusted from client.
    expect(validation).toContain("base64DecodedLength");
    expect(validation).toContain("sizeBytes > MAX_EVIDENCE_FILE_SIZE");
    // The upload handler stores the decoded bytes as bytea and rejects
    // non-owned cases with a specific error (never a generic failure).
    expect(evidence).toContain("decode(${valid.dataBase64}, 'base64')");
    expect(evidence).not.toContain("Upload failed. Please try again.");
  });

  it("page copy states the limits, ownership context, and educational-only framing — no overclaims", () => {
    expect(page).toContain("10 MB");
    expect(page).toContain("your case workspace");
    expect(page).toContain("educational tooling, not secure legal-grade evidence preservation");
    expect(page).toContain("not legal advice");
    expect(page).toContain("type=\"file\"");
    expect(page).toContain("window.confirm"); // delete requires confirmation
    expect(page).not.toContain("temporarily unavailable");
    expect(page).not.toContain("Files are stored securely");
  });
});
