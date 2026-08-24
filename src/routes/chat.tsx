import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { askAIStreaming } from "~/lib/ai";
import { sanitizeInput } from "~/lib/sanitize";
import { checkRateLimit } from "~/lib/rate-limit";
import { logAIAnalysisGenerated } from "~/lib/audit";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
  tempUnavailableError,
} from "~/lib/restrictedFeatures";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "AI Legal Education Chat — Fair Fight" },
      { name: "description", content: "The AI Legal Education Chat is temporarily unavailable while we verify Pro activation. Educational purposes only — not legal advice." },
    ],
  }),
});

// NOTE (Flag A, 2026-08-22): The AI legal-education chat is a live paid AI tool.
// It is NOT case-scoped (unlike Pro Case Analysis, which is gated per-case via
// the Pro entitlement), and has no per-user entitlement check — it would run
// chats on our paid backend for ANY signed-in user. It is therefore gated on the
// ALWAYS-CLOSED `generativeProTools` flag (NOT the checkout gate, which opens
// for the $99 case-scoped launch): /chat and /documents stay fail-closed until
// a real, non-case-scoped Pro entitlement model is built for them. The
// implementation below is kept behind the gate; the route's unavailable UI is
// intentionally unchanged.
const sendMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.message !== "string" || !d.message.trim()) throw new Error("Message is required");
    return { message: d.message as string, history: (d.history as { role: string; content: string }[]) || [] };
  })
  .handler(async ({ data }) => {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { error: "Sign in required" };

    // Fail-closed gate: chat generation is a non-case-scoped paid AI tool with
    // no entitlement check yet, so it stays closed for every signed-in user.
    // Refuse ALL calls before any rate-limit or AI work.
    if (RESTRICTED_FEATURES.generativeProTools) {
      return tempUnavailableError();
    }

    const rateLimitResponse = await checkRateLimit("ai");
    if (rateLimitResponse) return rateLimitResponse;

    const sanitized = sanitizeInput(data.message);

    const SYSTEM_PROMPT = `You are the Fair Fight AI legal education assistant. Your role is strictly educational — you help people understand legal concepts in plain English. You never provide legal advice, predict case outcomes, or tell users what they should do.

Rules:
1. Explain legal concepts in plain English — no jargon without explanation.
2. When relevant, reference real, well-known case law with proper citations and explain what each case means.
3. Note which jurisdiction cases come from.
4. If you don't know something, say so. Never make up cases or statutes.
5. Keep responses concise and helpful — aim for 2-4 paragraphs unless the user asks for depth.
6. Always include: "This is legal education, not legal advice. Consult a licensed attorney for your specific situation."
7. Encourage users to speak with an attorney for legal advice specific to their situation.

The user may ask about any legal topic — court procedures, criminal law, family law, housing, employment, constitutional law, civil rights, debt collection, etc.`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...data.history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: sanitized },
    ];

    try {
      if (auth.userId) {
        await logAIAnalysisGenerated(auth.userId, "chat");
      }
    } catch {}

    try {
      const response = await askAIStreaming(messages, () => {}, { maxTokens: 2048 });
      return { success: true, response };
    } catch {
      return { success: false, error: "Failed to generate response. Please try again." };
    }
  });

function ChatPage() {
  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-extrabold text-white">AI Legal Education Chat</h1>
          <p className="mb-8 text-white/70">
            The AI legal-education chat is temporarily unavailable while we
            verify Pro activation.
          </p>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
              <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-white">
              The AI Legal Education Chat is temporarily unavailable
            </h2>
            <p className="mx-auto mb-6 max-w-xl text-center text-sm text-white/70">
              {TEMP_UNAVAILABLE_MESSAGE}
            </p>
            <p className="mx-auto max-w-xl text-center text-sm text-white/60">
              AI chat is a paid tool. We are verifying Pro activation before
              making it available. When it is restored, answers will be
              educational only — never legal advice. Your legal education, legal
              research, and core case tools continue to work.
            </p>
          </div>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
