import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
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

const getAdminStats = createServerFn({ method: "GET" }).handler(async (_data, ctx) => {
  const auth = await getAuth(ctx);
  if (!auth.userId) return { authorized: false };

  try {
    const userCount = await sql()`SELECT COUNT(*) as count FROM users`;
    const caseCount = await sql()`SELECT COUNT(*) as count FROM cases`;
    const recentUsers = await sql()`SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 10`;
    const recentAnalyses = await sql()`
      SELECT user_id, action, created_at FROM audit_logs 
      WHERE action = 'AI_ANALYSIS_GENERATED' 
      ORDER BY created_at DESC LIMIT 10
    `;

    return {
      authorized: true,
      users: Number(userCount[0]?.count || 0),
      cases: Number(caseCount[0]?.count || 0),
      recentUsers: recentUsers.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        email: String(r.email),
        createdAt: String(r.created_at),
      })),
      recentAnalyses: recentAnalyses.map((r: Record<string, unknown>) => ({
        userId: String(r.user_id),
        createdAt: String(r.created_at),
      })),
    };
  } catch {
    return { authorized: true, users: 0, cases: 0, recentUsers: [], recentAnalyses: [] };
  }
});

function AdminPage() {
  const [stats, setStats] = useState<{
    authorized: boolean;
    users: number;
    cases: number;
    recentUsers: { id: string; email: string; createdAt: string }[];
    recentAnalyses: { userId: string; createdAt: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then((d) => {
      setStats(d);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </main>
    );
  }

  if (!stats?.authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-white/60">You do not have admin access.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-extrabold text-white">Admin Dashboard</h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <p className="text-sm text-white/60">Total Users</p>
            <p className="mt-1 text-5xl font-bold text-white">{stats.users}</p>
          </div>
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <p className="text-sm text-white/60">Total Cases</p>
            <p className="mt-1 text-5xl font-bold text-white">{stats.cases}</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Recent Users</h2>
            {stats.recentUsers.length === 0 ? (
              <p className="text-sm text-white/40">No users yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{u.email}</span>
                    <span className="text-white/40">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Recent AI Analyses</h2>
            {stats.recentAnalyses.length === 0 ? (
              <p className="text-sm text-white/40">No analyses yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentAnalyses.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">User: {a.userId.slice(0, 12)}...</span>
                    <span className="text-white/40">{new Date(a.createdAt).toLocaleString()}</span>
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
