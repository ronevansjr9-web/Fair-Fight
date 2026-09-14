import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/tanstack-react-start";
import { getCurrentAuth } from "~/lib/auth";
import { fetchAuthedData } from "~/lib/caseFetchGate";
import { sql } from "~/db";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Fair Fight" },
      { name: "description", content: "Fair Fight administrative dashboard." },
    ],
  }),
});

/**
 * Admin allowlist, read from the environment at server-module load.
 * Format: comma-separated Clerk user ids, e.g. "user_abc,user_def".
 * NEVER a client-side value — this module runs in the server bundle only.
 */
const ADMIN_IDS: string[] = (process.env.ADMIN_CLERK_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

type AdminData = {
  totalCases: number;
  totalUsers: number;
  recentAnalyses: {
    caseId: string;
    title: string;
    status: string;
    model: string;
    createdAt: string;
  }[];
  // Not a users table — Fair Fight stores no users table on master. These are
  // derived from the most recent cases and labeled as such in the UI.
  recentCaseOwners: { userId: string; createdAt: string }[];
};

/**
 * Honest result contract:
 * - Unauthorized (signed out OR not allowlisted): `{ authorized: false }` ONLY —
 *   no counts, no reason, no hints about the allowlist.
 * - Authorized + success: real counts and lists.
 * - Authorized + DB failure: `{ authorized: true, ok: false, reason: "unavailable" }`
 *   — explicit error state, NEVER zero counts (zero counts would be a
 *   misleading "no users/cases" claim on a broken dashboard).
 */
type AdminResult =
  | { authorized: false }
  | { authorized: true; ok: true; data: AdminData }
  | { authorized: true; ok: false; reason: "unavailable" };

// POST, not GET: TanStack Start's GET server-fn transport serializes the
// request differently and in this runtime the authenticated GET path does not
// carry the Clerk session through getCurrentAuth (proven pattern — see
// dashboard.tsx, chat.tsx). No-validator POST fn (validator-compiled POST fns
// lose the request lifecycle getCurrentAuth() needs — PR #46). Auth + allowlist
// gate FIRST, before any query.
const getAdminStats = createServerFn({ method: "POST" }).handler(async (): Promise<AdminResult> => {
  const auth = await getCurrentAuth();
  if (!auth.userId || !ADMIN_IDS.includes(auth.userId)) {
    return { authorized: false };
  }
  try {
    // Real queries against existing tables only (cases, payments, case_analyses).
    const caseCount = await sql()`SELECT COUNT(*) AS count FROM cases`;
    // Distinct users are derived from the two user_id-bearing tables; there
    // is no users table on master.
    const userCount = await sql()`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM (SELECT user_id FROM cases UNION SELECT user_id FROM payments) u
    `;
    const recentAnalyses = await sql()`
      SELECT ca.case_id, c.title, ca.status, ca.model, ca.created_at
      FROM case_analyses ca
      JOIN cases c ON c.id = ca.case_id
      ORDER BY ca.created_at DESC
      LIMIT 10
    `;
    const recentCaseOwners = await sql()`
      SELECT user_id, created_at
      FROM cases
      ORDER BY created_at DESC
      LIMIT 10
    `;
    return {
      authorized: true,
      ok: true,
      data: {
        totalCases: Number(caseCount[0]?.count || 0),
        totalUsers: Number(userCount[0]?.count || 0),
        recentAnalyses: recentAnalyses.map((r: Record<string, unknown>) => ({
          caseId: String(r.case_id),
          title: String(r.title),
          status: String(r.status),
          model: String(r.model),
          createdAt: String(r.created_at),
        })),
        recentCaseOwners: recentCaseOwners.map((r: Record<string, unknown>) => ({
          userId: String(r.user_id),
          createdAt: String(r.created_at),
        })),
      },
    };
  } catch (error) {
    console.error("[admin] getAdminStats failed:", error);
    return { authorized: true, ok: false, reason: "unavailable" };
  }
});

function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-white/60">You do not have admin access.</p>
      </div>
    </main>
  );
}

function AdminPage() {
  // Route components render inside <ClerkProvider> (see __root.tsx), so useAuth()
  // here is SSR-safe. fetchAuthedData waits for Clerk auth to resolve, force-
  // refreshes the session token before the fetch, and retries exactly once on
  // unauthorized (hard-load token-freshness race — dashboard.tsx pattern).
  const auth = useAuth();
  const [result, setResult] = useState<AdminResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const outcome = await fetchAuthedData({
      isSignedIn: auth.isSignedIn,
      getToken: auth.getToken,
      fetch: () => getAdminStats({ data: {} }),
      isUnauthorized: (r) => !r.authorized,
    });
    if (outcome.state === "auth_not_ready") return;
    setResult(outcome.result);
    setLoading(false);
  };

  useEffect(() => {
    if (auth.isSignedIn !== true) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isSignedIn]);

  if (auth.isSignedIn === false) return <AccessDenied />;
  if (loading || result === null) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </main>
    );
  }
  if (!result.authorized) return <AccessDenied />;

  // Authorized but the database is unavailable: show an explicit error state.
  // Never show zero counts here — that would be a misleading "no users/cases".
  if (!result.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">Admin dashboard unavailable</h1>
          <p className="text-white/60">
            We couldn't load the admin dashboard — the database did not respond
            (reason: {result.reason}). No data is shown rather than misleading
            zero counts. Please try again.
          </p>
        </div>
      </main>
    );
  }

  const { data } = result;
  return (
    <main className="min-h-screen bg-navy px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-extrabold text-white">Admin Dashboard</h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <p className="text-sm text-white/60">Total Cases</p>
            <p className="mt-1 text-5xl font-bold text-white">{data.totalCases}</p>
            <p className="mt-2 text-xs text-white/40">COUNT(cases)</p>
          </div>
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <p className="text-sm text-white/60">Total Users</p>
            <p className="mt-1 text-5xl font-bold text-white">{data.totalUsers}</p>
            <p className="mt-2 text-xs text-white/40">
              Distinct user_id across cases &amp; payments (no users table)
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Recent AI Analyses</h2>
            {data.recentAnalyses.length === 0 ? (
              <p className="text-sm text-white/40">No analyses yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentAnalyses.map((a) => (
                  <div key={a.caseId} className="rounded-xl bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-white/80">{a.title}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          a.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : a.status === "failed"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-gold/20 text-gold"
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-white/40">
                      <span>model: {a.model || "—"}</span>
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Recent Case Owners</h2>
            <p className="mb-3 text-xs text-white/40">
              Derived from the 10 most recent cases (user_id, created_at) — Fair
              Fight stores no users table, so no email addresses are shown.
            </p>
            {data.recentCaseOwners.length === 0 ? (
              <p className="text-sm text-white/40">No cases yet</p>
            ) : (
              <div className="space-y-2">
                {data.recentCaseOwners.map((u) => (
                  <div key={`${u.userId}-${u.createdAt}`} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{u.userId.slice(0, 12)}…</span>
                    <span className="text-white/40">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}