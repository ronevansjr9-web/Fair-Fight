import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { SignInButton, useAuth } from "@clerk/tanstack-react-start";
import { getCurrentAuth } from "~/lib/auth";
import { askAI } from "~/lib/ai";
import { sanitizeInput } from "~/lib/sanitize";
import { logDocumentGenerated } from "~/lib/audit";
import { hasProMembership } from "~/lib/argumentAccess";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { shouldFetchForSignedInUser, fetchAuthedData } from "~/lib/caseFetchGate";

export const Route = createFileRoute("/documents")({
  component: DocumentsPage,
  head: () => ({
    meta: [
      { title: "Legal Document Generator — Fair Fight" },
      { name: "description", content: "Legal Document Generator — a Pro member tool included with a one-time $99 Pro Case Analysis purchase. Educational templates only, never legal advice." },
    ],
  }),
});

// Wave 1 (2026-08-24): the Document Generator is LIVE for verified Pro members.
// Rebuilt per-user entitlement model: any succeeded $99 Pro Case Analysis
// payment unlocks the member tools (/chat and /documents) via
// `hasProMembership` — the business plan defines the app as paid-only
// (no unpaid tier). Gate order enforced server-side: Clerk auth, then
// membership, then AI. Signed-out and unpaid users fail closed before any AI
// work and see truthful member-tool copy with a dashboard CTA.
const MEMBER_TOOLS_ERROR =
  "The Document Generator is a Pro member tool included with a Pro Case Analysis purchase ($99 one-time per case). Purchase Pro from your dashboard to unlock the member tools.";

const DOC_TYPES = [
  { id: "motion", label: "Motion Template", desc: "Generic motion with caption, facts, legal argument, and proposed order" },
  { id: "demand-letter", label: "Demand Letter", desc: "Formal demand letter for payment, performance, or cease-and-desist" },
  { id: "affidavit", label: "Affidavit Template", desc: "Sworn statement of facts with notary block" },
  { id: "complaint", label: "Complaint Template", desc: "Civil complaint with jurisdiction, parties, counts, and prayer for relief" },
  { id: "answer", label: "Answer to Complaint", desc: "Defendant's response admitting or denying allegations with affirmative defenses" },
  { id: "discovery-requests", label: "Discovery Requests", desc: "Interrogatories, requests for production, and requests for admission templates" },
  { id: "brief", label: "Legal Brief", desc: "Formal legal brief with table of authorities, argument, and conclusion" },
  { id: "settlement", label: "Settlement Agreement", desc: "Template for settling a dispute with release of claims" },
];

type DocumentInput = { docType: string; context: string; jurisdiction: string };

// No-validator POST fn (the proven pattern: validator-compiled POST fns lose
// the request lifecycle getCurrentAuth() needs — PR #46, production-verified).
// Payload validation runs AFTER the auth + membership gates.
function parseDocumentInput(data: unknown): DocumentInput {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.docType !== "string" || !d.docType.trim()) throw new Error("Document type required");
  return {
    docType: String(d.docType).slice(0, 100),
    context: typeof d.context === "string" ? d.context.slice(0, 4000) : "",
    jurisdiction: typeof d.jurisdiction === "string" ? d.jurisdiction.slice(0, 200) : "",
  };
}

const generateDocument = createServerFn({ method: "POST" })
  .handler(async ({ data }): Promise<{ success: true; document: string } | { error: string }> => {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { error: "Sign in required" };

    // Pro member gate: /documents is a non-case-scoped member tool. Any
    // verified $99 Pro Case Analysis purchase unlocks it. Everyone else fails
    // closed here, BEFORE any AI work.
    const isProMember = await hasProMembership(auth.userId);
    if (!isProMember) return { error: MEMBER_TOOLS_ERROR };

    let input: DocumentInput;
    try {
      input = parseDocumentInput(data);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Document type required" };
    }

    const sanitized = sanitizeInput(input.context);

    const SYSTEM_PROMPT = `You are a legal document education tool. Generate an educational TEMPLATE for a ${input.docType}. 
This is an educational example showing proper legal document structure — NOT a filing-ready document.
${input.jurisdiction ? `This template follows ${input.jurisdiction} formatting conventions.` : ""}

Include:
1. Proper caption/header format
2. All required sections with placeholder text in [brackets]
3. Educational annotations explaining what each section means in plain English
4. A disclaimer: "FOR EDUCATIONAL PURPOSES ONLY. Review with a licensed attorney before filing."

Format the output as a clear, well-organized document template with markdown headers.`;

    const messages: { role: "system" | "user"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: sanitized || `Generate an educational template for a ${input.docType}.` },
    ];

    try {
      const response = await askAI(messages, { maxTokens: 2048 });
      await logDocumentGenerated(auth.userId, input.docType);
      return { success: true, document: response };
    } catch {
      return { error: "Failed to generate the template. Please try again." };
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
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  },
);

function MemberToolNotice({ signedOut }: { signedOut?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
        <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h2 className="mb-2 text-center text-xl font-bold text-white">
        The Document Generator is a Pro member tool
      </h2>
      <p className="mx-auto mb-6 max-w-xl text-center text-sm text-white/70">
        The generator is included with Pro Case Analysis — a one-time $99
        purchase per case. Any verified Pro purchase unlocks the member tools
        (the document generator and the AI chat) for your account.
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
        Educational purposes only — not legal advice. Outputs are educational
        templates, not filing-ready documents. Review with a licensed attorney
        before filing.
      </p>
    </div>
  );
}

function DocumentsPage() {
  const auth = useAuth();
  const [access, setAccess] = useState<
    { status: "loading" } | { status: "member" } | { status: "unpaid" } | { status: "error"; reason: string }
  >({ status: "loading" });
  const [selectedType, setSelectedType] = useState("");
  const [context, setContext] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [generated, setGenerated] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionError, setActionError] = useState("");

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

  const handleGenerate = async () => {
    if (!selectedType) {
      setActionError("Select a document type first.");
      return;
    }
    setIsGenerating(true);
    setActionError("");
    setGenerated("");
    const result = await generateDocument({
      data: { docType: selectedType, context, jurisdiction },
    });
    if (result.success) {
      setGenerated(result.document);
    } else if ("error" in result && result.error) {
      setActionError(result.error);
    }
    setIsGenerating(false);
  };

  return (
    <AuthenticatedGuard fallback={<MemberToolNotice signedOut />}>
      <main className="min-h-screen bg-navy px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-3xl font-extrabold text-white">Document Generator</h1>
          <p className="mb-8 text-white/70">
            A Pro member tool — included with a $99 one-time Pro Case Analysis
            purchase. Educational legal document templates, never filing-ready
            documents or legal advice.
          </p>

          {access.status === "loading" && (
            <div className="flex items-center justify-center p-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
            </div>
          )}

          {access.status === "error" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <h2 className="mb-2 text-xl font-bold text-white">Document Generator Unavailable</h2>
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
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
              <div className="mb-6 flex items-center gap-2">
                <span className="rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-300">
                  ✓ Pro member — document generator unlocked
                </span>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-white">Document Type</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {DOC_TYPES.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedType(doc.id)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        selectedType === doc.id
                          ? "border-gold bg-navy text-white"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <h3 className={`font-semibold ${selectedType === doc.id ? "text-gold" : "text-white"}`}>{doc.label}</h3>
                      <p className={`mt-1 text-xs ${selectedType === doc.id ? "text-white/70" : "text-white/60"}`}>{doc.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-semibold text-white">
                  Context — what should the template reflect? (optional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                  placeholder="The parties, the dispute, key dates — anything the template should reference."
                  className="mb-4 w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
                <label className="mb-1 block text-sm font-semibold text-white">Jurisdiction (optional)</label>
                <input
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder='e.g. "California" or "Federal — 9th Circuit"'
                  className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
              </div>

              {actionError && (
                <div className="mb-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">{actionError}</div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedType}
                className="gold-gradient w-full rounded-full py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isGenerating ? "Generating template..." : "Generate Document Template"}
              </button>
              <p className="mt-3 text-center text-xs text-white/40">
                Educational template only — not a filing-ready document and not legal
                advice. Review with a licensed attorney before filing.
              </p>

              {generated && (
                <div className="mt-6 rounded-xl border border-white/10 bg-navy p-5">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{generated}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </AuthenticatedGuard>
  );
}