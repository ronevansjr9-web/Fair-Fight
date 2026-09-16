import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { j as Route, c as createSsrRpc } from "./router-CPaV_2AK.js";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { c as createServerFn } from "../server.js";
import { A as AuthenticatedGuard } from "./AuthenticatedGuard-BRF14A_z.js";
import { s as shouldFetchForSignedInUser, f as fetchAuthedData } from "./caseFetchGate-Din3Y7TF.js";
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
const getCase = createServerFn({
  method: "POST"
}).handler(createSsrRpc("a994618c0c3bbdf912135a73d411252e34c8e198c9ffd91d022348a6aab38da3"));
const TOOL_LINKS = [{
  href: "/analysis",
  icon: "🧠",
  label: "Pro Case Analysis",
  desc: "Paid $99 one-time: plain-English summary, possible issues, candidate arguments, and sources"
}, {
  href: "/chat",
  icon: "💬",
  label: "AI Legal Chat",
  desc: "Ask plain-English questions about your legal situation"
}, {
  href: "/research",
  icon: "📚",
  label: "Legal Research",
  desc: "Find case law and statutes"
}, {
  href: "/evidence",
  icon: "📎",
  label: "Evidence Manager",
  desc: "Temporarily unavailable — organizing and uploading case evidence"
}, {
  href: "/timeline",
  icon: "🕐",
  label: "Timeline Builder",
  desc: "Build a chronological case timeline"
}, {
  href: "/calendar",
  icon: "📅",
  label: "Court Calendar",
  desc: "Track court dates and deadlines"
}, {
  href: "/documents",
  icon: "📝",
  label: "Document Generator",
  desc: "Generate legal document drafts"
}, {
  href: "/legal-argument",
  icon: "⚖️",
  label: "Argument Builder",
  desc: "Structure legal arguments with citations"
}];
function statusBadgeClass(status) {
  if (status === "active") return "bg-green-900/30 text-green-300";
  if (status === "resolved") return "bg-white/10 text-white/70";
  return "bg-yellow-100 text-yellow-700";
}
function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function CaseWorkspacePage() {
  const {
    caseId
  } = Route.useParams();
  const auth = useAuth();
  const [state, setState] = useState({
    status: "loading"
  });
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    if (!shouldFetchForSignedInUser(auth.isSignedIn)) return;
    let cancelled = false;
    setState({
      status: "loading"
    });
    fetchAuthedData({
      isSignedIn: auth.isSignedIn,
      getToken: auth.getToken,
      fetch: () => getCase({
        data: {
          caseId
        }
      }),
      isUnauthorized: (result) => !result.ok && result.reason === "unauthorized"
    }).then((outcome) => {
      if (cancelled || outcome.state === "auth_not_ready") return;
      const result = outcome.result;
      if (result.ok) setState({
        status: "loaded",
        case: result.case
      });
      else setState({
        status: "error",
        reason: result.reason
      });
    }).catch(() => {
      if (!cancelled) setState({
        status: "error",
        reason: "unavailable"
      });
    });
    return () => {
      cancelled = true;
    };
  }, [caseId, auth.isSignedIn, retryKey]);
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-5xl px-4 py-8", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/dashboard", search: {
      checkout: void 0
    }, className: "mb-6 inline-flex items-center gap-1 text-sm font-medium text-white/50 transition-colors hover:text-gold", children: [
      /* @__PURE__ */ jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }),
      "Back to Dashboard"
    ] }),
    state.status === "loading" && /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center p-16", children: /* @__PURE__ */ jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" }) }),
    state.status === "error" && /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 text-5xl", children: "🔒" }),
      /* @__PURE__ */ jsx("h1", { className: "mb-2 text-2xl font-bold text-white", children: "Case Not Found" }),
      /* @__PURE__ */ jsx("p", { className: "mb-6 text-white/60", children: state.reason === "unavailable" ? "We couldn't load this case right now. Please try again in a moment." : "This case doesn't exist or you don't have access to it. Check the link or return to your dashboard." }),
      state.reason === "unavailable" && /* @__PURE__ */ jsx("button", { onClick: () => setRetryKey((k) => k + 1), className: "gold-gradient mb-3 inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md transition-all hover:shadow-lg", children: "Try again" }),
      /* @__PURE__ */ jsx(Link, { to: "/dashboard", search: {
        checkout: void 0
      }, className: "gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md transition-all hover:shadow-lg", children: "Back to Dashboard" })
    ] }),
    state.status === "loaded" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap items-start justify-between gap-4", children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(state.case.status)}`, children: state.case.status }),
            state.case.caseType && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold", children: state.case.caseType }),
            state.case.jurisdiction && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60", children: state.case.jurisdiction })
          ] }),
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-extrabold text-white", children: state.case.title })
        ] }) }),
        state.case.description && /* @__PURE__ */ jsx("p", { className: "mt-4 text-white/70", children: state.case.description }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap gap-4 text-xs text-white/40", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "Created ",
            formatDate(state.case.createdAt)
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            "Last updated ",
            formatDate(state.case.updatedAt)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("h2", { className: "mb-4 mt-10 text-xl font-bold text-white", children: "Case Tools" }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: TOOL_LINKS.map((tool) => /* @__PURE__ */ jsxs("a", { href: `${tool.href}?caseId=${encodeURIComponent(state.case.id)}`, className: "card-hover group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-sm transition-all hover:border-gold/40", children: [
        /* @__PURE__ */ jsx("span", { className: "text-2xl", children: tool.icon }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx("span", { className: "block font-semibold text-white group-hover:text-gold", children: tool.label }),
          /* @__PURE__ */ jsx("span", { className: "mt-0.5 block text-sm text-white/50", children: tool.desc })
        ] })
      ] }, tool.href)) }),
      /* @__PURE__ */ jsx("p", { className: "mt-10 text-center text-xs text-white/40", children: "⚖️ Fair Fight is for educational purposes only and does not provide legal advice. Your case information is private." })
    ] })
  ] }) }) });
}
export {
  CaseWorkspacePage as component
};
