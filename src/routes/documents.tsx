import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { askAI } from "~/lib/ai";
import { sanitizeInput } from "~/lib/sanitize";
import { logDocumentGenerated } from "~/lib/audit";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
  tempUnavailableError,
} from "~/lib/restrictedFeatures";

export const Route = createFileRoute("/documents")({
  component: DocumentsPage,
  head: () => ({
    meta: [
      { title: "Legal Document Generator — Fair Fight" },
      { name: "description", content: "The Legal Document Generator is temporarily unavailable while we verify Pro activation. Educational purposes only — not legal advice." },
    ],
  }),
});

// NOTE (Flag A, 2026-08-22): The Document Generator is a live paid AI tool. It
// is NOT case-scoped (unlike Pro Case Analysis, which is gated per-case via the
// Pro entitlement), and has no per-user entitlement check — it would generate
// on our paid backend for ANY signed-in user. It is therefore gated on the
// ALWAYS-CLOSED `generativeProTools` flag (NOT the checkout gate, which opens
// for the $99 case-scoped launch): /documents and /chat stay fail-closed until
// a real, non-case-scoped Pro entitlement model is built for them. The
// implementation below is kept behind the gate; the route's unavailable UI is
// intentionally unchanged.
const generateDocument = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.docType !== "string") throw new Error("Document type required");
    return {
      docType: d.docType as string,
      context: (d.context as string) || "",
      jurisdiction: (d.jurisdiction as string) || "",
    };
  })
  .handler(async ({ data }) => {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { error: "Sign in required" };

    // Fail-closed gate: document generation is a non-case-scoped paid AI tool
    // with no entitlement check yet, so it stays closed for every signed-in
    // user. Refuse ALL calls before any AI work.
    if (RESTRICTED_FEATURES.generativeProTools) {
      return tempUnavailableError();
    }

    const sanitized = sanitizeInput(data.context);

    const SYSTEM_PROMPT = `You are a legal document education tool. Generate an educational TEMPLATE for a ${data.docType}. 
This is an educational example showing proper legal document structure — NOT a filing-ready document.
${data.jurisdiction ? `This template follows ${data.jurisdiction} formatting conventions.` : ""}

Include:
1. Proper caption/header format
2. All required sections with placeholder text in [brackets]
3. Educational annotations explaining what each section means in plain English
4. A disclaimer: "FOR EDUCATIONAL PURPOSES ONLY. Review with a licensed attorney before filing."

Format the output as a clear, well-organized document template with markdown headers.`;

    const messages: { role: "system" | "user"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: sanitized || `Generate an educational template for a ${data.docType}.` },
    ];

    const response = await askAI(messages, { maxTokens: 2048 });

    await logDocumentGenerated(auth.userId, data.docType);

    return { success: true, document: response };
  });

function DocumentsPage() {
  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-extrabold text-white">Document Generator</h1>
          <p className="mb-8 text-white/70">
            The AI Document Generator — creating educational legal document
            templates — is temporarily unavailable while we verify Pro
            activation.
          </p>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
              <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-white">
              The Document Generator is temporarily unavailable
            </h2>
            <p className="mx-auto mb-6 max-w-xl text-center text-sm text-white/70">
              {TEMP_UNAVAILABLE_MESSAGE}
            </p>
            <p className="mx-auto max-w-xl text-center text-sm text-white/60">
              Document generation is a paid AI tool. We are verifying Pro
              activation before making it available. When it is restored, outputs
              will be educational templates only — not filing-ready documents or
              legal advice. Your legal education, legal research, and core case
              tools continue to work.
            </p>
          </div>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
