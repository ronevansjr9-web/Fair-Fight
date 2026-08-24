import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { ARTICLES, ALL_CATEGORIES, getGuideBySlug, guideUrl } from "~/lib/guides";

export const Route = createFileRoute("/learn")({
  validateSearch: (search: Record<string, unknown>) => ({
    article: (search.article as string) || undefined,
  }),
  head: ({ search }: { search?: { article?: string } }) => {
    const articleId = search?.article;
    if (articleId) {
      const article = ARTICLES.find((a) => a.id === articleId);
      if (article) {
        const description = article.paragraphs[0].substring(0, 160);
        const ogImage = "https://fairfight.ctonew.app/og-image.png";
        return {
          meta: [
            { title: `${article.title} | Fair Fight` },
            { name: "description", content: description },
            { property: "og:title", content: `${article.title} | Fair Fight` },
            { property: "og:description", content: description },
            { property: "og:image", content: ogImage },
            { property: "og:type", content: "article" },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:title", content: `${article.title} | Fair Fight` },
            { name: "twitter:description", content: description },
            { name: "twitter:image", content: ogImage },
          ],
          // Legacy /learn?article=<id> deep links hand SEO credit to the clean
          // static /learn/<slug> canonical rather than self-canonicalizing to the
          // legacy ?article= URL. The component below also redirects to /learn/<slug>.
          links: [
            { rel: "canonical", href: guideUrl(article.id) },
          ],
        };
      }
    }
    return {
      meta: [
        { title: "Public Legal Education Guides — Plain-English Law Explained | Fair Fight" },
        { name: "description", content: "Public plain-English legal guides on court procedures, motions, discovery, statutes of limitations, criminal law, family law, housing law, debt collection, and more. Fair Fight's paid Pro Case Analysis workspace is separate from these educational guides." },
      ],
    };
  },
  component: Learn,
});
function Learn() {
  const search = Route.useSearch();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const filtered = selectedCategory ? ARTICLES.filter((a) => a.category === selectedCategory) : ARTICLES;

  // Preserve legacy /learn?article=<id> deep links (used by earlier Dev.to articles)
  // by redirecting to the clean static /learn/<slug> URL. This consolidates SEO onto
  // one canonical URL per guide.
  if (search.article) {
    const legacy = getGuideBySlug(search.article);
    if (legacy) {
      return <Navigate to="/learn/$slug" params={{ slug: legacy.id }} replace />;
    }
  }

  return (
    <main className="min-h-screen bg-navy">
      <section className="bg-navy-dark px-4 py-16 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">Public Legal Education Guides</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">Plain-English explanations of legal concepts, court procedures, and your rights. Browse {ARTICLES.length} public guides; Pro Case Analysis is a separate one-time $99 purchase per case.</p>
        </div>
      </section>
      <section className="border-b border-white/10 px-4 py-6">
        <div className="mx-auto max-w-6xl flex flex-wrap gap-2">
          <button onClick={() => setSelectedCategory(null)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${!selectedCategory ? "bg-gold text-navy" : "border border-white/10 text-white/60 hover:border-white/30 hover:text-white"}`}>All</button>
          {ALL_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${selectedCategory === cat ? "bg-gold text-navy" : "border border-white/10 text-white/60 hover:border-white/30 hover:text-white"}`}>{cat}</button>
          ))}
        </div>
      </section>
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <Link key={article.id} to="/learn/$slug" params={{ slug: article.id }} className="card-hover rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm">
              <span className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/50">{article.category}</span>
              <h3 className="mb-2 text-lg font-bold text-white line-clamp-2">{article.title}</h3>
              <p className="text-xs text-white/40">{article.readTime} read</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

