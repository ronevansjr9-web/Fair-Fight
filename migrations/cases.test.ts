import { describe, expect, test } from "bun:test";

const migration = await Bun.file(new URL("./000_cases.sql", import.meta.url)).text();
const contract = await Bun.file(new URL("./README.md", import.meta.url)).text();
const runner = await Bun.file(new URL("../scripts/migrate.sh", import.meta.url)).text();
const allMigrations = await Promise.all(["001_case_activity.sql", "002_payments.sql"].map((f) => Bun.file(new URL(`./${f}`, import.meta.url)).text()));

describe("canonical cases migration", () => {
  test("preflights every canonical definition and fails closed", () => {
    for (const column of ["id", "user_id", "title", "case_type", "status", "jurisdiction", "description", "created_at", "updated_at"]) expect(migration).toContain(`('${column}'`);
    expect(migration).toContain("format_type");
    expect(migration).toContain("actual_not_null");
    expect(migration).toContain("pg_get_expr");
    expect(migration).toContain("pg_get_constraintdef");
    expect(migration).toContain("status contains unsupported values");
    expect(migration).toContain("single-column primary key");
    expect(migration).toContain("canonical safe default");
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS\s+cases/i);
    expect(migration).not.toMatch(/\b(DROP TABLE|TRUNCATE)\b/i);
  });

  test("rejects bounded varchar and invalid id/default/nullability contracts", () => {
    expect(migration).toContain("IF actual_type <> expected.type_name");
    expect(migration).not.toContain("character varying%");
    expect(migration).toContain("IF expected.required_not_null AND NOT actual_not_null");
    expect(migration).toContain("IF id_pk_columns <> 1 OR NOT id_pk_ok OR NOT id_default_ok");
    expect(migration).toContain("public.cases");
    expect(migration).toContain("regexp_replace(lower(actual_default)");
    expect(migration).toContain("timestamp with time zone");
    expect(migration).toContain("status_constraint_count <> 1 OR canonical_status_count <> 1");
    expect(migration).toContain("existing status constraint is noncanonical");
  });

  test("fresh and existing contracts are explicit and restrictive variants fail closed", () => {
    expect(migration).toMatch(/CREATE TABLE public\.cases[\s\S]*id TEXT PRIMARY KEY DEFAULT md5/);
    expect(migration).toMatch(/id_pk_columns[\s\S]*id_pk_ok[\s\S]*id_default_ok/);
    expect(migration).toContain("actual_default IS NULL");
    expect(migration).toContain("status_constraint_count > 0 AND (status_constraint_count <> 1 OR canonical_status_count <> 1)");
    expect(migration).toContain("pg_get_constraintdef(c.oid, true)");
  });

  test("runner emits literal psql commands and quotes migration paths", () => {
    expect(runner).toContain("'\\if :already_applied'");
    expect(runner).toContain("\\i '$file_sql'");
    expect(runner).toContain("sql_quote()");
    expect(runner).not.toMatch(/printf "\\\\echo/);
    expect(runner).not.toContain("|| true");
    expect(runner).toContain("--set=ON_ERROR_STOP=1");
  });

  test("runner owns transactions, lock, and ledger sequencing", () => {
    expect(runner).toContain("pg_advisory_xact_lock");
    expect(runner).toContain("SELECT EXISTS");
    expect(runner).toContain("\\\\gset");
    expect(runner).toContain("INSERT INTO public.schema_migrations");
    expect(runner).toContain("COMMIT;");
    expect(runner).not.toContain("grep -q");
    for (const sql of allMigrations) {
      expect(sql).not.toMatch(/^\s*(BEGIN|COMMIT);/m);
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\./);
      expect(sql).not.toMatch(/REFERENCES cases\b/);
    }
    expect(allMigrations[0]).toContain("REFERENCES public.cases(id)");
    expect(allMigrations[1]).toContain("public.payments");
  });

  test("docs state the exact compatibility and transaction contract", () => {
    expect(contract).toContain("text/varchar");
    expect(contract).toContain("fails closed");
    expect(contract).toContain("definition (not its name)");
    expect(contract).toContain("transaction-scoped advisory lock");
    expect(contract).toContain("must not issue `BEGIN` or `COMMIT`");
  });
});
