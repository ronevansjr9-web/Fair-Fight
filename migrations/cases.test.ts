import { describe, expect, test } from "bun:test";

const migration = await Bun.file(new URL("./000_cases.sql", import.meta.url)).text();

describe("canonical cases migration", () => {
  test("is idempotent and defines only the case workspace contract", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS cases");
    expect(migration).toContain("id TEXT PRIMARY KEY");
    expect(migration).toContain("user_id TEXT NOT NULL");
    for (const column of ["title", "case_type", "status", "jurisdiction", "description", "created_at", "updated_at"]) {
      expect(migration).toContain(`${column} `);
    }
    expect(migration).toContain("CONSTRAINT cases_status_check");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS cases_user_updated_idx");
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS (?!cases\b)/);
    expect(migration).not.toContain("DROP TABLE");
    expect(migration).not.toContain("TRUNCATE");
  });

  test("case id remains compatible with activity foreign keys", () => {
    expect(migration).toMatch(/id TEXT PRIMARY KEY/);
    expect(migration).toMatch(/ON DELETE CASCADE|--/);
  });
});
