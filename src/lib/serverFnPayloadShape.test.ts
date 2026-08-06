/**
 * Regression guard: TanStack Start v1.158 client calls to validator-backed
 * `createServerFn`s must pass the payload as `fn({ data: payload })`.
 *
 * Framework evidence (node_modules):
 * - Client stub (start-client-core/src/client-rpc/serverFnFetcher.ts):
 *   `if (opts.data !== undefined) { payloadToSerialize['data'] = opts.data }`
 *   — only `opts.data` is serialized to the wire.
 * - Server runner (start-client-core/src/createServerFn.ts):
 *   `ctx.data = await execValidator(validator, ctx.data)` — the validator
 *   receives the inner `data` from the wire.
 *
 * A direct call such as `fn(payload)` leaves `opts.data === undefined`, so
 * nothing is sent and the server-side validator receives `undefined`, breaking
 * chat, case creation/reopen, evidence delete, checkout start, document
 * generation, legal-argument generation, and legal research at runtime.
 *
 * This test statically scans customer-critical client code and fails if any
 * validator-backed server fn is invoked with a payload that is not wrapped in
 * `{ data: ... }`. It does not import React/TanStack modules, so it runs under
 * bun's built-in test runner.
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
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".gen.ts")) {
      files.push(p);
    }
  }
  return files;
}

/** fnName -> declaration file, for createServerFn declarations that use `.validator(`. */
function findValidatorBackedServerFns(srcDir: string): Map<string, string> {
  const fns = new Map<string, string>();
  const declRe =
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*createServerFn\s*\([^)]*\)([\s\S]*?)(?=\.handler\s*\()/g;
  for (const file of collectSourceFiles(srcDir)) {
    const content = readFileSync(file, "utf8");
    let m: RegExpExecArray | null;
    while ((m = declRe.exec(content)) !== null) {
      if (m[2] && m[2].includes(".validator(")) {
        fns.set(m[1], file);
      }
    }
  }
  return fns;
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

describe("validator-backed server fn client payload shape", () => {
  const fns = findValidatorBackedServerFns(SRC_DIR);

  // Sanity: the customer-critical set (audit-named plus the reference
  // timeline/calendar fns) must all be detected as validator-backed.
  const expectedNames = [
    "analyzeCase",
    "createCase",
    "generateArgument",
    "generateDocument",
    "getCase",
    "legalResearch",
    "removeFile",
    "sendMessage",
    "startCheckout",
    "listTimeline",
    "addTimeline",
    "deleteTimeline",
    "listCalendar",
    "addCalendar",
    "deleteCalendar",
  ];

  test("detects all validator-backed server fns", () => {
    for (const name of expectedNames) {
      expect(fns.has(name), `missing validator-backed declaration for ${name}`).toBe(true);
    }
  });

  test("every client call passes { data: ... }", () => {
    const violations: string[] = [];
    for (const [fnName] of fns) {
      const callRe = new RegExp(`(?<!\\.)\\b${fnName}\\s*\\(`, "g");
      for (const file of collectSourceFiles(SRC_DIR)) {
        const content = readFileSync(file, "utf8");
        let m: RegExpExecArray | null;
        while ((m = callRe.exec(content)) !== null) {
          const openParenIndex = m.index + m[0].lastIndexOf("(");
          const args = extractArgs(content, openParenIndex).trim();
          if (args === "") {
            violations.push(`${fnName}() called with no payload in ${file}`);
            continue;
          }
          if (!/^\{\s*data\s*:/.test(args)) {
            violations.push(
              `${fnName} call in ${file} must pass { data: payload }, got: ${args.slice(0, 100)}`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
