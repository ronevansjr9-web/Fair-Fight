import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { A as AuthenticatedGuard } from "./AuthenticatedGuard-BRF14A_z.js";
import { Link } from "@tanstack/react-router";
import { l as listTimeline, a as addTimeline, d as deleteTimeline } from "./caseActivity-CuXKeuRt.js";
import { R as Route } from "./router-CPaV_2AK.js";
import "@clerk/react";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "@clerk/react/internal";
import "@clerk/shared/getToken";
import "@clerk/shared/error";
import "@clerk/shared/getEnvVariable";
import "@clerk/shared/underscore";
import "@clerk/shared/htmlSafeJson";
import "@neondatabase/serverless";
import "./db-D7cnbd5l.js";
import "stripe";
import "./argumentAccess-Brc0Ql3j.js";
function TimelinePage() {
  const {
    caseId
  } = Route.useSearch();
  const [entries, setEntries] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: "",
    title: "",
    description: ""
  });
  const [error, setError] = useState("");
  useEffect(() => {
    if (caseId) listTimeline({
      data: {
        caseId
      }
    }).then(setEntries).catch((e) => setError(e instanceof Error ? e.message : "Unable to load timeline"));
  }, [caseId]);
  const handleAdd = async () => {
    if (!caseId || !newEntry.title.trim() || !newEntry.date) return;
    try {
      const entry = await addTimeline({
        data: {
          caseId,
          ...newEntry
        }
      });
      setEntries((prev) => [...prev, entry]);
      setNewEntry({
        date: "",
        title: "",
        description: ""
      });
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save event");
    }
  };
  const handleRemove = async (id) => {
    if (!caseId) return;
    try {
      await deleteTimeline({
        data: {
          caseId,
          id
        }
      });
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove event");
    }
  };
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-extrabold text-white", children: "Case Timeline" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-white/60", children: "Build a chronological timeline of key events" })
      ] }),
      caseId && /* @__PURE__ */ jsx("button", { onClick: () => setShowAdd(!showAdd), className: "gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy", children: "＋ Add Event" })
    ] }),
    !caseId ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white", children: [
      /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold", children: "Choose a case to view its timeline" }),
      /* @__PURE__ */ jsx(Link, { to: "/dashboard", search: {
        checkout: void 0
      }, className: "mt-5 inline-block text-gold underline", children: "Go to dashboard" })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      error && /* @__PURE__ */ jsx("p", { className: "mb-4 rounded-lg bg-red-900/40 p-3 text-red-200", children: error }),
      showAdd && /* @__PURE__ */ jsxs("div", { className: "mb-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-white", children: "New Timeline Event" }),
        /* @__PURE__ */ jsx("input", { "aria-label": "Date", type: "date", value: newEntry.date, onChange: (e) => setNewEntry({
          ...newEntry,
          date: e.target.value
        }), className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white" }),
        /* @__PURE__ */ jsx("input", { "aria-label": "Event Title", value: newEntry.title, onChange: (e) => setNewEntry({
          ...newEntry,
          title: e.target.value
        }), placeholder: "Event title", className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white" }),
        /* @__PURE__ */ jsx("textarea", { "aria-label": "Description", value: newEntry.description, onChange: (e) => setNewEntry({
          ...newEntry,
          description: e.target.value
        }), placeholder: "Brief description of what happened...", className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm text-white" }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsx("button", { onClick: handleAdd, className: "gold-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-navy", children: "Add Event" }),
          /* @__PURE__ */ jsx("button", { onClick: () => setShowAdd(false), className: "rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white/70", children: "Cancel" })
        ] })
      ] }),
      sortedEntries.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-12 text-center shadow-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 text-5xl", children: "🕐" }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-white/60", children: "No timeline entries yet" })
      ] }) : /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute left-20 top-0 h-full w-0.5 bg-gold/30" }),
        /* @__PURE__ */ jsx("div", { className: "space-y-6", children: sortedEntries.map((entry, i) => /* @__PURE__ */ jsxs("div", { className: "relative flex items-start gap-6", children: [
          /* @__PURE__ */ jsx("div", { className: "w-20 flex-shrink-0 text-right text-sm font-semibold text-white", children: (/* @__PURE__ */ new Date(`${entry.date}T00:00:00`)).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          }) }),
          /* @__PURE__ */ jsx("div", { className: `flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${i === 0 ? "border-gold bg-gold text-white" : "border-gold/30 bg-white text-white"}`, children: /* @__PURE__ */ jsx("span", { className: "text-xs font-bold", children: i + 1 }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-bold text-white", children: entry.title }),
            entry.description && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-white/70", children: entry.description }),
            /* @__PURE__ */ jsx("button", { onClick: () => handleRemove(entry.id), className: "mt-2 text-xs text-white/40 hover:text-red-500", children: "Remove" })
          ] })
        ] }, entry.id)) })
      ] })
    ] })
  ] }) }) });
}
export {
  TimelinePage as component
};
