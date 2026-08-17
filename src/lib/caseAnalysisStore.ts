/**
 * Durable case_analyses persistence. All reads enforce exact ownership in the
 * WHERE clause (user_id + case_id), never trusting the client.
 */
import { sql } from "~/db";
import type { CaseAnalysis, LegalSource } from "./caseAnalysis";

export interface CaseAnalysisRow extends CaseAnalysis {
  facts: string;
  jurisdiction: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeSources(value: unknown): LegalSource[] {
  if (Array.isArray(value)) {
    return value.filter(
      (s): s is LegalSource =>
        !!s && typeof s === "object" && typeof (s as LegalSource).title === "string" && typeof (s as LegalSource).url === "string",
    );
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeSources(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

/** One analysis per case: upsert on case_id (regenerate overwrites in place). */
export async function saveCaseAnalysis(row: {
  userId: string;
  caseId: string;
  facts: string;
  jurisdiction: string;
  analysis: CaseAnalysis;
  model: string;
}): Promise<void> {
  const query = sql();
  await query`
    INSERT INTO case_analyses
      (case_id, user_id, facts, jurisdiction, summary, possible_issues, candidate_arguments, counterarguments, sources, model, status, created_at, updated_at)
    VALUES
      (${row.caseId}, ${row.userId}, ${row.facts}, ${row.jurisdiction}, ${row.analysis.summary}, ${row.analysis.possibleIssues}, ${row.analysis.candidateArguments}, ${row.analysis.counterarguments}, ${JSON.stringify(row.analysis.sources)}::jsonb, ${row.model}, 'completed', NOW(), NOW())
    ON CONFLICT (case_id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      facts = EXCLUDED.facts,
      jurisdiction = EXCLUDED.jurisdiction,
      summary = EXCLUDED.summary,
      possible_issues = EXCLUDED.possible_issues,
      candidate_arguments = EXCLUDED.candidate_arguments,
      counterarguments = EXCLUDED.counterarguments,
      sources = EXCLUDED.sources,
      model = EXCLUDED.model,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;
}

/**
 * Load the saved analysis for a case, but ONLY when the requesting user owns
 * the case (ownership enforced inside the query itself).
 */
export async function loadCaseAnalysis(userId: string, caseId: string): Promise<CaseAnalysisRow | null> {
  const rows = await sql()`
    SELECT case_id, user_id, facts, jurisdiction, summary, possible_issues, candidate_arguments, counterarguments, sources, model, created_at, updated_at
    FROM case_analyses
    WHERE case_id = ${caseId} AND user_id = ${userId}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    facts: String(r.facts ?? ""),
    jurisdiction: String(r.jurisdiction ?? ""),
    summary: String(r.summary ?? ""),
    possibleIssues: String(r.possible_issues ?? ""),
    candidateArguments: String(r.candidate_arguments ?? ""),
    counterarguments: String(r.counterarguments ?? ""),
    sources: normalizeSources(r.sources),
    model: String(r.model ?? ""),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
