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
});