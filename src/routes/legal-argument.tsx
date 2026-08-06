import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import { generateArgumentTemplate } from "~/lib/argument-template";
import { sanitizeInput } from "~/lib/sanitize";
import { hasOwnedCaseEntitlement } from "~/lib/argumentAccess";
import { ProGate } from "~/components/ProGate";
import { sql } from "~/db";

export const Route = createFileRoute("/legal-argument")({
  component: LegalArgumentPage,
  head: () => ({
    meta: [
      { title: "Legal Argument Generator — AI-Powered Case Law Citations | Fair Fight Pro" },
      { name: "description", content: "Generate AI-powered legal argument templates with jurisdiction-specific case law citations. Pro feature — educational purposes only." },
    ],
  }),
});

const JURISDICTIONS = [
  "Federal — U.S. Supreme Court / Federal Circuit",
  "Federal — 1st Circuit (ME, MA, NH, RI, PR)",
  "Federal — 2nd Circuit (NY, CT, VT)",
  "Federal — 3rd Circuit (PA, NJ, DE, VI)",
  "Federal — 4th Circuit (MD, VA, WV, NC, SC)",
  "Federal — 5th Circuit (TX, LA, MS)",
  "Federal — 6th Circuit (OH, MI, KY, TN)",
  "Federal — 7th Circuit (IL, IN, WI)",
  "Federal — 8th Circuit (MN, IA, MO, AR, NE, ND, SD)",
  "Federal — 9th Circuit (CA, OR, WA, AZ, NV, ID, MT, AK, HI)",
  "Federal — 10th Circuit (CO, UT, WY, KS, OK, NM)",
  "Federal — 11th Circuit (FL, GA, AL)",
  "Federal — D.C. Circuit",
  "Alabama State", "Alaska State", "Arizona State", "Arkansas State",
  "California State", "Colorado State", "Connecticut State", "Delaware State",
  "Florida State", "Georgia State", "Hawaii State", "Idaho State",
  "Illinois State", "Indiana State", "Iowa State", "Kansas State",
  "Kentucky State", "Louisiana State", "Maine State", "Maryland State",
  "Massachusetts State", "Michigan State", "Minnesota State", "Mississippi State",
  "Missouri State", "Montana State", "Nebraska State", "Nevada State",
  "New Hampshire State", "New Jersey State", "New Mexico State", "New York State",
  "North Carolina State", "North Dakota State", "Ohio State", "Oklahoma State",
  "Oregon State", "Pennsylvania State", "Rhode Island State", "South Carolina State",
  "South Dakota State", "Tennessee State", "Texas State", "Utah State",
  "Vermont State", "Virginia State", "Washington State", "West Virginia State",
  "Wisconsin State", "Wyoming State",
];

const generateArgument = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.situation !== "string" || !d.situation.trim()) throw new Error("Situation is required");
    if (typeof d.caseId !== "string" || !/^[A-Za-z0-9_-]+$/.test(d.caseId)) throw new Error("Select a case first");
    return {
      caseId: d.caseId,
      situation: d.situation as string,
      jurisdiction: (d.jurisdiction as string) || "Federal",
      caseType: (d.caseType as string) || "Civil",
      position: (d.position as string) || "neutral",
      additionalContext: (d.additionalContext as string) || "",
    };
  })
  .handler(async ({ data }) => {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { error: "Sign in required" };

    if (!(await hasOwnedCaseEntitlement(auth.userId, data.caseId))) return { error: "This case is not eligible for Pro access" };

    const sanitized = sanitizeInput(data.situation);
    const response = await generateArgumentTemplate({
      situation: sanitized,
      jurisdiction: data.jurisdiction,
      caseType: data.caseType,
      position: data.position,
      additionalContext: sanitizeInput(data.additionalContext),
    });

    return { success: true, response };
  });

export async function fetchUserCases(userId: string | null) {
  if (!userId) return { cases: [] };

  try {
    const cases = await sql()`
      SELECT id, title
      FROM cases
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 100
    `;
    return {
      cases: cases.map((c: Record<string, unknown>) => ({
        id: String(c.id),
        title: String(c.title),
      })),
    };
  } catch {
    return { cases: [] };
  }
}

export const getUserCases = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getCurrentAuth();
  return fetchUserCases(auth.userId);
});

function LegalArgumentPage() {
  const [caseId, setCaseId] = useState("");
  const [situation, setSituation] = useState("");
  const [jurisdiction, setJurisdiction] = useState("Federal");
  const [caseType, setCaseType] = useState("Civil");
  const [position, setPosition] = useState("neutral");
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const [userCases, setUserCases] = useState<{ id: string; title: string }[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);

  useEffect(() => {
    getUserCases()
      .then((res) => {
        const list = res?.cases || [];
        setUserCases(list);
        setIsLoadingCases(false);
        if (list.length > 0) {
          setCaseId(list[0].id);
        }
      })
      .catch(() => {
        setIsLoadingCases(false);
      });
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    setResult("");
    const res = await generateArgument({
      data: {
        caseId,
        situation,
        jurisdiction,
        caseType,
        position,
        additionalContext,
      },
    });
    if (res.success) {
      setResult(res.response);
    } else if (res.error) {
      setError(res.error);
    }
    setIsGenerating(false);
  };

  return (
    <main className="min-h-screen bg-navy px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-extrabold text-white sm:text-4xl">Legal Argument Generator</h1>
        <p className="mb-8 text-lg text-white/70">
          AI-powered legal argument templates with jurisdiction-specific case law citations.
        </p>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <label className="mb-2 block text-sm font-semibold text-white">Select your case (required)</label>
          {isLoadingCases ? (
            <div className="flex items-center gap-2 py-1 text-sm text-white/70">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              <span>Loading your cases...</span>
            </div>
          ) : userCases.length === 0 ? (
            <div className="rounded-xl border border-yellow-800/30 bg-yellow-900/10 p-4 text-sm text-yellow-200">
              <p className="mb-2 font-semibold">No cases found in your account.</p>
              <p className="mb-4 text-xs text-white/60">You must create a case first before you can generate legal arguments.</p>
              <Link
                to="/cases/new"
                className="gold-gradient inline-flex items-center rounded-full px-5 py-2 text-xs font-semibold text-navy shadow-md hover:shadow-lg transition-all"
              >
                Create a New Case
              </Link>
            </div>
          ) : (
            <>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              >
                <option value="">-- Select a case --</option>
                {userCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-white/50">For your security, access is checked against your account and this exact case.</p>
            </>
          )}
        </div>
        <ProGate feature="Legal Argument Generator" caseId={caseId}>
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-white">Jurisdiction</label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                >
                  {JURISDICTIONS.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-white">Case Type</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                >
                  <option>Civil</option>
                  <option>Criminal</option>
                  <option>Family</option>
                  <option>Housing</option>
                  <option>Employment</option>
                  <option>Constitutional</option>
                  <option>Contract</option>
                  <option>Tort / Personal Injury</option>
                  <option>Administrative</option>
                  <option>Appeal</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-white">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/90 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                >
                  <option value="neutral">Neutral / Educational</option>
                  <option value="plaintiff">Plaintiff / Petitioner</option>
                  <option value="defendant">Defendant / Respondent</option>
                </select>
              </div>
            </div>

            <label className="mb-1 block text-sm font-semibold text-white">Describe Your Situation</label>
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              rows={8}
              placeholder="Describe your legal situation in detail. Include all relevant facts, dates, parties, and the legal issue you're dealing with. The more detail, the better the result."
              className="mb-4 w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            />

            <label className="mb-1 block text-sm font-semibold text-white">Additional Context (optional)</label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
              placeholder="Any additional context: prior court rulings, specific statutes you're aware of, arguments the other side has made..."
              className="mb-6 w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-white/90 placeholder-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            />

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !situation.trim()}
              className="gold-gradient w-full rounded-full py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {isGenerating ? "Generating Argument..." : "Generate Legal Argument"}
            </button>

            {error && (
              <div className="mt-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">{error}</div>
            )}

            {result && (
              <div className="mt-8 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeInput(result).replace(/\n/g, "<br/>") }} />
                <div className="mt-6 rounded-lg border border-yellow-800 bg-yellow-900/20 p-4 text-sm text-yellow-300">
                  ⚖️ <strong>FOR EDUCATIONAL PURPOSES ONLY — NOT LEGAL ADVICE.</strong> Review with a licensed attorney before filing. The AI may cite cases that require verification. Never file a document without attorney review.
                </div>
              </div>
            )}
          </div>
        </ProGate>
      </div>
    </main>
  );
}
