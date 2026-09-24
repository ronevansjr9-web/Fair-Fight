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

// Wave 3 question-intent SEO overrides (26 of the remaining 52 guides):
// the question-led phrases (title tags WITHOUT the " | Fair Fight" suffix),
// metas, and H1s shipped for the 26 highest question-intent guides. Like the
// pilots, the data in guides.ts must match these exactly; the route helpers
// must produce the budgeted title/meta/H1. Metas keep the "Not legal advice."
// honesty posture because every one of these guides is how-to/process content.
const WAVE3_SEO: Record<string, { seoTitle: string; metaDescription: string; h1?: string }> = {
  "how-to-write-demand-letter": {
    seoTitle: "How to Write a Demand Letter",
    metaDescription: "How do you write a demand letter? What to include, how to send it so you can prove it arrived, and when it is required before you sue. Not legal advice.",
    h1: "How Do I Write a Demand Letter?",
  },
  "motion-to-dismiss-explained": {
    seoTitle: "What Is a Motion to Dismiss?",
    metaDescription: "What is a motion to dismiss, and how do you respond to one? The Rule 12(b) grounds, the pleading standard, and what 'with prejudice' means. Not legal advice.",
    h1: "What Is a Motion to Dismiss and How Do I Respond?",
  },
  "what-is-a-complaint": {
    seoTitle: "How to Write a Complaint to File a Lawsuit",
    metaDescription: "How do you write a complaint to start a lawsuit? What the rules require, the pleading standard courts apply, and how to file and serve it. Not legal advice.",
    h1: "How Do I Write a Complaint to File a Lawsuit?",
  },
  "tenant-rights-guide": {
    seoTitle: "Tenant Rights: What a Landlord Can Do",
    metaDescription: "What are your rights as a tenant? How habitability, deposit, privacy, and eviction rules work, and what a landlord cannot do to push you out. Not legal advice.",
    h1: "What Are My Rights as a Tenant?",
  },
  "fight-traffic-ticket": {
    seoTitle: "How to Fight a Traffic Ticket",
    metaDescription: "Should you fight a traffic ticket or pay it? How to plead not guilty, the evidence that helps, defenses that work, and traffic school. Not legal advice.",
    h1: "How Do I Fight a Traffic Ticket in Court?",
  },
  "divorce-spouse-wont-sign": {
    seoTitle: "Divorce When Your Spouse Won't Sign",
    metaDescription: "Can you divorce a spouse who won't sign or respond? How filing, service, and a default judgment work, and how temporary orders protect you. Not legal advice.",
    h1: "How Do I Get a Divorce If My Spouse Won't Sign?",
  },
  "denied-insurance-claim": {
    seoTitle: "How to Appeal a Denied Insurance Claim",
    metaDescription: "Why was your claim denied, and what can you do? How the internal appeal, external review, and state insurance department complaint work. Not legal advice.",
    h1: "How Do I Appeal a Denied Insurance Claim?",
  },
  "what-happens-after-filing-lawsuit": {
    seoTitle: "What Happens After You File a Lawsuit",
    metaDescription: "What happens after you file a civil lawsuit? The pleadings, discovery, motions, pretrial, and trial phases, and why most cases settle. Not legal advice.",
    h1: "What Happens After You File a Lawsuit?",
  },
  "how-to-write-a-will": {
    seoTitle: "How to Write a Will",
    metaDescription: "How do you write a valid will? Who can make one, whether witnesses or a notary are needed, what a will can't override, and when to update it. Not legal advice.",
    h1: "How Do I Write a Will?",
  },
  "how-to-file-police-report": {
    seoTitle: "How to File a Police Report",
    metaDescription: "How do you file a police report, and when do you need one? What to have ready, what to say in your statement, and how to get a copy afterward. Not legal advice.",
    h1: "How Do I File a Police Report?",
  },
  "fight-restraining-order": {
    seoTitle: "How to Fight a Restraining Order",
    metaDescription: "Served with a restraining order? What the temporary order requires, what happens at the hearing, and how the other side must prove their case. Not legal advice.",
    h1: "How Do I Fight a Restraining Order?",
  },
  "restraining-order-guide": {
    seoTitle: "Restraining Order: How to File One",
    metaDescription: "Need a restraining order? How to file the petition, the first review, how long a temporary order lasts, and what the hearing decides. Not legal advice.",
    h1: "How to Get a Restraining Order: Filing and the Hearing",
  },
  "after-car-accident-guide": {
    seoTitle: "What to Do After a Car Accident",
    metaDescription: "What should you do after a car accident? Gather evidence at the scene, handle insurance adjusters, see a doctor, and track the claim deadline. Not legal advice.",
    h1: "What Should I Do After a Car Accident?",
  },
  "medical-malpractice-guide": {
    seoTitle: "Do I Have a Medical Malpractice Case?",
    metaDescription: "Was your bad outcome malpractice? The four elements you must prove, why expert testimony matters, and the special filing requirements. Not legal advice.",
  },
  "how-to-start-an-llc": {
    seoTitle: "How to Start an LLC",
    metaDescription: "How do you start an LLC? Naming and registered agent rules, filing articles of organization, the operating agreement, and the tax elections. Not legal advice.",
    h1: "How Do I Start an LLC?",
  },
  "deposition-preparation": {
    seoTitle: "How to Prepare for a Deposition",
    metaDescription: "How do you prepare for a deposition? The rules that matter most, what to do when you don't know an answer, and how to review the transcript. Not legal advice.",
    h1: "How Do I Prepare for a Deposition?",
  },
  "how-to-get-green-card": {
    seoTitle: "How to Get a Green Card",
    metaDescription: "How do you get a green card? The family, employment, and humanitarian paths, plus the adjustment vs. consular processing choice. Not legal advice.",
    h1: "How Do I Get a Green Card?",
  },
  "us-citizenship-naturalization": {
    seoTitle: "How to Apply for U.S. Citizenship",
    metaDescription: "How do you apply for U.S. citizenship? The eligibility rules, Form N-400, the English and civics tests, and what can delay or block it. Not legal advice.",
    h1: "How Do I Apply for U.S. Citizenship?",
  },
  "child-custody-guide": {
    seoTitle: "How Is Child Custody Decided?",
    metaDescription: "How do courts decide child custody? Legal vs. physical custody, the best interests factors, and how orders can be modified. Not legal advice.",
  },
  "divorce-process-overview": {
    seoTitle: "How Does the Divorce Process Work?",
    metaDescription: "How does the divorce process work? Filing and service, temporary orders, discovery, settlement or trial, and the final decree. Not legal advice.",
  },
  "wrongful-termination": {
    seoTitle: "Wrongful Termination: Can You Sue?",
    metaDescription: "Were you fired illegally? How at-will employment works, the exceptions, what discrimination claims require, and the EEOC filing deadline. Not legal advice.",
    h1: "Was I Wrongfully Terminated?",
  },
  "workplace-harassment-laws": {
    seoTitle: "Is Workplace Harassment Illegal?",
    metaDescription: "What counts as illegal workplace harassment? The protected characteristics, when conduct is severe or pervasive, and how to report it. Not legal advice.",
    h1: "What Counts as Illegal Workplace Harassment?",
  },
  "sexual-harassment-rights": {
    seoTitle: "What Is Sexual Harassment?",
    metaDescription: "What is sexual harassment at work? Quid pro quo vs. hostile environment, what counts as unwelcome conduct, and how to document and report it. Not legal advice.",
    h1: "What Is Sexual Harassment at Work?",
  },
  "equal-pay-act": {
    seoTitle: "Equal Pay Act: When Pay Differs by Sex",
    metaDescription: "Paid less than a coworker for the same work? How the Equal Pay Act applies, the employer defenses, and how state pay laws can go further. Not legal advice.",
    h1: "Can My Employer Pay Me Less for the Same Job?",
  },
  "summary-judgment-explained": {
    seoTitle: "What Is Summary Judgment?",
    metaDescription: "What is summary judgment and how do you oppose it? When a court can decide without trial, the evidence to put in the record, and deadlines. Not legal advice.",
    h1: "What Is Summary Judgment and How Do I Oppose It?",
  },
  "rights-during-police-stop": {
    seoTitle: "Your Rights During a Police Stop",
    metaDescription: "What are your rights during a traffic stop or street encounter? When you can leave, what you must provide, and refusing consent to a search. Not legal advice.",
    h1: "What Are My Rights During a Police Stop?",
  },
};
const WAVE3_SLUGS = Object.keys(WAVE3_SEO);

describe("Wave 2 question-intent SEO (pilot batch)", () => {
  const SEO_SLUGS = [...PILOT_SLUGS, ...WAVE3_SLUGS];

  test("exactly the 10 pilots + 26 wave-3 guides carry seo fields; the other 26 have none", () => {
    expect(ARTICLES.length).toBe(62);
    const withSeo = ARTICLES.filter((a) => a.seoTitle !== undefined).map((a) => a.id);
    expect(withSeo.sort()).toEqual([...SEO_SLUGS].sort());
    for (const a of ARTICLES) {
      if (!SEO_SLUGS.includes(a.id)) {
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

  test("wave-3 seo fields match the shipped wave-3 set exactly (incl. the Not-legal-advice posture)", () => {
    for (const slug of WAVE3_SLUGS) {
      const a = getGuideBySlug(slug)!;
      expect(a.seoTitle, slug).toBe(WAVE3_SEO[slug].seoTitle);
      expect(a.metaDescription, slug).toBe(WAVE3_SEO[slug].metaDescription);
      // Every wave-3 guide summarizes how-to/process content, so every meta
      // keeps the "Not legal advice." honesty posture.
      expect(a.metaDescription!.endsWith("Not legal advice."), `${slug} meta posture`).toBe(true);
      // h1 field is optional where it equals the seoTitle phrase; the helpers resolve it.
      expect(a.h1 ?? a.seoTitle, `${slug} h1`).toBe(WAVE3_SEO[slug].h1 ?? WAVE3_SEO[slug].seoTitle);
    }
  });

  test("wave-3 title tags and metas fit the length budgets (<=60 title, <=47 phrase, <=160 meta)", () => {
    for (const slug of WAVE3_SLUGS) {
      const a = getGuideBySlug(slug)!;
      expect(a.seoTitle!.length, `${slug} phrase`).toBeLessThanOrEqual(47);
      expect(a.metaDescription!.length, `${slug} meta`).toBeLessThanOrEqual(160);
      expect(guidePageTitle(a).length, `${slug} full title`).toBeLessThanOrEqual(60);
    }
  });

  test("no guarantee/outcome language in wave-3 copy", () => {
    const banned = /\b(win your case|guaranteed|guarantee|best argument|beat the ticket|get your money back|sue successfully)\b/i;
    for (const slug of WAVE3_SLUGS) {
      const a = getGuideBySlug(slug)!;
      const copy = [a.seoTitle, a.metaDescription, a.h1 ?? ""].join(" ");
      expect(copy.match(banned), `${slug} wave-3 copy`).toBeNull();
    }
  });

  test("wave-3 pages render the new title, meta, and H1 via the head helpers", () => {
    for (const slug of WAVE3_SLUGS) {
      const a = getGuideBySlug(slug)!;
      expect(guidePageTitle(a), slug).toBe(`${a.seoTitle} | Fair Fight`);
      expect(guidePageDescription(a), slug).toBe(a.metaDescription);
      expect(guidePageH1(a), slug).toBe(WAVE3_SEO[slug].h1 ?? a.seoTitle);
    }
  });

  test("field-less guides keep the legacy rendering (title = article.title, meta = first 160 chars, H1 = title)", () => {
    // The 26 guides not yet carrying Wave-3 seo fields still use the fallback path.
    const fieldLess = ARTICLES.filter((a) => a.seoTitle === undefined);
    expect(fieldLess.length).toBe(26);
    for (const a of fieldLess) {
      expect(guidePageTitle(a), a.id).toBe(`${a.title} | Fair Fight`);
      expect(guidePageDescription(a), a.id).toBe(a.paragraphs[0].substring(0, 160));
      expect(guidePageH1(a), a.id).toBe(a.title);
    }
    // Keep the fallback coverage against an inline minimal Article too, so it
    // survives even after every live guide gains seo fields.
    const noSeoArticle: Article = {
      id: "sample-legacy-fixture",
      title: "Sample Legacy Rendering Guide",
      category: "Evidence & Discovery",
      readTime: "5 min",
      paragraphs: ["A plain-English fixture used only to pin the legacy (no-seo-fields) rendering path."],
      takeaways: ["Test fixture only"],
      relatedGuides: [],
    };
    expect(guidePageTitle(noSeoArticle)).toBe(`${noSeoArticle.title} | Fair Fight`);
    expect(guidePageDescription(noSeoArticle)).toBe(noSeoArticle.paragraphs[0].substring(0, 160));
    expect(guidePageH1(noSeoArticle)).toBe(noSeoArticle.title);
  });

  test("demand-letter title no longer over-claims Templates", () => {
    const dl = getGuideBySlug("how-to-write-demand-letter")!;
    expect(dl.title).toBe("How to Write a Demand Letter");
    // Wave 3 gave this guide an seoTitle phrase identical to its corrected
    // title, so the rendered title tag is unchanged from the legacy value.
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
