import { describe, expect, test } from "bun:test";
import {
  ARTICLES,
  GUIDE_REDIRECTS,
  getGuideBySlug,
  guidePageDescription,
  guidePageFaqs,
  guidePageH1,
  guidePageTitle,
  type Article,
} from "./guides";

describe("guide consolidation (SEO)", () => {
  test("guide count is 62 after the content-wave additions (attorney prep + document organization)", () => {
    expect(ARTICLES.length).toBe(62);
  });

  test("folded/renamed slugs are no longer separately-indexed guides", () => {
    for (const slug of ["sue-in-small-claims", "renter-rights-full-guide", "what-is-summary-judgment"]) {
      expect(getGuideBySlug(slug), `${slug} should be removed from the public list`).toBeUndefined();
    }
  });

  test("canonical targets exist for every redirect", () => {
    for (const [from, to] of Object.entries(GUIDE_REDIRECTS)) {
      expect(from, `redirect source ${from} must not be a live guide`).not.toBeUndefined();
      expect(getGuideBySlug(from), `${from} must not still resolve as a guide`).toBeUndefined();
      expect(getGuideBySlug(to), `redirect target ${to} should exist`).toBeDefined();
    }
  });

  test("redirect map has exactly the three intended mappings", () => {
    expect(GUIDE_REDIRECTS).toEqual({
      "sue-in-small-claims": "small-claims-court-guide",
      "renter-rights-full-guide": "tenant-rights-guide",
      "what-is-summary-judgment": "what-happens-after-filing-lawsuit",
    });
  });

  test("slug fix: what-is-summary-judgment content now lives under a truthful slug", () => {
    const renamed = getGuideBySlug("what-happens-after-filing-lawsuit");
    expect(renamed).toBeDefined();
    // Its content is the broad civil-litigation timeline, not Rule 56.
    expect(renamed!.paragraphs.join(" ")).toContain("timeline");
    // The genuinely distinct Rule 56 guide is untouched and not merged.
    expect(getGuideBySlug("summary-judgment-explained")).toBeDefined();
  });

  test("every relatedGuides link from the consolidated guides resolves to a live guide", () => {
    for (const id of ["small-claims-court-guide", "tenant-rights-guide", "what-happens-after-filing-lawsuit"]) {
      const a = getGuideBySlug(id)!;
      expect(a, `${id} should exist`).toBeDefined();
      for (const rel of a.relatedGuides) {
        expect(getGuideBySlug(rel), `${id} links to missing guide ${rel}`).toBeDefined();
      }
    }
  });

  test("restored guides (expungement, restraining order) exist and all related links resolve", () => {
    for (const id of ["how-to-expunge-a-criminal-record", "how-to-get-a-restraining-order"]) {
      const a = getGuideBySlug(id)!;
      expect(a, `${id} should exist`).toBeDefined();
      expect(a.paragraphs.length).toBeGreaterThan(0);
      expect(a.takeaways.length).toBeGreaterThan(0);
      for (const rel of a.relatedGuides) {
        expect(getGuideBySlug(rel), `${id} links to missing guide ${rel}`).toBeDefined();
      }
    }
  });
  test("content-wave guides (attorney prep, document organization) exist, have content, and all related links resolve", () => {
    for (const id of ["prepare-attorney-consultation", "organize-case-documents"]) {
      const a = getGuideBySlug(id)!;
      expect(a, `${id} should exist`).toBeDefined();
      expect(a.paragraphs.length).toBeGreaterThan(0);
      expect(a.takeaways.length).toBeGreaterThan(0);
      for (const rel of a.relatedGuides) {
        expect(getGuideBySlug(rel), `${id} links to missing guide ${rel}`).toBeDefined();
      }
    }
  });
  test("no guide slug collides with a redirect source", () => {
    const liveSlugs = new Set(ARTICLES.map((a) => a.id));
    for (const from of Object.keys(GUIDE_REDIRECTS)) {
      expect(liveSlugs.has(from), `redirect source ${from} should not also be a live guide`).toBe(false);
    }
  });
});

// --- Wave 2: question-intent SEO restructure (pilot batch) -----------------
// Literal copy of the question-intent map's recommended title phrases, metas,
// and H1s for the 10 pilot guides. The data in guides.ts must match these
// exactly; the route helpers must produce the budgeted title/meta/H1.
const PILOT_SEO: Record<string, { seoTitle: string; metaDescription: string; h1?: string }> = {
  "how-to-file-a-motion": {
    seoTitle: "How to File a Motion in Court",
    metaDescription:
      "How do you file a motion in court? What goes in a motion, how to format and file it, and how to serve the other side. Not legal advice.",
  },
  "small-claims-court-guide": {
    seoTitle: "How to Sue in Small Claims Court",
    metaDescription:
      "How do you sue someone in small claims court? Filing steps, the monetary limit, serving the defendant, and collecting a judgment. Not legal advice.",
    h1: "How Do You Sue Someone in Small Claims Court?",
  },
  "statute-of-limitations-guide": {
    seoTitle: "Statute of Limitations: How Long You Have",
    metaDescription:
      "How long do you have to sue? How statutes of limitations work by claim type, and how tolling and the discovery rule can change your deadline.",
    h1: "How Long Do You Have to Sue? Statute of Limitations Basics",
  },
  "eviction-process-guide": {
    seoTitle: "Eviction Process: Tenant Rights Step by Step",
    metaDescription:
      "How does an eviction work, and what can a tenant do about it? The notice, the court case, defenses you can raise, and what happens after a judgment.",
    h1: "How Does the Eviction Process Work?",
  },
  "how-to-respond-to-lawsuit": {
    seoTitle: "Served With a Lawsuit? How to Respond",
    metaDescription:
      "Just been served with a lawsuit? How long you have to respond, how to answer a complaint, when to file a motion instead, and avoid a default judgment.",
    h1: "How Do I Respond to a Lawsuit?",
  },
  "security-deposit-guide": {
    seoTitle: "Get Your Security Deposit Back",
    metaDescription:
      "Can your landlord keep your security deposit? What can be deducted, the return deadline, and how to get your deposit back if they refuse.",
    h1: "How Do I Get My Security Deposit Back?",
  },
  "debt-collection-defense": {
    seoTitle: "Sued by a Debt Collector? How to Respond",
    metaDescription:
      "Being sued by a debt collector? How to answer in time, common defenses such as lack of standing or an expired limitations period. Not legal advice.",
    h1: "Being Sued by a Debt Collector: How to Respond",
  },
  "unemployment-benefits-guide": {
    seoTitle: "How to File for Unemployment Benefits",
    metaDescription:
      "How do you file for unemployment benefits? Who qualifies, what you need to apply, why claims are denied, and how the appeal hearing works.",
    h1: "How Do I File for Unemployment Benefits?",
  },
  "how-to-get-a-restraining-order": {
    seoTitle: "How to Get a Restraining Order",
    metaDescription:
      "How do you get a restraining order? The types of protective orders, what evidence to file, what a judge can order, and how the hearing works.",
    h1: "How Do I Get a Restraining Order?",
  },
  "how-to-expunge-a-criminal-record": {
    seoTitle: "How to Expunge a Criminal Record",
    metaDescription:
      "Can you expunge a criminal record? How eligibility works by offense and disposition, what to file, and what a sealed record does not hide.",
    h1: "How Do I Expunge a Criminal Record?",
  },
};
const PILOT_SLUGS = Object.keys(PILOT_SEO);

describe("Wave 2 question-intent SEO (pilot batch)", () => {
  test("exactly the 10 pilot guides carry seo fields; the other 52 have none", () => {
    expect(ARTICLES.length).toBe(62);
    const withSeo = ARTICLES.filter((a) => a.seoTitle !== undefined).map((a) => a.id);
    expect(withSeo.sort()).toEqual([...PILOT_SLUGS].sort());
    for (const a of ARTICLES) {
      if (!PILOT_SLUGS.includes(a.id)) {
        expect(a.seoTitle, `${a.id} seoTitle`).toBeUndefined();
        expect(a.metaDescription, `${a.id} metaDescription`).toBeUndefined();
        expect(a.h1, `${a.id} h1`).toBeUndefined();
      }
    }
  });

  test("pilot seo fields match the question-intent map verbatim", () => {
    for (const slug of PILOT_SLUGS) {
      const a = getGuideBySlug(slug)!;
      expect(a.seoTitle, slug).toBe(PILOT_SEO[slug].seoTitle);
      expect(a.metaDescription, slug).toBe(PILOT_SEO[slug].metaDescription);
      // h1 field is optional where it equals the seoTitle phrase; the helpers resolve it.
      expect(a.h1 ?? a.seoTitle, `${slug} h1`).toBe(PILOT_SEO[slug].h1 ?? PILOT_SEO[slug].seoTitle);
    }
  });

  test("pilot title tags and metas fit the length budgets (<=60 title, <=47 phrase, <=155 meta)", () => {
    for (const slug of PILOT_SLUGS) {
      const a = getGuideBySlug(slug)!;
      expect(a.seoTitle!.length, `${slug} phrase`).toBeLessThanOrEqual(47);
      expect(a.metaDescription!.length, `${slug} meta`).toBeLessThanOrEqual(155);
      expect(guidePageTitle(a).length, `${slug} full title`).toBeLessThanOrEqual(60);
    }
  });

  test("no guarantee/outcome language in new pilot copy", () => {
    const banned = /\b(win your case|guaranteed|guarantee|best argument|beat the ticket|get your money back|sue successfully)\b/i;
    for (const slug of PILOT_SLUGS) {
      const a = getGuideBySlug(slug)!;
      const copy = [a.seoTitle, a.metaDescription, a.h1 ?? ""].join(" ");
      expect(copy.match(banned), `${slug} pilot copy`).toBeNull();
    }
  });

  test("pilot pages render the new title, meta, and H1 via the head helpers", () => {
    for (const slug of PILOT_SLUGS) {
      const a = getGuideBySlug(slug)!;
      expect(guidePageTitle(a), slug).toBe(`${a.seoTitle} | Fair Fight`);
      expect(guidePageDescription(a), slug).toBe(a.metaDescription);
      expect(guidePageH1(a), slug).toBe(PILOT_SEO[slug].h1 ?? a.seoTitle);
    }
  });

  test("non-pilot guides keep the legacy rendering (title = article.title, meta = first 160 chars, H1 = title)", () => {
    const nonPilots = ARTICLES.filter((a) => !PILOT_SLUGS.includes(a.id));
    expect(nonPilots.length).toBe(52);
    for (const a of nonPilots) {
      expect(guidePageTitle(a), a.id).toBe(`${a.title} | Fair Fight`);
      expect(guidePageDescription(a), a.id).toBe(a.paragraphs[0].substring(0, 160));
      expect(guidePageH1(a), a.id).toBe(a.title);
    }
  });

  test("demand-letter title no longer over-claims Templates", () => {
    const dl = getGuideBySlug("how-to-write-demand-letter")!;
    expect(dl.title).toBe("How to Write a Demand Letter");
    expect(dl.seoTitle).toBeUndefined();
    expect(guidePageTitle(dl)).toBe("How to Write a Demand Letter | Fair Fight");
  });

  test("every relatedGuides link across all 62 guides resolves to a live guide", () => {
    const ids = new Set(ARTICLES.map((a) => a.id));
    for (const a of ARTICLES) {
      for (const rel of a.relatedGuides) {
        expect(ids.has(rel), `${a.id} -> ${rel}`).toBe(true);
        expect(rel, `${a.id} must not self-link`).not.toBe(a.id);
      }
      expect(new Set(a.relatedGuides).size, `${a.id} relatedGuides dupes`).toBe(a.relatedGuides.length);
    }
  });
  test("every guide carries 3-5 relatedGuides (cross-link density), all resolving, no self/dupes", () => {
    const ids = new Set(ARTICLES.map((a) => a.id));
    for (const a of ARTICLES) {
      expect(a.relatedGuides.length, `${a.id} must list at least 3 related guides`).toBeGreaterThanOrEqual(3);
      expect(a.relatedGuides.length, `${a.id} must list at most 5 related guides`).toBeLessThanOrEqual(5);
      for (const rel of a.relatedGuides) {
        expect(ids.has(rel), `${a.id} -> ${rel}`).toBe(true);
        expect(rel, `${a.id} must not self-link`).not.toBe(a.id);
      }
      expect(new Set(a.relatedGuides).size, `${a.id} relatedGuides dupes`).toBe(a.relatedGuides.length);
    }
  });
});

describe("Wave 3 + 4 FAQ sections (all 62 guides)", () => {
  // The 22 tier-1 guides from Wave 3 (PR #61) plus the 40 wave-4 guides from
  // FAQ passes part 1 and part 2 — every guide in the library now carries faqs.
  const FAQ_SLUGS = [
    "after-car-accident-guide",
    "asylum-law-guide",
    "child-custody-guide",
    "debt-collection-defense",
    "denied-insurance-claim",
    "deposition-preparation",
    "divorce-process-overview",
    "divorce-spouse-wont-sign",
    "eviction-process-guide",
    "fight-restraining-order",
    "fight-traffic-ticket",
    "how-to-expunge-a-criminal-record",
    "how-to-file-a-motion",
    "how-to-file-a-trademark",
    "how-to-file-police-report",
    "how-to-get-a-restraining-order",
    "how-to-get-green-card",
    "how-to-read-contract",
    "how-to-respond-to-lawsuit",
    "how-to-start-an-llc",
    "how-to-write-a-will",
    "how-to-write-demand-letter",
    "how-to-write-legal-brief",
    "immigration-court-basics",
    "living-will-advance-directives",
    "medical-malpractice-guide",
    "motion-to-dismiss-explained",
    "power-of-attorney-guide",
    "restraining-order-guide",
    "rights-during-police-stop",
    "security-deposit-guide",
    "small-claims-court-guide",
    "statute-of-limitations-guide",
    "tenant-rights-guide",
    "understanding-alimony",
    "understanding-miranda-rights",
    "unemployment-benefits-guide",
    "us-citizenship-naturalization",
    "what-happens-after-filing-lawsuit",
    "what-is-a-complaint",
    "what-is-probate",
    "wrongful-death-claims",
    // Wave-4 FAQ pass, part 2 (this PR): the remaining 20 FAQ-less guides,
    // matching the question phrasings in the question-intent map.
    "civil-rights-section-1983",
    "class-action-lawsuits",
    "complaint-against-judge",
    "defamation-libel-slander",
    "eminent-domain",
    "equal-pay-act",
    "first-amendment-speech",
    "fourth-amendment-search-seizure",
    "insider-trading",
    "noise-complaints-nuisance",
    "organize-case-documents",
    "prepare-attorney-consultation",
    "right-to-protest",
    "sexual-harassment-rights",
    "subpoena-phone-records",
    "summary-judgment-explained",
    "what-is-a-trust",
    "what-is-discovery",
    "workplace-harassment-laws",
    "wrongful-termination",
  ];
  test("every one of the 62 articles carries exactly 3 faqs (no FAQ-less guides remain)", () => {
    expect(ARTICLES.length).toBe(62);
    const withFaqs = ARTICLES.filter((a) => a.faqs !== undefined).map((a) => a.id);
    expect(withFaqs.sort()).toEqual([...FAQ_SLUGS].sort());
    for (const a of ARTICLES) {
      expect(a.faqs, `${a.id} faqs`).toBeDefined();
      expect(a.faqs!.length, `${a.id} faqs length`).toBe(3);
    }
  });
  test("every faq is question-shaped with a substantive answer", () => {
    for (const slug of FAQ_SLUGS) {
      const a = getGuideBySlug(slug)!;
      for (const [i, faq] of (a.faqs ?? []).entries()) {
        expect(faq.question.trim().endsWith("?"), `${slug} faq ${i} question shape`).toBe(true);
        expect(faq.answer.length, `${slug} faq ${i} answer too short`).toBeGreaterThanOrEqual(80);
        expect(faq.answer.length, `${slug} faq ${i} answer too long`).toBeLessThanOrEqual(700);
        expect(faq.answer, `${slug} faq ${i} answer repeats question`).not.toBe(faq.question);
      }
    }
  });
  test("no guarantee/outcome language in faq copy", () => {
    const banned = /\b(win your case|guaranteed|guarantee|best argument|beat the ticket|get your money back|sue successfully)\b/i;
    for (const slug of FAQ_SLUGS) {
      const a = getGuideBySlug(slug)!;
      const copy = (a.faqs ?? []).map((f) => `${f.question} ${f.answer}`).join(" ");
      expect(copy.match(banned), `${slug} faq copy`).toBeNull();
    }
  });
  test("guidePageFaqs returns the faqs for guides that carry them and undefined otherwise", () => {
    const withFaqs = getGuideBySlug("how-to-file-a-motion")!;
    expect(guidePageFaqs(withFaqs)).toBeDefined();
    expect(guidePageFaqs(withFaqs)!.length).toBe(3);
    // No live guide is FAQ-less after the part-2 pass; keep the fallback path
    // tested with an inline minimal Article that has no faqs field.
    const withoutFaqs: Article = {
      id: "sample-explainer",
      title: "Sample Explainer Guide",
      category: "Evidence & Discovery",
      readTime: "5 min",
      paragraphs: ["A plain-English explainer used only as a test fixture."],
      takeaways: ["Test fixture only"],
      relatedGuides: [],
    };
    expect(guidePageFaqs(withoutFaqs)).toBeUndefined();
  });
});
