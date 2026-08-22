/**
 * Unit tests for the data-protection primitives (export, delete, payment
 * history). `~/db` is mocked and captures SQL so we assert exact statements,
 * ownership scoping, completeness of coverage, transaction shape, and
 * fail-closed behavior without a real database. Real-DB/live verification is the
 * separate controlled-deploy step that precedes clearing the flags (see
 * /home/team/shared/data-flow-inventory-2026-08-20.md).
 */
import { describe, expect, test, mock } from "bun:test";

type Captured = { sql: string; params: unknown[]; txn: boolean };

const captured: Captured[] = [];
/** Test hook: return rows for a given SQL statement (defaults to []). */
let resultsFor: (sqlText: string) => unknown[] = () => [];

function makeFn(isTxn: boolean) {
  return (strings: TemplateStringsArray, ...params: unknown[]) => {
    const sqlText = strings.join("?");
    captured.push({ sql: sqlText, params, txn: isTxn });
    return Promise.resolve(resultsFor(sqlText));
  };
}
const queryFn = makeFn(false);
const txnFn = makeFn(true);
const transaction = (fn: (txn: typeof txnFn) => unknown[]) => {
  const txnQueries = fn(txnFn);
  return Promise.resolve(txnQueries);
};

mock.module("~/db", () => ({
  sql: () => Object.assign(queryFn, { transaction }),
}));

const {
  collectUserExport,
  deleteAllUserData,
  listUserPayments,
  USER_DATA_CATEGORIES,
} = await import("./dataProtection");

function reset(customResults?: (sqlText: string) => unknown[]) {
  captured.length = 0;
  resultsFor = customResults ?? (() => []);
}

describe("collectUserExport", () => {
  test("queries every canonical user-owned category, ownership-scoped", async () => {
    reset();
    await collectUserExport("user_abc");
    const sql = captured.map((c) => c.sql.toLowerCase()).join("\n");
    for (const table of USER_DATA_CATEGORIES) {
      expect(sql, `export must cover ${table}`).toContain(table.toLowerCase());
    }
    // Case-owned children must join cases and filter on cases.user_id.
    expect(sql).toContain("join cases c on c.id=t.case_id");
    expect(sql).toContain("join cases c on c.id=e.case_id");
    // Ownership scoping: every category filters by user.
    expect(sql).toContain("user_id");
    const userParams = captured.filter((c) => c.params.includes("user_abc")).length;
    expect(userParams).toBeGreaterThanOrEqual(USER_DATA_CATEGORIES.length);
    // No blanket (unscoped) select.
    expect(sql).not.toMatch(/from cases\b(?!.+where)/);
  });

  test("coerces all timestamps to strings and maps snake_case → camelCase", async () => {
    reset((sqlText) => {
      if (sqlText.includes("FROM cases")) {
        return [{
          id: "c1", title: "My Case", case_type: "Civil", status: "active",
          jurisdiction: "CA", description: "d", created_at: new Date(), updated_at: new Date(),
        }];
      }
      if (sqlText.includes("FROM case_analyses")) {
        return [{
          id: "1", case_id: "c1", facts: "f", jurisdiction: "CA", summary: "s",
          possible_issues: "pi", candidate_arguments: "ca", counterarguments: "x",
          sources: [{ title: "t", url: "u", type: "statute" }], model: "gemini-3.6-flash",
          status: "completed", created_at: new Date(), updated_at: new Date(),
        }];
      }
      return [];
    });
    const out = await collectUserExport("user_abc");
    expect(out.cases[0].caseType).toBe("Civil");
    expect(typeof out.cases[0].createdAt).toBe("string");
    expect(out.caseAnalyses[0].possibleIssues).toBe("pi");
    expect(typeof out.caseAnalyses[0].sources).toBe("object");
    expect(out.schemaVersion).toBe(1);
    expect(out.user.userId).toBe("user_abc");
    expect(typeof out.exportedAt).toBe("string");
  });
});

describe("deleteAllUserData", () => {
  test("deletes every user-owned category in dependency-safe order in one transaction", async () => {
    reset();
    await deleteAllUserData("user_abc");
    const sql = captured
      .filter((c) => c.txn)
      .map((c) => c.sql.toLowerCase())
      .join("\n");
    for (const table of USER_DATA_CATEGORIES) {
      expect(sql, `delete must cover ${table}`).toContain(`delete from ${table}`);
    }
    // Dependency-safe order: children referencing cases before cases itself.
    expect(sql.indexOf("delete from case_analyses")).toBeLessThan(sql.indexOf("delete from cases"));
    expect(sql.indexOf("delete from timeline_entries")).toBeLessThan(sql.indexOf("delete from cases"));
    expect(sql.indexOf("delete from calendar_events")).toBeLessThan(sql.indexOf("delete from cases"));
    // Ownership scoping on every delete — guarantees other users' rows untouched.
    for (const t of captured.filter((c) => c.txn)) {
      expect(t.sql.toLowerCase()).toContain("user_id");
      expect(t.params).toContain("user_abc");
    }
    // Case-owned children scope via JOIN, not blanket delete.
    expect(sql).toContain("using cases c");
    expect(sql).not.toMatch(/delete from timeline_entries\s*;?\s*$/m);
    expect(sql).not.toMatch(/delete from calendar_events\s*;?\s*$/m);
  });

  test("routes through the Neon transaction primitive (all-or-nothing)", async () => {
    reset();
    await deleteAllUserData("u2");
    // We captured txn statements only because deleteAllUserData used
    // sql().transaction — a non-transactional path would have captured nothing.
    const txn = captured.filter((c) => c.txn);
    expect(txn.length).toBeGreaterThan(0);
    // Normal query function was NOT used for deletes.
    const plain = captured.filter((c) => !c.txn);
    expect(plain.length).toBe(0);
  });
});

describe("listUserPayments", () => {
  test("returns only the owning user's payment rows, ownership-scoped", async () => {
    reset((sqlText) =>
      sqlText.includes("FROM payments WHERE user_id=")
        ? [{ id: "1", case_id: "c1", amount_cents: 9900, currency: "usd", status: "succeeded", created_at: new Date() }]
        : [],
    );
    const out = await listUserPayments("user_abc");
    expect(out.length).toBe(1);
    expect(out[0].amountCents).toBe(9900);
    expect(out[0].caseId).toBe("c1");
    const q = captured.find((c) => c.sql.toLowerCase().includes("from payments"));
    expect(q!.sql.toLowerCase()).toContain("user_id=");
    expect(q!.params).toContain("user_abc");
  });

  test("fail-closed: returns empty array on DB error instead of leaking", async () => {
    reset(() => {
      throw new Error("db down");
    });
    const out = await listUserPayments("nobody");
    expect(out).toEqual([]);
  });
});
