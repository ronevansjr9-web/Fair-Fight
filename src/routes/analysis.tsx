import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/tanstack-react-start";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { getCurrentAuth } from "~/lib/auth";
import { isCaseOwner, hasOwnedCaseEntitlement } from "~/lib/argumentAccess";
import { hasCaseEntitlement } from "~/lib/payment";
import { generateCaseAnalysis, ANALYSIS_MODEL, type CaseAnalysis, type LegalSource } from "~/lib/caseAnalysis";
import { saveCaseAnalysis, loadCaseAnalysis, type CaseAnalysisRow } from "~/lib/caseAnalysisStore";
import { createCheckoutSession } from "~/lib/stripe";
import { askAI } from "~/lib/ai";
import { trackEvent, AnalyticsEvents } from "~/lib/analytics";
import { sanitizeInput } from "~/lib/sanitize";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
} from "~/lib/restrictedFeatures";
import { shouldFetchForSignedInUser } from "~/lib/caseFetchGate";
import { sql } from "~/db";

export const Route = createFileRoute("/analysis")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: (search.caseId as string) || undefined,
    checkout: (search.checkout as string) || undefined,
  }),
  component: AnalysisPage,
  head: () => ({
    meta: [
      { title: "Pro Case Analysis — Fair Fight" },
      { name: "description", content: "Fair Fight Pro Case Analysis: a plain-English summary, possible legal issues, candidate arguments, counterarguments, and traceable public sources — educational, not legal advice." },
    ],
  }),
});

const CASE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

type AnalysisStatus =
  | { ok: true; entitled: true; analysis: CaseAnalysisRow | null; caseTitle: string }
  | { ok: true; entitled: false; caseTitle: string }
  | { ok: false; reason: "unauthorized" | "not_found" | "unavailable" }
  | { restricted: true };

const getAnalysisStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) throw new Error("Invalid case id");
    return { caseId: d.caseId };
  })
  .handler(async ({ data }): Promise<AnalysisStatus> => {
    try {
      const auth = await getCurrentAuth();
      if (!auth.userId) return { ok: false, reason: "unauthorized" };

      // Fail-closed presentation: while the checkout/entitlement gate is
      // active, the paid analysis surface reports restricted even when an
      // entitlement record exists (records are preserved, not honored).
      if (RESTRICTED_FEATURES.checkoutProActivation) return { restricted: true };

      try {
        const owned = await isCaseOwner(auth.userId, data.caseId);
        if (!owned) return { ok: false, reason: "not_found" };
        const titleRows = await sql()`
          SELECT title FROM cases WHERE id = ${data.caseId} AND user_id = ${auth.userId} LIMIT 1
        `;
        const caseTitle = titleRows.length > 0 ? String(titleRows[0].title) : "Your case";
        const entitled = await hasCaseEntitlement(auth.userId, data.caseId);
        if (!entitled) return { ok: true, entitled: false, caseTitle };
        const analysis = await loadCaseAnalysis(auth.userId, data.caseId);
        return { ok: true, entitled: true, analysis, caseTitle };
      } catch (error) {
        console.error("Analysis status error:", error);
        return { ok: false, reason: "unavailable" };
      }
    } catch {
      return { ok: false, reason: "unauthorized" };
    }
  });

const runAnalysis = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) throw new Error("Invalid case id");
    if (typeof d.facts !== "string" || !d.facts.trim()) throw new Error("Describe your situation first");
    return {
      caseId: d.caseId,
      facts: d.facts as string,
      jurisdiction: (d.jurisdiction as string) || "",
      caseType: (d.caseType as string) || "Civil",
    };
  })
  .handler(async ({ data }): Promise<{ success: true; analysis: CaseAnalysis } | { success: false; error: string }> => {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { success: false, error: "Sign in required" };

    if (RESTRICTED_FEATURES.checkoutProActivation) {
      return { success: false, error: TEMP_UNAVAILABLE_MESSAGE };
    }

    try {
      // Exact ownership + exact entitlement for THIS case, server-side.
      const eligible = await hasOwnedCaseEntitlement(auth.userId, data.caseId);
      if (!eligible) return { success: false, error: "This case is not unlocked for Pro analysis" };

      const facts = sanitizeInput(data.facts);
      const jurisdiction = sanitizeInput(data.jurisdiction).slice(0, 200);
      const caseType = sanitizeInput(data.caseType).slice(0, 100);

      const analysis = await generateCaseAnalysis(
        { facts, jurisdiction, caseType },
        {
          askAI: (messages, options) => askAI(messages, options),
          saveAnalysis: async () => {},
        },
      );
      await saveCaseAnalysis({
        userId: auth.userId,
        caseId: data.caseId,
        facts,
        jurisdiction,
        analysis,
        model: ANALYSIS_MODEL,
      });
      return { success: true, analysis };
    } catch (error) {
      console.error("Analysis generation failed:", error);
      // Fail closed: never return or persist a partial/fabricated result.
      return {
        success: false,
        error:
          error instanceof Error && /valid JSON|empty response|missing required/i.test(error.message)
            ? "The AI could not produce a usable educational analysis. Please try again."
            : "Analysis failed. Please try again shortly.",
      };
    }
  });

const startCheckout = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) throw new Error("Invalid case id");
    return { caseId: d.caseId };
  })
  .handler(async ({ data }): Promise<{ success: true; url: string } | { success: false; error: string }> => {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { success: false, error: "Sign in required" };
    const result = await createCheckoutSession(auth.userId, data.caseId);
    if ("error" in result) return { success: false, error: result.error };
    return { success: true, url: result.url };
  });

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function SourcesList({ sources }: { sources: LegalSource[] }) {
  if (!sources || sources.length === 0) {
    return <p className="text-sm text-white/50">No public sources were attached to this analysis. Verify anything you rely on with a licensed attorney.</p>;
  }
  return (
    <ul className="space-y-2">
      {sources.map((s, i) => (
        <li key={i} className="flex flex-col gap-0.5">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gold underline decoration-gold/40 underline-offset-2 hover:text-gold-light"
          >
            {s.title}
          </a>
          <span className="truncate text-xs text-white/40">{s.url}</span>
        </li>
      ))}
    </ul>
  );
}

function AnalysisResults({ analysis }: { analysis: CaseAnalysisRow }) {
  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gold">Plain-English Summary</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{analysis.summary}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gold">Possible Legal Issues</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{analysis.possibleIssues}</p>
        <p className="mt-2 text-xs text-white/40">These are possibilities to discuss with an attorney, not conclusions.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gold">Candidate Arguments</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{analysis.candidateArguments}</p>
        <p className="mt-2 text-xs text-white/40">Educational candidate arguments only — no argument is guaranteed to succeed.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gold">Counterarguments & Uncertainties</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{analysis.counterarguments}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gold">Public Sources</h3>
        <SourcesList sources={analysis.sources} />
      </div>
      <p className="text-xs text-white/40">
        Last updated {formatDate(analysis.updatedAt)} · {analysis.model}
      </p>
    </div>
  );
}

function AnalysisPage() {
  const search = Route.useSearch();
  const auth = useAuth();
  const [status, setStatus] = useState<
    | { status: "loading" }
    | { status: "error"; reason: string }
    | { status: "restricted" }
    | { status: "unpaid"; caseTitle: string }
    | { status: "pending" }
    | { status: "paid"; analysis: CaseAnalysisRow | null; caseTitle: string }
  >({ status: "loading" });

  const [facts, setFacts] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [caseType, setCaseType] = useState("Civil");
  const [generating, setGenerating] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [actionError, setActionError] = useState("");

  const refresh = () => {
    if (!search.caseId) return;
    setStatus({ status: "loading" });
    setActionError("");
    getAnalysisStatus({ data: { caseId: search.caseId } })
      .then((result) => {
        if ("restricted" in result) {
          setStatus({ status: "restricted" });
          return;
        }
        if (!result.ok) {
          setStatus({ status: "error", reason: result.reason });
          return;
        }
        if (!result.entitled) {
          // After a Stripe redirect, the webhook may still be in flight —
          // present an honest "verifying payment" state instead of a dead end.
          if (search.checkout === "success") setStatus({ status: "pending" });
          else setStatus({ status: "unpaid", caseTitle: result.caseTitle });
          return;
        }
        setStatus({ status: "paid", analysis: result.analysis, caseTitle: result.caseTitle });
      })
      .catch(() => setStatus({ status: "error", reason: "unavailable" }));
  };

  useEffect(() => {
    if (!shouldFetchForSignedInUser(auth.isSignedIn)) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isSignedIn, search.caseId, search.checkout]);

  const handleGenerate = async () => {
    if (!search.caseId || !facts.trim()) return;
    setGenerating(true);
    setActionError("");
    const result = await runAnalysis({
      data: { caseId: search.caseId, facts, jurisdiction, caseType },
    });
    if (result.success) {
      // Reload from the durable store — proves the save happened and the
      // reopen path returns the persisted analysis.
      setStatus({ status: "loading" });
      refresh();
    } else {
      setActionError(result.error);
    }
    setGenerating(false);
  };

  const handleCheckout = async () => {
    if (!search.caseId) return;
    setStartingCheckout(true);
    setActionError("");
    // Fire-and-forget funnel beacon (analytics must never block checkout).
    trackEvent(AnalyticsEvents.CHECKOUT_STARTED);
    const result = await startCheckout({ data: { caseId: search.caseId } });
    if (result.success) {
      window.location.assign(result.url);
    } else {
      setActionError(result.error);
      setStartingCheckout(false);
    }
  };

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-8">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            to="/dashboard"
            search={{ checkout: undefined }}
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-white/50 transition-colors hover:text-gold"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Pro Case Analysis</h1>
          <p className="mt-1 text-sm text-white/60">
            One plain-English analysis per case: summary, possible issues, candidate arguments,
            counterarguments, and traceable public sources. Educational only — not legal advice.
          </p>

          {status.status === "loading" && (
            <div className="flex items-center justify-center p-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
            </div>
          )}

          {status.status === "error" && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="mb-3 text-4xl">🔒</div>
              <h2 className="mb-2 text-xl font-bold text-white">Case Analysis Unavailable</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-white/60">
                {status.reason === "not_found"
                  ? "This case doesn't exist or you don't have access to it."
                  : "We couldn't load this page right now. Please try again in a moment."}
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                {status.reason !== "not_found" && (
                  <button
                    onClick={refresh}
                    className="gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy"
                  >
                    Try again
                  </button>
                )}
                <Link
                  to="/dashboard"
                  search={{ checkout: undefined }}
                  className="inline-flex items-center rounded-full border border-white/20 px-6 py-2.5 font-semibold text-white/70 transition-colors hover:bg-white/10"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}

          {status.status === "restricted" && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <h2 className="mb-3 text-xl font-bold text-white">Pro Case Analysis — Temporarily Unavailable</h2>
              <p className="mx-auto max-w-lg text-sm text-white/70">{TEMP_UNAVAILABLE_MESSAGE}</p>
            </div>
          )}

          {status.status === "unpaid" && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
              <h2 className="mb-2 text-xl font-bold text-white">Unlock Case Analysis — $99 one-time</h2>
              <p className="mb-4 text-sm text-white/60">
                One purchase unlocks the analysis workspace for{" "}
                <span className="font-semibold text-white">{status.caseTitle}</span>. No subscription —
                a single $99 USD payment per case.
              </p>
              <ul className="mb-6 space-y-2 text-sm text-white/70">
                <li>· Plain-English summary of your situation</li>
                <li>· Possible legal issues to research</li>
                <li>· Candidate arguments for either side, with counterarguments</li>
                <li>· Traceable public sources (statutes, cases, guides)</li>
              </ul>
              {actionError && (
                <div className="mb-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">{actionError}</div>
              )}
              <button
                onClick={handleCheckout}
                disabled={startingCheckout}
                className="gold-gradient w-full rounded-full py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {startingCheckout ? "Opening secure checkout..." : "Unlock for $99"}
              </button>
              <p className="mt-4 text-center text-xs text-white/40">
                Secure payment by Stripe. Educational candidate arguments and possible issues — not legal advice,
                and no guarantee of any outcome.
              </p>
            </div>
          )}

          {status.status === "pending" && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
              <h2 className="mb-2 text-xl font-bold text-white">Verifying your payment</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-white/60">
                We received your return from checkout. Your access appears as soon as Stripe confirms the
                $99 payment — usually within a minute. If it takes longer, refresh below.
              </p>
              <button
                onClick={refresh}
                className="gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy"
              >
                Check again
              </button>
            </div>
          )}

          {status.status === "paid" && (
            <>
              {!status.analysis && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-300">
                      ✓ Case Analysis unlocked
                    </span>
                  </div>
                  <label className="mb-1 block text-sm font-semibold text-white">Facts — what happened?</label>
                  <textarea
                    value={facts}
                    onChange={(e) => setFacts(e.target.value)}
                    rows={6}
                    placeholder="Describe what happened, who is involved, key dates, and the dispute in plain English."
                    className="mb-4 w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-white">Jurisdiction</label>
                      <input
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        placeholder='e.g. "California" or "Federal — 9th Circuit"'
                        className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-white">Case type</label>
                      <select
                        value={caseType}
                        onChange={(e) => setCaseType(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                      >
                        {["Civil", "Criminal", "Family", "Housing", "Employment", "Small Claims", "Appeal", "Other"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {actionError && (
                    <div className="mb-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">{actionError}</div>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !facts.trim()}
                    className="gold-gradient w-full rounded-full py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {generating ? "Analyzing..." : "Generate Educational Analysis"}
                  </button>
                  <p className="mt-3 text-center text-xs text-white/40">
                    The AI returns candidate arguments and possible issues for education — never legal advice,
                    recommendations, or a guarantee of success.
                  </p>
                </div>
              )}

              {status.analysis && (
                <>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-300">
                      ✓ Case Analysis unlocked
                    </span>
                    <button
                      onClick={() => setStatus({ status: "paid", analysis: null, caseTitle: status.caseTitle })}
                      className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10"
                    >
                      Regenerate with new facts
                    </button>
                  </div>
                  <AnalysisResults analysis={status.analysis} />
                  <div className="mt-8 rounded-xl border border-yellow-800/40 bg-yellow-900/15 p-4 text-sm text-yellow-200">
                    <strong>For educational purposes only — not legal advice.</strong> This is not a recommendation
                    to file anything, and no argument here is guaranteed to succeed. Verify every source and every
                    claim with a licensed attorney before acting on it.
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
