import { jsxs, jsx } from "react/jsx-runtime";
import { c as createSsrRpc } from "./router-COlvaXvL.js";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { c as createServerFn } from "../server.js";
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
const RESEARCH_TOPICS = [{
  icon: "📜",
  title: "Federal Rules of Civil Procedure",
  desc: "The rules governing civil litigation in U.S. federal courts.",
  category: "Court Rules"
}, {
  icon: "⚖️",
  title: "Federal Rules of Evidence",
  desc: "Rules determining what evidence is admissible in federal court.",
  category: "Court Rules"
}, {
  icon: "🏛️",
  title: "U.S. Constitution",
  desc: "The supreme law of the United States, including all amendments.",
  category: "Constitutional"
}, {
  icon: "📋",
  title: "Supreme Court Cases",
  desc: "Landmark decisions from the highest court in the United States.",
  category: "Case Law"
}, {
  icon: "📝",
  title: "Federal Statutes (U.S. Code)",
  desc: "Compilation of all permanent federal laws of the United States.",
  category: "Statutes"
}, {
  icon: "🔍",
  title: "Legal Terms Glossary",
  desc: "Plain-English definitions of common legal terms and Latin phrases.",
  category: "Reference"
}, {
  icon: "📊",
  title: "Court Statistics",
  desc: "Data on case filings, outcomes, and timelines by jurisdiction.",
  category: "Reference"
}, {
  icon: "📖",
  title: "State Court Rules",
  desc: "Procedural rules for state courts — select your state.",
  category: "Court Rules"
}];
const legalResearch = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  return {
    query: d.query || ""
  };
}).handler(createSsrRpc("95dbc344e448a8fada4864873302bc7a0bc7575fd12421adfc387119c87e2cc2"));
function ResearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const res = await legalResearch({
        data: {
          query
        }
      });
      if (res.success) {
        setResults(res.results);
        if (res.results.length === 0) {
          setError("No results found. Try different search terms.");
        }
      } else {
        setResults([]);
        setError(res.error || "Search failed. Please try again.");
      }
    } catch {
      setError("Search failed. Please try again.");
    }
    setIsSearching(false);
  };
  return /* @__PURE__ */ jsxs("main", { className: "min-h-screen bg-navy", children: [
    /* @__PURE__ */ jsx("section", { className: "bg-navy px-4 py-16", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl text-center", children: [
      /* @__PURE__ */ jsx("h1", { className: "mb-4 text-4xl font-extrabold text-white sm:text-5xl", children: "Legal Research" }),
      /* @__PURE__ */ jsx("p", { className: "mb-8 text-lg text-white/70", children: "Search public case law from U.S. courts via CourtListener. Educational research only; not legal advice." }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx("input", { type: "text", value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSearch(), placeholder: 'Search case law... (e.g., "Fourth Amendment," "summary judgment," "statute of limitations")', className: "flex-1 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-white placeholder-white/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" }),
        /* @__PURE__ */ jsx("button", { onClick: handleSearch, disabled: isSearching || !query.trim(), className: "gold-gradient rounded-full px-6 py-3 font-semibold text-navy disabled:opacity-50", children: isSearching ? "Searching..." : "Search" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "px-4 py-12", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-4xl", children: [
      error && /* @__PURE__ */ jsx("div", { className: "mb-8 rounded-lg border border-yellow-800 bg-yellow-900/20 p-4 text-sm text-yellow-300", children: error }),
      results.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mb-12", children: [
        /* @__PURE__ */ jsx("h2", { className: "mb-4 text-xl font-bold text-white", children: "Case Law Results" }),
        /* @__PURE__ */ jsx("div", { className: "space-y-4", children: results.map((r, i) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5 shadow-sm", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold text-white text-lg", children: /* @__PURE__ */ jsx("a", { href: r.url, target: "_blank", rel: "noopener noreferrer", className: "hover:text-gold transition-colors", children: r.caseName }) }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60", children: [
            /* @__PURE__ */ jsx("span", { children: r.court }),
            /* @__PURE__ */ jsx("span", { children: r.dateFiled }),
            /* @__PURE__ */ jsx("span", { className: "text-gold/70", children: r.citation })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm leading-relaxed text-white/70", children: r.snippet }),
          /* @__PURE__ */ jsx("a", { href: r.url, target: "_blank", rel: "noopener noreferrer", className: "mt-2 inline-block text-xs text-gold hover:underline", children: "View full opinion on CourtListener →" })
        ] }, i)) }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/50", children: [
          /* @__PURE__ */ jsx("span", { children: "⚖️" }),
          /* @__PURE__ */ jsxs("span", { children: [
            "Results powered by ",
            /* @__PURE__ */ jsx("a", { href: "https://www.courtlistener.com", target: "_blank", rel: "noopener noreferrer", className: "text-gold hover:underline", children: "CourtListener" }),
            ", a project of the Free Law Project."
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-2 rounded-lg border border-yellow-800 bg-yellow-900/20 p-3 text-xs text-yellow-300", children: "⚖️ For educational purposes only. Fair Fight is not a law firm and does not provide legal advice. Always consult with a qualified attorney." })
      ] }),
      /* @__PURE__ */ jsx("h2", { className: "mb-6 text-2xl font-bold text-white", children: "Legal Research Topics" }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: RESEARCH_TOPICS.map((topic) => /* @__PURE__ */ jsxs(Link, { to: "/learn", className: "card-hover rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5 shadow-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "mb-2 text-2xl", children: topic.icon }),
        /* @__PURE__ */ jsx("h3", { className: "font-bold text-white", children: topic.title }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-white/60", children: topic.desc }),
        /* @__PURE__ */ jsx("span", { className: "mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70", children: topic.category })
      ] }, topic.title)) })
    ] }) })
  ] });
}
export {
  ResearchPage as component
};
