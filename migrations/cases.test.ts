import { describe, expect, test } from "bun:test";

const migration = await Bun.file(new URL("./000_cases.sql", import.meta.url)).text();
const contract = await Bun.file(new URL("./README.md", import.meta.url)).text();
const runner = await Bun.file(new URL("../scripts/migrate.sh", import.meta.url)).text();
const allMigrations = await Promise.all(["001_case_activity.sql", "002_payments.sql"].map((f) => Bun.file(new URL(`./${f}`, import.meta.url)).text()));

describe("canonical cases migration", () => {
  test("preflights every canonical definition and fails closed", () => {
    for (const column of ["id", "user_id", "title", "case_type", "status", "jurisdiction", "description", "created_at", "updated_at"]) expect(migration).toContain(`('${column}'`);
    expect(migration).toContain("format_type");
    expect(migration).toContain("attnotnull");
    expect(migration).toContain("pg_get_expr");
    expect(migration).toContain("pg_get_constraintdef");
    expect(migration).toContain("status contains unsupported values");
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS\s+cases/i);
    expect(migration).not.toMatch(/\b(DROP TABLE|TRUNCATE)\b/i);
  });

  test("runner owns transactions, lock, and ledger sequencing", () => {
    expect(runner).toContain("pg_advisory_xact_lock");
    expect(runner).toContain("SELECT EXISTS");
    expect(runner).toContain("\\gset");
    expect(runner).toContain("INSERT INTO public.schema_migrations");
    expect(runner).toContain("COMMIT;");
    expect(runner).not.toContain("grep -q");
    expect(runner).not.toMatch(/psql[^\n]*--file[^\n]*\npsql/);
    for (const sql of allMigrations) {
      expect(sql).not.toMatch(/^\s*(BEGIN|COMMIT);/m);
    }
  });

  test("docs state the exact compatibility and transaction contract", () => {
    expect(contract).toContain("text/varchar");
    expect(contract).toContain("fails closed");
    expect(contract).toContain("definition (not its name)");
    expect(contract).toContain("transaction-scoped advisory lock");
    expect(contract).toContain("must not issue `BEGIN` or `COMMIT`");
  });
});
