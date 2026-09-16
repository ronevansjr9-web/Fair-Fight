import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-FTkvfrUA.js";
import { a as askAI } from "./ai-Cw0dwDfh.js";
import { s as sanitizeInput } from "./sanitize-CTUyMlso.js";
import { b as hasOwnedCaseEntitlement } from "./argumentAccess-Brc0Ql3j.js";
import { s as sql } from "./db-D7cnbd5l.js";
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
import "stripe";
import "@neondatabase/serverless";
const ARGUMENT_SYSTEM_PROMPT = `You are a legal education tool that helps users understand how legal arguments are structured. Your role is strictly educational — you never provide legal advice or represent anyone.

Given a user's legal situation, generate a legal argument TEMPLATE that demonstrates proper legal argument structure. This is an educational example, not a filing-ready document.

Structure your response with these EXACT sections, using the markdown headers as shown:

## Case Caption
Create a sample case caption in proper format for the jurisdiction.

## Statement of Facts
Write 2-4 paragraphs presenting the facts in the light most favorable to the user's position. Use neutral, professional legal tone.

## Legal Standard
State the applicable legal standard (e.g., summary judgment standard, motion to dismiss standard, etc.) with citations to relevant rules and case law.

## Argument
Present 3-4 key arguments with:
- Point headings in ALL CAPS
- Supporting case law citations with parenthetical explanations
- Application of law to facts
Explain each case's holding in plain English.

## Anticipated Counter-Arguments
Identify 2-3 strongest counter-arguments the opposing party might raise and suggest responses.

## Prayer for Relief
State specifically what relief the court should grant, in proper legal format.

## Relevant Case Citations
List 3-5 real, well-established case law citations with:
- Full case name and citation
- Brief plain-English explanation of the holding
- How it supports the argument

## Strategic Notes
Provide 3-5 strategic considerations about timing, burden of proof, and procedural posture.

CRITICAL: Only cite REAL, well-known cases. Never fabricate case citations. If uncertain about a specific case, state the legal principle without a fake citation.
Always include: "FOR EDUCATIONAL PURPOSES ONLY — NOT LEGAL ADVICE. Review with a licensed attorney before filing."`;
async function generateArgumentTemplate(request) {
  const userPrompt = `Generate an educational legal argument template for the following situation:

Jurisdiction: ${request.jurisdiction}
Case Type: ${request.caseType}
Position: ${request.position}
Situation: ${request.situation}
${request.additionalContext ? `Additional Context: ${request.additionalContext}` : ""}

Remember: only cite real, verifiable cases. This is for educational purposes only.`;
  const messages = [
    { role: "system", content: ARGUMENT_SYSTEM_PROMPT },
    { role: "user", content: userPrompt }
  ];
  return askAI(messages, { maxTokens: 4096, temperature: 0.2 });
}
const generateArgument_createServerFn_handler = createServerRpc({
  id: "b4351b31f52bf9c509e39d02aa6bffc4928232f749ab483b7045461bfacbf6f6",
  name: "generateArgument",
  filename: "src/routes/legal-argument.tsx"
}, (opts) => generateArgument.__executeServer(opts));
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
}).handler(generateArgument_createServerFn_handler, async ({
  data
}) => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    error: "Sign in required"
  };
  if (!await hasOwnedCaseEntitlement(auth.userId, data.caseId)) return {
    error: "This case is not eligible for Pro access"
  };
  const sanitized = sanitizeInput(data.situation);
  const response = await generateArgumentTemplate({
    situation: sanitized,
    jurisdiction: data.jurisdiction,
    caseType: data.caseType,
    position: data.position,
    additionalContext: sanitizeInput(data.additionalContext)
  });
  return {
    success: true,
    response
  };
});
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
const getUserCases_createServerFn_handler = createServerRpc({
  id: "44d77e1a0aabca096b6d26cfb2779f0ef7ff3a9da2296720cc2e86f808872c2b",
  name: "getUserCases",
  filename: "src/routes/legal-argument.tsx"
}, (opts) => getUserCases.__executeServer(opts));
const getUserCases = createServerFn({
  method: "GET"
}).handler(getUserCases_createServerFn_handler, async () => {
  const auth = await getCurrentAuth();
  return fetchUserCases(auth.userId);
});
export {
  generateArgument_createServerFn_handler,
  getUserCases_createServerFn_handler
};
