import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { sanitizeInput } from "~/lib/sanitize";

export const Route = createFileRoute("/research")({
  component: ResearchPage,
  head: () => ({
    meta: [
      { title: "Free Legal Research — Case Law & Statutes | Fair Fight" },
      { name: "description", content: "Free legal research tools — search real case law via CourtListener, statutes, court rules, and legal concepts. Plain-English explanations. No paywall on legal information." },
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

interface CourtListenerResult {
  caseName: string;
  court: string;
  dateFiled: string;
  citation: string;
  snippet: string;
  url: string;
}

const COURT_LISTENER_API = "https://www.courtlistener.com/api/rest/v4/search/";

const legalResearch = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    return { query: (d.query as string) || "" };
  })
  .handler(async ({ data }): Promise<{
    success: boolean;
    query: string;
    results: CourtListenerResult[];
    error?: string;
    disclaimer: string;
  }> => {
    const sanitized = sanitizeInput(data.query);
    if (!sanitized || sanitized.length < 2) {
      return {
        success: false,
        query: sanitized,
        results: [],
        error: "Please enter a longer search query.",
        disclaimer: "Fair Fight provides educational guidance on where to find legal resources. For comprehensive legal research, consult a law librarian or attorney.",
      };
    }

    try {
      const url = `${COURT_LISTENER_API}?q=${encodeURIComponent(sanitized)}&type=d&page_size=5`;
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "FairFight/1.0 (educational legal research platform; https://fairfight.ctonew.app)",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`CourtListener returned ${response.status}`);
      }

      const data = await response.json() as {
        results?: Array<{
          caseName?: string;
          court?: string;
          dateFiled?: string;
          citation?: string;
          text?: string;
          absolute_url?: string;
          cluster_id?: number;
        }>;
      };

      const results: CourtListenerResult[] = (data.results || []).map((item) => ({
        caseName: item.caseName || "Untitled Opinion",
        court: item.court || "Unknown Court",
        dateFiled: item.dateFiled
          ? new Date(item.dateFiled).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : "Date unknown",
        citation: item.citation || "No citation available",
        snippet: item.text
          ? item.text.replace(/<[^>]*>/g, "").substring(0, 300) + "..."
          : "No preview available.",
        url: item.absolute_url
          ? `https://www.courtlistener.com${item.absolute_url}`
          : `https://www.courtlistener.com/opinion/${item.cluster_id || ""}`,
      }));

      return {
        success: true,
        query: sanitized,
        results,
        disclaimer: "Results powered by CourtListener. Fair Fight provides educational guidance — not legal advice. For comprehensive legal research, consult a law librarian or attorney.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("CourtListener API error:", message);

      return {
        success: false,
        query: sanitized,
        results: [],
        error: "Search is temporarily unavailable. Please try again later.",
        disclaimer: "Fair Fight provides educational guidance on where to find legal resources. For comprehensive legal research, consult a law librarian or attorney.",
      };
    }
  });

function ResearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourtListenerResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const res = await legalResearch({ data: { query } });
      if (res.success) {
        setResults(res.results);
        if (res.results.length === 0) {
          setError("No results found. Try different search terms.");
        }
      } else {
        setResults([]);
        setError(res.error || "Search failed. Please try again.");
      }
    } catch {
      setError("Search failed. Please try again.");
    }
    setIsSearching(false);
  };

  return (
    <main className="min-h-screen bg-navy">
      <section className="bg-navy px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">Free Legal Research</h1>
          <p className="mb-8 text-lg text-white/70">
            Search real case law from U.S. courts via CourtListener. Free — forever.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder='Search case law... (e.g., "Fourth Amendment," "summary judgment," "statute of limitations")'
              className="flex-1 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-white placeholder-white/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="gold-gradient rounded-full px-6 py-3 font-semibold text-navy disabled:opacity-50"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          {error && (
            <div className="mb-8 rounded-lg border border-yellow-800 bg-yellow-900/20 p-4 text-sm text-yellow-300">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="mb-12">
              <h2 className="mb-4 text-xl font-bold text-white">Case Law Results</h2>
              <div className="space-y-4">
                {results.map((r, i) => (
                  <div key={i} className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5 shadow-sm">
                    <h3 className="font-semibold text-white text-lg">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gold transition-colors"
                      >
                        {r.caseName}
                      </a>
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                      <span>{r.court}</span>
                      <span>{r.dateFiled}</span>
                      <span className="text-gold/70">{r.citation}</span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">{r.snippet}</p>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-gold hover:underline"
                    >
                      View full opinion on CourtListener →
                    </a>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/50">
                <span>⚖️</span>
                <span>Results powered by <a href="https://www.courtlistener.com" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">CourtListener</a>, a project of the Free Law Project.</span>
              </div>
              <div className="mt-2 rounded-lg border border-yellow-800 bg-yellow-900/20 p-3 text-xs text-yellow-300">
                ⚖️ For educational purposes only. Fair Fight is not a law firm and does not provide legal advice. Always consult with a qualified attorney.
              </div>
            </div>
          )}

          <h2 className="mb-6 text-2xl font-bold text-white">Legal Research Topics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {RESEARCH_TOPICS.map((topic) => (
              <Link
                key={topic.title}
                to="/learn"
                className="card-hover rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5 shadow-sm"
              >
                <div className="mb-2 text-2xl">{topic.icon}</div>
                <h3 className="font-bold text-white">{topic.title}</h3>
                <p className="mt-1 text-sm text-white/60">{topic.desc}</p>
                <span className="mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">{topic.category}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
