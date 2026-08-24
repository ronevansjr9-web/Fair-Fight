// JSON-LD structured data for the public /learn/<slug> legal-education guides.
//
// This module builds Schema.org objects (Article, BreadcrumbList, and — for
// procedural "how to" guides — HowTo) strictly from the guide data in guides.ts.
// We never invent authors, dates unrelated to the guide library, or facts not
// present in the guide content itself. Author/Publisher is always the company,
// "Fair Fight", never a fabricated person.
import type { Article } from "./guides";
import { SITE_ORIGIN, guideUrl } from "./guides";

// Stable publication date for the /learn guide library. The guide data carries no
// per-guide dates; we use a single stable value reflecting when the clean
// /learn/<slug> SEO URLs and guide library went live, so datePublished/dateModified
// are consistent for crawlers rather than empty or fabricated per-guide dates.
export const GUIDE_LIBRARY_DATE = "2026-08-24";

const HOME_URL = `${SITE_ORIGIN}/`;
const LEARN_URL = `${SITE_ORIGIN}/learn`;

// Guides whose titles are *procedural* but do not literally begin with "How to"
// (and are not caught by the step-by-step phrase), yet are genuinely step-by-step
// process content the team wants marked up as HowTo (eviction, small claims).
const HOW_TO_BY_SLUG: ReadonlySet<string> = new Set([
  "eviction-process-guide",
  "small-claims-court-guide",
]);

const HOW_TO_TITLE_RE = /(^how to\b|step[\s-]?by[\s-]?step)/i;

/**
 * True when the guide is genuinely procedural "how to" content that warrants a
 * HowTo schema. We use the guide's own title as the first-class signal ("How
 * to …" or "… Step-by-Step …"), plus a small explicit allowlist for procedurals
 * whose titles aren't phrased that way (eviction, small claims). Explainer /
 * reference guides (statute of limitations, what-is-discovery, rights explainers)
 * correctly get only Article.
 */
export function isHowToGuide(article: Article): boolean {
  return HOW_TO_TITLE_RE.test(article.title) || HOW_TO_BY_SLUG.has(article.id);
}

/** Schema.org "Article". */
export function articleSchema(article: Article): Record<string, unknown> {
  const canonical = guideUrl(article.id);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.paragraphs[0].substring(0, 160),
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    url: canonical,
    datePublished: GUIDE_LIBRARY_DATE,
    dateModified: GUIDE_LIBRARY_DATE,
    inLanguage: "en",
    author: {
      "@type": "Organization",
      name: "Fair Fight",
      url: SITE_ORIGIN,
    },
    publisher: {
      "@type": "Organization",
      name: "Fair Fight",
      url: SITE_ORIGIN,
    },
  };
}

/** Schema.org "BreadcrumbList": Home → Learn → <guide title>. */
export function breadcrumbSchema(article: Article): Record<string, unknown> {
  const canonical = guideUrl(article.id);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: HOME_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Learn",
        item: LEARN_URL,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: canonical,
      },
    ],
  };
}

/**
 * Schema.org "HowTo" for procedural guides. "name" is the guide's own title and
 * "description" is its opening line. The ordered "step" list is derived from the
 * guide's own structured takeaways — the guide's summary of the procedure — so
 * every step's text is verbatim guide content (nothing invented).
 */
export function howToSchema(article: Article): Record<string, unknown> | null {
  if (!isHowToGuide(article) || article.takeaways.length === 0) {
    return null;
  }
  const canonical = guideUrl(article.id);
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: article.title,
    description: article.paragraphs[0].substring(0, 160),
    url: canonical,
    inLanguage: "en",
    step: article.takeaways.map((t) => ({ "@type": "HowToStep", text: t })),
  };
}

/**
 * The ordered list of JSON-LD <script> blocks to inject into the /learn/<slug>
 * <head>, so structured data is server-rendered in the raw HTML for crawlers.
 * Every guide gets Article + BreadcrumbList; procedural how-to guides additionally
 * get HowTo.
 */
export function guideStructuredDataScripts(article: Article): Array<{
  type: string;
  children: string;
}> {
  const blocks: Record<string, unknown>[] = [
    articleSchema(article),
    breadcrumbSchema(article),
  ];
  const howTo = howToSchema(article);
  if (howTo) {
    blocks.push(howTo);
  }
  return blocks.map((data) => ({
    type: "application/ld+json",
    children: JSON.stringify(data),
  }));
}
