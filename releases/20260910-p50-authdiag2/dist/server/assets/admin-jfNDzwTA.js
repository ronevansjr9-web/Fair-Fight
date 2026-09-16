import { jsx, jsxs } from "react/jsx-runtime";
import { c as createSsrRpc } from "./router-CKJnu5wL.js";
import { useState, useEffect } from "react";
import { c as createServerFn } from "../server.js";
import "@tanstack/react-router";
import "@clerk/react/internal";
import "@clerk/shared/getToken";
import "@clerk/react";
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
const getAdminStats = createServerFn({
  method: "GET"
}).handler(createSsrRpc("15cd0173a0b5b91e1bd987c0c05c3bbd4b0b6dca270202967a21d28f2ce87afc"));
function AdminPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getAdminStats().then((d) => {
      setStats(d);
      setLoading(false);
    });
  }, []);
  if (loading) {
    return /* @__PURE__ */ jsx("main", { className: "flex min-h-screen items-center justify-center", children: /* @__PURE__ */ jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" }) });
  }
  if (!stats?.authorized) {
    return /* @__PURE__ */ jsx("main", { className: "flex min-h-screen items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("h1", { className: "mb-2 text-2xl font-bold text-white", children: "Access Denied" }),
      /* @__PURE__ */ jsx("p", { className: "text-white/60", children: "You do not have admin access." })
    ] }) });
  }
  return /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-6xl", children: [
    /* @__PURE__ */ jsx("h1", { className: "mb-8 text-3xl font-extrabold text-white", children: "Admin Dashboard" }),
    /* @__PURE__ */ jsxs("div", { className: "mb-8 grid gap-4 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-white/60", children: "Total Users" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-5xl font-bold text-white", children: stats.users })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-white/60", children: "Total Cases" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-5xl font-bold text-white", children: stats.cases })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-8 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "mb-4 text-lg font-bold text-white", children: "Recent Users" }),
        stats.recentUsers.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-white/40", children: "No users yet" }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: stats.recentUsers.map((u) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
          /* @__PURE__ */ jsx("span", { className: "text-white/80", children: u.email }),
          /* @__PURE__ */ jsx("span", { className: "text-white/40", children: new Date(u.createdAt).toLocaleDateString() })
        ] }, u.id)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "mb-4 text-lg font-bold text-white", children: "Recent AI Analyses" }),
        stats.recentAnalyses.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-white/40", children: "No analyses yet" }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: stats.recentAnalyses.map((a, i) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
          /* @__PURE__ */ jsxs("span", { className: "text-white/80", children: [
            "User: ",
            a.userId.slice(0, 12),
            "..."
          ] }),
          /* @__PURE__ */ jsx("span", { className: "text-white/40", children: new Date(a.createdAt).toLocaleString() })
        ] }, i)) })
      ] })
    ] })
  ] }) });
}
export {
  AdminPage as component
};
