import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { b as listCalendar, c as addCalendar, e as deleteCalendar } from "./caseActivity-D0G-wsxJ.js";
import { A as AuthenticatedGuard } from "./AuthenticatedGuard-BRF14A_z.js";
import "./router-COlvaXvL.js";
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
function CalendarPage() {
  const {
    caseId
  } = useSearch({
    from: "/calendar"
  });
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (caseId) listCalendar({
      data: {
        caseId
      }
    }).then(setEvents).catch((e) => setError(e instanceof Error ? e.message : "Unable to load calendar"));
  }, [caseId]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    type: "hearing",
    notes: ""
  });
  const handleAdd = async () => {
    if (!caseId || !newEvent.title.trim() || !newEvent.date) return;
    try {
      const event = await addCalendar({
        data: {
          caseId,
          ...newEvent
        }
      });
      setEvents((prev) => [...prev, event]);
      setNewEvent({
        title: "",
        date: "",
        type: "hearing",
        notes: ""
      });
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save event");
    }
  };
  const handleRemove = async (id) => {
    if (!caseId) return;
    try {
      await deleteCalendar({
        data: {
          caseId,
          id
        }
      });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove event");
    }
  };
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const eventTypeColors = {
    hearing: "bg-red-100 text-red-300 border-red-800",
    deadline: "bg-orange-100 text-orange-700 border-orange-200",
    filing: "bg-blue-100 text-blue-700 border-blue-200",
    meeting: "bg-green-900/30 text-green-300 border-green-200",
    reminder: "bg-purple-100 text-purple-700 border-purple-200",
    other: "bg-white/10 text-white/80 border-white/10"
  };
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-4xl", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-extrabold text-white", children: "Court Calendar" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-white/60", children: "Track court dates, deadlines, and appointments" })
      ] }),
      caseId && /* @__PURE__ */ jsxs("button", { onClick: () => setShowAdd(!showAdd), className: "gold-gradient inline-flex items-center rounded-full px-6 py-2.5 font-semibold text-navy shadow-md", children: [
        /* @__PURE__ */ jsx("svg", { className: "mr-1.5 h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" }) }),
        "Add Event"
      ] })
    ] }),
    error && /* @__PURE__ */ jsx("p", { className: "mb-4 rounded-lg bg-red-900/40 p-3 text-red-200", children: error }),
    !caseId ? /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white", children: "Choose a case from your dashboard to view calendar events." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      showAdd && /* @__PURE__ */ jsxs("div", { className: "mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "mb-4 text-lg font-bold text-white", children: "New Calendar Event" }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Event Title" }),
            /* @__PURE__ */ jsx("input", { type: "text", value: newEvent.title, onChange: (e) => setNewEvent((p) => ({
              ...p,
              title: e.target.value
            })), placeholder: 'e.g., "Hearing on Motion to Dismiss"', className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Date" }),
            /* @__PURE__ */ jsx("input", { type: "date", value: newEvent.date, onChange: (e) => setNewEvent((p) => ({
              ...p,
              date: e.target.value
            })), className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Event Type" }),
            /* @__PURE__ */ jsxs("select", { value: newEvent.type, onChange: (e) => setNewEvent((p) => ({
              ...p,
              type: e.target.value
            })), className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20", children: [
              /* @__PURE__ */ jsx("option", { value: "hearing", children: "Court Hearing" }),
              /* @__PURE__ */ jsx("option", { value: "deadline", children: "Filing Deadline" }),
              /* @__PURE__ */ jsx("option", { value: "filing", children: "Filing Due" }),
              /* @__PURE__ */ jsx("option", { value: "meeting", children: "Attorney Meeting" }),
              /* @__PURE__ */ jsx("option", { value: "reminder", children: "Reminder" }),
              /* @__PURE__ */ jsx("option", { value: "other", children: "Other" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Notes" }),
            /* @__PURE__ */ jsx("input", { type: "text", value: newEvent.notes, onChange: (e) => setNewEvent((p) => ({
              ...p,
              notes: e.target.value
            })), placeholder: "Optional notes...", className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 flex gap-3", children: [
          /* @__PURE__ */ jsx("button", { onClick: handleAdd, className: "gold-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-navy", children: "Add Event" }),
          /* @__PURE__ */ jsx("button", { onClick: () => setShowAdd(false), className: "rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white/70", children: "Cancel" })
        ] })
      ] }),
      sortedEvents.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-12 text-center shadow-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 text-5xl", children: "📅" }),
        /* @__PURE__ */ jsx("p", { className: "mb-2 text-lg font-semibold text-white/60", children: "No events yet" }),
        /* @__PURE__ */ jsx("p", { className: "mb-4 text-sm text-white/40", children: "Add court dates and deadlines to stay on track" }),
        /* @__PURE__ */ jsx("button", { onClick: () => setShowAdd(true), className: "gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy", children: "Add Your First Event" })
      ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: sortedEvents.map((event) => /* @__PURE__ */ jsxs("div", { className: `flex items-start justify-between gap-3 rounded-xl border p-4 ${eventTypeColors[event.type] || eventTypeColors.other}`, children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold", children: event.title }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: (/* @__PURE__ */ new Date(event.date + "T00:00:00")).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            }) }),
            /* @__PURE__ */ jsx("span", { className: "rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium capitalize", children: event.type })
          ] }),
          event.notes && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm opacity-70", children: event.notes })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => handleRemove(event.id), className: "shrink-0 rounded-lg p-2 opacity-50 hover:opacity-100", children: /* @__PURE__ */ jsx("svg", { className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })
      ] }, event.id)) })
    ] })
  ] }) }) });
}
export {
  CalendarPage as component
};
