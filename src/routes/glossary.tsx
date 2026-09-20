import { createFileRoute, Link } from "@tanstack/react-router";
import { getGuideBySlug, SITE_ORIGIN } from "~/lib/guides";
import {
  GLOSSARY_GROUPS,
  GLOSSARY_TERMS,
  glossaryStructuredDataScripts,
  GLOSSARY_URL,
} from "~/lib/glossary";

const SITE = SITE_ORIGIN;
const CANONICAL = GLOSSARY_URL;

export const Route = createFileRoute("/glossary")({
  head: () => ({
    meta: [
      { title: "Legal Terms in Plain English | Fair Fight" },
      {
        name: "description",
        content:
          "Plain-English definitions of the legal terms you'll meet in court: motions, discovery, judgments, settlements, and more. Educational — not legal advice.",
      },
      { property: "og:title", content: "Legal Terms in Plain English | Fair Fight" },
      {
        property: "og:description",
        content:
          "Plain-English definitions of the legal terms you'll meet in court: motions, discovery, judgments, settlements, and more. Educational — not legal advice.",
      },
      { property: "og:image", content: `${SITE}/og-image.png` },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Legal Terms in Plain English | Fair Fight" },
      {
        name: "twitter:description",
        content:
          "Plain-English definitions of the legal terms you'll meet in court: motions, discovery, judgments, settlements, and more. Educational — not legal advice.",
      },
      { name: "twitter:image", content: `${SITE}/og-image.png` },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: glossaryStructuredDataScripts(),
  }),
  component: GlossaryPage,
});

function GlossaryPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/60">
          <Link to="/" className="hover:text-gold">Home</Link>
          <span className="mx-2 text-white/30">/</span>
          <Link to="/learn" className="hover:text-gold">Guides</Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/40">Legal Glossary</span>
        </nav>
        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
          Legal Education
        </span>
        <h1 className="mb-4 mt-4 text-4xl font-extrabold text-white sm:text-5xl">
          Legal Terms in Plain English
        </h1>
        <p className="mb-10 text-lg leading-relaxed text-white/70">
          Court filings and hearings are full of unfamiliar words. This glossary defines the
          terms you are most likely to meet as a self-represented litigant, in plain English.
          Definitions describe how the terms are generally used across U.S. courts — rules and
          deadlines vary by state, so always check your own court&apos;s rules or a licensed
          attorney for what applies to your case. This page is educational and is not legal
          advice.
        </p>

        <nav aria-label="Glossary groups" className="mb-12 grid gap-2 sm:grid-cols-2">
          {GLOSSARY_GROUPS.map((group) => (
            <a
              key={group.title}
              href={`#${group.terms[0].slug}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 transition hover:border-gold/40 hover:text-gold"
            >
              {group.title} ({group.terms.length})
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          {GLOSSARY_GROUPS.map((group) => (
            <section key={group.title} aria-labelledby={`group-${group.terms[0].slug}`}>
              <h2
                id={`group-${group.terms[0].slug}`}
                className="mb-5 border-b border-gold/20 pb-2 text-2xl font-bold text-gold"
              >
                {group.title}
              </h2>
              <dl className="space-y-6">
                {group.terms.map((t) => {
                  const guides = (t.relatedGuideIds ?? []).map((id) => getGuideBySlug(id)).filter(Boolean);
                  return (
                    <div key={t.slug} id={t.slug} className="scroll-mt-8">
                      <dt className="text-lg font-semibold text-white">{t.term}</dt>
                      <dd className="mt-1 text-white/70">
                        <p className="leading-relaxed">{t.definition}</p>
                        {guides.length > 0 && (
                          <p className="mt-2 text-sm">
                            <span className="text-white/40">Learn more: </span>
                            {guides.map((g, i) => (
                              <span key={g!.id}>
                                {i > 0 && <span className="text-white/30"> · </span>}
                                <Link
                                  to="/learn/$slug"
                                  params={{ slug: g!.id }}
                                  className="text-gold underline-offset-2 hover:underline"
                                >
                                  {g!.seoTitle ?? g!.title}
                                </Link>
                              </span>
                            ))}
                          </p>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-gold/20 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-2 text-xl font-bold text-gold">What&apos;s next?</h2>
          <p className="text-white/70">
            Every term here links to a free step-by-step guide where one exists. Browse all{" "}
            {GLOSSARY_TERMS.length} definitions above, or jump into the{" "}
            <Link to="/learn" className="text-gold underline-offset-2 hover:underline">
              full library of legal guides
            </Link>
            .
          </p>
        </div>
      </div>
      <footer className="border-t border-white/10 bg-navy-dark px-4 py-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center text-xs text-white/40">
          <p>⚖️ Fair Fight is not a law firm and does not provide legal advice. For educational purposes only.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="hover:text-gold">Home</Link>
            <Link to="/learn" className="hover:text-gold">Legal Guides</Link>
            <Link to="/glossary" className="hover:text-gold">Legal Glossary</Link>
            <Link to="/privacy" className="hover:text-gold">Privacy Policy</Link>
          </div>
          <p>© {new Date().getFullYear()} Fair Fight. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}