import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { sanitizeInput } from "~/lib/sanitize";
import { logCaseCreated } from "~/lib/audit";
import { sql } from "~/db";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";

export const Route = createFileRoute("/cases/new")({
  component: NewCasePage,
  head: () => ({
    meta: [
      { title: "Create New Case — Fair Fight" },
      { name: "description", content: "Create a new legal case on Fair Fight to start organizing evidence, tracking deadlines, and getting AI-powered legal education." },
    ],
  }),
});

const createCase = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    if (typeof d.title !== "string" || !d.title.trim()) throw new Error("Case title is required");
    return {
      title: d.title as string,
      caseType: (d.caseType as string) || "Civil",
      jurisdiction: (d.jurisdiction as string) || "",
      description: (d.description as string) || "",
    };
  })
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.userId) return { error: "Sign in required" };

    const sanitized = {
      title: sanitizeInput(data.title),
      caseType: sanitizeInput(data.caseType),
      jurisdiction: sanitizeInput(data.jurisdiction),
      description: sanitizeInput(data.description),
    };

    try {
      const result = await sql()`
        INSERT INTO cases (user_id, title, case_type, status, jurisdiction, description, created_at, updated_at)
        VALUES (${auth.userId}, ${sanitized.title}, ${sanitized.caseType}, 'active', ${sanitized.jurisdiction}, ${sanitized.description}, NOW(), NOW())
        RETURNING id
      `;
      const caseId = String(result[0].id);
      await logCaseCreated(auth.userId, caseId);
      return { success: true, caseId };
    } catch (error) {
      console.error("Case creation error:", error);
      return { error: "Failed to create case. Please try again." };
    }
  });

function NewCasePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState("Civil");
  const [jurisdiction, setJurisdiction] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError("");

    const result = await createCase({ title, caseType, jurisdiction, description });

    if (result.success) {
      navigate({ to: "/dashboard" });
    } else if (result.error) {
      setError(result.error);
    }

    setIsSubmitting(false);
  };

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-3xl font-extrabold text-navy">Create New Case</h1>
          <p className="mb-8 text-gray-600">Start a new case to organize evidence, track deadlines, and get AI-powered legal education.</p>

          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-navy">
                  Case Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='e.g., "Smith v. Johnson — Breach of Contract"'
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-navy">Case Type</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                >
                  <option>Civil</option>
                  <option>Criminal</option>
                  <option>Family</option>
                  <option>Housing</option>
                  <option>Employment</option>
                  <option>Small Claims</option>
                  <option>Appeal</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-navy">Jurisdiction</label>
                <input
                  type="text"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder='e.g., "California," "Federal — 9th Circuit"'
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-navy">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Briefly describe your case. What happened, who's involved, and what's the legal issue?"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="gold-gradient flex-1 rounded-full py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? "Creating Case..." : "Create Case"}
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/dashboard" })}
                className="rounded-full bg-gray-100 px-6 py-3 font-semibold text-gray-600 transition-all hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-gray-400">
              ⚖️ Fair Fight is for educational purposes only. Your case information is private.
            </p>
          </form>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
