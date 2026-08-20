/**
 * Regression guard: Clerk `getAuth` MUST receive the actual Request.
 *
 * Framework evidence (installed node_modules, not docs):
 * - `src/lib/auth.ts` authenticates via `@clerk/backend` `authenticateRequest`
 *   (no Vinxi / `@clerk/tanstack-start/server`); its `getCurrentAuth` MUST be
 *   given the actual Request, either pulled from the request lifecycle via
 *   `getRequest()` (server fn handlers) or passed explicitly (API routes).
 * - TanStack Start server-fn handlers receive a `ServerFnCtx` with
 *   `{ data, serverFnMeta, context, method }` — there is NO Request on it.
 *
 * This test statically scans `src` and fails if any direct `getAuth(...)` call
 * exists outside the single helper `src/lib/auth.ts`, or if any code reads
 * `auth.user` (AuthObject has no `user` property — the old code silently
 * passed empty emails because of it). It does not import React/TanStack
 * modules, so it runs under bun's built-in test runner.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = `${dir}/${entry}`;
    const st = statSync(p);
    if (st.isDirectory()) {
      files.push(...collectSourceFiles(p));
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !entry.endsWith(".gen.ts") &&
      !entry.endsWith(".test.ts")
    ) {
      files.push(p);
    }
  }
  return files;
}

describe("Clerk getAuth request-context regression guard", () => {
  const files = collectSourceFiles(SRC_DIR);
  const authHelper = files.find((f) => f.endsWith("/lib/auth.ts"));
  const otherFiles = files.filter((f) => f !== authHelper);

  test("every direct getAuth(...) call lives only in src/lib/auth.ts", () => {
    const violations: string[] = [];
    const callRe = /\bgetAuth\s*\(/g;
    for (const file of otherFiles) {
      const content = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      while ((m = callRe.exec(content)) !== null) {
        violations.push(`${file}:${lineAt(content, m.index)} direct getAuth() call`);
      }
    }
    expect(violations).toEqual([]);
  });

  test("src/lib/auth.ts passes the Request (request ?? getRequest()) to Clerk auth", () => {
    expect(authHelper, "src/lib/auth.ts must exist").toBeTruthy();
    const raw = readFileSync(authHelper!, "utf8");
    // Strip comments so documentation of the API shape is not scanned as code.
    const content = raw
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*)/.test(l))
      .join("\n");
    // Auth is resolved via @clerk/backend authenticateRequest (no Vinxi event
    // context / legacy getAuth). The actual Request is normalized once via
    // `request ?? getRequest()` and passed into authenticateRequest.
    expect(
      /request\s*\?\?\s*getRequest\(\)/.test(content),
      "getCurrentAuth must pull the actual Request via request ?? getRequest()",
    ).toBe(true);
    expect(
      /\bauthenticateRequest\s*\(\s*req\b/.test(content),
      "getCurrentAuth must pass the Request to @clerk/backend authenticateRequest",
    ).toBe(true);
  });

  test("no code reads auth.user (AuthObject has no user property)", () => {
    const violations: string[] = [];
    // Catches `auth.user?.x`, `auth.user.x`, `auth.user)`, etc. — but NOT
    // `auth.userId` (the valid property).
    const authUserRe = /auth\.user(?!Id)/g;
    for (const file of otherFiles) {
      const content = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      while ((m = authUserRe.exec(content)) !== null) {
        violations.push(`${file}:${lineAt(content, m.index)} reads auth.user`);
      }
    }
    expect(violations).toEqual([]);
  });

  test("API route handlers pass their request to getCurrentAuth(request)", () => {
    const violations: string[] = [];
    const apiRe = /api[\\/]/;
    for (const file of files.filter((f) => apiRe.test(f))) {
      const content = readFileSync(file, "utf8");
      const callRe = /getCurrentAuth\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = callRe.exec(content)) !== null) {
        const args = extractArgs(content, m.index + m[0].lastIndexOf("(")).trim();
        if (args !== "request") {
          violations.push(`${file}:${lineAt(content, m.index)} getCurrentAuth(${args}) — API routes must pass the handler's request`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

function lineAt(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

/** Extract the argument text of a `name(...)` call, handling nested parens and newlines. */
function extractArgs(text: string, openParenIndex: number): string {
  let depth = 0;
  for (let i = openParenIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(openParenIndex + 1, i);
    }
  }
  return text.slice(openParenIndex + 1);
}
