import { describe, expect, test } from "bun:test";

const migration = await Bun.file(new URL("./000_cases.sql", import.meta.url)).text();
const contract = await Bun.file(new URL("./README.md", import.meta.url)).text();
const runner = await Bun.file(new URL("../scripts/migrate.sh", import.meta.url)).text();

describe("canonical cases migration", () => {
  test("is an atomic, conservative migration for the exact 000 file", () => {
    expect(migration.startsWith("-- Canonical case workspace schema")).toBe(true);
    expect(migration).toMatch(/BEGIN;[\s\S]*DO \$preflight\$/);
    expect(migration).toMatch(/DO \$preflight\$[\s\S]*COMMIT;/);
    expect(migration).toContain("to_regclass('public.cases') IS NULL");
    expect(migration).toContain("id must be a non-null text-compatible key");
    expect(migration).toContain("id must have a single-column primary key");
    expect(migration).toContain("status contains unsupported values");
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS\s+cases/i);
    expect(migration).not.toMatch(/\b(DROP TABLE|TRUNCATE)\b/i);
  });

  test("documents dependency order and existing-database handling", () => {
    expect(contract).toContain("000_cases.sql`, then `001_case_activity.sql`, then `002_payments.sql");
    expect(contract).toContain("never infer history from table presence");
    expect(contract).toContain("Stop on any error");
    expect(contract).toContain("scripts/migrate.sh");
    expect(runner).toContain("schema_migrations");
    expect(runner).toContain("ON_ERROR_STOP=1");
    expect(runner).toContain("000_cases 001_case_activity 002_payments");
    expect(contract).toContain("does not discover files by filename order");
  });
});
