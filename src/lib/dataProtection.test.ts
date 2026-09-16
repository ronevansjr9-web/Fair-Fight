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
  // Mirror the real Neon transaction primitive: each query is executed and
  // the transaction resolves with the array of row-array results.
  return Promise.all(txnQueries);
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
    // Evidence is metadata-only: the bytea `data` column is never selected.
    expect(sql).toContain("from evidence_files e");
    expect(sql).toContain("e.size_bytes");
    expect(sql).not.toContain("e.data");
    // Audit logs exported for the owning user only.
    expect(sql).toContain("from audit_logs");
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
      if (sqlText.includes("FROM evidence_files")) {
        return [{
          id: "ef1", case_id: "c1", filename: "affidavit.pdf", mime_type: "application/pdf",
          size_bytes: 2048, created_at: new Date(),
        }];
      }
      if (sqlText.includes("FROM audit_logs")) {
        return [{
          action: "CASE_CREATED", resource: "c1", details: '{"caseId":"c1"}', created_at: new Date(),
        }];
      }
      return [];
    });
    const out = await collectUserExport("user_abc");
    expect(out.data.cases[0].caseType).toBe("Civil");
    expect(typeof out.data.cases[0].createdAt).toBe("string");
    expect(out.data.caseAnalyses[0].possibleIssues).toBe("pi");
    expect(typeof out.data.caseAnalyses[0].sources).toBe("object");
    // Evidence metadata maps correctly and carries no file contents.
    expect(out.data.evidenceFiles[0].filename).toBe("affidavit.pdf");
    expect(out.data.evidenceFiles[0].mimeType).toBe("application/pdf");
    expect(out.data.evidenceFiles[0].sizeBytes).toBe(2048);
    expect(out.data.auditLogs[0].action).toBe("CASE_CREATED");
    expect(out.schemaVersion).toBe(2);
    expect(out.user.clerkUserId).toBe("user_abc");
    expect(typeof out.exportedAt).toBe("string");
    // The export states the honest boundaries in its own notes.
    expect(out.notes.evidenceFiles.toLowerCase()).toContain("not included");
    expect(out.notes.payments.toLowerCase()).toContain("stripe");
    // No bytea data anywhere in the mapped export.
    expect(JSON.stringify(out)).not.toContain("data\":\"");
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
    // Evidence files are deleted via the cases join and audit_logs are
    // deleted for the owning user only (not blanket).
    expect(sql).toContain("delete from evidence_files e using cases c");
    expect(sql).toContain("delete from audit_logs where user_id");
    // Every delete returns rows so exact per-table counts are provable:
    // no bare DELETE without RETURNING.
    expect(sql).toMatch(/delete from case_analyses[\s\S]*returning/);
    expect(sql).toMatch(/delete from evidence_files[\s\S]*returning/);
    expect(sql).toMatch(/delete from audit_logs[\s\S]*returning/);
  });
  test("returns exact per-table counts of deleted rows from the transaction", async () => {
    reset((sqlText) => {
      const t = sqlText.toLowerCase();
      if (t.includes("from evidence_files")) return [{ id: "e1" }, { id: "e2" }];
      if (t.includes("from case_analyses")) return [{ id: "a1" }];
      if (t.includes("from timeline_entries")) return [{ id: "t1" }, { id: "t2" }, { id: "t3" }];
      if (t.includes("from calendar_events")) return [];
      if (t.includes("from payments")) return [{ id: "p1" }];
      if (t.includes("from audit_logs")) return [{ id: "l1" }, { id: "l2" }];
      if (t.includes("from cases")) return [{ id: "c1" }, { id: "c2" }];
      return [];
    });
    const counts = await deleteAllUserData("user_abc");
    expect(counts).toEqual({
      evidenceFiles: 2,
      caseAnalyses: 1,
      timelineEntries: 3,
      calendarEvents: 0,
      payments: 1,
      cases: 2,
      auditLogs: 2,
    });
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
