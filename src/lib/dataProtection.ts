/**
 * Data-protection primitives for Fair Fight: a single source of truth for
 * "all of a user's data" so self-serve EXPORT and DELETE genuinely cover every
 * category a user can own, scoped so no other user's rows are ever touched.
 *
 * Canonical user-owned surface (verified against the live `public` schema and
 * the migration ledger 001–005, see /home/team/shared/data-flow-inventory-2026-08-20.md):
 *   - cases            (user_id)
 *   - payments         (user_id)
 *   - case_analyses    (user_id)
 *   - timeline_entries (no user_id column — owned via joining cases.user_id)
 *   - calendar_events  (no user_id column — owned via joining cases.user_id)
 *
 * NOT user-owned and excluded here (disclosed honestly in copy): the global
 * `webhook_events` idempotency ledger, Clerk account/session data, and Stripe's
 * own financial records.
 *
 * FAIL-CLOSED: both flows throw on any DB error; callers must surface an honest
 * error rather than return partial/empty data.
 */
import { sql } from "~/db";

export const USER_DATA_CATEGORIES = [
  "cases",
  "payments",
  "case_analyses",
  "timeline_entries",
  "calendar_events",
] as const;

/* ──────────────────────────── EXPORT ──────────────────────────── */

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

export interface UserDataExport {
  schemaVersion: 1;
  exportedAt: string;
  user: { userId: string };
  cases: ExportedCase[];
  caseAnalyses: ExportedCaseAnalysis[];
  payments: ExportedPayment[];
  timelineEntries: ExportedTimelineEntry[];
  calendarEntries: ExportedCalendarEntry[];
}

function s(v: unknown): string {
  return v == null ? "" : String(v);
}
function n(v: unknown): number {
  return v == null ? 0 : Number(v);
}

/**
 * Collect the owning user's COMPLETE data set, ownership-scoped (every query
 * filtered by the user, including the case-owned timeline/calendar via an
 * explicit JOIN on cases.user_id). Throws on any DB error — never returns a
 * partial export. Returns plain JSON-safe data (all timestamps coerced to
 * strings) suitable for the server-fn wire and a JSON file download.
 */
export async function collectUserExport(userId: string): Promise<UserDataExport> {
  const query = sql();
  const [cases, payments, analyses, timeline, calendar] = await Promise.all([
    query`SELECT id,title,case_type,status,jurisdiction,description,created_at,updated_at FROM cases WHERE user_id=${userId} ORDER BY updated_at DESC`,
    query`SELECT id,case_id,amount_cents,currency,status,created_at FROM payments WHERE user_id=${userId} ORDER BY created_at DESC`,
    query`SELECT id,case_id,facts,jurisdiction,summary,possible_issues,candidate_arguments,counterarguments,sources,model,status,created_at,updated_at FROM case_analyses WHERE user_id=${userId} ORDER BY updated_at DESC`,
    query`SELECT t.id,t.case_id,t.event_date,t.title,t.description,t.created_at FROM timeline_entries t JOIN cases c ON c.id=t.case_id WHERE c.user_id=${userId} ORDER BY t.event_date,t.created_at`,
    query`SELECT e.id,e.case_id,e.event_date,e.title,e.event_type,e.notes,e.created_at FROM calendar_events e JOIN cases c ON c.id=e.case_id WHERE c.user_id=${userId} ORDER BY e.event_date,e.created_at`,
  ]);

  const out: UserDataExport = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    user: { userId },
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
      sources: a.sources,
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
      description: s(t.description ?? ""),
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
  };
  return out;
}

/* ──────────────────────────── DELETE ──────────────────────────── */

/**
 * Delete ALL of the owning user's rows in dependency-safe order, inside ONE
 * Postgres transaction (Neon non-interactive transaction over HTTP — either all
 * deletes commit or none do). Ownership is enforced on every statement:
 *
 *  - `case_analyses`, `payments`, `cases` have a `user_id` column → filter on it.
 *  - `timeline_entries`/`calendar_events` have no `user_id` → delete via JOIN to
 *    `cases` filtered on `cases.user_id` (so only rows under the user's cases are
 *    removed, and no other user's rows are touched).
 *
 * Order respects FKs: children that reference `cases` are removed before (and
 * the child rows are keyed off the user's cases) so `cases` deletion never
 * violates a foreign key. Throws on error so callers fail closed.
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  const query = sql();
  await query.transaction((txn) => [
    // Directly user-owned children of cases (explicit, ownership-scoped).
    txn`DELETE FROM case_analyses WHERE user_id=${userId}`,
    // Case-owned children with no user_id column — scope via cases.user_id.
    txn`DELETE FROM timeline_entries t USING cases c WHERE t.case_id=c.id AND c.user_id=${userId}`,
    txn`DELETE FROM calendar_events e USING cases c WHERE e.case_id=c.id AND c.user_id=${userId}`,
    // Directly user-owned, independent of cases.
    txn`DELETE FROM payments WHERE user_id=${userId}`,
    // Base user-owned rows last (children above removed first).
    txn`DELETE FROM cases WHERE user_id=${userId}`,
  ]);
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
