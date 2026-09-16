import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { b as getRequest, c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-ZI2Sw1yb.js";
import { i as isCaseOwner, d as hasCaseEntitlement, e as checkoutReturnUrls, F as FAIR_FIGHT_PRICE_CENTS, f as FAIR_FIGHT_CURRENCY, b as hasOwnedCaseEntitlement } from "./argumentAccess-Brc0Ql3j.js";
import { a as sanitizeUrl, s as sanitizeInput } from "./sanitize-CTUyMlso.js";
import { a as askAI, A as ANALYSIS_MODEL } from "./ai-Cw0dwDfh.js";
import { s as sql } from "./db-D7cnbd5l.js";
import Stripe from "stripe";
import { R as RESTRICTED_FEATURES } from "./restrictedFeatures-CtcRJvVh.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "@google/generative-ai";
import "@neondatabase/serverless";
const ANALYSIS_SYSTEM_PROMPT = `You are the Fair Fight legal EDUCATION engine. You help self-represented people understand their situation so they can prepare for an attorney conversation. You never give legal advice, never predict outcomes, never recommend a course of action, and never claim an argument is "best" or guaranteed, or that any output is filing-ready.

Given the user's facts and jurisdiction, respond with STRICT JSON only — no markdown fences, no commentary. The JSON must have exactly these keys:
{
  "summary": "2-4 sentence plain-English summary of the situation and the legal area it appears to touch.",
  "possibleIssues": "Plain-English bullet points (each on a new line starting with '- ') of possible legal issues the facts may raise. Label each as a possibility, not a conclusion.",
  "candidateArguments": "Plain-English bullet points (each on a new line starting with '- ') of candidate arguments EITHER side might make, with the general legal principle each relies on. Frame as possibilities for education, not positions you recommend.",
  "counterarguments": "Plain-English bullet points (each on a new line starting with '- ') of counterarguments and uncertainties — weaknesses, open questions, and facts that would change the picture.",
  "sources": [ { "title": "Name of the law/case/guide", "url": "https://...", "type": "statute|case|guide|other" } ]
}

Rules for sources: cite only real, well-known, verifiable public legal sources (statutes, court rules, major reported cases, government or court guides). Include a real public URL for each when you can. If you are not certain a source exists, omit it — never fabricate a citation or URL. 1-5 sources is plenty. Keep the whole response under 800 words.

End your response with nothing but the JSON object. This is legal education, not legal advice: the user must consult a licensed attorney for their specific situation.`;
function buildAnalysisPrompt(input) {
  return [
    "USER FACTS:",
    input.facts.trim().slice(0, 8e3) || "(no facts provided)",
    "",
    "JURISDICTION:",
    input.jurisdiction.trim() || "(not specified)",
    "",
    "CASE TYPE:",
    input.caseType.trim() || "(not specified)"
  ].join("\n");
}
const ALLOWED_SOURCE_TYPES = /* @__PURE__ */ new Set(["statute", "case", "guide", "other"]);
function normalizeSource(raw) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw;
  const title = typeof r.title === "string" ? r.title.trim().slice(0, 300) : "";
  const url = sanitizeUrl(typeof r.url === "string" ? r.url : "");
  const type = typeof r.type === "string" && ALLOWED_SOURCE_TYPES.has(r.type) ? r.type : "other";
  if (!title || !url) return null;
  return { title, url, type };
}
function parseAnalysisResponse(raw) {
  const text = raw.trim();
  const jsonText = text.startsWith("{") ? text : text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI response was not valid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("AI response was not an object");
  const p = parsed;
  const str = (v) => typeof v === "string" ? v.trim() : "";
  const summary = str(p.summary);
  const possibleIssues = str(p.possibleIssues);
  const candidateArguments = str(p.candidateArguments);
  const counterarguments = str(p.counterarguments);
  if (!summary || !possibleIssues || !candidateArguments) {
    throw new Error("AI response is missing required sections");
  }
  const sources = Array.isArray(p.sources) ? p.sources.map(normalizeSource).filter((s) => s !== null) : [];
  return { summary, possibleIssues, candidateArguments, counterarguments, sources };
}
async function generateCaseAnalysis(input, deps) {
  const raw = await deps.askAI(
    [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: buildAnalysisPrompt(input) }
    ],
    { maxTokens: 2048, temperature: 0.3 }
  );
  if (!raw || raw.length === 0) throw new Error("AI returned an empty response");
  return parseAnalysisResponse(raw);
}
function normalizeSources(value) {
  if (Array.isArray(value)) {
    return value.filter(
      (s) => !!s && typeof s === "object" && typeof s.title === "string" && typeof s.url === "string"
    );
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeSources(parsed);
    } catch {
      return [];
    }
  }
  return [];
}
async function saveCaseAnalysis(row) {
  const query = sql();
  await query`
    INSERT INTO case_analyses
      (case_id, user_id, facts, jurisdiction, summary, possible_issues, candidate_arguments, counterarguments, sources, model, status, created_at, updated_at)
    VALUES
      (${row.caseId}, ${row.userId}, ${row.facts}, ${row.jurisdiction}, ${row.analysis.summary}, ${row.analysis.possibleIssues}, ${row.analysis.candidateArguments}, ${row.analysis.counterarguments}, ${JSON.stringify(row.analysis.sources)}::jsonb, ${row.model}, 'completed', NOW(), NOW())
    ON CONFLICT (case_id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      facts = EXCLUDED.facts,
      jurisdiction = EXCLUDED.jurisdiction,
      summary = EXCLUDED.summary,
      possible_issues = EXCLUDED.possible_issues,
      candidate_arguments = EXCLUDED.candidate_arguments,
      counterarguments = EXCLUDED.counterarguments,
      sources = EXCLUDED.sources,
      model = EXCLUDED.model,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;
}
function mapCaseAnalysisRow(r) {
  return {
    facts: String(r.facts ?? ""),
    jurisdiction: String(r.jurisdiction ?? ""),
    summary: String(r.summary ?? ""),
    possibleIssues: String(r.possible_issues ?? ""),
    candidateArguments: String(r.candidate_arguments ?? ""),
    counterarguments: String(r.counterarguments ?? ""),
    sources: normalizeSources(r.sources),
    model: String(r.model ?? ""),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
async function loadCaseAnalysis(userId, caseId) {
  const rows = await sql()`
    SELECT case_id, user_id, facts, jurisdiction, summary, possible_issues, candidate_arguments, counterarguments, sources, model, created_at, updated_at
    FROM case_analyses
    WHERE case_id = ${caseId} AND user_id = ${userId}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  return mapCaseAnalysisRow(rows[0]);
}
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "";
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-03-31.basil"
    });
  }
  return _stripe;
}
function currentRequest() {
  try {
    return getRequest();
  } catch {
    return void 0;
  }
}
async function validateConfiguredProPrice() {
  if (!STRIPE_PRO_PRICE_ID) return "STRIPE_PRO_PRICE_ID environment variable is not configured";
  try {
    const price = await getStripe().prices.retrieve(STRIPE_PRO_PRICE_ID);
    if (price.type !== "one_time") return "Configured price is not a one-time purchase";
    if (price.unit_amount !== FAIR_FIGHT_PRICE_CENTS) return "Configured price is not the $99 USD Pro price";
    if (price.currency !== FAIR_FIGHT_CURRENCY) return "Configured price is not USD";
    return null;
  } catch (error) {
    console.error("Stripe price validation failed:", error);
    return "Failed to validate the configured Stripe price";
  }
}
async function createCheckoutSessionCore(userId, caseId) {
  if (!userId || !caseId || !/^[A-Za-z0-9_-]{1,64}$/.test(caseId)) {
    return { error: "Select a valid case before purchasing Pro." };
  }
  let owned = false;
  try {
    owned = await isCaseOwner(userId, caseId);
  } catch {
    owned = false;
  }
  if (!owned) return { error: "Case not found or not owned by you." };
  let alreadyEntitled = false;
  try {
    alreadyEntitled = await hasCaseEntitlement(userId, caseId);
  } catch {
    alreadyEntitled = true;
  }
  if (alreadyEntitled) {
    return { error: "Pro Case Analysis is already unlocked for this case. Open it from your dashboard." };
  }
  const priceError = await validateConfiguredProPrice();
  if (priceError) return { error: priceError };
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_PRO_PRICE_ID,
          quantity: 1
        }
      ],
      // userId is ALWAYS server-derived (never read from the client). caseId
      // is validated and ownership-checked above.
      metadata: {
        userId,
        caseId
      },
      ...checkoutReturnUrls(void 0, { request: currentRequest(), caseId }),
      allow_promotion_codes: false,
      billing_address_collection: "auto"
    });
    return { url: session.url || checkoutReturnUrls(void 0, { request: currentRequest(), caseId }).success_url };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return { error: "Failed to create checkout session" };
  }
}
async function createCheckoutSession(userId, caseId) {
  return createCheckoutSessionCore(userId, caseId);
}
const CASE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const getAnalysisStatus_createServerFn_handler = createServerRpc({
  id: "c6d2efa93b45004f5f098be6b899086345155ca100e94710cbe429d62f68ec53",
  name: "getAnalysisStatus",
  filename: "src/routes/analysis.tsx"
}, (opts) => getAnalysisStatus.__executeServer(opts));
const getAnalysisStatus = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) throw new Error("Invalid case id");
  return {
    caseId: d.caseId
  };
}).handler(getAnalysisStatus_createServerFn_handler, async ({
  data
}) => {
  try {
    const auth = await getCurrentAuth();
    if (!auth.userId) return {
      ok: false,
      reason: "unauthorized"
    };
    if (RESTRICTED_FEATURES.checkoutProActivation) ;
    try {
      const owned = await isCaseOwner(auth.userId, data.caseId);
      if (!owned) return {
        ok: false,
        reason: "not_found"
      };
      const titleRows = await sql()`
          SELECT title FROM cases WHERE id = ${data.caseId} AND user_id = ${auth.userId} LIMIT 1
        `;
      const caseTitle = titleRows.length > 0 ? String(titleRows[0].title) : "Your case";
      const entitled = await hasCaseEntitlement(auth.userId, data.caseId);
      if (!entitled) return {
        ok: true,
        entitled: false,
        caseTitle
      };
      const analysis = await loadCaseAnalysis(auth.userId, data.caseId);
      return {
        ok: true,
        entitled: true,
        analysis,
        caseTitle
      };
    } catch (error) {
      console.error("Analysis status error:", error);
      return {
        ok: false,
        reason: "unavailable"
      };
    }
  } catch {
    return {
      ok: false,
      reason: "unauthorized"
    };
  }
});
const runAnalysis_createServerFn_handler = createServerRpc({
  id: "e53487e8b518c7e37f01ee27433f1a5e7702bb781fbbd24bdec7fa40ff072ed4",
  name: "runAnalysis",
  filename: "src/routes/analysis.tsx"
}, (opts) => runAnalysis.__executeServer(opts));
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
}).handler(runAnalysis_createServerFn_handler, async ({
  data
}) => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    success: false,
    error: "Sign in required"
  };
  try {
    const eligible = await hasOwnedCaseEntitlement(auth.userId, data.caseId);
    if (!eligible) return {
      success: false,
      error: "This case is not unlocked for Pro analysis"
    };
    const facts = sanitizeInput(data.facts);
    const jurisdiction = sanitizeInput(data.jurisdiction).slice(0, 200);
    const caseType = sanitizeInput(data.caseType).slice(0, 100);
    const analysis = await generateCaseAnalysis({
      facts,
      jurisdiction,
      caseType
    }, {
      askAI: (messages, options) => askAI(messages, options),
      saveAnalysis: async () => {
      }
    });
    await saveCaseAnalysis({
      userId: auth.userId,
      caseId: data.caseId,
      facts,
      jurisdiction,
      analysis,
      model: ANALYSIS_MODEL
    });
    return {
      success: true,
      analysis
    };
  } catch (error) {
    console.error("Analysis generation failed:", error);
    return {
      success: false,
      error: error instanceof Error && /valid JSON|empty response|missing required/i.test(error.message) ? "The AI could not produce a usable educational analysis. Please try again." : "Analysis failed. Please try again shortly."
    };
  }
});
const startCheckout_createServerFn_handler = createServerRpc({
  id: "e5f362d4d22a73ceb9e92e1cca95df2f75ca8701f1e678bfbd67c58c88ed8f2d",
  name: "startCheckout",
  filename: "src/routes/analysis.tsx"
}, (opts) => startCheckout.__executeServer(opts));
const startCheckout = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.caseId !== "string" || !CASE_ID_PATTERN.test(d.caseId)) throw new Error("Invalid case id");
  return {
    caseId: d.caseId
  };
}).handler(startCheckout_createServerFn_handler, async ({
  data
}) => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    success: false,
    error: "Sign in required"
  };
  const result = await createCheckoutSession(auth.userId, data.caseId);
  if ("error" in result) return {
    success: false,
    error: result.error
  };
  return {
    success: true,
    url: result.url
  };
});
export {
  getAnalysisStatus_createServerFn_handler,
  runAnalysis_createServerFn_handler,
  startCheckout_createServerFn_handler
};
