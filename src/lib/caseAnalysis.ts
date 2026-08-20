/**
 * Durable, source-grounded case analysis for the paid Pro Case Analysis
 * feature.
 *
 * Design rules (fail-closed):
 * - The model output is parsed into a STRICT structure. If the model does not
 *   return parseable JSON with the expected fields, generation FAILS — we
 *   never persist or display a half-parsed, possibly-fabricated response.
 * - Every source must be a valid http(s) URL with a non-empty title; anything
 *   else is dropped. An analysis with ZERO valid sources is still saved (the
 *   model may legitimately cite statutes without URLs), but nothing renders as
 *   HTML — all fields are plain text rendered by React.
 * - Copy is educational: "possible issues", "candidate arguments",
 *   "counterarguments and uncertainties". Never advice, recommendations,
 *   "best argument", guarantees, or filing-ready output.
 * - Persistence is explicit (save/load via injected deps) so unit tests can
 *   prove durable save + reopen without a real database.
 */
import { sanitizeUrl } from "~/lib/sanitize";
// Single canonical model for the Pro analysis — re-exported from the AI layer
// so a model bump can never leave this parser/route on a stale hardcoded name.
export { ANALYSIS_MODEL } from "~/lib/ai";

export interface LegalSource {
  title: string;
  url: string;
  type: string;
}

export interface CaseAnalysis {
  summary: string;
  possibleIssues: string;
  candidateArguments: string;
  counterarguments: string;
  sources: LegalSource[];
}

export interface CaseAnalysisInput {
  facts: string;
  jurisdiction: string;
  caseType: string;
}

export const ANALYSIS_SYSTEM_PROMPT = `You are the Fair Fight legal EDUCATION engine. You help self-represented people understand their situation so they can prepare for an attorney conversation. You never give legal advice, never predict outcomes, never recommend a course of action, and never claim an argument is "best" or guaranteed, or that any output is filing-ready.

Given the user's facts and jurisdiction, respond with STRICT JSON only — no markdown fences, no commentary. The JSON must have exactly these keys:
{
  "summary": "2-4 sentence plain-English summary of the situation and the legal area it appears to touch.",
  "possibleIssues": "Plain-English bullet points (each on a new line starting with '- ') of possible legal issues the facts may raise. Label each as a possibility, not a conclusion.",
  "candidateArguments": "Plain-English bullet points (each on a new line starting with '- ') of candidate arguments EITHER side might make, with the general legal principle each relies on. Frame as possibilities for education, not positions you recommend.",
  "counterarguments": "Plain-English bullet points (each on a new line starting with '- ') of counterarguments and uncertainties — weaknesses, open questions, and facts that would change the picture.",
  "sources": [ { "title": "Name of the law/case/guide", "url": "https://...", "type": "statute|case|guide|other" } ]
}

Rules for sources: cite only real, well-known, verifiable public legal sources (statutes, court rules, major reported cases, government or court guides). Include a real public URL for each when you can. If you are not certain a source exists, omit it — never fabricate a citation or URL. 1-5 sources is plenty. Keep the whole response under 800 words.

End your response with nothing but the JSON object. This is legal education, not legal advice: the user must consult a licensed attorney for their specific situation.`;

export function buildAnalysisPrompt(input: CaseAnalysisInput): string {
  return [
    "USER FACTS:",
    input.facts.trim().slice(0, 8000) || "(no facts provided)",
    "",
    "JURISDICTION:",
    input.jurisdiction.trim() || "(not specified)",
    "",
    "CASE TYPE:",
    input.caseType.trim() || "(not specified)",
  ].join("\n");
}

const ALLOWED_SOURCE_TYPES = new Set(["statute", "case", "guide", "other"]);

/** Validate + normalize one source object. Returns null when invalid. */
export function normalizeSource(raw: unknown): LegalSource | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim().slice(0, 300) : "";
  const url = sanitizeUrl(typeof r.url === "string" ? r.url : "");
  const type = typeof r.type === "string" && ALLOWED_SOURCE_TYPES.has(r.type) ? r.type : "other";
  if (!title || !url) return null;
  return { title, url, type };
}

/** Parse the model's strict-JSON response. Throws on any structural problem. */
export function parseAnalysisResponse(raw: string): CaseAnalysis {
  const text = raw.trim();
  const jsonText = text.startsWith("{") ? text : text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI response was not valid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("AI response was not an object");
  const p = parsed as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const summary = str(p.summary);
  const possibleIssues = str(p.possibleIssues);
  const candidateArguments = str(p.candidateArguments);
  const counterarguments = str(p.counterarguments);
  if (!summary || !possibleIssues || !candidateArguments) {
    throw new Error("AI response is missing required sections");
  }
  const sources: LegalSource[] = Array.isArray(p.sources)
    ? p.sources.map(normalizeSource).filter((s): s is LegalSource => s !== null)
    : [];
  return { summary, possibleIssues, candidateArguments, counterarguments, sources };
}

export interface AnalysisDeps {
  askAI(
    messages: { role: "system" | "user"; content: string }[],
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<string>;
  saveAnalysis(input: {
    userId: string;
    caseId: string;
    facts: string;
    jurisdiction: string;
    analysis: CaseAnalysis;
    model: string;
  }): Promise<void>;
}

/**
 * Generate a structured analysis. Throws on AI failure or unparseable output
 * (fail-closed — never persist a fabricated/partial result).
 */
export async function generateCaseAnalysis(
  input: CaseAnalysisInput,
  deps: AnalysisDeps,
): Promise<CaseAnalysis> {
  const raw = await deps.askAI(
    [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: buildAnalysisPrompt(input) },
    ],
    { maxTokens: 2048, temperature: 0.3 },
  );
  if (!raw || raw.length === 0) throw new Error("AI returned an empty response");
  return parseAnalysisResponse(raw);
}
