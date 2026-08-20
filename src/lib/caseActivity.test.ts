import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const source = readFileSync(fileURLToPath(new URL("./caseActivity.ts", import.meta.url)), "utf8");
function handlerBody(exportName: string) {
  const start = source.indexOf(`export const ${exportName} =`);
  const next = source.indexOf("export const ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}
describe("case activity schema policy", () => {
  test("never issues request-time DDL — schema is migration-managed only", () => {
    // The timeline/calendar tables and indexes are created solely by the
    // locked, transactional migration runner (migrations/001_case_activity.sql,
    // `bun run migrate`). No request-time CREATE TABLE / CREATE INDEX allowed.
    expect(source).not.toContain("CREATE TABLE");
    expect(source).not.toContain("CREATE INDEX");
    expect(source).not.toContain("ensureSchema");
    expect(source).toContain("migrations/001_case_activity.sql");
  });
  test("every timeline and calendar operation reads and writes only with an owner-scoped query", () => {
    for (const operation of [
      "listTimeline",
      "addTimeline",
      "deleteTimeline",
      "listCalendar",
      "addCalendar",
      "deleteCalendar",
    ]) {
      const body = handlerBody(operation);
      expect(body, operation).toContain("userId");
      expect(body, operation).toContain("caseId");
      expect(body, operation).toContain("cases");
    }
  });
});
