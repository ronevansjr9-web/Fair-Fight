import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { getCurrentAuth } from "~/lib/auth";
import { ReferralCard } from "~/components/ReferralCard";
import { trackEvent, AnalyticsEvents } from "~/lib/analytics";
import { sql } from "~/db";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    checkout: (search.checkout as string) || undefined,
  }),
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Fair Fight" },
      { name: "description", content: "Your Fair Fight dashboard — manage cases, evidence, and legal education tools." },
    ],
  }),
});

const getDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return { ok: true as const, cases: [], stats: { total: 0, active: 0, resolved: 0 } };

  try {
    const cases = await sql()`
      SELECT id, title, case_type, status, jurisdiction, created_at, updated_at
      FROM cases
      WHERE user_id = ${auth.userId}
      ORDER BY updated_at DESC
      LIMIT 20
    `;
    const stats = await sql()`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM cases
      WHERE user_id = ${auth.userId}
    `;
    return {
      ok: true as const,
      cases: cases.map((c: Record<string, unknown>) => ({
        id: String(c.id),
        title: String(c.title),
        caseType: String(c.case_type),
        status: String(c.status),
        jurisdiction: String(c.jurisdiction),
        createdAt: String(c.created_at),
        updatedAt: String(c.updated_at),
      })),
      stats: {
        total: Number(stats[0]?.total || 0),
        active: Number(stats[0]?.active || 0),
        resolved: Number(stats[0]?.resolved || 0),
      },
    };
  } catch {
    return { ok: false as const, error: "unavailable" as const, cases: [], stats: { total: 0, active: 0, resolved: 0 } };
  }
});

function DashboardPage() {
  const search = Route.useSearch();
  const [data, setData] = useState<{
    ok: boolean;
    error?: "unavailable";
    cases: { id: string; title: string; caseType: string; status: string; jurisdiction: string; createdAt: string; updatedAt: string }[];
    stats: { total: number; active: number; resolved: number };
  }>({ ok: true, cases: [], stats: { total: 0, active: 0, resolved: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardData()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        // Keep database/provider details out of the UI, but never turn an
        // unavailable schema into a misleading empty workspace.
        setData({ ok: false, error: "unavailable", cases: [], stats: { total: 0, active: 0, resolved: 0 } });
        setLoading(false);
      });
  }, []);

  // Return parameters are informational only; access is granted by the webhook-backed DB record.
  useEffect(() => {
    if (search.checkout === "success") trackEvent(AnalyticsEvents.CHECKOUT_COMPLETED);
  }, [search.checkout]);

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
              <p className="mt-1 text-white/60">Manage your cases, evidence, and legal education</p>
            </div>
            <Link
              to="/cases/new"
              className="gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md transition-all hover:shadow-lg"
            >
              <svg className="mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Case
            </Link>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
              <p className="text-sm font-medium text-white/60">Total Cases</p>
              <p className="mt-1 text-4xl font-bold text-white">{loading ? "..." : data.stats.total}</p>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
              <p className="text-sm font-medium text-white/60">Active Cases</p>
              <p className="mt-1 text-4xl font-bold text-green-600">{loading ? "..." : data.stats.active}</p>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
              <p className="text-sm font-medium text-white/60">Resolved</p>
              <p className="mt-1 text-4xl font-bold text-white/40">{loading ? "..." : data.stats.resolved}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8 grid gap-4 sm:grid-cols-5">
            {[
              { label: "AI Legal Chat", to: "/chat", icon: "💬" },
              { label: "Legal Research", to: "/research", icon: "📚" },
              { label: "Evidence", to: "/evidence", icon: "📎" },
              { label: "Calendar", to: "/calendar", icon: "📅" },
              { label: "Profile", to: "/profile", icon: "👤" },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="card-hover flex items-center gap-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 shadow-sm"
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="font-semibold text-white">{action.label}</span>
              </Link>
            ))}
          </div>

          {/* Referral */}
          <div className="mb-8">
            <ReferralCard />
          </div>

          {/* Cases List */}
          <div className="rounded-2xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-sm">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Your Cases</h2>
            </div>
            {!loading && !data.ok ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 text-4xl">⚠️</div>
                <p className="mb-2 text-lg font-semibold text-white">Cases are temporarily unavailable</p>
                <p className="text-sm text-white/50">We could not load your case workspace. Please try again shortly. If the problem continues, contact support before retrying changes.</p>
              </div>
            ) : loading ? (
              <div className="p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
              </div>
            ) : data.cases.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 text-4xl">📂</div>
                <p className="mb-2 text-lg font-semibold text-white/60">No cases yet</p>
                <p className="mb-4 text-sm text-white/40">Create your first case to get started</p>
                <Link
                  to="/cases/new"
                  className="gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy"
                >
                  Create Your First Case
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {data.cases.map((c) => (
                  <Link
                    key={c.id}
                    to="/cases/$caseId"
                    params={{ caseId: c.id }}
                    className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/5"
                  >
                    <div>
                      <h3 className="font-semibold text-white">{c.title}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === "active" ? "bg-green-900/30 text-green-300" :
                          c.status === "resolved" ? "bg-white/10 text-white/70" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {c.status}
                        </span>
                        <span className="text-xs text-white/40">{c.caseType}</span>
                        <span className="text-xs text-white/40">{c.jurisdiction}</span>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
