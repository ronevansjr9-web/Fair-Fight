/**
 * Unit tests for the migration runner. The runner's database surface is mocked
 * (no DATABASE_URL / real Postgres here), proving the plan logic, checksums,
 * drift detection, and the single-transaction batch shape. Real-Postgres
 * verification is a documented blocked integration step (migrations/README.md).
 */
import { describe, expect, test } from "bun:test";
import {
  loadMigrations,
  planMigrations,
  runMigrations,
  sha256Checksum,
  splitStatements,
  MIGRATION_LOCK_KEY,
  type MigrationSql,
} from "./migrate";
import { join } from "node:path";

function fakeSql(log: { calls: unknown[] }) {
  const fn = (async () => []) as unknown as MigrationSql;
  const sql = Object.assign(fn, {
    transaction: async (queriesOrFn: (txn: { unsafe(rawSQL: string): unknown }) => unknown[]) => {
      const queries = queriesOrFn({ query: (rawSQL: string) => rawSQL });
      log.calls.push(queries);
      return queries;
    },
  });
  return sql;
}

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

describe("sha256Checksum", () => {
  test("is deterministic and 64 hex chars", () => {
    expect(sha256Checksum("SELECT 1")).toBe(sha256Checksum("SELECT 1"));
    expect(sha256Checksum("SELECT 1")).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Checksum("SELECT 1")).not.toBe(sha256Checksum("SELECT 2"));
  });
});

describe("splitStatements", () => {
  test("splits on line-ending semicolons and drops comments/blanks", () => {
    const sql = "-- header comment\nCREATE TABLE IF NOT EXISTS t (id INT);\n\nCREATE INDEX IF NOT EXISTS idx ON t(id);";
    expect(splitStatements(sql)).toEqual([
      "CREATE TABLE IF NOT EXISTS t (id INT)",
      "CREATE INDEX IF NOT EXISTS idx ON t(id)",
    ]);
  });
});

describe("loadMigrations", () => {
  test("loads the repo migrations in version order with checksums", () => {
    const files = loadMigrations(MIGRATIONS_DIR);
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(files.map((f) => f.version)).toEqual(["001", "002", "003", "004", "005"]);
    for (const f of files) {
      expect(f.checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(f.statements.length).toBeGreaterThan(0);
    }
    // The base cases table and paid-analysis schema are present.
    const cases = files.find((f) => f.version === "001")!;
    expect(cases.statements.join("\n")).toContain("CREATE TABLE IF NOT EXISTS cases");
    const analyses = files.find((f) => f.version === "003")!;
    expect(analyses.statements.join("\n")).toContain("CREATE TABLE IF NOT EXISTS case_analyses");
    const ledger = files.find((f) => f.version === "004")!;
    expect(ledger.statements.join("\n")).toContain("CREATE TABLE IF NOT EXISTS webhook_events");
  });
});

describe("planMigrations", () => {
  const files = [
    { version: "001", checksum: "a", statements: ["SELECT 1"] },
    { version: "002", checksum: "b", statements: ["SELECT 2"] },
    { version: "003", checksum: "c", statements: ["SELECT 3"] },
  ];

  test("fresh ledger applies everything in order", () => {
    const plan = planMigrations(files, []);
    expect(plan.toApply.map((f) => f.version)).toEqual(["001", "002", "003"]);
    expect(plan.skipped).toEqual([]);
    expect(plan.drift).toEqual([]);
  });

  test("matching ledger entries are skipped (idempotent replay)", () => {
    const plan = planMigrations(files, [
      { version: "001", checksum: "a" },
      { version: "002", checksum: "b" },
    ]);
    expect(plan.toApply.map((f) => f.version)).toEqual(["003"]);
    expect(plan.skipped).toEqual(["001", "002"]);
  });

  test("checksum mismatch is reported as drift, never auto-applied", () => {
    const plan = planMigrations(files, [{ version: "002", checksum: "EDITED" }]);
    expect(plan.toApply.map((f) => f.version)).toEqual(["001", "003"]);
    expect(plan.drift).toEqual([
      { version: "002", fileChecksum: "b", ledgerChecksum: "EDITED" },
    ]);
  });
});

describe("runMigrations", () => {
  test("sends one locked transaction batch with lock, statements, and ledger inserts", async () => {
    const log: { calls: unknown[] } = { calls: [] };
    // Ledger read throws -> fresh-DB path; transaction records the batch.
    const sql = Object.assign(async () => {
      throw new Error("schema_migrations does not exist");
    }, {
      transaction: async (queriesOrFn: (txn: { unsafe(rawSQL: string): unknown }) => unknown[]) => {
        const queries = queriesOrFn({ query: (rawSQL: string) => rawSQL });
        log.calls.push(queries);
        return queries;
      },
    }) as unknown as MigrationSql;
    const plan = await runMigrations({ sql, migrationsDir: MIGRATIONS_DIR });
    expect(plan.toApply.map((f) => f.version)).toEqual(["001", "002", "003", "004", "005"]);
    expect(log.calls.length).toBe(1);
    const batch = log.calls[0] as string[];
    // The advisory xact lock MUST be first so concurrent runners serialize
    // before any catalog/schema creation.
    expect(batch[0]).toBe(`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`);
    expect(batch[1]).toContain("CREATE TABLE IF NOT EXISTS schema_migrations");
    // All migration statements in the middle.
    expect(batch.join("\n")).toContain("CREATE TABLE IF NOT EXISTS cases");
    expect(batch.join("\n")).toContain("CREATE TABLE IF NOT EXISTS case_analyses");
    expect(batch.join("\n")).toContain("CREATE TABLE IF NOT EXISTS webhook_events");
    // Ledger inserts for each version at the end.
    for (const version of ["001", "002", "003", "004", "005"]) {
      expect(batch.some((q) => q.includes(`VALUES ('${version}'`))).toBe(true);
    }
  });

  test("second run with a matching ledger applies nothing", async () => {
    const log: { calls: unknown[] } = { calls: [] };
    const files = loadMigrations(MIGRATIONS_DIR);
    const ledger = files.map((f) => ({ version: f.version, checksum: f.checksum }));
    const sql = Object.assign(async () => ledger, {
      transaction: async (queriesOrFn: (txn: { unsafe(rawSQL: string): unknown }) => unknown[]) =>
        queriesOrFn({ unsafe: (rawSQL: string) => rawSQL }),
    }) as unknown as MigrationSql;
    const plan = await runMigrations({ sql, migrationsDir: MIGRATIONS_DIR });
    expect(plan.toApply).toEqual([]);
    expect(plan.skipped).toEqual(["001", "002", "003", "004", "005"]);
  });

  test("drift aborts with an error instead of applying", async () => {
    const sql = Object.assign(async () => [{ version: "001", checksum: "WRONG" }], {
      transaction: async () => [],
    }) as unknown as MigrationSql;
    await expect(runMigrations({ sql, migrationsDir: MIGRATIONS_DIR })).rejects.toThrow(/Migration drift/);
  });
});
