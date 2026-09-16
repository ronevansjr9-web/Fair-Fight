import { jsx, jsxs } from "react/jsx-runtime";
import { a as Route, t as trackEvent, c as createSsrRpc, A as AnalyticsEvents } from "./router-CxY3nyJJ.js";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { c as createServerFn } from "../server.js";
import { A as AuthenticatedGuard } from "./AuthenticatedGuard-BRF14A_z.js";
import { s as shouldTrackCheckoutSuccess } from "./restrictedFeatures-Dp1tXKpY.js";
import { f as fetchAuthedData } from "./caseFetchGate-Din3Y7TF.js";
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
const getDashboardData = createServerFn({
  method: "POST"
}).handler(createSsrRpc("c960787ec9a553a77dbdde3313b39cc569b31b3a3e3cbc4ea4944aa965eaaa9f"));
function DashboardPage() {
  const search = Route.useSearch();
  const auth = useAuth();
  const [data, setData] = useState({
    cases: [],
    stats: {
      total: 0,
      active: 0,
      resolved: 0
    },
    entitledCaseIds: []
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const load = async () => {
    setLoading(true);
    setLoadError(false);
    const outcome = await fetchAuthedData({
      isSignedIn: auth.isSignedIn,
      getToken: auth.getToken,
      fetch: getDashboardData,
      isUnauthorized: (result2) => !result2.ok && result2.reason === "unauthorized"
    });
    if (outcome.state === "auth_not_ready") return;
    const result = outcome.result;
    if (result.ok) {
      setData(result.data);
      setLoading(false);
    } else {
      setLoading(false);
      setLoadError(true);
    }
  };
  useEffect(() => {
    if (auth.isSignedIn !== true) return;
    load();
  }, [auth.isSignedIn]);
  useEffect(() => {
    if (search.checkout === "success" && shouldTrackCheckoutSuccess()) {
      trackEvent(AnalyticsEvents.CHECKOUT_COMPLETED);
    }
  }, [search.checkout]);
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-6xl px-4 py-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-extrabold text-white", children: "Dashboard" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-white/60", children: "Manage your cases and legal education tools" })
      ] }),
      /* @__PURE__ */ jsxs(Link, { to: "/cases/new", className: "gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md transition-all hover:shadow-lg", children: [
        /* @__PURE__ */ jsx("svg", { className: "mr-1.5 h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" }) }),
        "New Case"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-8 grid gap-4 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-white/60", children: "Total Cases" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-4xl font-bold text-white", children: loading ? "..." : data.stats.total })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-white/60", children: "Active Cases" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-4xl font-bold text-green-600", children: loading ? "..." : data.stats.active })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-white/60", children: "Resolved" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-4xl font-bold text-white/40", children: loading ? "..." : data.stats.resolved })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mb-8 grid gap-4 sm:grid-cols-5", children: [{
      label: "AI Legal Chat",
      to: "/chat",
      icon: "💬"
    }, {
      label: "Legal Research",
      to: "/research",
      icon: "📚"
    }, {
      label: "Evidence",
      to: "/evidence",
      icon: "📎"
    }, {
      label: "Calendar",
      to: "/calendar",
      icon: "📅"
    }, {
      label: "Profile",
      to: "/profile",
      icon: "👤"
    }].map((action) => /* @__PURE__ */ jsxs(Link, { to: action.to, className: "card-hover flex items-center gap-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 shadow-sm", children: [
      /* @__PURE__ */ jsx("span", { className: "text-2xl", children: action.icon }),
      /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: action.label })
    ] }, action.to)) }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "border-b border-white/10 px-6 py-4", children: /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-white", children: "Your Cases" }) }),
      loading ? /* @__PURE__ */ jsx("div", { className: "p-12 text-center", children: /* @__PURE__ */ jsx("div", { className: "mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" }) }) : loadError ? /* @__PURE__ */ jsxs("div", { className: "p-12 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 text-4xl", children: "⚠️" }),
        /* @__PURE__ */ jsx("p", { className: "mb-2 text-lg font-semibold text-white/70", children: "We couldn't load your dashboard" }),
        /* @__PURE__ */ jsx("p", { className: "mb-4 text-sm text-white/40", children: "A temporary problem interrupted the load. Try again in a moment." }),
        /* @__PURE__ */ jsx("button", { onClick: load, className: "gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy", children: "Try again" })
      ] }) : data.cases.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-12 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 text-4xl", children: "📂" }),
        /* @__PURE__ */ jsx("p", { className: "mb-2 text-lg font-semibold text-white/60", children: "No cases yet" }),
        /* @__PURE__ */ jsx("p", { className: "mb-4 text-sm text-white/40", children: "Create your first case to get started" }),
        /* @__PURE__ */ jsx(Link, { to: "/cases/new", className: "gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy", children: "Create Your First Case" })
      ] }) : /* @__PURE__ */ jsx("div", { className: "divide-y divide-white/10", children: data.cases.map((c) => /* @__PURE__ */ jsxs(Link, { to: "/cases/$caseId", params: {
        caseId: c.id
      }, className: "flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/5", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold text-white", children: c.title }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "active" ? "bg-green-900/30 text-green-300" : c.status === "resolved" ? "bg-white/10 text-white/70" : "bg-yellow-100 text-yellow-700"}`, children: c.status }),
            data.entitledCaseIds.includes(c.id) ? /* @__PURE__ */ jsx(Link, { to: "/analysis", search: {
              caseId: c.id,
              checkout: void 0
            }, className: "rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold transition-colors hover:bg-gold/25", title: "Open your unlocked Pro Case Analysis for this case", children: "✓ Pro Analysis" }) : /* @__PURE__ */ jsx("a", { href: `/analysis?caseId=${encodeURIComponent(c.id)}`, className: "rounded-full border border-gold/40 px-2 py-0.5 text-xs font-medium text-gold transition-colors hover:bg-gold/10", children: "Unlock $99" }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-white/40", children: c.caseType }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-white/40", children: c.jurisdiction })
          ] })
        ] }),
        /* @__PURE__ */ jsx("svg", { className: "h-5 w-5 text-white/20", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })
      ] }, c.id)) })
    ] })
  ] }) }) });
}
export {
  DashboardPage as component
};
