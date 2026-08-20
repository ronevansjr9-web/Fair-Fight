/**
 * Regression tests for the case-analysis reopen serialization contract.
 *
 * Background (2026-08-20, reopen bug): once a durable `case_analyses` row
 * exists, `getAnalysisStatus` (routes/analysis.tsx) returns the loaded
 * analysis object across the TanStack server-function RPC boundary. The Neon
 * serverless driver returns `timestamptz` columns as JS `Date` objects and
 * `jsonb` as parsed objects/arrays. If any such non-JSON value leaked into the
 * returned object the client `.catch()` fires → "Case Analysis Unavailable",
 * even though the case is owned + entitled. These tests prove
 * `mapCaseAnalysisRow` (the pure mapping used by `loadCaseAnalysis`) always
 * yields a JSON-safe object (no `Date`, no BigInt) so a durable row always
 * reopens with the saved content.
 *
 * The mapping is passed a fixture that mirrors the real Neon driver output
 * (Date timestamps + a parsed jsonb sources array), so no `~/db` mock is
 * needed and there is no cross-file mock leakage.
 */
import { describe, expect, test } from "bun:test";
import { mapCaseAnalysisRow, type CaseAnalysisRow } from "./caseAnalysisStore";
import type { LegalSource } from "./caseAnalysis";

/** Mimics `@neondatabase/serverless` output for a real row: Date timestamps. */
function rawRow(overrides: Record<string, unknown> = {}) {
  return {
    facts: "Moved out; landlord kept the $2,300 deposit without itemized accounting.",
    jurisdiction: "California",
    summary: "A plain-English summary.",
    possible_issues: "- Possible issue A\n- Possible issue B",
    candidate_arguments: "- Candidate argument A\n- Candidate argument B",
    counterarguments: "- Counterargument A\n- Counterargument B",
    sources: [
      {
        title: "California Civil Code Section 1950.5",
        url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1950.5",
        type: "statute",
      },
      { title: "Granberry v. Islay Investments, 9 Cal. 4th 738 (1995)", url: "https://scholar.google.com/scholar_case?case=1", type: "case" },
    ],
    model: "gemini-3.6-flash",
    created_at: new Date("2026-08-20T02:35:44.951Z"),
    updated_at: new Date("2026-08-20T02:35:44.951Z"),
    ...overrides,
  };
}

/** Asserts a value is JSON-safe: stringify works and no Date/BigInt leaks. */
function expectJsonSafe(value: unknown) {
  expect(() => JSON.stringify(value)).not.toThrow();
  if (Array.isArray(value)) {
    for (const item of value) expectJsonSafe(item);
  } else if (value && typeof value === "object") {
    expect(value).not.toBeInstanceOf(Date);
    for (const v of Object.values(value as Record<string, unknown>)) expectJsonSafe(v);
  } else {
    expect(["string", "number", "boolean", "undefined"].includes(typeof value)).toBe(true);
  }
}

describe("mapCaseAnalysisRow serialization contract (reopen path)", () => {
  test("coerces Date timestamps to strings and keeps sources as a plain array", () => {
    const mapped = mapCaseAnalysisRow(rawRow());
    expect(typeof mapped.facts).toBe("string");
    expect(typeof mapped.summary).toBe("string");
    expect(typeof mapped.possibleIssues).toBe("string");
    expect(typeof mapped.candidateArguments).toBe("string");
    expect(typeof mapped.counterarguments).toBe("string");
    expect(typeof mapped.model).toBe("string");
    // The Neon driver hands us Date objects — the mapping MUST stringify them.
    expect(typeof mapped.createdAt).toBe("string");
    expect(typeof mapped.updatedAt).toBe("string");
    // A time value survives as a parseable date string (never a leaked Date).
    expect(Number.isNaN(Date.parse(mapped.updatedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(mapped.createdAt))).toBe(false);
    expect(Array.isArray(mapped.sources)).toBe(true);
    expect(mapped.sources.length).toBe(2);
    for (const s of mapped.sources) {
      expect(typeof s.title).toBe("string");
      expect(typeof s.url).toBe("string");
    }
  });

  test("the mapped durable row reopens with the exact saved content", () => {
    const mapped = mapCaseAnalysisRow(rawRow());
    expect(mapped.summary).toBe("A plain-English summary.");
    expect(mapped.candidateArguments).toContain("Candidate argument A");
    expect(mapped.model).toBe("gemini-3.6-flash");
    expect(mapped.sources.map((s: LegalSource) => s.title)).toEqual([
      "California Civil Code Section 1950.5",
      "Granberry v. Islay Investments, 9 Cal. 4th 738 (1995)",
    ]);
  });

  test("the whole returned object contains only JSON-safe primitives/arrays (round-trip)", () => {
    const mapped = mapCaseAnalysisRow(rawRow());
    expectJsonSafe(mapped);
    // Full JSON round-trip: serializing and parsing must yield the same data,
    // proving nothing was lost to a Date/BigInt (which would become a string).
    const roundTripped = JSON.parse(JSON.stringify(mapped)) as CaseAnalysisRow;
    expect(roundTripped).toEqual(mapped);
  });

  test("handles a sources jsonb column returned as a JSON string", () => {
    const mapped = mapCaseAnalysisRow(
      rawRow({ sources: JSON.stringify([{ title: "A", url: "https://a.example", type: "guide" }]) }),
    );
    expect(mapped.sources).toEqual([{ title: "A", url: "https://a.example", type: "guide" }]);
    expectJsonSafe(mapped);
  });

  test("defaults empty / null columns safely without leaking", () => {
    const mapped = mapCaseAnalysisRow(rawRow({ facts: null, sources: null, created_at: null, updated_at: null }));
    expect(mapped.facts).toBe("");
    expect(mapped.updatedAt).toBe("null"); // String(null) === "null"; safe, no Date
    expect(mapped.sources).toEqual([]);
    expectJsonSafe(mapped);
  });
});
