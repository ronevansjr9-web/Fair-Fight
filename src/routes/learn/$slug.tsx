import { createFileRoute, Link } from "@tanstack/react-router";
import {
  getGuideBySlug,
  guideUrl,
  SITE_ORIGIN,
} from "~/lib/guides";

export const Route = createFileRoute("/learn/$slug")({
  head: ({ params }) => {
    const article = getGuideBySlug(params.slug);
    if (!article) {
      return {
        meta: [
          { title: "Guide Not Found | Fair Fight" },
          { name: "description", content: "This public legal-education guide could not be found. Browse all public guides at Fair Fight." },
        ],
      };
    }
    const description = article.paragraphs[0].substring(0, 160);
    const canonical = guideUrl(article.id);
    const ogImage = `${SITE_ORIGIN}/og-image.png`;
    return {
      meta: [
        { title: `${article.title} | Fair Fight` },
        { name: "description", content: description },
        { property: "og:title", content: `${article.title} | Fair Fight` },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImage },
        { property: "og:url", content: canonical },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${article.title} | Fair Fight` },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const { slug } = Route.useParams();
  const article = getGuideBySlug(slug);

  if (!article) {
    return (
      <main className="min-h-screen bg-navy px-4 py-24 text-center">
        <h1 className="text-4xl font-extrabold text-white">Guide not found</h1>
        <p className="mx-auto mt-4 max-w-md text-white/60">
          This public legal-education guide could not be found or has moved.
        </p>
        <Link
          to="/learn"
          className="gold-gradient mx-auto mt-8 inline-block rounded-full px-6 py-3 font-semibold text-navy"
        >
          Browse all guides
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/learn" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-gold">
          &larr; Back to Guides
        </Link>
        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">{article.category}</span>
        <span className="ml-2 text-xs text-white/40">{article.readTime} read</span>
        <h1 className="mb-8 mt-4 text-4xl font-extrabold text-white sm:text-5xl">{article.title}</h1>
        <div className="space-y-5">
          {article.paragraphs.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed text-white/70">{p}</p>
          ))}
        </div>
        {article.takeaways.length > 0 && (
          <div className="mt-10 rounded-2xl border border-gold/20 bg-white/5 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-bold text-gold">Key Takeaways</h2>
            <ul className="space-y-2">
              {article.takeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-white/80"><span className="mt-1 text-gold">✦</span>{t}</li>
              ))}
            </ul>
          </div>
        )}
        {article.relatedGuides.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-white">Related Guides</h2>
            <div className="flex flex-wrap gap-2">
              {article.relatedGuides.map((id) => {
                const related = getGuideBySlug(id);
                if (!related) return null;
                return (
                  <Link
                    key={id}
                    to="/learn/$slug"
                    params={{ slug: id }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 hover:border-gold/40 hover:text-white"
                  >
                    {related.title}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-xs text-white/40">For educational purposes only. Fair Fight is not a law firm and does not provide legal advice. Consult a licensed attorney. Public guides are separate from Fair Fight's paid Pro Case Analysis workspace.</p>
        </div>
      </div>
    </main>
  );
}
