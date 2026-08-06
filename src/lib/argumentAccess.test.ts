/**
 * Case-scoped Pro authorization tests (src/lib/argumentAccess.ts).
 *
 * Guards the non-negotiable rule that a paid entitlement only authorizes its
 * exact case:
 * - `hasOwnedCaseEntitlement` returns false unless the case belongs to the user
 *   AND that exact case has a succeeded payment record.
 * - The legal-argument flow and the ProGate UI must authorize the premium
 *   action with the case-scoped check — never with an any-case or subscription
 *   check.
 */
import { describe, expect, test, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// --- Behavior of hasOwnedCaseEntitlement and fetchUserCases with mocked modules ---
let results: Record<string, unknown>[][] = [];
const sqlMock = () => async () => {
  const next = results.shift();
  if (next === undefined) throw new Error("DB Error");
  return next;
};
mock.module("~/db", () => ({ sql: sqlMock }));

let mockUserId: string | null = "user_1";
mock.module("~/lib/auth", () => ({
  getCurrentAuth: async () => ({ userId: mockUserId }),
  getPrimaryEmail: async () => "user@example.com",
}));

// Imports must come after mock.module so the mocked modules are used.
const { hasOwnedCaseEntitlement } = await import("./argumentAccess");
const { fetchUserCases } = await import("../routes/legal-argument");

describe("hasOwnedCaseEntitlement", () => {
  test("denies access when the case is not owned by the user", async () => {
    results = [[]];
    expect(await hasOwnedCaseEntitlement("user_1", "case_1")).toBe(false);
  });

  test("denies access when the case is owned but not paid for", async () => {
    results = [[{ id: 1 }], []];
    expect(await hasOwnedCaseEntitlement("user_1", "case_1")).toBe(false);
  });

  test("grants access only when the exact case is owned and paid", async () => {
    results = [[{ id: 1 }], [{ id: 1 }]];
    expect(await hasOwnedCaseEntitlement("user_1", "case_1")).toBe(true);
  });

  test("rejects malformed case ids before touching the database", async () => {
    results = [];
    expect(await hasOwnedCaseEntitlement("user_1", "case_1; DROP TABLE cases")).toBe(false);
    expect(await hasOwnedCaseEntitlement("user_1", "")).toBe(false);
    expect(await hasOwnedCaseEntitlement("", "case_1")).toBe(false);
    expect(results.length).toBe(0);
  });
});

describe("fetchUserCases inner auth logic", () => {
  test("returns cases for authenticated user", async () => {
    results = [[{ id: "case_1", title: "My Case" }]];
    const res = await fetchUserCases("user_1");
    expect(res).toEqual({
      cases: [{ id: "case_1", title: "My Case" }],
    });
  });

  test("returns empty cases list when database query fails", async () => {
    results = []; // Will throw "DB Error" in mock
    const res = await fetchUserCases("user_1");
    expect(res).toEqual({ cases: [] });
  });

  test("returns empty cases list when user is not logged in", async () => {
    const res = await fetchUserCases(null);
    expect(res).toEqual({ cases: [] });
  });
});

// --- Static wiring guard: no any-case/subscription check may authorize the
// case-specific premium action. ---
const legalArgumentSource = readFileSync(
  fileURLToPath(new URL("../routes/legal-argument.tsx", import.meta.url)),
  "utf8",
);
const proGateSource = readFileSync(
  fileURLToPath(new URL("../components/ProGate.tsx", import.meta.url)),
  "utf8",
);

describe("case-scoped authorization wiring", () => {
  test("legal-argument server fn authorizes with hasOwnedCaseEntitlement only", () => {
    expect(legalArgumentSource).toContain("hasOwnedCaseEntitlement(auth.userId, data.caseId)");
    expect(legalArgumentSource).not.toContain("hasAnyEntitlement");
    expect(legalArgumentSource).not.toContain("getSubscriptionStatus");
    expect(legalArgumentSource).toContain("getCurrentAuth");
    expect(legalArgumentSource).not.toContain('import { getAuth }');
    expect(legalArgumentSource).not.toContain('getAuth()');
  });

  test("ProGate authorizes with hasOwnedCaseEntitlement only", () => {
    expect(proGateSource).toContain("hasOwnedCaseEntitlement(auth.userId, data.caseId)");
    expect(proGateSource).not.toContain("hasAnyEntitlement");
    expect(proGateSource).not.toContain("getSubscriptionStatus");
    expect(proGateSource).toContain("getCurrentAuth");
    expect(proGateSource).not.toContain('import { getAuth }');
    expect(proGateSource).not.toContain('getAuth()');
  });

  test("legal-argument requires a selected case before generating", () => {
    expect(legalArgumentSource).toContain('if (typeof d.caseId !== "string" || !/^[A-Za-z0-9_-]+$/.test(d.caseId)) throw new Error("Select a case first")');
  });

  test("legal-argument renders custom selector with empty/loading state and no arbitrary paste fallback", () => {
    expect(legalArgumentSource).toContain("<select");
    expect(legalArgumentSource).toContain("userCases.map");
    expect(legalArgumentSource).toContain("isLoadingCases");
    expect(legalArgumentSource).toContain("userCases.length === 0");
    expect(legalArgumentSource).not.toContain('placeholder="Paste your case ID from the dashboard"');
  });
});
