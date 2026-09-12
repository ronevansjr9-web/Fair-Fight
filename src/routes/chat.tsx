import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { createServerFn } from "@tanstack/react-start";
import { SignInButton, useAuth } from "@clerk/tanstack-react-start";
import { getCurrentAuth } from "~/lib/auth";
import { askAIStreaming } from "~/lib/ai";
import { sanitizeInput } from "~/lib/sanitize";
import { checkRateLimit } from "~/lib/rate-limit";
import { logAIAnalysisGenerated } from "~/lib/audit";
import { hasProMembership } from "~/lib/argumentAccess";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { shouldFetchForSignedInUser, fetchAuthedData } from "~/lib/caseFetchGate";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "AI Legal Education Chat — Fair Fight" },
      { name: "description", content: "AI Legal Education Chat — a Pro member tool included with a one-time $99 Pro Case Analysis purchase. Plain-English legal education, never legal advice." },
    ],
  }),
});

// Wave 1 (2026-08-24): the AI legal-education chat is LIVE for verified Pro
// members. The rebuilt entitlement model is per-user, not per-case: any
// succeeded $99 Pro Case Analysis payment unlocks the member tools (/chat and
// /documents) via `hasProMembership` — the business plan defines the app as
// paid-only. Gate order enforced server-side: Clerk auth,
// then membership, then rate-limit, then AI. Signed-out and unpaid users fail
// closed before any rate-limit or AI work and see truthful member-tool copy
// with a dashboard CTA.
const MEMBER_TOOLS_ERROR =
  "AI Chat is a Pro member tool included with a Pro Case Analysis purchase ($99 one-time per case). Purchase Pro from your dashboard to unlock the member tools.";

type ChatInput = { message: string; history: { role: "user" | "assistant"; content: string }[] };

// No-validator POST fn (the proven pattern: validator-compiled POST fns lose
// the request lifecycle getCurrentAuth() needs — PR #46, production-verified).
// Payload validation runs AFTER the auth + membership gates.
function parseChatInput(data: unknown): ChatInput {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.message !== "string" || !d.message.trim()) throw new Error("Message is required");
  const rawHistory = Array.isArray(d.history) ? d.history : [];
  const history = rawHistory
    .filter(
      (h): h is { role: "user" | "assistant"; content: string } =>
        typeof (h as Record<string, unknown>)?.role === "string" &&
        typeof (h as Record<string, unknown>)?.content === "string",
    )
    .map((h) => ({
      role: (h.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: String(h.content),
    }));
  return { message: String(d.message).slice(0, 4000), history };
}

const sendMessage = createServerFn({ method: "POST" })
  .handler(async ({ data }): Promise<{ success: true; response: string } | { error: string }> => {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { error: "Sign in required" };

    // Pro member gate: /chat is a non-case-scoped member tool. Any verified
    // $99 Pro Case Analysis purchase unlocks it. Everyone else fails closed
    // here, BEFORE any rate-limit or AI work.
    const isProMember = await hasProMembership(auth.userId);
    if (!isProMember) return { error: MEMBER_TOOLS_ERROR };

    let input: ChatInput;
    try {
      input = parseChatInput(data);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Message is required" };
    }

    const rateLimitResponse = await checkRateLimit("ai");
    if (rateLimitResponse) return rateLimitResponse;

    const sanitized = sanitizeInput(input.message);

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
      ...input.history,
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
      return { error: "Failed to generate response. Please try again." };
    }
  });

type MemberStatus =
  | { ok: true; isMember: boolean }
  | { ok: false; reason: "unauthorized" | "unavailable" };

const getMemberStatus = createServerFn({ method: "POST" }).handler(
  async (): Promise<MemberStatus> => {
    try {
      const auth = await getCurrentAuth();
      if (!auth.userId) return { ok: false, reason: "unauthorized" };
      return { ok: true, isMember: await hasProMembership(auth.userId) };
    } catch (error) {
      console.error("[member-status] getMemberStatus failed:", error);
      return { ok: false, reason: "unavailable" };
    }
  },
);

function MemberToolNotice({ signedOut }: { signedOut?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
        <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
      <h2 className="mb-2 text-center text-xl font-bold text-white">
        AI Legal Education Chat is a Pro member tool
      </h2>
      <p className="mx-auto mb-6 max-w-xl text-center text-sm text-white/70">
        The chat is included with Pro Case Analysis — a one-time $99 purchase per
        case. Any verified Pro purchase unlocks the member tools (the AI chat and
        the document generator) for your account.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        {signedOut ? (
          <SignInButton mode="modal">
            <button
              type="button"
              className="gold-gradient inline-flex items-center rounded-full px-8 py-3 font-semibold text-navy transition-all hover:shadow-lg"
            >
              Sign In
            </button>
          </SignInButton>
        ) : (
          <Link
            to="/dashboard"
            search={{ checkout: undefined }}
            className="gold-gradient inline-flex items-center rounded-full px-8 py-3 font-semibold text-navy transition-all hover:shadow-lg"
          >
            Go to Dashboard
          </Link>
        )}
        {!signedOut && (
          <span className="text-xs text-white/50">Then purchase Pro for a case to unlock the member tools.</span>
        )}
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-xs text-white/50">
        Educational purposes only — not legal advice. Consult a licensed attorney for
        your specific situation. Answers never predict outcomes or guarantee results.
      </p>
    </div>
  );
}

function ChatPage() {
  const auth = useAuth();
  const [access, setAccess] = useState<
    { status: "loading" } | { status: "member" } | { status: "unpaid" } | { status: "error"; reason: string }
  >({ status: "loading" });
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shouldFetchForSignedInUser(auth.isSignedIn)) return;
    let cancelled = false;
    setAccess({ status: "loading" });
    // fetchAuthedData force-refreshes the Clerk session token before the first
    // call and retries exactly once on `unauthorized` (hard-load token race).
    fetchAuthedData({
      isSignedIn: auth.isSignedIn,
      getToken: auth.getToken,
      fetch: () => getMemberStatus({ data: {} }),
      isUnauthorized: (result) => !result.ok && result.reason === "unauthorized",
    })
      .then((outcome) => {
        if (cancelled || outcome.state === "auth_not_ready") return;
        const result = outcome.result;
        setAccess(
          result.ok
            ? result.isMember
              ? { status: "member" }
              : { status: "unpaid" }
            : { status: "error", reason: result.reason },
        );
      })
      .catch(() => {
        if (!cancelled) setAccess({ status: "error", reason: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isSignedIn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsSending(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const result = await sendMessage({ data: { message: userMessage, history } });
    if (result.success && result.response) {
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
    } else if ("error" in result && result.error) {
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${result.error}` }]);
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AuthenticatedGuard fallback={<MemberToolNotice signedOut />}>
      <main className="min-h-screen bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-extrabold text-white">AI Legal Education Chat</h1>
          <p className="mb-8 text-white/70">
            A Pro member tool — included with a $99 one-time Pro Case Analysis
            purchase. Plain-English answers about legal concepts, never legal advice.
          </p>

          {access.status === "loading" && (
            <div className="flex items-center justify-center p-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
            </div>
          )}

          {access.status === "error" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <h2 className="mb-2 text-xl font-bold text-white">Chat Unavailable</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-white/60">
                We couldn't load this page right now. Please try again in a moment.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => setAccess({ status: "loading" })}
                  className="gold-gradient rounded-full px-6 py-2.5 font-semibold text-navy"
                >
                  Try again
                </button>
                <Link
                  to="/dashboard"
                  search={{ checkout: undefined }}
                  className="rounded-full border border-white/20 px-6 py-2.5 font-semibold text-white/70 transition-colors hover:bg-white/10"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}

          {access.status === "unpaid" && <MemberToolNotice />}

          {access.status === "member" && (
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-300">
                  ✓ Pro member — chat unlocked
                </span>
              </div>
              <div className="mb-6 max-h-[50vh] space-y-6 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/60">
                    Ask about any legal concept — for example, "What is habeas corpus?"
                    or "Explain the exclusionary rule."
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-3 whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-gold/20 text-white"
                          : "border border-white/10 bg-white/5 text-white/80"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gold" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gold" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gold" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about any legal concept... (e.g., 'What is habeas corpus?' or 'Explain the exclusionary rule')"
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className="self-end gold-gradient rounded-xl px-5 py-3 text-sm font-semibold text-navy transition-all hover:shadow-md disabled:opacity-50"
                >
                  {isSending ? "..." : "Send"}
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-white/40">
                ⚖️ Educational purposes only — not legal advice. Consult a licensed
                attorney for your specific situation.
              </p>
            </div>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}