/**
 * Transactional, locked, checksum-ledger-backed migration runner.
 *
 * Safe by construction:
 * - All statements for a run are executed inside ONE Postgres transaction via
 *   the Neon driver's `sql.transaction(...)` (non-interactive transaction over
 *   HTTP). Either every migration in the batch applies, or none does — no
 *   partial schema.
 * - A Postgres advisory transaction lock (`pg_advisory_xact_lock`) is the
 *   FIRST statement in that same transaction, so concurrent runners serialize
 *   instead of racing.
 * - Every applied file is recorded in a `schema_migrations` ledger
 *   (version + sha256 checksum) inside the same transaction. Re-running is a
 *   no-op for already-applied, checksum-matching versions; a version whose
 *   file checksum no longer matches its ledger entry ABORTS the whole run
 *   (drift detection) instead of silently re-applying edited history.
 *
 * The runner NEVER runs request-time DDL: it is only invoked explicitly by
 * `bun run migrate` (src/lib/migrate-cli.ts) during a controlled deploy.
 * Applying to the real database is a documented, blocked integration step
 * (no DATABASE_URL in this sandbox; requires a controlled deploy + the real
 * DB) — see migrations/README.md.
 *
 * Statement splitting: files are split on `;` at line ends. That is correct
 * for the migrations in this repo (no semicolons inside string literals);
 * keep it that way when adding new files.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Advisory-lock key shared by every run (arbitrary fixed 64-bit value). */
export const MIGRATION_LOCK_KEY = 7_240_051_992_021_304n;

export interface MigrationFile {
  version: string;
  checksum: string;
  statements: string[];
}

export interface AppliedMigration {
  version: string;
  checksum: string;
}

export interface MigrationPlan {
  toApply: MigrationFile[];
  skipped: string[];
  drift: { version: string; fileChecksum: string; ledgerChecksum: string }[];
}

export function sha256Checksum(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/** Split a migration file into executable statements on `;` at line ends. */
export function splitStatements(sqlText: string): string[] {
  const withoutComments = sqlText
    .split(/\r?\n/)
    .filter((l) => !/^\s*--/.test(l))
    .join("\n");
  return withoutComments
    .split(/;\s*(\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Load migrations from a directory, in ascending version order.
 * Version = the `NNN_` numeric prefix of the filename.
 */
export function loadMigrations(dir: string): MigrationFile[] {
  const files = readdirSync(dir)
    .filter((f) => /^\d+_[A-Za-z0-9_]+\.sql$/.test(f))
    .sort();
  return files.map((f) => {
    const version = f.split("_")[0];
    const raw = readFileSync(join(dir, f), "utf8");
    const body = raw
      .split(/\r?\n/)
      .filter((l) => !/^\s*--/.test(l))
      .join("\n");
    return { version, checksum: sha256Checksum(body), statements: splitStatements(body) };
  });
}

/** Decide what to apply given the ledger. Pure — unit-testable without a DB. */
export function planMigrations(files: MigrationFile[], applied: AppliedMigration[]): MigrationPlan {
  const plan: MigrationPlan = { toApply: [], skipped: [], drift: [] };
  const byVersion = new Map(applied.map((a) => [a.version, a]));
  for (const file of files) {
    const entry = byVersion.get(file.version);
    if (!entry) {
      plan.toApply.push(file);
      continue;
    }
    if (entry.checksum === file.checksum) {
      plan.skipped.push(file.version);
    } else {
      plan.drift.push({ version: file.version, fileChecksum: file.checksum, ledgerChecksum: entry.checksum });
    }
  }
  return plan;
}

/** Minimal shape of the Neon query function needed by the runner. */
export interface MigrationSql {
  (strings: TemplateStringsArray, ...params: unknown[]): Promise<Record<string, unknown>[]>;
  transaction: (
    queriesOrFn: (txn: { query(rawSQL: string): unknown }) => unknown[],
  ) => Promise<unknown[]>;
}

export interface MigrationDeps {
  sql: MigrationSql;
  /** Directory containing migrations. Defaults to <repo>/migrations. */
  migrationsDir?: string;
}

export async function runMigrations(deps: MigrationDeps): Promise<MigrationPlan> {
  const dir = deps.migrationsDir ?? join(process.cwd(), "migrations");
  const files = loadMigrations(dir);

  let ledger: AppliedMigration[] = [];
  try {
    const rows = (await deps.sql`SELECT version, checksum FROM schema_migrations ORDER BY version`) as {
      version: string;
      checksum: string;
    }[];
    ledger = (rows ?? []).map((r) => ({ version: String(r.version), checksum: String(r.checksum) }));
  } catch (error) {
    // Only a missing ledger table (brand-new database) falls through to the
    // empty-ledger path. The ledger is created idempotently inside the apply
    // transaction; an empty ledger means every file is pending. Any OTHER
    // error (connection failure, permission, ...) is rethrown instead of being
    // silently misread as "fresh database".
    const code = (error as { code?: string } | undefined)?.code;
    const message = String((error as Error | undefined)?.message ?? error);
    const ledgerMissing =
      code === "42P01" || /schema_migrations.*does not exist|does not exist.*schema_migrations/i.test(message);
    if (!ledgerMissing) throw error;
    ledger = [];
  }

  const plan = planMigrations(files, ledger);
  if (plan.drift.length > 0) {
    throw new Error(
      `Migration drift: ${plan.drift
        .map((d) => `${d.version} (file ${d.fileChecksum.slice(0, 12)}… vs ledger ${d.ledgerChecksum.slice(0, 12)}…)`)
        .join(", ")}. Refusing to apply.`,
    );
  }
  if (plan.toApply.length === 0) return plan;

  // Order matters for concurrency: the advisory xact lock MUST be the first
  // statement in the transaction. Two concurrent runners otherwise race to
  // create schema_migrations / the app tables before either takes the lock
  // (Postgres `CREATE TABLE IF NOT EXISTS` is not race-free against a second
  // concurrent creator — duplicate key on pg_type). With the lock first, the
  // second runner blocks until the first commits, then its IF NOT EXISTS /
  // ON CONFLICT statements become no-ops.
  const queries: string[] = [
    `SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`,
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  ];
  for (const file of plan.toApply) {
    queries.push(...file.statements);
  }
  for (const file of plan.toApply) {
    queries.push(
      `INSERT INTO schema_migrations (version, checksum) VALUES ('${file.version}', '${file.checksum}') ON CONFLICT (version) DO NOTHING`,
    );
  }
  // NOTE: use `txn.query(rawSQL)`, NOT `txn.unsafe(rawSQL)`, inside the
  // transaction: the Neon serverless driver only accepts query objects
  // (txn.unsafe returns an UnsafeRawSql wrapper that transaction() rejects
  // with "expects an array of queries").
  await deps.sql.transaction((txn) => queries.map((q) => txn.query(q)));
  return plan;
}
