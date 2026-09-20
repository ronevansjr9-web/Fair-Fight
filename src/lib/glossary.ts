/**
 * Glossary of common legal terms in plain English (owner directive 09-20,
 * part 3). This is legal EDUCATION: definitions are general-purpose, US-wide
 * explanations of standard terms. They must never state jurisdiction-specific
 * rules, impose deadlines that vary by state, or give advice, and they must
 * never promise outcomes.
 *
 * `relatedGuideIds` links a term to a /learn guide that genuinely discusses
 * it. Every id must resolve via getGuideBySlug() (enforced by
 * glossary.test.ts) — ids are only added where the guide's own content
 * covers the term, so "Learn more" links are never dead or off-topic.
 */
import { SITE_ORIGIN } from "./guides";

export type GlossaryTerm = {
  /** Display name, e.g. "Motion to dismiss". */
  term: string;
  /** Anchor id used on the page and in JSON-LD URLs (e.g. "motion-to-dismiss"). */
  slug: string;
  /** Plain-English definition, 1-3 sentences, general US terms only. */
  definition: string;
  /** /learn guide ids whose content genuinely covers this term. */
  relatedGuideIds?: string[];
};

export type GlossaryGroup = {
  /** Theme group heading shown on the page. */
  title: string;
  terms: GlossaryTerm[];
};

/** Theme groups — the page is organized by "who/what/where" rather than A-Z. */
export const GLOSSARY_GROUPS: GlossaryGroup[] = [
  {
    title: "The People in a Case",
    terms: [
      {
        term: "Plaintiff",
        slug: "plaintiff",
        definition:
          "The person or business that starts a civil lawsuit by filing a complaint. The plaintiff brings the claims and carries the burden of proof.",
        relatedGuideIds: ["what-is-a-complaint"],
      },
      {
        term: "Defendant",
        slug: "defendant",
        definition:
          "The person or business being sued (or, in a criminal case, the person accused of a crime). The defendant must respond to the complaint by the deadline or risk a default judgment.",
        relatedGuideIds: ["how-to-respond-to-lawsuit"],
      },
      {
        term: "Pro se",
        slug: "pro-se",
        definition:
          "A Latin phrase meaning \u201cfor oneself\u201d \u2014 representing yourself in court without a lawyer. Many courts offer self-help resources, and small claims courts are designed for pro se litigants.",
        relatedGuideIds: ["small-claims-court-guide"],
      },
    ],
  },
  {
    title: "Court Papers & Filing",
    terms: [
      {
        term: "Complaint",
        slug: "complaint",
        definition:
          "The document that starts a lawsuit. It explains who the plaintiff and defendant are, what happened, and what the plaintiff wants the court to do. Once it is filed and served, the defendant must respond by a deadline.",
        relatedGuideIds: ["what-is-a-complaint"],
      },
      {
        term: "Answer",
        slug: "answer",
        definition:
          "The formal written response a defendant files after being sued, replying to each claim in the complaint. In it, you admit or deny the plaintiff's allegations and can raise defenses. Filing an answer on time avoids a default judgment.",
        relatedGuideIds: ["how-to-respond-to-lawsuit"],
      },
      {
        term: "Summons",
        slug: "summons",
        definition:
          "A legal notice telling someone they have been sued and that they must respond by a deadline. The summons is delivered together with the complaint.",
        relatedGuideIds: ["how-to-respond-to-lawsuit"],
      },
      {
        term: "Service of process",
        slug: "service-of-process",
        definition:
          "The formal delivery of legal papers, such as a summons and complaint, to the person being sued. Proper service gives the court power over the defendant and gives the defendant notice and a fair chance to respond. If service is defective, the case can be dismissed.",
        relatedGuideIds: ["motion-to-dismiss-explained"],
      },
      {
        term: "Pleading",
        slug: "pleading",
        definition:
          "The formal written documents in which the parties state their claims and defenses \u2014 most commonly the complaint and the answer. Pleadings lay out the issues the court will decide.",
      },
      {
        term: "Cause of action",
        slug: "cause-of-action",
        definition:
          "The legal basis for a lawsuit \u2014 the set of facts and law that give someone the right to sue. Breach of contract and negligence are different causes of action.",
      },
      {
        term: "Clerk of court",
        slug: "clerk-of-court",
        definition:
          "The court employee who handles paperwork: filing documents, keeping records, collecting filing fees, and maintaining the docket. Litigants interact with the clerk's office for almost every routine step in a case.",
        relatedGuideIds: ["what-is-a-complaint"],
      },
      {
        term: "Docket",
        slug: "docket",
        definition:
          "The court's official calendar and record of every filing, hearing, and order in a case. You can typically look up a case's docket to see its full procedural history.",
      },
      {
        term: "Filing fee",
        slug: "filing-fee",
        definition:
          "The money a court charges to accept certain documents, most commonly the fee to start a lawsuit. Fees vary by court and case type, and many courts allow fee waivers for people who cannot afford to pay.",
        relatedGuideIds: ["small-claims-court-guide"],
      },
      {
        term: "Brief",
        slug: "brief",
        definition:
          "A written legal argument submitted to a court explaining why the law supports your position. Briefs cite statutes, cases, and court rules, and judges rely on them to decide motions and appeals.",
        relatedGuideIds: ["how-to-write-legal-brief"],
      },
      {
        term: "Affidavit",
        slug: "affidavit",
        definition:
          "A written statement of facts that you sign under oath, usually in front of a notary. Courts use affidavits as sworn evidence when a witness cannot testify in person at a hearing.",
        relatedGuideIds: ["summary-judgment-explained"],
      },
      {
        term: "Continuance",
        slug: "continuance",
        definition:
          "A postponement of a court hearing or trial to a later date, granted by the judge. Courts grant continuances for good cause, such as illness or a scheduling conflict.",
      },
    ],
  },
  {
    title: "Motions & Court Orders",
    terms: [
      {
        term: "Motion",
        slug: "motion",
        definition:
          "A formal written request asking the judge to make a ruling or take a specific action in a case. Examples include motions to dismiss, motions for summary judgment, and motions to compel.",
        relatedGuideIds: ["how-to-file-a-motion"],
      },
      {
        term: "Motion to dismiss",
        slug: "motion-to-dismiss",
        definition:
          "A motion asking the judge to throw out all or part of a case before trial, usually because the complaint is legally insufficient or the court lacks jurisdiction. If granted, the motion can end the case early.",
        relatedGuideIds: ["motion-to-dismiss-explained"],
      },
      {
        term: "Motion to compel",
        slug: "motion-to-compel",
        definition:
          "A motion asking the judge to order the other side to comply with a discovery obligation \u2014 for example, to answer interrogatories or produce documents they have withheld.",
      },
      {
        term: "Default judgment",
        slug: "default-judgment",
        definition:
          "A judgment entered against a defendant who failed to respond to a lawsuit by the deadline. It means the plaintiff wins without a full trial. Courts can set aside default judgments in limited circumstances.",
        relatedGuideIds: ["how-to-respond-to-lawsuit"],
      },
      {
        term: "Summary judgment",
        slug: "summary-judgment",
        definition:
          "A ruling by the judge that one side wins without a trial because the key facts are not in genuine dispute and the law clearly favors that side. It is decided on written evidence and legal arguments.",
        relatedGuideIds: ["summary-judgment-explained"],
      },
      {
        term: "Injunction",
        slug: "injunction",
        definition:
          "A court order directing someone to do something or to stop doing something. An injunction can be temporary (while a case is pending) or permanent (issued after trial).",
        relatedGuideIds: ["what-is-a-complaint"],
      },
      {
        term: "Restraining order",
        slug: "restraining-order",
        definition:
          "A court order telling someone to stay away from another person or to stop certain behavior, often issued in domestic-violence situations. Violating a restraining order can carry its own penalties.",
        relatedGuideIds: ["restraining-order-guide", "how-to-get-a-restraining-order"],
      },
      {
        term: "Protective order",
        slug: "protective-order",
        definition:
          "A court order that protects someone from harassment or harm \u2014 for example, a domestic-violence protective order. The term also refers to an order limiting what the parties can do with sensitive information disclosed during discovery.",
        relatedGuideIds: ["restraining-order-guide"],
      },
    ],
  },
  {
    title: "Where & When",
    terms: [
      {
        term: "Jurisdiction",
        slug: "jurisdiction",
        definition:
          "A court's legal authority to hear a particular case, based on geography, subject matter, or the parties involved. A court cannot act in a case it lacks jurisdiction over, and a case can be dismissed on that ground.",
        relatedGuideIds: ["motion-to-dismiss-explained"],
      },
      {
        term: "Venue",
        slug: "venue",
        definition:
          "The specific court location where a case is heard, usually where the events happened or where the parties live. Venue rules decide which courthouse hears a case, while jurisdiction decides whether a court has power over it at all.",
        relatedGuideIds: ["small-claims-court-guide"],
      },
      {
        term: "Statute of limitations",
        slug: "statute-of-limitations",
        definition:
          "A law that sets a deadline for bringing a lawsuit. If you miss the deadline, the court will typically dismiss the case no matter how strong the facts are. Deadlines vary by state and by the type of claim.",
        relatedGuideIds: ["statute-of-limitations-guide"],
      },
      {
        term: "Appeal",
        slug: "appeal",
        definition:
          "A request to a higher court to review a decision made by a lower court. An appeal is not a second trial \u2014 the higher court reviews the record for legal errors. Deadlines for filing an appeal are usually very short.",
      },
    ],
  },
  {
    title: "Discovery & Evidence",
    terms: [
      {
        term: "Discovery",
        slug: "discovery",
        definition:
          "The pre-trial phase where each side gathers evidence from the other side and from third parties. Common tools include interrogatories, requests for documents, and depositions, all limited by court rules.",
        relatedGuideIds: ["what-is-discovery"],
      },
      {
        term: "Deposition",
        slug: "deposition",
        definition:
          "A formal out-of-court questioning session where a witness answers questions under oath, with lawyers present and a transcript recorded. Depositions are a common part of discovery and happen before trial.",
        relatedGuideIds: ["deposition-preparation"],
      },
      {
        term: "Interrogatories",
        slug: "interrogatories",
        definition:
          "Written questions one side sends to the other during discovery, which must be answered in writing and under oath within a set time. They help each side learn the other's version of the facts.",
        relatedGuideIds: ["what-is-discovery"],
      },
      {
        term: "Subpoena",
        slug: "subpoena",
        definition:
          "A court-issued order requiring someone to appear \u2014 for example, to testify at a hearing or deposition, or to produce documents. Ignoring a valid subpoena can result in penalties.",
        relatedGuideIds: ["subpoena-phone-records"],
      },
      {
        term: "Exhibit",
        slug: "exhibit",
        definition:
          "A document, photo, object, or other item formally introduced as evidence in a case. Exhibits are usually labeled and numbered \u2014 for example, \u201cExhibit A\u201d \u2014 and are attached to filings or shown during testimony. Deposition exhibits are marked during questioning and can be used later at trial.",
      },
      {
        term: "Testimony",
        slug: "testimony",
        definition:
          "What a witness says under oath in court or in a deposition. Testimony becomes part of the official record and can be challenged through cross-examination.",
        relatedGuideIds: ["deposition-preparation"],
      },
      {
        term: "Cross-examination",
        slug: "cross-examination",
        definition:
          "Questioning of a witness by the opposing side after the first round of questioning ends. Its purpose is to test the accuracy and credibility of what the witness said.",
        relatedGuideIds: ["deposition-preparation"],
      },
      {
        term: "Burden of proof",
        slug: "burden-of-proof",
        definition:
          "The obligation to prove the facts of your case. In a civil case the plaintiff usually carries it; in a criminal case the prosecution must prove guilt beyond a reasonable doubt.",
        relatedGuideIds: ["fight-restraining-order"],
      },
      {
        term: "Preponderance of the evidence",
        slug: "preponderance-of-the-evidence",
        definition:
          "The standard of proof in most civil cases: the winning side must show its version of the facts is more likely true than not (more than 50%). It is a lower bar than \u201cbeyond a reasonable doubt\u201d.",
        relatedGuideIds: ["restraining-order-guide"],
      },
    ],
  },
  {
    title: "Claims & Money",
    terms: [
      {
        term: "Damages",
        slug: "damages",
        definition:
          "Money that a court orders one side to pay the other as compensation for a loss. Damages can cover medical bills, lost wages, property loss, and other harm caused by the other party. Compensatory damages repay actual losses; punitive damages additionally punish especially bad conduct.",
        relatedGuideIds: ["after-car-accident-guide"],
      },
      {
        term: "Punitive damages",
        slug: "punitive-damages",
        definition:
          "Money a court awards to punish a defendant for especially reckless or intentional misconduct and to discourage others from doing the same. Punitive damages are added on top of compensatory damages and are not available in every case.",
        relatedGuideIds: ["wrongful-death-claims"],
      },
      {
        term: "Negligence",
        slug: "negligence",
        definition:
          "Failure to use the level of care a reasonable person would, where that failure causes someone else's injury or loss. Negligence is the basis of many personal-injury and malpractice claims.",
        relatedGuideIds: ["medical-malpractice-guide"],
      },
      {
        term: "Liability",
        slug: "liability",
        definition:
          "Legal responsibility for harm or loss. A person or business found liable must typically pay damages or otherwise remedy the harm.",
      },
      {
        term: "Tort",
        slug: "tort",
        definition:
          "A civil wrong that harms someone, other than a broken contract. Examples include negligence, defamation, and trespass. Tort cases are typically about getting compensation for harm.",
        relatedGuideIds: ["defamation-libel-slander"],
      },
      {
        term: "Settlement",
        slug: "settlement",
        definition:
          "An agreement between the parties to end a dispute without a final court decision, usually involving a payment in exchange for dropping the case. Most civil cases settle before trial.",
        relatedGuideIds: ["what-happens-after-filing-lawsuit"],
      },
      {
        term: "Contingency fee",
        slug: "contingency-fee",
        definition:
          "A payment arrangement where a lawyer is paid a percentage of the money you recover, usually only if you win or settle. If you recover nothing, the lawyer typically receives no fee, though costs may still be owed.",
        relatedGuideIds: ["prepare-attorney-consultation"],
      },
    ],
  },
  {
    title: "Resolving a Case",
    terms: [
      {
        term: "Mediation",
        slug: "mediation",
        definition:
          "A voluntary process where a neutral third person (the mediator) helps the two sides negotiate their own settlement. The mediator does not decide the case \u2014 the parties decide, and a deal becomes binding when written and signed.",
        relatedGuideIds: ["divorce-process-overview"],
      },
      {
        term: "Arbitration",
        slug: "arbitration",
        definition:
          "A way to resolve a dispute outside court where a neutral person (the arbitrator) hears both sides and makes a decision. Many contracts include arbitration clauses that require disputes to go this route instead of court.",
        relatedGuideIds: ["how-to-read-contract"],
      },
      {
        term: "Small claims court",
        slug: "small-claims-court",
        definition:
          "A court that handles small-dollar disputes with simplified rules and low filing fees, designed for people without lawyers. The maximum amount you can sue for varies by state.",
        relatedGuideIds: ["small-claims-court-guide"],
      },
      {
        term: "Verdict",
        slug: "verdict",
        definition:
          "The jury's formal decision in a case \u2014 for example, finding a defendant liable or not liable. In a bench trial, the judge plays the jury's role and issues the decision.",
      },
      {
        term: "Judgment",
        slug: "judgment",
        definition:
          "The court's final decision in a case, stating who wins and what the losing side must do \u2014 often pay money. A judgment can be enforced through tools like wage garnishment or liens on property.",
      },
    ],
  },
];

/** Flat list of every term, in page order. */
export const GLOSSARY_TERMS: GlossaryTerm[] = GLOSSARY_GROUPS.flatMap((g) => g.terms);

export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.slug === slug);
}

export const GLOSSARY_URL = `${SITE_ORIGIN}/glossary`;

/**
 * Schema.org DefinedTermSet for the glossary page: one DefinedTerm per entry,
 * each with its plain-English definition and a canonical URL anchor. Every
 * field comes verbatim from GLOSSARY_TERMS — nothing invented for the schema.
 */
export function glossaryDefinedTermSetSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Legal Terms in Plain English",
    description:
      "Plain-English definitions of common legal terms for self-represented litigants, linked to Fair Fight's free legal-education guides.",
    url: GLOSSARY_URL,
    inLanguage: "en",
    hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.definition,
      url: `${GLOSSARY_URL}#${t.slug}`,
    })),
  };
}

/** JSON-LD script blocks for the /glossary <head>, matching the /learn pattern. */
export function glossaryStructuredDataScripts(): Array<{ type: string; children: string }> {
  return [
    {
      type: "application/ld+json",
      children: JSON.stringify(glossaryDefinedTermSetSchema()),
    },
  ];
}