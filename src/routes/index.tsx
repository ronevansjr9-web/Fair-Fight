import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/tanstack-start";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { askAI } from "~/lib/ai";
import { sanitizeInput } from "~/lib/sanitize";
import { checkRateLimit } from "~/lib/rate-limit";
import { logAIAnalysisGenerated } from "~/lib/audit";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  getSubscriptionStatus,
} from "~/lib/stripe";
import { getReferrerInfo } from "~/lib/referral";

export const Route = createFileRoute("/")({
  component: Home,
});

/* ────────────────────────────────────────────
   Server function — AI case analysis for demo
   ──────────────────────────────────────────── */
const analyzeCase = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") throw new Error("Invalid request");
    const d = data as Record<string, unknown>;
    if (typeof d.situation !== "string" || !d.situation.trim())
      throw new Error("Please describe your situation");
    return { situation: d.situation as string };
  })
  .handler(async ({ data }) => {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit('ai');
    if (rateLimitResponse) return rateLimitResponse;

    // Sanitize input
    const sanitizedSituation = sanitizeInput(data.situation);

    const SYSTEM_PROMPT = `You are a legal education assistant for Fair Fight, a platform that helps people understand legal concepts in plain English. Your role is strictly educational — never provide legal advice.

When relevant, reference state and federal case law to support your educational explanations. Cite specific cases where helpful and explain their relevance in plain English. Note which jurisdiction the case comes from.

Given a user's description of their legal situation, structure your response with these exact sections. Use the markdown headers exactly as shown. **Keep your entire response under 250 words — each section should be 2-3 sentences max.** This is a free preview.

## Your Situation
Briefly summarize the user's situation in 2-3 sentences. Plain English.

## Relevant Legal Concepts
Identify 2-3 relevant legal concepts in 2-3 sentences each. Be concise.

## What to Do Next
Provide 2-3 practical next steps. Be concrete but brief.

## Questions for Your Attorney
List 2-3 smart questions tailored to the situation.

Keep it short — this is a free preview of what Fair Fight Pro can do. Never say you are giving legal advice.`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: sanitizedSituation },
    ];

    try {
      const response = await askAI(messages);

      // Parse sections from markdown response
      const sections = {
        situation: "",
        concepts: "",
        nextSteps: "",
        questions: "",
      };

      const situationMatch = response.match(/## Your Situation\n([\s\S]*?)(?=\n## |$)/);
      const conceptsMatch = response.match(/## Relevant Legal Concepts\n([\s\S]*?)(?=\n## |$)/);
      const nextStepsMatch = response.match(/## What to Do Next\n([\s\S]*?)(?=\n## |$)/);
      const questionsMatch = response.match(/## Questions for Your Attorney\n([\s\S]*?)(?=\n## |$)/);

      sections.situation = situationMatch?.[1]?.trim() || "";
      sections.concepts = conceptsMatch?.[1]?.trim() || "";
      sections.nextSteps = nextStepsMatch?.[1]?.trim() || "";
      sections.questions = questionsMatch?.[1]?.trim() || "";

      // Audit logging
      try {
        const auth = await getAuth();
        if (auth.userId) {
          await logAIAnalysisGenerated(auth.userId, 'homepage-dem