/**
 * Data-protection primitives: portable export and permanent deletion of ONE
 * user's complete data set, ownership-scoped.
 *
 * Wave 5 (2026-08): export/delete are LIVE. Every query is filtered by the
 * authenticated user (directly on user_id, or via an explicit JOIN to
 * `cases` filtered on cases.user_id for case-owned children like
 * timeline/calendar/evidence). Deletion runs inside ONE Postgres transaction
 * (Neon non-interactive transaction over HTTP — either all deletes commit or
 * none do) and returns exact per-table counts of the rows that were deleted,
 * so the caller can audit the operation truthfully.
 *
 * Honest boundaries (also surfaced in UI copy and in the export file itself):
 *  - evidence export contains METADATA ONLY (filename, type, size) — the
 *    bytea file contents are never exported or read.
 *  - audit_logs rows for the user are exported and deleted with the rest;
 *    the DATA_DELETED operational row is written AFTER the transaction by the
 *    caller so the operational log retains exactly one row.
 *  - deleting payment rows locally does NOT delete Stripe's records — Stripe
 *    retains its own payment records independently.
 */
import { sql } from "~/db";

export const USER_DATA_CATEGORIES = [
  "cases",
  "case_analyses",
  "payments",
  "timeline_entries",
  "calendar_events",
  "evidence_files",
  "audit_logs",
] as const;

export interface ExportedCase {
  id: string;
  title: string;
  caseType: string;
  status: string;
  jurisdiction: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
export interface ExportedCaseAnalysis {
  id: string;
  caseId: string;
  facts: string;
  jurisdiction: string;
  summary: string;
  possibleIssues: string;
  candidateArguments: string;
  counterarguments: string;
  sources: unknown;
  model: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export interface ExportedPayment {
  id: string;
  caseId: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}
export interface ExportedTimelineEntry {
  id: string;
  caseId: string;
  date: string;
  title: string;
  description: string;
  createdAt: string;
}
export interface ExportedCalendarEntry {
  id: string;
  caseId: string;
  date: string;
  title: string;
  type: string;
  notes: string;
  createdAt: string;
}
/** Evidence file METADATA only — the bytea file contents are never exported. */
export interface ExportedEvidenceFile {
  id: string;
  caseId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
export interface ExportedAuditLog {
  action: string;
  resource: string;
  details: string | null;
  createdAt: string;
}
export interface UserDataExport {
  schemaVersion: 2;
  exportedAt: string;
  user: { clerkUserId: string };
  /**
   * Honest notes shipped inside the export file itself, so a user reading the
   * JSON knows exactly what is and isn't in it.
   */
  notes: {
    evidenceFiles: string;
    payments: string;
    auditLogs: string;
  };
  data: {
    cases: ExportedCase[];
    caseAnalyses: ExportedCaseAnalysis[];
    payments: ExportedPayment[];
    timelineEntries: ExportedTimelineEntry[];
    calendarEntries: ExportedCalendarEntry[];
    evidenceFiles: ExportedEvidenceFile[];
    auditLogs: ExportedAuditLog[];
  };
}
export interface UserDeleteCounts {
  evidenceFiles: number;
  caseAnalyses: number;
  timelineEntries: number;
  calendarEvents: number;
  payments: number;
  cases: number;
  auditLogs: number;
}
function s(v: unknown): string {
  return v == null ? "" : String(v);
}
function n(v: unknown): number {
  return v == null ? 0 : Number(v);
}
/**
 * Collect the owning user's COMPLETE data set, ownership-scoped (every query
 * filtered by the user, including the case-owned timeline/calendar/evidence
 * via an explicit JOIN on cases.user_id). Throws on any DB error — never
 * returns a partial export. Returns plain JSON-safe data (all timestamps
 * coerced to strings) suitable for a JSON file download.
 */
export async function collectUserExport(userId: string): Promise<UserDataExport> {
  const query = sql();
  const [cases, payments, analyses, timeline, calendar, evidence, auditLogs] =
    await Promise.all([
      query`SELECT id,title,case_type,status,jurisdiction,description,created_at,updated_at FROM cases WHERE user_id=${userId} ORDER BY updated_at DESC`,
      query`SELECT id,case_id,amount_cents,currency,status,created_at FROM payments WHERE user_id=${userId} ORDER BY created_at DESC`,
      query`SELECT id,case_id,facts,jurisdiction,summary,possible_issues,candidate_arguments,counterarguments,sources,model,status,created_at,updated_at FROM case_analyses WHERE user_id=${userId} ORDER BY updated_at DESC`,
      query`SELECT t.id,t.case_id,t.event_date,t.title,t.description,t.created_at FROM timeline_entries t JOIN cases c ON c.id=t.case_id WHERE c.user_id=${userId} ORDER BY t.event_date,t.created_at`,
      query`SELECT e.id,e.case_id,e.event_date,e.title,e.event_type,e.notes,e.created_at FROM calendar_events e JOIN cases c ON c.id=e.case_id WHERE c.user_id=${userId} ORDER BY e.event_date,e.created_at`,
      // METADATA ONLY — the bytea `data` column is deliberately never selected.
      query`SELECT e.id,e.case_id,e.filename,e.mime_type,e.size_bytes,e.created_at FROM evidence_files e JOIN cases c ON c.id=e.case_id WHERE c.user_id=${userId} ORDER BY e.created_at DESC,e.filename`,
      query`SELECT action,resource,details,created_at FROM audit_logs WHERE user_id=${userId} ORDER BY created_at DESC`,
    ]);
  const out: UserDataExport = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    user: { clerkUserId: userId },
    notes: {
      evidenceFiles:
        "Evidence file contents are NOT included in this export — only metadata (filename, type, size). File contents are stored as blobs and are not downloadable.",
      payments:
        "Payment records are your Fair Fight records. Stripe retains its own independent payment records outside this app.",
      auditLogs:
        "Audit log entries for your account are included. The DATA_EXPORTED entry for this export is written after the snapshot and is not in it.",
    },
    data: {
      cases: (cases as Record<string, unknown>[]).map((c) => ({
        id: s(c.id),
        title: s(c.title),
        caseType: s(c.case_type),
        status: s(c.status),
        jurisdiction: s(c.jurisdiction),
        description: s(c.description),
        createdAt: s(c.created_at),
        updatedAt: s(c.updated_at),
      })),
      caseAnalyses: (analyses as Record<string, unknown>[]).map((a) => ({
        id: s(a.id),
        caseId: s(a.case_id),
        facts: s(a.facts),
        jurisdiction: s(a.jurisdiction),
        summary: s(a.summary),
        possibleIssues: s(a.possible_issues),
        candidateArguments: s(a.candidate_arguments),
        counterarguments: s(a.counterarguments),
        sources: a.sources ?? null,
        model: s(a.model),
        status: s(a.status),
        createdAt: s(a.created_at),
        updatedAt: s(a.updated_at),
      })),
      payments: (payments as Record<string, unknown>[]).map((p) => ({
        id: s(p.id),
        caseId: s(p.case_id),
        amountCents: n(p.amount_cents),
        currency: s(p.currency),
        status: s(p.status),
        createdAt: s(p.created_at),
      })),
      timelineEntries: (timeline as Record<string, unknown>[]).map((t) => ({
        id: s(t.id),
        caseId: s(t.case_id),
        date: s(t.event_date).slice(0, 10),
        title: s(t.title),
        description: s(t.description),
        createdAt: s(t.created_at),
      })),
      calendarEntries: (calendar as Record<string, unknown>[]).map((e) => ({
        id: s(e.id),
        caseId: s(e.case_id),
        date: s(e.event_date).slice(0, 10),
        title: s(e.title),
        type: s(e.event_type),
        notes: s(e.notes ?? ""),
        createdAt: s(e.created_at),
      })),
      evidenceFiles: (evidence as Record<string, unknown>[]).map((e) => ({
        id: s(e.id),
        caseId: s(e.case_id),
        filename: s(e.filename),
        mimeType: s(e.mime_type),
        sizeBytes: n(e.size_bytes),
        createdAt: s(e.created_at),
      })),
      auditLogs: (auditLogs as Record<string, unknown>[]).map((l) => ({
        action: s(l.action),
        resource: s(l.resource),
        details: l.details == null ? null : String(l.details),
        createdAt: s(l.created_at),
      })),
    },
  };
  return out;
}
/* ──────────────────────────── DELETE ──────────────────────────── */
/**
 * Delete ALL of the owning user's rows in dependency-safe order, inside ONE
 * Postgres transaction (Neon non-interactive transaction over HTTP — either
 * all deletes commit or none do). Ownership is enforced on every statement:
 *
 *  - `case_analyses`, `payments`, `cases`, `audit_logs` have a `user_id`
 *    column → filter on it.
 *  - `timeline_entries`, `calendar_events`, `evidence_files` have no usable
 *    user ownership → delete via JOIN to `cases` filtered on `cases.user_id`
 *    (so only rows under the user's cases are removed, and no other user's
 *    rows are touched).
 *
 * Order respects FKs: children that reference `cases` are removed before (and
 * the child rows are keyed off the user's cases) so `cases` deletion never
 * violates a foreign key. The user's audit_logs rows are deleted inside the
 * same transaction; the caller writes the DATA_DELETED operational row AFTER
 * the transaction so the operational log retains exactly one row.
 *
 * Each DELETE uses RETURNING so the function returns exact per-table counts of
 * the rows actually deleted (all-or-nothing: if any statement fails, the whole
 * transaction rolls back and nothing is deleted). Throws on error so callers
 * fail closed.
 */
export async function deleteAllUserData(userId: string): Promise<UserDeleteCounts> {
  const query = sql();
  const results = await query.transaction((txn) => [
    // Case-owned children with no user_id column — scope via cases.user_id.
    txn`DELETE FROM evidence_files e USING cases c WHERE e.case_id=c.id AND c.user_id=${userId} RETURNING e.id`,
    // Directly user-owned children of cases (explicit, ownership-scoped).
    txn`DELETE FROM case_analyses WHERE user_id=${userId} RETURNING id`,
    txn`DELETE FROM timeline_entries t USING cases c WHERE t.case_id=c.id AND c.user_id=${userId} RETURNING t.id`,
    txn`DELETE FROM calendar_events e USING cases c WHERE e.case_id=c.id AND c.user_id=${userId} RETURNING e.id`,
    // Directly user-owned, independent of cases.
    txn`DELETE FROM payments WHERE user_id=${userId} RETURNING id`,
    // The user's audit rows go with the rest (the DATA_DELETED operational
    // row is written by the caller AFTER this transaction).
    txn`DELETE FROM audit_logs WHERE user_id=${userId} RETURNING id`,
    // Base user-owned rows last (children above removed first).
    txn`DELETE FROM cases WHERE user_id=${userId} RETURNING id`,
  ]);
  const count = (r: unknown): number => Array.isArray(r) ? r.length : 0;
  const [evidenceFiles, caseAnalyses, timelineEntries, calendarEvents, payments, auditLogs, cases] = results;
  return {
    evidenceFiles: count(evidenceFiles),
    caseAnalyses: count(caseAnalyses),
    timelineEntries: count(timelineEntries),
    calendarEvents: count(calendarEvents),
    payments: count(payments),
    cases: count(cases),
    auditLogs: count(auditLogs),
  };
}
/* ─────────────────── PROFILE PAYMENT HISTORY ─────────────────── */
export interface PaymentHistoryRecord {
  id: string;
  caseId: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}
/**
 * Ownership-scoped payment history for the profile view. Returns only the
 * authenticated user's own `payments` rows (what is actually queryable in our
 * DB — never invents Stripe-detail we don't store). Fail-closed: returns an
 * empty list on error rather than leaking/exposing anything.
 */
export async function listUserPayments(userId: string): Promise<PaymentHistoryRecord[]> {
  try {
    const rows = (await sql()`SELECT id,case_id,amount_cents,currency,status,created_at FROM payments WHERE user_id=${userId} ORDER BY created_at DESC`) as Record<string, unknown>[];
    return rows.map((p) => ({
      id: s(p.id),
      caseId: s(p.case_id),
      amountCents: n(p.amount_cents),
      currency: s(p.currency),
      status: s(p.status),
      createdAt: s(p.created_at),
    }));
  } catch (error) {
    console.error("[DATAPROTECT] Failed to list payments:", error);
    return [];
  }
}
