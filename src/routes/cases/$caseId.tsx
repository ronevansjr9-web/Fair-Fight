import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/tanstack-react-start";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { getCurrentAuth } from "~/lib/auth";
import { shouldFetchForSignedInUser } from "~/lib/caseFetchGate";
import { sql } from "~/db";

export const Route = createFileRoute("/cases/$caseId")({
  component: CaseWorkspacePage,
  head: () => ({
    meta: [
      { title: "Case Workspace — Fair Fight" },
      { name: "description", content: "Your Fair Fight case workspace — case details and tools for tracking deadlines and preparing for attorney conversations." },
    ],
  }),
});

interface CaseData {
  id: string;
  title: string;
  caseType: string;
  status: string;
  jurisdiction: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

type CaseResult =
  | { ok: true; case: CaseData }
  | { ok: false; reason: "unauthorized" | "not_found" | "unavailable" };

// Restrict case IDs to safe path characters (UUIDs and common id formats).
// This also keeps the value out of anything that could be interpreted as a
// path traversal or oversized payload; the DB query itself is parameterized.
const CASE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

const getCase = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) {
      throw new Error("Invalid case id");
    }
    return { caseId: d.caseId as string };
  })
  .handler(async ({ data }): Promise<CaseResult> => {
    try {
      const auth = await getCurrentAuth();
      if (!auth.userId) return { ok: false, reason: "unauthorized" };
      try {
        const rows = await sql()`
          SELECT id, title, case_type, status, jurisdiction, description, created_at, updated_at
          FROM cases
          WHERE id = ${data.caseId} AND user_id = ${auth.userId}
          LIMIT 1
        `;
        if (!rows || rows.length === 0) return { ok: false, reason: "not_found" };
        const c = rows[0] as Record<string, unknown>;
        return {
          ok: true,
          case: {
            id: String(c.id),
            title: String(c.title),
            caseType: String(c.case_type),
            status: String(c.status),
            jurisdiction: String(c.jurisdiction),
            description: String(c.description),
            createdAt: String(c.created_at),
            updatedAt: String(c.updated_at),
          },
        };
      } catch (error) {
        console.error("Case load error:", error);
        return { ok: false, reason: "unavailable" };
      }
    } catch {
      return { ok: false, reason: "unauthorized" };
    }
  });

const TOOL_LINKS = [
  { href: "/analysis", icon: "🧠", label: "Pro Case Analysis", desc: "Paid $99 one-time: plain-English summary, possible issues, candidate arguments, and sources" },
  { href: "/chat", icon: "💬", label: "AI Legal Chat", desc: "Ask plain-English questions about your legal situation" },
  { href: "/research", icon: "📚", label: "Legal Research", desc: "Find case law and statutes" },
  { href: "/evidence", icon: "📎", label: "Evidence Manager", desc: "Temporarily unavailable — organizing and uploading case evidence" },
  { href: "/timeline", icon: "🕐", label: "Timeline Builder", desc: "Build a chronological case timeline" },
  { href: "/calendar", icon: "📅", label: "Court Calendar", desc: "Track court dates and deadlines" },
  { href: "/documents", icon: "📝", label: "Document Generator", desc: "Generate legal document drafts" },
  { href: "/legal-argument", icon: "⚖️", label: "Argument Builder", desc: "Structure legal arguments with citations" },
];

function statusBadgeClass(status: string): string {
  if (status === "active") return "bg-green-900/30 text-green-300";
  if (status === "resolved") return "bg-white/10 text-white/70";
  return "bg-yellow-100 text-yellow-700";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function CaseWorkspacePage() {
  const { caseId } = Route.useParams();
  // Route components render inside <ClerkProvider> (see __root.tsx), so useAuth()
  // here is SSR-safe. `isSignedIn` is `undefined` while Clerk is still hydrating
  // on the client — do NOT fire the case fetch during that window: the server
  // call can return `unauthorized` and the effect would never rerun after
  // sign-in resolves, stranding the user on "Case Not Found". The fetch below is
  // gated on `isSignedIn === true` and re-runs when auth resolves; signed-out
  // users get the AuthenticatedGuard prompt without any case fetch.
  const auth = useAuth();
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; reason: string } | { status: "loaded"; case: CaseData }
  >({ status: "loading" });

  useEffect(() => {
    // Wait for Clerk auth to definitively resolve before fetching. If auth is
    // still hydrating (`undefined`) or the user is signed out (`false`), skip
    // the fetch entirely — AuthenticatedGuard renders the spinner / sign-in
    // prompt in those cases. When `isSignedIn` transitions to `true`, the
    // dependency below re-runs this effect and the case is fetched once.
    if (!shouldFetchForSignedInUser(auth.isSignedIn)) return;
    let cancelled = false;
    setState({ status: "loading" });
    getCase({ data: { caseId } })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setState({ status: "loaded", case: result.case });
        else setState({ status: "error", reason: result.reason });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", reason: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, auth.isSignedIn]);

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link to="/dashboard" search={{ checkout: undefined }} className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-white/50 transition-colors hover:text-gold">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          {state.status === "loading" && (
            <div className="flex items-center justify-center p-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
            </div>
          )}

          {state.status === "error" && (
            <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-sm">
              <div className="mx-auto mb-4 text-5xl">🔒</div>
              <h1 className="mb-2 text-2xl font-bold text-white">Case Not Found</h1>
              <p className="mb-6 text-white/60">
                {state.reason === "unavailable"
                  ? "We couldn't load this case right now. Please try again in a moment."
                  : "This case doesn't exist or you don't have access to it. Check the link or return to your dashboard."}
              </p>
              <Link
                to="/dashboard"
                search={{ checkout: undefined }}
                className="gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md transition-all hover:shadow-lg"
              >
                Back to Dashboard
              </Link>
            </div>
          )}

          {state.status === "loaded" && (
            <>
              {/* Case header */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(state.case.status)}`}>
                        {state.case.status}
                      </span>
                      {state.case.caseType && (
                        <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold">{state.case.caseType}</span>
                      )}
                      {state.case.jurisdiction && (
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">{state.case.jurisdiction}</span>
                      )}
                    </div>
                    <h1 className="text-3xl font-extrabold text-white">{state.case.title}</h1>
                  </div>
                </div>

                {state.case.description && (
                  <p className="mt-4 text-white/70">{state.case.description}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/40">
                  <span>Created {formatDate(state.case.createdAt)}</span>
                  <span>Last updated {formatDate(state.case.updatedAt)}</span>
                </div>
              </div>

              {/* Case tools — selected case context is preserved via ?caseId= in each link */}
              <h2 className="mb-4 mt-10 text-xl font-bold text-white">Case Tools</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TOOL_LINKS.map((tool) => (
                  <a
                    key={tool.href}
                    href={`${tool.href}?caseId=${encodeURIComponent(state.case.id)}`}
                    className="card-hover group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-sm transition-all hover:border-gold/40"
                  >
                    <span className="text-2xl">{tool.icon}</span>
                    <span>
                      <span className="block font-semibold text-white group-hover:text-gold">{tool.label}</span>
                      <span className="mt-0.5 block text-sm text-white/50">{tool.desc}</span>
                    </span>
                  </a>
                ))}
              </div>

              <p className="mt-10 text-center text-xs text-white/40">
                ⚖️ Fair Fight is for educational purposes only and does not provide legal advice. Your case information is private.
              </p>
            </>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
