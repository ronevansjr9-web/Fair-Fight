import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { b as Route, t as trackEvent, c as createSsrRpc, A as AnalyticsEvents } from "./router-DNu9hc7_.js";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { c as createServerFn } from "../server.js";
import { A as AuthenticatedGuard } from "./AuthenticatedGuard-BRF14A_z.js";
import { T as TEMP_UNAVAILABLE_MESSAGE } from "./restrictedFeatures-CtcRJvVh.js";
import { s as shouldFetchForSignedInUser } from "./caseFetchGate-Bvza5aCl.js";
import { useAuth } from "@clerk/react";
import "@clerk/react/internal";
import "@clerk/shared/getToken";
import "@clerk/shared/error";
import "@clerk/shared/getEnvVariable";
import "@clerk/shared/underscore";
import "@clerk/shared/htmlSafeJson";
import "@neondatabase/serverless";
import "./db-D7cnbd5l.js";
import "@tanstack/router-core/ssr/client";
import "stripe";
import "./argumentAccess-Brc0Ql3j.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
const CASE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const getAnalysisStatus = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) throw new Error("Invalid case id");
  return {
    caseId: d.caseId
  };
}).handler(createSsrRpc("c6d2efa93b45004f5f098be6b899086345155ca100e94710cbe429d62f68ec53"));
const runAnalysis = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) throw new Error("Invalid case id");
  if (typeof d.facts !== "string" || !d.facts.trim()) throw new Error("Describe your situation first");
  return {
    caseId: d.caseId,
    facts: d.facts,
    jurisdiction: d.jurisdiction || "",
    caseType: d.caseType || "Civil"
  };
}).handler(createSsrRpc("e53487e8b518c7e37f01ee27433f1a5e7702bb781fbbd24bdec7fa40ff072ed4"));
const startCheckout = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) throw new Error("Invalid case id");
  return {
    caseId: d.caseId
  };
}).handler(createSsrRpc("e5f362d4d22a73ceb9e92e1cca95df2f75ca8701f1e678bfbd67c58c88ed8f2d"));
function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function SourcesList({
  sources
}) {
  if (!sources || sources.length === 0) {
    return /* @__PURE__ */ jsx("p", { className: "text-sm text-white/50", children: "No public sources were attached to this analysis. Verify anything you rely on with a licensed attorney." });
  }
  return /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: sources.map((s, i) => /* @__PURE__ */ jsxs("li", { className: "flex flex-col gap-0.5", children: [
    /* @__PURE__ */ jsx("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", className: "text-sm font-medium text-gold underline decoration-gold/40 underline-offset-2 hover:text-gold-light", children: s.title }),
    /* @__PURE__ */ jsx("span", { className: "truncate text-xs text-white/40", children: s.url })
  ] }, i)) });
}
function AnalysisResults({
  analysis
}) {
  return /* @__PURE__ */ jsxs("div", { className: "mt-8 space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-6", children: [
      /* @__PURE__ */ jsx("h3", { className: "mb-2 text-sm font-bold uppercase tracking-wide text-gold", children: "Plain-English Summary" }),
      /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-sm leading-relaxed text-white/80", children: analysis.summary })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-6", children: [
      /* @__PURE__ */ jsx("h3", { className: "mb-2 text-sm font-bold uppercase tracking-wide text-gold", children: "Possible Legal Issues" }),
      /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-sm leading-relaxed text-white/80", children: analysis.possibleIssues }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-xs text-white/40", children: "These are possibilities to discuss with an attorney, not conclusions." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-6", children: [
      /* @__PURE__ */ jsx("h3", { className: "mb-2 text-sm font-bold uppercase tracking-wide text-gold", children: "Candidate Arguments" }),
      /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-sm leading-relaxed text-white/80", children: analysis.candidateArguments }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-xs text-white/40", children: "Educational candidate arguments only — no argument is guaranteed to succeed." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-6", children: [
      /* @__PURE__ */ jsx("h3", { className: "mb-2 text-sm font-bold uppercase tracking-wide text-gold", children: "Counterarguments & Uncertainties" }),
      /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-sm leading-relaxed text-white/80", children: analysis.counterarguments })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-6", children: [
      /* @__PURE__ */ jsx("h3", { className: "mb-2 text-sm font-bold uppercase tracking-wide text-gold", children: "Public Sources" }),
      /* @__PURE__ */ jsx(SourcesList, { sources: analysis.sources })
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "text-xs text-white/40", children: [
      "Last updated ",
      formatDate(analysis.updatedAt),
      " · ",
      analysis.model
    ] })
  ] });
}
function AnalysisPage() {
  const search = Route.useSearch();
  const auth = useAuth();
  const [status, setStatus] = useState({
    status: "loading"
  });
  const [facts, setFacts] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [caseType, setCaseType] = useState("Civil");
  const [generating, setGenerating] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [actionError, setActionError] = useState("");
  const refresh = () => {
    if (!search.caseId) return;
    setStatus({
      status: "loading"
    });
    setActionError("");
    getAnalysisStatus({
      data: {
        caseId: search.caseId
      }
    }).then((result) => {
      if ("restricted" in result) {
        setStatus({
          status: "restricted"
        });
        return;
      }
      if (!result.ok) {
        setStatus({
          status: "error",
          reason: result.reason
        });
        return;
      }
      if (!result.entitled) {
        if (search.checkout === "success") setStatus({
          status: "pending"
        });
        else setStatus({
          status: "unpaid",
          caseTitle: result.caseTitle
        });
        return;
      }
      setStatus({
        status: "paid",
        analysis: result.analysis,
        caseTitle: result.caseTitle
      });
    }).catch(() => setStatus({
      status: "error",
      reason: "unavailable"
    }));
  };
  useEffect(() => {
    if (!shouldFetchForSignedInUser(auth.isSignedIn)) return;
    refresh();
  }, [auth.isSignedIn, search.caseId, search.checkout]);
  const handleGenerate = async () => {
    if (!search.caseId || !facts.trim()) return;
    setGenerating(true);
    setActionError("");
    const result = await runAnalysis({
      data: {
        caseId: search.caseId,
        facts,
        jurisdiction,
        caseType
      }
    });
    if (result.success) {
      setStatus({
        status: "loading"
      });
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
    trackEvent(AnalyticsEvents.CHECKOUT_STARTED);
    const result = await startCheckout({
      data: {
        caseId: search.caseId
      }
    });
    if (result.success) {
      window.location.assign(result.url);
    } else {
      setActionError(result.error);
      setStartingCheckout(false);
    }
  };
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto w-full max-w-2xl", children: [
    /* @__PURE__ */ jsx(Link, { to: "/dashboard", search: {
      checkout: void 0
    }, className: "mb-6 inline-flex items-center gap-1 text-sm font-medium text-white/50 transition-colors hover:text-gold", children: "← Back to Dashboard" }),
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-extrabold text-white sm:text-3xl", children: "Pro Case Analysis" }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-white/60", children: "One plain-English analysis per case: summary, possible issues, candidate arguments, counterarguments, and traceable public sources. Educational only — not legal advice." }),
    status.status === "loading" && /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center p-16", children: /* @__PURE__ */ jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" }) }),
    status.status === "error" && /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-3 text-4xl", children: "🔒" }),
      /* @__PURE__ */ jsx("h2", { className: "mb-2 text-xl font-bold text-white", children: "Case Analysis Unavailable" }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto mb-6 max-w-md text-sm text-white/60", children: status.reason === "not_found" ? "This case doesn't exist or you don't have access to it." : "We couldn't load this page right now. Please try again in a moment." }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center gap-3 sm:flex-row", children: [
        status.reason !== "not_found" && /* @__PURE__ */ jsx("button", { onClick: refresh, className: "gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy", children: "Try again" }),
        /* @__PURE__ */ jsx(Link, { to: "/dashboard", search: {
          checkout: void 0
        }, className: "inline-flex items-center rounded-full border border-white/20 px-6 py-2.5 font-semibold text-white/70 transition-colors hover:bg-white/10", children: "Back to Dashboard" })
      ] })
    ] }),
    status.status === "restricted" && /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center", children: [
      /* @__PURE__ */ jsx("h2", { className: "mb-3 text-xl font-bold text-white", children: "Pro Case Analysis — Temporarily Unavailable" }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto max-w-lg text-sm text-white/70", children: TEMP_UNAVAILABLE_MESSAGE })
    ] }),
    status.status === "unpaid" && /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8", children: [
      /* @__PURE__ */ jsx("h2", { className: "mb-2 text-xl font-bold text-white", children: "Unlock Case Analysis — $99 one-time" }),
      /* @__PURE__ */ jsxs("p", { className: "mb-4 text-sm text-white/60", children: [
        "One purchase unlocks the analysis workspace for",
        " ",
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: status.caseTitle }),
        ". No subscription — a single $99 USD payment per case."
      ] }),
      /* @__PURE__ */ jsxs("ul", { className: "mb-6 space-y-2 text-sm text-white/70", children: [
        /* @__PURE__ */ jsx("li", { children: "· Plain-English summary of your situation" }),
        /* @__PURE__ */ jsx("li", { children: "· Possible legal issues to research" }),
        /* @__PURE__ */ jsx("li", { children: "· Candidate arguments for either side, with counterarguments" }),
        /* @__PURE__ */ jsx("li", { children: "· Traceable public sources (statutes, cases, guides)" })
      ] }),
      actionError && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300", children: actionError }),
      /* @__PURE__ */ jsx("button", { onClick: handleCheckout, disabled: startingCheckout, className: "gold-gradient w-full rounded-full py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: startingCheckout ? "Opening secure checkout..." : "Unlock for $99" }),
      /* @__PURE__ */ jsx("p", { className: "mt-4 text-center text-xs text-white/40", children: "Secure payment by Stripe. Educational candidate arguments and possible issues — not legal advice, and no guarantee of any outcome." })
    ] }),
    status.status === "pending" && /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" }),
      /* @__PURE__ */ jsx("h2", { className: "mb-2 text-xl font-bold text-white", children: "Verifying your payment" }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto mb-6 max-w-md text-sm text-white/60", children: "We received your return from checkout. Your access appears as soon as Stripe confirms the $99 payment — usually within a minute. If it takes longer, refresh below." }),
      /* @__PURE__ */ jsx("button", { onClick: refresh, className: "gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy", children: "Check again" })
    ] }),
    status.status === "paid" && /* @__PURE__ */ jsxs(Fragment, { children: [
      !status.analysis && /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-white/10 bg-white/5 p-6", children: [
        /* @__PURE__ */ jsx("div", { className: "mb-4 flex items-center gap-2", children: /* @__PURE__ */ jsx("span", { className: "rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-300", children: "✓ Case Analysis unlocked" }) }),
        /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Facts — what happened?" }),
        /* @__PURE__ */ jsx("textarea", { value: facts, onChange: (e) => setFacts(e.target.value), rows: 6, placeholder: "Describe what happened, who is involved, key dates, and the dispute in plain English.", className: "mb-4 w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" }),
        /* @__PURE__ */ jsxs("div", { className: "mb-4 grid gap-4 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Jurisdiction" }),
            /* @__PURE__ */ jsx("input", { value: jurisdiction, onChange: (e) => setJurisdiction(e.target.value), placeholder: 'e.g. "California" or "Federal — 9th Circuit"', className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Case type" }),
            /* @__PURE__ */ jsx("select", { value: caseType, onChange: (e) => setCaseType(e.target.value), className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20", children: ["Civil", "Criminal", "Family", "Housing", "Employment", "Small Claims", "Appeal", "Other"].map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) })
          ] })
        ] }),
        actionError && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300", children: actionError }),
        /* @__PURE__ */ jsx("button", { onClick: handleGenerate, disabled: generating || !facts.trim(), className: "gold-gradient w-full rounded-full py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: generating ? "Analyzing..." : "Generate Educational Analysis" }),
        /* @__PURE__ */ jsx("p", { className: "mt-3 text-center text-xs text-white/40", children: "The AI returns candidate arguments and possible issues for education — never legal advice, recommendations, or a guarantee of success." })
      ] }),
      status.analysis && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-300", children: "✓ Case Analysis unlocked" }),
          /* @__PURE__ */ jsx("button", { onClick: () => setStatus({
            status: "paid",
            analysis: null,
            caseTitle: status.caseTitle
          }), className: "rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10", children: "Regenerate with new facts" })
        ] }),
        /* @__PURE__ */ jsx(AnalysisResults, { analysis: status.analysis }),
        /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-xl border border-yellow-800/40 bg-yellow-900/15 p-4 text-sm text-yellow-200", children: [
          /* @__PURE__ */ jsx("strong", { children: "For educational purposes only — not legal advice." }),
          " This is not a recommendation to file anything, and no argument here is guaranteed to succeed. Verify every source and every claim with a licensed attorney before acting on it."
        ] })
      ] })
    ] })
  ] }) }) });
}
export {
  AnalysisPage as component
};
