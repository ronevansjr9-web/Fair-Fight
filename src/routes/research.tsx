import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { sanitizeInput } from "~/lib/sanitize";

export const Route = createFileRoute("/research")({
  component: ResearchPage,
  head: () => ({
    meta: [
      { title: "Free Legal Research — Case Law & Statutes | Fair Fight" },
      { name: "description", content: "Free legal research tools — search case law, statutes, court rules, and legal concepts. Plain-English explanations. No paywall on legal information." },
    ],
  }),
});

const RESEARCH_TOPICS = [
  { icon: "📜", title: "Federal Rules of Civil Procedure", desc: "The rules governing civil litigation in U.S. federal courts.", category: "Court Rules" },
  { icon: "⚖️", title: "Federal Rules of Evidence", desc: "Rules determining what evidence is admissible in federal court.", category: "Court Rules" },
  { icon: "🏛️", title: "U.S. Constitution", desc: "The supreme law of the United States, including all amendments.", category: "Constitutional" },
  { icon: "📋", title: "Supreme Court Cases", desc: "Landmark decisions from the highest court in the United States.", category: "Case Law" },
  { icon: "📝", title: "Federal Statutes (U.S. Code)", desc: "Compilation of all permanent federal laws of the United States.", category: "Statutes" },
  { icon: "🔍", title: "Legal Terms Glossary", desc: "Plain-English definitions of common legal terms and Latin phrases.", category: "Reference" },
  { icon: "📊", title: "Court Statistics", desc: "Data on case filings, outcomes, and timelines by jurisdiction.", category: "Reference" },
  { icon: "📖", title: "State Court Rules", desc: "Procedural rules for state courts — select your state.", category: "Court Rules" },
];

const legalResearch = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    return { query: (d.query as string) || "" };
  })
  .handler(async ({ data }) => {
    const sanitized = sanitizeInput(data.query);
    // This is a mock legal research function — in production, integrate with
    // CourtListener API, Google Scholar, or PACER for real case law search
    return {
      success: true,
      query: sanitized,
      results: [
        { title: "Search case law databases", description: "Use Google Scholar (scholar.google.com) — select 'Case law' and choose your jurisdiction for free case law search." },
        { title: "Search federal statutes", description: "Visit uscode.house.gov or law.cornell.edu/uscode/text for the full U.S. Code with search functionality." },
        { title: "Search state statutes", description: "Most state legislatures provide free online access to state statutes. Search '[your state] revised statutes' online." },
        { title: "Find court rules", description: "Federal Rules: uscourts.gov/rules-policies. State rules: usually available on the state's judicial branch website." },
      ],
      disclaimer: "Fair Fight provides educational guidance on where to find legal resources. For comprehensive legal research, consult a law librarian or attorney.",
    };
  });

function ResearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ title: string; description: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    const res = await legalResearch({ query });
    if (res.success) setResults(res.results);
    setIsSearching(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-navy px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">Free Legal Research</h1>
          <p className="mb-8 text-lg text-white/70">
            Search and understand case law, statutes, and court rules. Free — forever.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder='Search legal topics... (e.g., "Fourth Amendment," "Rule 56 summary judgment")'
              className="flex-1 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-white placeholder-white/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="gold-gradient rounded-full px-6 py-3 font-semibold text-navy disabled:opacity-50"
            >
              {isSearching ? "..." : "Search"}
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          {results.length > 0 && (
            <div className="mb-12">
              <h2 className="mb-4 text-xl font-bold text-navy">Research Results</h2>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <h3 className="font-semibold text-navy">{r.title}</h3>
                    <p className="text-sm text-gray-600">{r.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-yellow-100 bg-yellow-50 p-3 text-xs text-yellow-800">
                ⚖️ Educational guidance on legal research resources. For comprehensive research, consult a law librarian or attorney.
              </div>
            </div>
          )}

          <h2 className="mb-6 text-2xl font-bold text-navy">Legal Research Topics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {RESEARCH_TOPICS.map((topic) => (
              <Link
                key={topic.title}
                to="/learn"
                className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 text-2xl">{topic.icon}</div>
                <h3 className="font-bold text-navy">{topic.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{topic.desc}</p>
                <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{topic.category}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
