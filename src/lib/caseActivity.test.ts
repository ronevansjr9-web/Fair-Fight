import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./caseActivity.ts", import.meta.url)), "utf8");

function handlerBody(exportName: string) {
  const start = source.indexOf(`export const ${exportName} =`);
  const next = source.indexOf("export const ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

describe("case activity schema bootstrap", () => {
  test("defines both durable tables and indexes", () => {
    expect(source).toContain("CREATE TABLE IF NOT EXISTS timeline_entries");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS calendar_events");
    expect(source).toContain("timeline_entries_case_date_idx");
    expect(source).toContain("calendar_events_case_date_idx");
  });

  test("every timeline and calendar operation bootstraps schema before table access", () => {
    for (const operation of [
      "listTimeline",
      "addTimeline",
      "deleteTimeline",
      "listCalendar",
      "addCalendar",
      "deleteCalendar",
    ]) {
      const body = handlerBody(operation);
      expect(body, operation).toContain("await ensureSchema()");
      const bootstrap = body.indexOf("await ensureSchema()");
      const tableAccess = Math.min(
        ...["timeline_entries", "calendar_events"].map((table) => {
          const index = body.indexOf(table, body.indexOf(".handler"));
          return index === -1 ? Number.POSITIVE_INFINITY : index;
        }),
      );
      expect(bootstrap, operation).toBeLessThan(tableAccess);
    }
  });

  test("all SQL paths scope records through the authenticated case owner", () => {
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
