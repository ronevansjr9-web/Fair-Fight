import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { askAIStreaming } from "~/lib/ai";
import { sanitizeInput } from "~/lib/sanitize";
import { checkRateLimit } from "~/lib/rate-limit";
import { logAIAnalysisGenerated } from "~/lib/audit";
import { trackEvent, AnalyticsEvents } from "~/lib/analytics";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "AI Legal Assistant Chat — Free Legal Education | Fair Fight" },
      { name: "description", content: "Chat with Fair Fight's AI legal education assistant. Ask questions about court procedures, legal concepts, statutes, and case law. Educational purposes only — not legal advice." },
    ],
  }),
});

const sendMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.message !== "string" || !d.message.trim()) throw new Error("Message is required");
    return { message: d.message as string, history: (d.history as { role: string; content: string }[]) || [] };
  })
  .handler(async ({ data }) => {
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
      const auth = await getAuth();
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
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content: "Hi! I'm the Fair Fight AI legal education assistant. I can help you understand legal concepts in plain English — court procedures, statutes, case law, legal terms, and more. What would you like to learn about today?\n\n*This is legal education, not legal advice. Always consult a licensed attorney for your specific situation.*",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const result = await sendMessage({ data: { message: userMessage, history } });

    if (result.success && result.response) {
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
      trackEvent(AnalyticsEvents.AI_ANALYSIS_RUN);
    } else if (result.error) {
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${result.error}` }]);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AuthenticatedGuard>
      <main className="flex h-[calc(100vh-120px)] flex-col bg-navy">
        <div className="border-b border-white/10 bg-white/5 px-4 py-4">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-xl font-bold text-white">AI Legal Education Chat</h1>
            <p className="text-sm text-white/60">Ask questions about legal concepts — plain English answers. Not legal advice.</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                    msg.role === "user"
                      ? "bg-gold/20 text-white"
                      : "border border-white/10 bg-white/5 text-white/80"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
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
        </div>

        <div className="border-t border-white/10 bg-white/5 px-4 py-4">
          <div className="mx-auto max-w-3xl">
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
                disabled={!input.trim() || isLoading}
                className="self-end gold-gradient rounded-xl px-5 py-3 text-sm font-semibold text-navy transition-all hover:shadow-md disabled:opacity-50"
              >
                {isLoading ? "..." : "Send"}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-white/40">
              ⚖️ Educational purposes only. Not legal advice. Consult a licensed attorney.
            </p>
          </div>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
