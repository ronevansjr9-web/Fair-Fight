import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/tanstack-start";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth, getPrimaryEmail } from "~/lib/auth";
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
        const auth = await getCurrentAuth();
        if (auth.userId) {
          await logAIAnalysisGenerated(auth.userId, 'homepage-demo');
        }
      } catch {
        // Audit logging shouldn't block the response
      }

      return { success: true, sections, raw: response };
    } catch (error) {
      console.error("AI analysis error:", error);
      return {
        success: false,
        error: "Analysis failed. Please try again later.",
      };
    }
  });

/* ────────────────────────────────────────────
   Server function — get user pro status
   ──────────────────────────────────────────── */
const getUserProStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { pro: false };
    const status = await getSubscriptionStatus(auth.userId);
    return { pro: status.active };
  } catch {
    return { pro: false };
  }
});

/* ────────────────────────────────────────────
   Server function — start pro checkout
   ──────────────────────────────────────────── */
const startProCheckout = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return { error: "Please sign in first." };

  // AuthObject has no `user` property — resolve email via Clerk Backend API.
  // `null` (lookup failure) is passed as undefined so Stripe omits customer_email
  // instead of receiving an empty string.
  const email = (await getPrimaryEmail(auth.userId)) ?? undefined;
  const result = await createCheckoutSession(auth.userId, email);

  if ("error" in result) return { error: result.error };
  return { url: result.url };
});

/* ────────────────────────────────────────────
   Home Component
   ──────────────────────────────────────────── */
function Home() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [situation, setSituation] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    situation: string;
    concepts: string;
    nextSteps: string;
    questions: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [proStatus, setProStatus] = useState(false);

  useEffect(() => {
    getUserProStatus().then((r) => setProStatus(r.pro));

    // Continue checkout only when this browser explicitly initiated the
    // homepage upgrade CTA before authentication. A bare query string (or a
    // return from another gated feature) must never trigger a purchase.
    const upgradeIntent = window.sessionStorage.getItem("fairfight:homepage-upgrade-intent");
    if (
      auth.isSignedIn &&
      upgradeIntent === "1" &&
      new URLSearchParams(window.location.search).get("upgrade") === "1"
    ) {
      window.sessionStorage.removeItem("fairfight:homepage-upgrade-intent");
      window.history.replaceState({}, "", window.location.pathname);
      void handleUpgrade();
    }
  }, [auth.isSignedIn]);

  const handleAnalyze = async () => {
    if (!situation.trim()) return;
    setIsAnalyzing(true);
    setError("");
    setAnalysis(null);

    const result = await analyzeCase({ data: { situation } });
    if (result.success && result.sections) {
      setAnalysis(result.sections);
    } else if (result.error) {
      setError(result.error);
    }
    setIsAnalyzing(false);
  };

  const handleUpgrade = async () => {
    setError("");
    try {
      const result = await startProCheckout();
      if ("error" in result) {
        setError(result.error || "Unable to start checkout. Please try again.");
      } else if (result.url) {
        // This records only a successful redirect to Checkout, never payment completion.
        await import("~/lib/analytics").then(({ trackEvent, AnalyticsEvents, withUTM }) =>
          trackEvent(AnalyticsEvents.CHECKOUT_STARTED, withUTM({ source: "homepage" })),
        );
        window.location.href = result.url;
      }
    } catch {
      setError("Unable to start checkout. Please try again.");
    }
  };

  const upgradeButton = auth.isSignedIn ? (
    <button onClick={handleUpgrade} className="gold-gradient rounded-full px-6 py-2 text-sm font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)]">
      Upgrade to Pro — $99
    </button>
  ) : (
    <SignInButton mode="modal" forceRedirectUrl="/?upgrade=1" fallbackRedirectUrl="/?upgrade=1">
      <button
        onClick={() => window.sessionStorage.setItem("fairfight:homepage-upgrade-intent", "1")}
        className="gold-gradient rounded-full px-6 py-2 text-sm font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)]"
      >
        Sign in to upgrade — $99
      </button>
    </SignInButton>
  );

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-navy px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light px-4 py-1.5 text-sm text-gold-light">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            Free Legal Education — No Paywall on Research
          </div>
          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            Understand the Law.
            <br />
            <span className="text-gold">Fight Your Fair Fight.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/70 sm:text-xl">
            The TurboTax of legal education — AI-powered plain-English explanations
            of statutes, case law, and legal procedures. Free legal research, always.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {auth.isSignedIn ? (
              <button
                      onClick={() => navigate({ to: "/dashboard" })}
                      className="gold-gradient rounded-full px-8 py-3.5 font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)] transition-all hover:shadow-[0_0_30px_rgba(201,162,39,0.5)]"
                    >
                      Go to Dashboard
                    </button>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button className="gold-gradient rounded-full px-8 py-3.5 font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)] transition-all hover:shadow-[0_0_30px_rgba(201,162,39,0.5)]">
                    Get Started Free
                  </button>
                </SignUpButton>
                <div className="flex items-center gap-2">
                  <SignUpButton mode="modal">
                    <button className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-medium text-white transition-all hover:bg-white/10" aria-label="Sign up with Google">
                      <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Google
                    </button>
                  </SignUpButton>
                  <SignUpButton mode="modal">
                    <button className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-medium text-white transition-all hover:bg-white/10" aria-label="Sign up with Apple">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                      Apple
                    </button>
                  </SignUpButton>
                </div>
              </>
            )}
            <a
              href="/learn"
              className="rounded-full border border-white/20 px-8 py-3.5 font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Legal Guides
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-navy-dark px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-white sm:text-4xl">
            Everything you need to understand your legal situation
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "AI Case Analysis",
                desc: "Describe your situation in plain English. Get plain-English explanations of relevant statutes and case law.",
                icon: "🧠",
              },
              {
                title: "Legal Research",
                desc: "Free access to case law, statutes, and court rules. 56+ plain-English guides on court procedures and legal topics.",
                icon: "📚",
              },
              {
                title: "Evidence Manager",
                desc: "Upload, organize, and tag evidence. Build timelines. Never lose track of a document or deadline.",
                icon: "📎",
              },
              {
                title: "Document Generator",
                desc: "Generate motions, briefs, and legal documents with AI assistance. Educational templates with plain-English explanations.",
                icon: "📝",
              },
              {
                title: "Court Calendar",
                desc: "Track court dates, filing deadlines, and statutes of limitations. Never miss a deadline.",
                icon: "📅",
              },
              {
                title: "Legal Argument Builder",
                desc: "AI-powered argument templates with jurisdiction-specific case law. For Pro users.",
                icon: "⚖️",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="card-hover rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
              >
                <div className="mb-4 text-3xl">{feature.icon}</div>
                <h3 className="mb-2 text-xl font-bold text-white">{feature.title}</h3>
                <p className="text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo AI Analysis Section */}
      <section className="bg-navy px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
            Try the AI Case Analyzer
          </h2>
          <p className="mb-8 text-center text-white/60">
            Describe your legal situation and get a free educational analysis.
            No sign-up required for your first 3 analyses.
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Describe your legal situation in plain English... (e.g., 'My landlord is refusing to return my security deposit even though I gave proper notice. I have photos showing the apartment was left clean.')"
              rows={4}
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40">
                Free for your first 3 analyses. No account needed.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !situation.trim()}
                className="gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)] transition-all hover:shadow-[0_0_30px_rgba(201,162,39,0.5)] disabled:opacity-50"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze My Situation"}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {analysis && (
              <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
                {analysis.situation && (
                  <div>
                    <h4 className="mb-1 font-semibold text-gold">Your Situation</h4>
                    <p className="text-sm text-white/70">{analysis.situation}</p>
                  </div>
                )}
                {analysis.concepts && (
                  <div>
                    <h4 className="mb-1 font-semibold text-gold">Relevant Legal Concepts</h4>
                    <p className="text-sm text-white/70">{analysis.concepts}</p>
                  </div>
                )}
                {analysis.nextSteps && (
                  <div>
                    <h4 className="mb-1 font-semibold text-gold">What to Do Next</h4>
                    <p className="text-sm text-white/70">{analysis.nextSteps}</p>
                  </div>
                )}
                {analysis.questions && (
                  <div>
                    <h4 className="mb-1 font-semibold text-gold">Questions for Your Attorney</h4>
                    <p className="text-sm text-white/70">{analysis.questions}</p>
                  </div>
                )}
                {!proStatus && (
                  <div className="rounded-lg border border-gold/20 bg-navy-light/50 p-4 text-center">
                    <p className="mb-2 text-sm text-white/80">
                      This was a free preview. Upgrade to Pro for unlimited AI analyses per case.
                    </p>
                    {upgradeButton}
                  </div>
                )}
                <p className="text-xs text-white/40">
                  ⚖️ For educational purposes only. Not legal advice. Consult a licensed attorney.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-navy px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to understand your legal situation?
          </h2>
          <p className="mb-8 text-lg text-white/70">
            Fair Fight gives you plain-English legal education, AI-powered case analysis,
            and tools to stay organized. All legal research is free — forever.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {auth.isSignedIn ? (
              <button
                      onClick={() => navigate({ to: "/dashboard" })}
                      className="gold-gradient rounded-full px-8 py-3.5 font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)]"
                    >
                      Go to Dashboard
                    </button>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button className="gold-gradient rounded-full px-8 py-3.5 font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)]">
                    Get Started Free
                  </button>
                </SignUpButton>
                <div className="flex items-center gap-2">
                  <SignUpButton mode="modal">
                    <button className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-medium text-white transition-all hover:bg-white/10" aria-label="Sign up with Google">
                      <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Google
                    </button>
                  </SignUpButton>
                  <SignUpButton mode="modal">
                    <button className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-medium text-white transition-all hover:bg-white/10" aria-label="Sign up with Apple">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                      Apple
                    </button>
                  </SignUpButton>
                </div>
              </>
            )}
            <a
              href="/learn"
              className="rounded-full border border-white/20 px-8 py-3.5 font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Free Guides
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-navy-dark px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-4">
            <div>
              <h4 className="mb-3 font-bold text-gold">Fair Fight</h4>
              <p className="text-sm text-white/40">AI-powered legal education platform.</p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">Features</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="/chat" className="hover:text-gold">AI Legal Chat</a></li>
                <li><a href="/research" className="hover:text-gold">Legal Research</a></li>
                <li><a href="/documents" className="hover:text-gold">Documents</a></li>
                <li><a href="/evidence" className="hover:text-gold">Evidence</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">Resources</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="/learn" className="hover:text-gold">Legal Guides</a></li>
                <li><a href="/calendar" className="hover:text-gold">Court Calendar</a></li>
                <li><a href="/timeline" className="hover:text-gold">Timeline</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="/privacy" className="hover:text-gold">Privacy Policy</a></li>
                <li><a href="/data-request" className="hover:text-gold">Data Request</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/40">
            <p>⚖️ Fair Fight is not a law firm and does not provide legal advice. For educational purposes only.</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} Fair Fight. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}