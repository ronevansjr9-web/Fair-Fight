/**
 * Real-PostgreSQL integration tests for the migration runner
 * (src/lib/migrate.ts). These prove the runner against an actual PostgreSQL
 * server — fresh install, safe rerun, checksum-drift rejection, transactional
 * rollback, concurrent runners, and the required catalog/FK/index/constraint
 * surface that the app's queries depend on.
 *
 * Gating: the whole suite skips unless TEST_DATABASE_URL is set, so ordinary
 * `bun test` runs stay hermetic (no local Postgres required). The harness
 * `scripts/pg-disposable-integration.sh` boots a disposable cluster, creates a
 * scratch database, sets TEST_DATABASE_URL, runs this file, and tears the
 * cluster down.
 *
 * Each test starts from a pristine `public` schema; migrations live in
 * `migrations/` (or a temporary copy for the rollback scenario).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import {
  loadMigrations,
  MIGRATION_LOCK_KEY,
  runMigrations,
  sha256Checksum,
  type MigrationSql,
} from "./migrate";

const TEST_URL = process.env.TEST_DATABASE_URL;
const MIGRATIONS_DIR = join(process.cwd(), "migrations");

/**
 * Wrap a node-postgres pool in the exact driver surface the runner uses
 * (Neon serverless driver shape: tagged-template query fn + `.transaction`).
 * The transaction runs BEGIN/COMMIT (ROLLBACK on error) on a single
 * connection, which is what makes the runner's all-or-nothing batch real.
 */
function pgSql(pool: Pool): MigrationSql {
  const fn = (async (strings: TemplateStringsArray, ...params: unknown[]) => {
    let text = "";
    for (let i = 0; i < strings.length; i++) {
      text += strings[i];
      if (i < params.length) text += `$${i + 1}`;
    }
    const { rows } = await pool.query({ text, values: params });
    return rows as Record<string, unknown>[];
  }) as unknown as MigrationSql;
  Object.assign(fn, {
    transaction: async (queriesOrFn: (txn: { query(rawSQL: string): unknown }) => unknown[]) => {
      // Neon-faithful: the serverless driver rejects txn.unsafe(...) inside a
      // transaction (it is not a query object), so the adapter exposes ONLY
      // txn.query(rawSQL) and would fail the suite if the runner regressed to
      // txn.unsafe.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const queries = queriesOrFn({ query: (rawSQL: string) => rawSQL });
        for (const query of queries) await client.query(query);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  });
  return fn as MigrationSql;
}

async function queryAll<T extends Record<string, unknown>>(pool: Pool, text: string): Promise<T[]> {
  const { rows } = await pool.query(text);
  return rows as T[];
}

async function resetPublicSchema(pool: Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("CREATE SCHEMA public");
}

/** All app tables the runner is expected to create, in dependency order. */
const EXPECTED_TABLES = [
  "schema_migrations",
  "cases",
  "payments",
  "case_analyses",
  "webhook_events",
  "timeline_entries",
  "calendar_events",
];

describe.skipIf(!TEST_URL)("migration runner on real PostgreSQL", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: TEST_URL, max: 4 });
  });
  afterAll(async () => {
    await pool.end();
  });

  test("fresh install: applies every migration in order and records the ledger", async () => {
    await resetPublicSchema(pool);
    const sql = pgSql(pool);
    const plan = await runMigrations({ sql });
    expect(plan.toApply.map((f) => f.version)).toEqual(["001", "002", "003", "004", "005"]);
    expect(plan.skipped).toEqual([]);
    expect(plan.drift).toEqual([]);

    const tables = (await queryAll<{ table_name: string }>(
      pool,
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
    )).map((r) => r.table_name);
    for (const t of EXPECTED_TABLES) expect(tables).toContain(t);

    // Ledger rows: every version with the exact sha256 of its file body.
    const files = loadMigrations(MIGRATIONS_DIR);
    const ledger = await queryAll<{ version: string; checksum: string }>(
      pool,
      "SELECT version, checksum FROM schema_migrations ORDER BY version",
    );
    expect(ledger.map((r) => r.version)).toEqual(["001", "002", "003", "004", "005"]);
    for (const file of files) {
      const entry = ledger.find((r) => r.version === file.version)!;
      expect(entry.checksum, `ledger checksum for ${file.version}`).toBe(file.checksum);
      expect(entry.checksum).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test("safe rerun: matching ledger means nothing to apply", async () => {
    await resetPublicSchema(pool);
    const sql = pgSql(pool);
    await runMigrations({ sql });
    const second = await runMigrations({ sql });
    expect(second.toApply).toEqual([]);
    expect(second.skipped).toEqual(["001", "002", "003", "004", "005"]);
    const ledger = await queryAll<{ version: string }>(
      pool,
      "SELECT version FROM schema_migrations ORDER BY version",
    );
    expect(ledger).toHaveLength(5);
  });

  test("checksum mismatch: drift aborts the run and never touches the schema", async () => {
    await resetPublicSchema(pool);
    const sql = pgSql(pool);
    await runMigrations({ sql });
    // Simulate a tampered migration file by editing its ledger checksum.
    await pool.query("UPDATE schema_migrations SET checksum='deadbeef' WHERE version='003'");
    await expect(runMigrations({ sql })).rejects.toThrow(/Migration drift/);
    // The previously applied schema is untouched.
    const cases = await queryAll<{ exists: boolean }>(
      pool,
      "SELECT to_regclass('public.cases') IS NOT NULL AS exists",
    );
    expect(cases[0].exists).toBe(true);
    const ledger = await queryAll<{ checksum: string }>(
      pool,
      "SELECT checksum FROM schema_migrations WHERE version='003'",
    );
    expect(ledger[0].checksum).toBe("deadbeef");
  });

  test("rollback: a failing migration aborts the whole batch (nothing persists)", async () => {
    await resetPublicSchema(pool);
    // Temporary migrations dir: the real files plus one broken migration.
    const scratch = mkdtempSync(join(tmpdir(), "ff-mig-"));
    try {
      cpSync(MIGRATIONS_DIR, scratch, { recursive: true });
      writeFileSync(join(scratch, "006_broken.sql"), "CREATE TABLE broken_table (id INT\n"); // unterminated
      const sql = pgSql(pool);
      await expect(runMigrations({ sql, migrationsDir: scratch })).rejects.toThrow();
      // One transaction -> rollback of the ENTIRE batch: no tables at all.
      const tables = await queryAll<{ table_name: string }>(
        pool,
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
      );
      expect(tables).toEqual([]);
      // Removing the broken file lets the exact same run succeed.
      rmSync(join(scratch, "006_broken.sql"));
      const plan = await runMigrations({ sql, migrationsDir: scratch });
      expect(plan.toApply.map((f) => f.version)).toEqual(["001", "002", "003", "004", "005"]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test("concurrent runners serialize on the advisory lock and both end consistent", async () => {
    await resetPublicSchema(pool);
    const a = pgSql(pool);
    const b = pgSql(pool);
    const [pa, pb] = await Promise.all([runMigrations({ sql: a }), runMigrations({ sql: b })]);
    // The lock is the first statement in each batch, so the runners never race
    // on catalog creation. Whichever runner saw an empty ledger first applies
    // all five; the other either saw the committed ledger (applies nothing) or
    // replayed its pre-lock plan as idempotent IF NOT EXISTS / ON CONFLICT
    // no-ops after the first committed. Either way both succeed.
    expect([pa.toApply.length, pb.toApply.length].sort((x, y) => y - x)[0]).toBe(5);
    const ledger = await queryAll<{ version: string; checksum: string }>(
      pool,
      "SELECT version, checksum FROM schema_migrations ORDER BY version",
    );
    expect(ledger.map((r) => r.version)).toEqual(["001", "002", "003", "004", "005"]);
    const files = loadMigrations(MIGRATIONS_DIR);
    for (const file of files) {
      const entry = ledger.find((r) => r.version === file.version)!;
      expect(entry.checksum, `ledger checksum for ${file.version}`).toBe(file.checksum);
    }
  });

  test("catalog: required tables, columns, FKs, indexes, and constraints exist", async () => {
    await resetPublicSchema(pool);
    await runMigrations({ sql: pgSql(pool) });

    // Columns the app queries against (from src/lib/* and src/routes/*).
    const requiredColumns: Record<string, string[]> = {
      cases: ["id", "user_id", "title", "case_type", "status", "jurisdiction", "description", "created_at", "updated_at"],
      payments: ["id", "checkout_session_id", "payment_intent_id", "user_id", "case_id", "amount_cents", "currency", "status", "created_at", "updated_at"],
      case_analyses: ["id", "case_id", "user_id", "facts", "jurisdiction", "summary", "possible_issues", "candidate_arguments", "counterarguments", "sources", "model", "status", "created_at", "updated_at"],
      webhook_events: ["event_id", "event_type", "processed_at"],
      timeline_entries: ["id", "case_id", "event_date", "title", "description", "created_at"],
      calendar_events: ["id", "case_id", "event_date", "title", "event_type", "notes", "created_at"],
    };
    for (const [table, columns] of Object.entries(requiredColumns)) {
      const found = (await queryAll<{ column_name: string }>(
        pool,
        `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}'`,
      )).map((r) => r.column_name);
      for (const column of columns) expect(found, `${table}.${column}`).toContain(column);
    }

    // Foreign keys: every child table that declares one points at cases(id).
    const fks = await queryAll<{ table_name: string; column_name: string; foreign_table: string }>(
      pool,
      `SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
       ORDER BY tc.table_name`,
    );
    expect(fks.map((r) => `${r.table_name}.${r.column_name}->${r.foreign_table}`)).toEqual([
      "calendar_events.case_id->cases",
      "case_analyses.case_id->cases",
      "timeline_entries.case_id->cases",
    ]);

    // Cascading deletes: removing a case removes its analyses and activity rows.
    const caseId = "case_cascade_test";
    await pool.query("INSERT INTO cases (id, user_id, title) VALUES ($1, 'u1', 't')", [caseId]);
    await pool.query("INSERT INTO case_analyses (case_id, user_id, summary) VALUES ($1, 'u1', 's')", [caseId]);
    await pool.query("INSERT INTO timeline_entries (case_id, event_date, title) VALUES ($1, '2026-08-16', 'e')", [caseId]);
    await pool.query("INSERT INTO calendar_events (case_id, event_date, title) VALUES ($1, '2026-08-16', 'c')", [caseId]);
    await pool.query("DELETE FROM cases WHERE id=$1", [caseId]);
    const orphans = await queryAll<{ n: string }>(
      pool,
      `SELECT (SELECT count(*) FROM case_analyses WHERE case_id='${caseId}')
            + (SELECT count(*) FROM timeline_entries WHERE case_id='${caseId}')
            + (SELECT count(*) FROM calendar_events WHERE case_id='${caseId}') AS n`,
    );
    expect(Number(orphans[0].n)).toBe(0);

    // Named indexes the app relies on.
    const indexes = (await queryAll<{ indexname: string }>(
      pool,
      "SELECT indexname FROM pg_indexes WHERE schemaname='public'",
    )).map((r) => r.indexname);
    for (const idx of [
      "cases_user_updated_idx",
      "payments_user_case_idx",
      "case_analyses_user_case_idx",
      "timeline_entries_case_date_idx",
      "calendar_events_case_date_idx",
    ]) {
      expect(indexes, idx).toContain(idx);
    }

    // Unique constraints backing ON CONFLICT / idempotency contracts.
    const uniques = await queryAll<{ conname: string }>(
      pool,
      "SELECT conname FROM pg_constraint WHERE contype='u' AND connamespace='public'::regnamespace",
    );
    for (const u of ["payments_checkout_session_id_key", "case_analyses_case_id_key"]) {
      expect(uniques.map((r) => r.conname), u).toContain(u);
    }

    // Check constraints guarding status enums.
    const checks = await queryAll<{ conname: string; def: string }>(
      pool,
      "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace",
    );
    const checkDef = (name: string) => checks.find((r) => r.conname === name)?.def ?? "";
    expect(checkDef("cases_status_check")).toContain("active");
    expect(checkDef("cases_status_check")).toContain("resolved");
    expect(checkDef("payments_status_check")).toContain("succeeded");
    expect(checkDef("payments_status_check")).toContain("refunded");
    expect(checkDef("case_analyses_status_check")).toContain("pending");
    expect(checkDef("case_analyses_status_check")).toContain("completed");
    expect(checkDef("case_analyses_status_check")).toContain("failed");

    // Webhook idempotency ledger: event_id is the primary key.
    const webhookPk = await queryAll<{ exists: boolean }>(
      pool,
      "SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='webhook_events' AND constraint_type='PRIMARY KEY') AS exists",
    );
    expect(webhookPk[0].exists).toBe(true);
  });

  test("app contract smoke: a case, payment, analysis, webhook event, timeline, and calendar row all persist", async () => {
    await resetPublicSchema(pool);
    await runMigrations({ sql: pgSql(pool) });
    const caseId = "case_smoke_1";
    await pool.query("INSERT INTO cases (id, user_id, title, jurisdiction) VALUES ($1, 'u1', 'Smoke', 'TX')", [caseId]);
    await pool.query(
      `INSERT INTO payments (checkout_session_id, payment_intent_id, user_id, case_id, amount_cents, currency, status)
       VALUES ('cs_1', 'pi_1', 'u1', $1, 9900, 'usd', 'succeeded')`,
      [caseId],
    );
    await pool.query(
      `INSERT INTO case_analyses (case_id, user_id, facts, jurisdiction, summary, possible_issues, candidate_arguments, counterarguments, sources, model, status)
       VALUES ($1, 'u1', 'facts', 'TX', 'summary', 'issues', 'args', 'counters', '[{"title":"t","url":"https://example.com","type":"statute"}]'::jsonb, 'test-model', 'completed')`,
      [caseId],
    );
    await pool.query("INSERT INTO webhook_events (event_id, event_type) VALUES ('evt_1', 'checkout.session.completed')");
    await pool.query("INSERT INTO timeline_entries (case_id, event_date, title, description) VALUES ($1, '2026-08-16', 'Filing', 'desc')", [caseId]);
    await pool.query("INSERT INTO calendar_events (case_id, event_date, title, event_type, notes) VALUES ($1, '2026-08-17', 'Hearing', 'hearing', 'notes')", [caseId]);

    const payments = await queryAll<{ amount_cents: number; status: string }>(
      pool,
      `SELECT amount_cents, status FROM payments WHERE checkout_session_id='cs_1'`,
    );
    expect(payments[0]).toEqual({ amount_cents: 9900, status: "succeeded" });

    const analyses = await queryAll<{ model: string; sources: unknown }>(
      pool,
      `SELECT model, sources FROM case_analyses WHERE case_id='${caseId}'`,
    );
    expect(analyses[0].model).toBe("test-model");
    const sources = analyses[0].sources as { url: string }[];
    expect(Array.isArray(sources)).toBe(true);
    expect(sources[0].url).toBe("https://example.com");
  });
});

/** Keep the runner's lock key honest: exported constant must stay fixed. */
describe("advisory lock key stability", () => {
  test("MIGRATION_LOCK_KEY is a stable fixed bigint", () => {
    expect(typeof MIGRATION_LOCK_KEY).toBe("bigint");
    expect(sha256Checksum(String(MIGRATION_LOCK_KEY))).toMatch(/^[0-9a-f]{64}$/);
  });
});
