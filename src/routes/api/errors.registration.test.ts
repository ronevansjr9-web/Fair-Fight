import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression test for the /api/errors route registration — the Wave 5 lesson
 * (commit 400df6e): TanStack Start only mounts a server handler when the
 * route file declares it via `createFileRoute(...)({ server: { handlers: {
 * POST } } })`. A bare `export async function POST` passes direct-handler
 * unit tests but never mounts in production and 404s (exactly what happened
 * to /api/user/export-data before 400df6e).
 *
 * This is a source-level contract check (fast, hermetic, no SSR/DB) modeled
 * on the existing src/routes/smokeTestDefects.test.ts precedent: it fails
 * the moment someone reverts the endpoint to a bare POST or changes the
 * registered path. The full build-time catch is routeTree.gen.ts
 * (regenerated on every `vite build`, currently gitignored) containing the
 * "/api/errors" route — verified manually at build.
 */
const siteRoot = resolve(import.meta.dir, "../../..");

describe("/api/errors route registration contract", () => {
  const source = readFileSync(
    resolve(siteRoot, "src/routes/api/errors.ts"),
    "utf8",
  );

  test("the endpoint file registers via createFileRoute with the exact path", () => {
    expect(source).toContain('createFileRoute("/api/errors")');
  });

  test("the POST server handler is wired in the createFileRoute options", () => {
    // Guards the Wave 5 failure mode: handler exists as a bare export but the
    // route options do not declare it (never mounted in production).
    expect(source).toContain("server: { handlers: { POST:");
  });

  test("the bare POST handler is still exercised by the direct-handler tests", () => {
    expect(source).toContain("async function handlePost(");
  });
});