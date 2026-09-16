import { jsx, jsxs } from "react/jsx-runtime";
import { Navigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { d as Route, e as ARTICLES, f as getGuideBySlug, h as ALL_CATEGORIES } from "./router-CxY3nyJJ.js";
import "@clerk/react/internal";
import "@clerk/shared/getToken";
import "@clerk/react";
import "@clerk/shared/error";
import "@clerk/shared/getEnvVariable";
import "@clerk/shared/underscore";
import "@clerk/shared/htmlSafeJson";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "@neondatabase/serverless";
import "./db-D7cnbd5l.js";
import "stripe";
import "./argumentAccess-Brc0Ql3j.js";
function Learn() {
  const search = Route.useSearch();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const filtered = selectedCategory ? ARTICLES.filter((a) => a.category === selectedCategory) : ARTICLES;
  if (search.article) {
    const legacy = getGuideBySlug(search.article);
    if (legacy) {
      return /* @__PURE__ */ jsx(Navigate, { to: "/learn/$slug", params: {
        slug: legacy.id
      }, replace: true });
    }
  }
  return /* @__PURE__ */ jsxs("main", { className: "min-h-screen bg-navy", children: [
    /* @__PURE__ */ jsx("section", { className: "bg-navy-dark px-4 py-16 text-center", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-4xl", children: [
      /* @__PURE__ */ jsx("h1", { className: "mb-4 text-4xl font-extrabold text-white sm:text-5xl", children: "Public Legal Education Guides" }),
      /* @__PURE__ */ jsxs("p", { className: "mx-auto max-w-2xl text-lg text-white/60", children: [
        "Plain-English explanations of legal concepts, court procedures, and your rights. Browse ",
        ARTICLES.length,
        " public guides; Pro Case Analysis is a separate one-time $99 purchase per case."
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "border-b border-white/10 px-4 py-6", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-6xl flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsx("button", { onClick: () => setSelectedCategory(null), className: `rounded-full px-4 py-1.5 text-sm font-medium transition-all ${!selectedCategory ? "bg-gold text-navy" : "border border-white/10 text-white/60 hover:border-white/30 hover:text-white"}`, children: "All" }),
      ALL_CATEGORIES.map((cat) => /* @__PURE__ */ jsx("button", { onClick: () => setSelectedCategory(cat), className: `rounded-full px-4 py-1.5 text-sm font-medium transition-all ${selectedCategory === cat ? "bg-gold text-navy" : "border border-white/10 text-white/60 hover:border-white/30 hover:text-white"}`, children: cat }, cat))
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "px-4 py-12", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-3", children: filtered.map((article) => /* @__PURE__ */ jsxs(Link, { to: "/learn/$slug", params: {
      slug: article.id
    }, className: "card-hover rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm", children: [
      /* @__PURE__ */ jsx("span", { className: "mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/50", children: article.category }),
      /* @__PURE__ */ jsx("h3", { className: "mb-2 text-lg font-bold text-white line-clamp-2", children: article.title }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-white/40", children: [
        article.readTime,
        " read"
      ] })
    ] }, article.id)) }) })
  ] });
}
export {
  Learn as component
};
