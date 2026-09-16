import { jsx, jsxs } from "react/jsx-runtime";
import { t as trackEvent, A as AnalyticsEvents, c as createSsrRpc } from "./router-CKJnu5wL.js";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { c as createServerFn } from "../server.js";
import { A as AuthenticatedGuard } from "./AuthenticatedGuard-BRF14A_z.js";
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
const createCase = createServerFn({
  method: "POST"
}).handler(createSsrRpc("7463bc5ff3d0d99c2f78a632dbcad1cc33759becdeebc6f266360bc101379952"));
function NewCasePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState("Civil");
  const [jurisdiction, setJurisdiction] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await createCase({
        data: {
          title,
          caseType,
          jurisdiction,
          description
        }
      });
      if (result?.success && result.caseId) {
        trackEvent(AnalyticsEvents.CASE_CREATED);
        navigate({
          to: "/cases/$caseId",
          params: {
            caseId: result.caseId
          }
        });
      } else if (result?.error) {
        setError(result.error);
      } else {
        setError("Something went wrong creating your case. Please try again.");
      }
    } catch (err) {
      console.error("Case creation request failed:", err);
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-12", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl", children: [
    /* @__PURE__ */ jsx("h1", { className: "mb-2 text-3xl font-extrabold text-white", children: "Create New Case" }),
    /* @__PURE__ */ jsx("p", { className: "mb-8 text-white/70", children: "Start a new case to track important dates and court deadlines and get AI-powered legal education." }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "mb-1 block text-sm font-semibold text-white", children: [
            "Case Title ",
            /* @__PURE__ */ jsx("span", { className: "text-red-400", children: "*" })
          ] }),
          /* @__PURE__ */ jsx("input", { type: "text", value: title, onChange: (e) => setTitle(e.target.value), placeholder: 'e.g., "Smith v. Johnson — Breach of Contract"', required: true, className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Case Type" }),
          /* @__PURE__ */ jsxs("select", { value: caseType, onChange: (e) => setCaseType(e.target.value), className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20", children: [
            /* @__PURE__ */ jsx("option", { children: "Civil" }),
            /* @__PURE__ */ jsx("option", { children: "Criminal" }),
            /* @__PURE__ */ jsx("option", { children: "Family" }),
            /* @__PURE__ */ jsx("option", { children: "Housing" }),
            /* @__PURE__ */ jsx("option", { children: "Employment" }),
            /* @__PURE__ */ jsx("option", { children: "Small Claims" }),
            /* @__PURE__ */ jsx("option", { children: "Appeal" }),
            /* @__PURE__ */ jsx("option", { children: "Other" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Jurisdiction" }),
          /* @__PURE__ */ jsx("input", { type: "text", value: jurisdiction, onChange: (e) => setJurisdiction(e.target.value), placeholder: 'e.g., "California," "Federal — 9th Circuit"', className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Description" }),
          /* @__PURE__ */ jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), rows: 4, placeholder: "Briefly describe your case. What happened, who's involved, and what's the legal issue?", className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" })
        ] })
      ] }),
      error && /* @__PURE__ */ jsx("div", { className: "mt-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300", children: error }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 flex gap-3", children: [
        /* @__PURE__ */ jsx("button", { type: "submit", disabled: isSubmitting || !title.trim(), className: "gold-gradient flex-1 rounded-full py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isSubmitting ? "Creating Case..." : "Create Case" }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => navigate({
          to: "/dashboard"
        }), className: "rounded-full bg-white/10 px-6 py-3 font-semibold text-white/70 transition-all hover:bg-white/10", children: "Cancel" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-4 text-center text-xs text-white/40", children: "⚖️ Fair Fight is for educational purposes only. Your case information is private." })
    ] })
  ] }) }) });
}
export {
  NewCasePage as component
};
