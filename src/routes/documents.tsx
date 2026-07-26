import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { askAI } from "~/lib/ai";
import { sanitizeInput } from "~/lib/sanitize";
import { logDocumentGenerated } from "~/lib/audit";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/documents")({
  component: DocumentsPage,
  head: () => ({
    meta: [
      { title: "Legal Document Generator — AI Templates | Fair Fight" },
      { name: "description", content: "Generate legal document templates with AI. Motion templates, demand letters, legal briefs, and more. Educational purposes only." },
    ],
  }),
});

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
    const auth = await getAuth();
    if (!auth.userId) return { error: "Sign in required" };

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
  const [selectedType, setSelectedType] = useState("");
  const [context, setContext] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [generated, setGenerated] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!selectedType) return;
    setIsGenerating(true);
    setError("");
    setGenerated("");
    const res = await generateDocument({ docType: selectedType, context, jurisdiction });
    if (res.success) {
      setGenerated(res.document);
    } else if (res.error) {
      setError(res.error);
    }
    setIsGenerating(false);
  };

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-3xl font-extrabold text-navy sm:text-4xl">Document Generator</h1>
          <p className="mb-8 text-lg text-gray-600">
            Generate educational legal document templates with AI guidance.
          </p>

          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-navy">Document Type</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {DOC_TYPES.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedType(doc.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selectedType === doc.id
                        ? "border-gold bg-navy text-white"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <h3 className={`font-semibold ${selectedType === doc.id ? "text-gold" : "text-navy"}`}>{doc.label}</h3>
                    <p className={`mt-1 text-xs ${selectedType === doc.id ? "text-white/70" : "text-gray-500"}`}>{doc.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold text-navy">Jurisdiction (optional)</label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder='e.g., "California," "Federal," "New York"' 
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-sm font-semibold text-navy">Case Context (optional)</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
                placeholder="Briefly describe your case to get a more tailored template..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 placeholder-gray-400 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedType}
              className="gold-gradient w-full rounded-full py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {isGenerating ? "Generating Template..." : "Generate Document Template"}
            </button>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            {generated && (
              <div className="mt-8 rounded-xl border border-gray-100 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-navy">Generated Template</h2>
                  <button
                    onClick={() => navigator.clipboard.writeText(generated)}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <div className="prose max-w-none rounded-lg bg-gray-50 p-6">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">{generated}</pre>
                </div>
                <div className="mt-4 rounded-lg border border-yellow-100 bg-yellow-50 p-3 text-xs text-yellow-800">
                  ⚖️ <strong>FOR EDUCATIONAL PURPOSES ONLY.</strong> This is a template showing proper document structure. Review with a licensed attorney before filing any document with a court.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
