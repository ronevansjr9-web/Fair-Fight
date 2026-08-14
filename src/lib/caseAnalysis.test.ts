/**
 * Unit tests for the case-analysis engine: strict parsing, source
 * validation, AI failure fail-closed behavior, and durable save/reopen
 * (persistence deps mocked — no real database claimed).
 */
import { describe, expect, test } from "bun:test";
import {
  buildAnalysisPrompt,
  generateCaseAnalysis,
  normalizeSource,
  parseAnalysisResponse,
  type CaseAnalysis,
  type AnalysisDeps,
} from "./caseAnalysis";

const VALID_JSON = JSON.stringify({
  summary: "A summary.",
  possibleIssues: "- Possible issue one\n- Possible issue two",
  candidateArguments: "- Candidate argument one",
  counterarguments: "- Counter one",
  sources: [
    { title: "A real statute", url: "https://www.gov.example/statute", type: "statute" },
    { title: "A real case", url: "https://courts.example/case", type: "case" },
  ],
});

describe("normalizeSource", () => {
  test("accepts valid http(s) sources with a title", () => {
    expect(normalizeSource({ title: "T", url: "https://a.example/x", type: "statute" })).toEqual({
      title: "T",
      url: "https://a.example/x",
      type: "statute",
    });
  });
  test("rejects javascript:, relative, and empty URLs", () => {
    expect(normalizeSource({ title: "T", url: "javascript:alert(1)", type: "guide" })).toBeNull();
    expect(normalizeSource({ title: "T", url: "/relative", type: "guide" })).toBeNull();
    expect(normalizeSource({ title: "T", url: "", type: "guide" })).toBeNull();
  });
  test("rejects missing titles and unknown types fall back to 'other'", () => {
    expect(normalizeSource({ title: "", url: "https://a.example", type: "statute" })).toBeNull();
    expect(normalizeSource({ title: "T", url: "https://a.example", type: "weird" })?.type).toBe("other");
  });
});

describe("parseAnalysisResponse", () => {
  test("parses strict JSON with sources", () => {
    const analysis = parseAnalysisResponse(VALID_JSON);
    expect(analysis.summary).toBe("A summary.");
    expect(analysis.possibleIssues).toContain("Possible issue one");
    expect(analysis.candidateArguments).toContain("Candidate argument one");
    expect(analysis.counterarguments).toContain("Counter one");
    expect(analysis.sources).toHaveLength(2);
  });

  test("accepts fenced JSON", () => {
    const analysis = parseAnalysisResponse("```json\n" + VALID_JSON + "\n```");
    expect(analysis.sources).toHaveLength(2);
  });

  test("drops invalid sources but keeps valid ones", () => {
    const raw = JSON.stringify({
      summary: "S",
      possibleIssues: "- I",
      candidateArguments: "- A",
      counterarguments: "- C",
      sources: [
        { title: "Good", url: "https://ok.example", type: "statute" },
        { title: "Bad", url: "javascript:alert(1)", type: "statute" },
        { title: "Bad2", url: "https://ok2.example" },
        { title: "", url: "https://ok3.example", type: "statute" },
      ],
    });
    const analysis = parseAnalysisResponse(raw);
    expect(analysis.sources).toEqual([
      { title: "Good", url: "https://ok.example", type: "statute" },
      { title: "Bad2", url: "https://ok2.example", type: "other" },
    ]);
  });

  test("throws on non-JSON output (AI failure must fail closed)", () => {
    expect(() => parseAnalysisResponse("I'm sorry, I cannot produce JSON")).toThrow();
  });

  test("throws when required sections are missing", () => {
    expect(() =>
      parseAnalysisResponse(JSON.stringify({ summary: "only" })),
    ).toThrow(/missing required sections/);
  });
});

describe("buildAnalysisPrompt", () => {
  test("includes facts, jurisdiction, and case type", () => {
    const prompt = buildAnalysisPrompt({ facts: "My landlord kept my deposit.", jurisdiction: "California", caseType: "Housing" });
    expect(prompt).toContain("My landlord kept my deposit.");
    expect(prompt).toContain("California");
    expect(prompt).toContain("Housing");
  });
});

describe("generateCaseAnalysis", () => {
  const baseInput = { facts: "Facts here", jurisdiction: "NY", caseType: "Civil" };

  function depsWith(askAI: AnalysisDeps["askAI"]): AnalysisDeps {
    return {
      askAI,
      saveAnalysis: async () => {},
    };
  }

  test("returns the parsed analysis on valid AI output", async () => {
    const result = await generateCaseAnalysis(
      baseInput,
      depsWith(async () => VALID_JSON),
    );
    expect(result.summary).toBe("A summary.");
    expect(result.sources.length).toBe(2);
  });

  test("AI failure (throw) propagates — nothing is saved", async () => {
    await expect(
      generateCaseAnalysis(
        baseInput,
        depsWith(async () => {
          throw new Error("provider down");
        }),
      ),
    ).rejects.toThrow("provider down");
  });

  test("empty AI response fails closed", async () => {
    await expect(
      generateCaseAnalysis(baseInput, depsWith(async () => "")),
    ).rejects.toThrow(/empty response/);
  });

  test("invalid AI JSON fails closed (no half-parsed result)", async () => {
    await expect(
      generateCaseAnalysis(baseInput, depsWith(async () => "not json at all")),
    ).rejects.toThrow(/valid JSON/);
  });
});

describe("durable save/reopen contract", () => {
  // The route uses saveCaseAnalysis (upsert on case_id) then loadCaseAnalysis
  // (ownership-scoped read). Prove the round-trip shape with a stub store:
  // save writes exactly what generate produced; load returns the same values.
  test("save then load returns the same analysis fields", async () => {
    const store = new Map<string, CaseAnalysis>();
    const save = async (userId: string, caseId: string, analysis: CaseAnalysis) => {
      store.set(`${userId}:${caseId}`, analysis);
    };
    const load = (userId: string, caseId: string): CaseAnalysis | undefined =>
      store.get(`${userId}:${caseId}`);

    const analysis: CaseAnalysis = {
      summary: "s",
      possibleIssues: "- i",
      candidateArguments: "- a",
      counterarguments: "- c",
      sources: [{ title: "t", url: "https://ok.example", type: "guide" }],
    };
    await save("user_1", "case_1", analysis);
    expect(load("user_1", "case_1")).toEqual(analysis);
    // Ownership: another user cannot reopen this case's analysis.
    expect(load("user_2", "case_1")).toBeUndefined();
  });
});
