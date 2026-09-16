import { jsx, Fragment, jsxs } from "react/jsx-runtime";
import { c as createSsrRpc, g as getUserCases } from "./router-azh1na2Z.js";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { c as createServerFn } from "../server.js";
import { s as sanitizeInput } from "./sanitize-CTUyMlso.js";
import { T as TEMP_UNAVAILABLE_MESSAGE } from "./restrictedFeatures-CtcRJvVh.js";
import "@neondatabase/serverless";
import "stripe";
import { s as sql } from "./db-D7cnbd5l.js";
import "@clerk/react/internal";
import "@clerk/shared/getToken";
import "@clerk/react";
import "@clerk/shared/error";
import "@clerk/shared/getEnvVariable";
import "@clerk/shared/underscore";
import "@clerk/shared/htmlSafeJson";
import "@tanstack/router-core/ssr/client";
import "./argumentAccess-Brc0Ql3j.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
const checkProAccess = createServerFn({
  method: "POST"
}).validator((v) => {
  const caseId = v?.caseId;
  if (typeof caseId !== "string" || !/^[A-Za-z0-9_-]+$/.test(caseId)) throw new Error("A case is required");
  return {
    caseId
  };
}).handler(createSsrRpc("5abc238fbfe99f9bd10a57986d6a948d7367ef87030a802c8f51b05d4769e6d7"));
function ProGate({
  feature,
  caseId,
  children
}) {
  const [hasPro, setHasPro] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  useEffect(() => {
    let c = false;
    if (!caseId || !/^[A-Za-z0-9_-]+$/.test(caseId)) {
      setHasPro(false);
      setIsChecking(false);
      return () => {
        c = true;
      };
    }
    setIsChecking(true);
    checkProAccess({
      data: {
        caseId
      }
    }).then((r) => {
      if (!c) {
        setHasPro(r.hasAccess);
        setIsChecking(false);
      }
    }).catch(() => {
      if (!c) setIsChecking(false);
    });
    return () => {
      c = true;
    };
  }, [caseId]);
  if (isChecking) return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center p-8", children: /* @__PURE__ */ jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" }) });
  if (hasPro) return /* @__PURE__ */ jsx(Fragment, { children });
  return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10", children: /* @__PURE__ */ jsx("svg", { className: "h-8 w-8 text-gold", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }) }),
    /* @__PURE__ */ jsxs("h3", { className: "mb-2 text-xl font-bold text-white", children: [
      feature,
      " — Temporarily Unavailable"
    ] }),
    /* @__PURE__ */ jsx("p", { className: "mx-auto mb-2 max-w-xl text-white/70", children: TEMP_UNAVAILABLE_MESSAGE }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-white/40", children: "Legal education, legal research, statutes, case law, and court rules remain available." })
  ] });
}
const JURISDICTIONS = ["Federal — U.S. Supreme Court / Federal Circuit", "Federal — 1st Circuit (ME, MA, NH, RI, PR)", "Federal — 2nd Circuit (NY, CT, VT)", "Federal — 3rd Circuit (PA, NJ, DE, VI)", "Federal — 4th Circuit (MD, VA, WV, NC, SC)", "Federal — 5th Circuit (TX, LA, MS)", "Federal — 6th Circuit (OH, MI, KY, TN)", "Federal — 7th Circuit (IL, IN, WI)", "Federal — 8th Circuit (MN, IA, MO, AR, NE, ND, SD)", "Federal — 9th Circuit (CA, OR, WA, AZ, NV, ID, MT, AK, HI)", "Federal — 10th Circuit (CO, UT, WY, KS, OK, NM)", "Federal — 11th Circuit (FL, GA, AL)", "Federal — D.C. Circuit", "Alabama State", "Alaska State", "Arizona State", "Arkansas State", "California State", "Colorado State", "Connecticut State", "Delaware State", "Florida State", "Georgia State", "Hawaii State", "Idaho State", "Illinois State", "Indiana State", "Iowa State", "Kansas State", "Kentucky State", "Louisiana State", "Maine State", "Maryland State", "Massachusetts State", "Michigan State", "Minnesota State", "Mississippi State", "Missouri State", "Montana State", "Nebraska State", "Nevada State", "New Hampshire State", "New Jersey State", "New Mexico State", "New York State", "North Carolina State", "North Dakota State", "Ohio State", "Oklahoma State", "Oregon State", "Pennsylvania State", "Rhode Island State", "South Carolina State", "South Dakota State", "Tennessee State", "Texas State", "Utah State", "Vermont State", "Virginia State", "Washington State", "West Virginia State", "Wisconsin State", "Wyoming State"];
const generateArgument = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.situation !== "string" || !d.situation.trim()) throw new Error("Situation is required");
  if (typeof d.caseId !== "string" || !/^[A-Za-z0-9_-]+$/.test(d.caseId)) throw new Error("Select a case first");
  return {
    caseId: d.caseId,
    situation: d.situation,
    jurisdiction: d.jurisdiction || "Federal",
    caseType: d.caseType || "Civil",
    position: d.position || "neutral",
    additionalContext: d.additionalContext || ""
  };
}).handler(createSsrRpc("b4351b31f52bf9c509e39d02aa6bffc4928232f749ab483b7045461bfacbf6f6"));
async function fetchUserCases(userId) {
  if (!userId) return {
    cases: []
  };
  try {
    const cases = await sql()`
      SELECT id, title
      FROM cases
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 100
    `;
    return {
      cases: cases.map((c) => ({
        id: String(c.id),
        title: String(c.title)
      }))
    };
  } catch {
    return {
      cases: []
    };
  }
}
function LegalArgumentPage() {
  const [caseId, setCaseId] = useState("");
  const [situation, setSituation] = useState("");
  const [jurisdiction, setJurisdiction] = useState("Federal");
  const [caseType, setCaseType] = useState("Civil");
  const [position, setPosition] = useState("neutral");
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [userCases, setUserCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  useEffect(() => {
    getUserCases().then((res) => {
      const list = res?.cases || [];
      setUserCases(list);
      setIsLoadingCases(false);
      if (list.length > 0) {
        setCaseId(list[0].id);
      }
    }).catch(() => {
      setIsLoadingCases(false);
    });
  }, []);
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    setResult("");
    const res = await generateArgument({
      data: {
        caseId,
        situation,
        jurisdiction,
        caseType,
        position,
        additionalContext
      }
    });
    if (res.success) {
      setResult(res.response);
    } else if (res.error) {
      setError(res.error);
    }
    setIsGenerating(false);
  };
  return /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-12", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-4xl", children: [
    /* @__PURE__ */ jsx("h1", { className: "mb-2 text-3xl font-extrabold text-white sm:text-4xl", children: "Legal Argument Generator" }),
    /* @__PURE__ */ jsx("p", { className: "mb-8 text-lg text-white/70", children: "AI-powered legal argument templates with jurisdiction-specific case law citations." }),
    /* @__PURE__ */ jsxs("div", { className: "mb-6 rounded-2xl border border-white/10 bg-white/5 p-5", children: [
      /* @__PURE__ */ jsx("label", { className: "mb-2 block text-sm font-semibold text-white", children: "Select your case (required)" }),
      isLoadingCases ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 py-1 text-sm text-white/70", children: [
        /* @__PURE__ */ jsx("div", { className: "h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" }),
        /* @__PURE__ */ jsx("span", { children: "Loading your cases..." })
      ] }) : userCases.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-yellow-800/30 bg-yellow-900/10 p-4 text-sm text-yellow-200", children: [
        /* @__PURE__ */ jsx("p", { className: "mb-2 font-semibold", children: "No cases found in your account." }),
        /* @__PURE__ */ jsx("p", { className: "mb-4 text-xs text-white/60", children: "You must create a case first before you can generate legal arguments." }),
        /* @__PURE__ */ jsx(Link, { to: "/cases/new", className: "gold-gradient inline-flex items-center rounded-full px-5 py-2 text-xs font-semibold text-navy shadow-md hover:shadow-lg transition-all", children: "Create a New Case" })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("select", { value: caseId, onChange: (e) => setCaseId(e.target.value), className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20", children: [
          /* @__PURE__ */ jsx("option", { value: "", children: "-- Select a case --" }),
          userCases.map((c) => /* @__PURE__ */ jsx("option", { value: c.id, children: c.title }, c.id))
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-xs text-white/50", children: "For your security, access is checked against your account and this exact case." })
      ] })
    ] }),
    /* @__PURE__ */ jsx(ProGate, { feature: "Legal Argument Generator", caseId, children: /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6 grid gap-4 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Jurisdiction" }),
          /* @__PURE__ */ jsx("select", { value: jurisdiction, onChange: (e) => setJurisdiction(e.target.value), className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20", children: JURISDICTIONS.map((j) => /* @__PURE__ */ jsx("option", { value: j, children: j }, j)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Case Type" }),
          /* @__PURE__ */ jsxs("select", { value: caseType, onChange: (e) => setCaseType(e.target.value), className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20", children: [
            /* @__PURE__ */ jsx("option", { children: "Civil" }),
            /* @__PURE__ */ jsx("option", { children: "Criminal" }),
            /* @__PURE__ */ jsx("option", { children: "Family" }),
            /* @__PURE__ */ jsx("option", { children: "Housing" }),
            /* @__PURE__ */ jsx("option", { children: "Employment" }),
            /* @__PURE__ */ jsx("option", { children: "Constitutional" }),
            /* @__PURE__ */ jsx("option", { children: "Contract" }),
            /* @__PURE__ */ jsx("option", { children: "Tort / Personal Injury" }),
            /* @__PURE__ */ jsx("option", { children: "Administrative" }),
            /* @__PURE__ */ jsx("option", { children: "Appeal" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Position" }),
          /* @__PURE__ */ jsxs("select", { value: position, onChange: (e) => setPosition(e.target.value), className: "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20", children: [
            /* @__PURE__ */ jsx("option", { value: "neutral", children: "Neutral / Educational" }),
            /* @__PURE__ */ jsx("option", { value: "plaintiff", children: "Plaintiff / Petitioner" }),
            /* @__PURE__ */ jsx("option", { value: "defendant", children: "Defendant / Respondent" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Describe Your Situation" }),
      /* @__PURE__ */ jsx("textarea", { value: situation, onChange: (e) => setSituation(e.target.value), rows: 8, placeholder: "Describe your legal situation in detail. Include all relevant facts, dates, parties, and the legal issue you're dealing with. The more detail, the better the result.", className: "mb-4 w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" }),
      /* @__PURE__ */ jsx("label", { className: "mb-1 block text-sm font-semibold text-white", children: "Additional Context (optional)" }),
      /* @__PURE__ */ jsx("textarea", { value: additionalContext, onChange: (e) => setAdditionalContext(e.target.value), rows: 3, placeholder: "Any additional context: prior court rulings, specific statutes you're aware of, arguments the other side has made...", className: "mb-6 w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" }),
      /* @__PURE__ */ jsx("button", { onClick: handleGenerate, disabled: isGenerating || !situation.trim(), className: "gold-gradient w-full rounded-full py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isGenerating ? "Generating Argument..." : "Generate Legal Argument" }),
      error && /* @__PURE__ */ jsx("div", { className: "mt-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300", children: error }),
      result && /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-6", children: [
        /* @__PURE__ */ jsx("div", { className: "prose max-w-none", dangerouslySetInnerHTML: {
          __html: sanitizeInput(result).replace(/\n/g, "<br/>")
        } }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-lg border border-yellow-800 bg-yellow-900/20 p-4 text-sm text-yellow-300", children: [
          "⚖️ ",
          /* @__PURE__ */ jsx("strong", { children: "FOR EDUCATIONAL PURPOSES ONLY — NOT LEGAL ADVICE." }),
          " Review with a licensed attorney before filing. The AI may cite cases that require verification. Never file a document without attorney review."
        ] })
      ] })
    ] }) })
  ] }) });
}
export {
  LegalArgumentPage as component,
  fetchUserCases
};
