import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/learn")({
  component: Learn,
  head: () => ({
    meta: [
      { title: "Free Legal Education Guides — Plain-English Law Explained | Fair Fight" },
      { name: "description", content: "Free plain-English legal guides on court procedures, motions, discovery, statutes of limitations, criminal law, family law, housing law, debt collection, and more. No paywall — legal education for everyone." },
    ],
  }),
});

interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  paragraphs: string[];
  takeaways: string[];
  relatedGuides: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Court Procedures": "bg-blue-100 text-blue-800",
  "Criminal Law": "bg-red-100 text-red-800",
  "Family Law": "bg-purple-100 text-purple-800",
  "Debt Collection": "bg-orange-100 text-orange-800",
  "Housing Law": "bg-green-100 text-green-800",
  "Constitutional Law": "bg-indigo-100 text-indigo-800",
  "Civil Rights": "bg-pink-100 text-pink-800",
  "Employment Law": "bg-yellow-100 text-yellow-800",
  "Legal Writing": "bg-teal-100 text-teal-800",
  "Evidence & Discovery": "bg-cyan-100 text-cyan-800",
  "Personal Injury": "bg-rose-100 text-rose-800",
  "Estate Planning": "bg-emerald-100 text-emerald-800",
  "Immigration Law": "bg-amber-100 text-amber-800",
  "Consumer Law": "bg-lime-100 text-lime-800",
};

const ARTICLES: Article[] = [
  {
    id: "how-to-file-a-motion",
    title: "How to File a Motion: A Step-by-Step Guide for Self-Represented Litigants",
    category: "Court Procedures",
    readTime: "12 min",
    paragraphs: [
      "Filing a motion is one of the most common actions in any court case. A motion is a formal request to the court asking a judge to make a ruling or take some action. Understanding how to properly draft, format, and file a motion is essential for anyone representing themselves in court.",
      "Every motion must include a caption identifying the court, parties, and case number; a title that tells the court what you're asking for; a statement of facts; a legal argument section citing relevant statutes and case law; and a proposed order for the judge to sign. The format requirements vary by jurisdiction but generally follow similar patterns.",
      "Before filing, check your local court rules for specific formatting requirements — things like font size (usually 12-point), margins (typically 1 inch), line spacing (often double-spaced), and page limits. Many courts also require a certificate of service proving you sent a copy to the other party.",
      "The legal argument section is where you explain why the law supports your request. This means citing statutes, court rules, and case law precedents. For example, if you're filing a motion to dismiss, you might cite Federal Rule of Civil Procedure 12(b)(6) and cases like Bell Atlantic Corp. v. Twombly, 550 U.S. 544 (2007), which established the 'plausibility' standard for complaints.",
      "After filing, the court will typically schedule a hearing date or issue a ruling based on the papers. Be prepared to argue your motion orally if a hearing is scheduled. Always keep copies of everything you file and note all deadlines on a calendar.",
    ],
    takeaways: [
      "A motion is a formal written request asking the court to take a specific action",
      "Every motion needs: caption, title, facts, legal argument, and proposed order",
      "Check local court rules for formatting requirements before filing",
      "Cite real statutes and case law in your legal argument section",
      "Always serve the other party and file a certificate of service",
    ],
    relatedGuides: ["how-to-write-a-legal-brief", "understanding-court-deadlines", "what-is-a-motion-to-dismiss"],
  },
  {
    id: "statute-of-limitations-guide",
    title: "Statute of Limitations by State: Complete 50-State Guide (2024)",
    category: "Court Procedures",
    readTime: "15 min",
    paragraphs: [
      "A statute of limitations is a law that sets the maximum time after an event within which legal proceedings may be initiated. If you miss the deadline, you permanently lose the right to sue — regardless of how strong your case is. This makes understanding the applicable statute of limitations one of the most critical aspects of any potential legal claim.",
      "Statutes of limitations vary significantly by state and by the type of legal claim. For example, personal injury claims range from 1 year (Kentucky, Louisiana, Tennessee) to 6 years (Maine, North Dakota). Breach of written contract claims range from 3 years in many states to up to 15 years in Ohio. The clock typically starts running from the date of injury or the date the injury was discovered.",
      "Some situations can 'toll' (pause) the statute of limitations. Common tolling events include: the defendant being a minor, the defendant leaving the state, the plaintiff being mentally incapacitated, or the defendant actively concealing the wrong. Courts apply tolling doctrines narrowly, so don't count on them without consulting an attorney.",
      "Federal claims have their own statutes of limitations. For example, employment discrimination claims under Title VII must be filed with the EEOC within 180 or 300 days (depending on the state). Civil rights claims under 42 U.S.C. § 1983 borrow the personal injury statute of limitations from the state where the claim arose.",
      "The discovery rule is an important exception: the clock doesn't start until the plaintiff knew or reasonably should have known about the injury. This is especially important in medical malpractice cases and fraud claims where the harm may not be immediately apparent. However, even with the discovery rule, most states impose an absolute statute of repose (e.g., 10 years) beyond which no claim can be brought.",
    ],
    takeaways: [
      "Missing a statute of limitations means permanently losing the right to sue",
      "Deadlines vary by state and claim type — personal injury: 1-6 years depending on state",
      "The clock usually starts at injury, but the discovery rule may delay it",
      "Tolling can pause the clock in limited circumstances (minority, incapacity, concealment)",
      "Federal claims have their own deadlines; check both state and federal law",
    ],
    relatedGuides: ["how-to-file-a-motion", "what-is-a-complaint", "understanding-court-deadlines"],
  },
  {
    id: "what-is-discovery",
    title: "What Is Discovery? Understanding the Discovery Process in Civil Litigation",
    category: "Evidence & Discovery",
    readTime: "14 min",
    paragraphs: [
      "Discovery is the pre-trial phase in a lawsuit where each party can obtain evidence from the opposing party through various legal tools. The purpose of discovery is to prevent 'trial by ambush' — ensuring both sides know what evidence exists before trial and encouraging settlement. Discovery is governed by the Federal Rules of Civil Procedure (Rules 26-37) and equivalent state rules.",
      "The main discovery tools are: interrogatories (written questions the other party must answer under oath), requests for production of documents (asking for emails, contracts, photos, etc.), requests for admissions (asking the other party to admit or deny specific facts), and depositions (in-person oral testimony under oath, recorded by a court reporter). Each tool serves a different strategic purpose.",
      "Discovery is broad. Under Rule 26(b)(1), parties may obtain discovery regarding any non-privileged matter that is relevant to any party's claim or defense and proportional to the needs of the case. This means you can discover information that isn't admissible at trial if it's reasonably calculated to lead to admissible evidence.",
      "There are important limits on discovery. Privileged communications (attorney-client, doctor-patient, spousal) are protected. Work product doctrine protects materials prepared in anticipation of litigation. Courts can also issue protective orders to prevent annoyance, embarrassment, or undue burden. If the other party refuses to respond, you can file a motion to compel.",
      "Discovery deadlines are strict. In federal court, the initial disclosure deadline is typically 14 days after the Rule 26(f) conference. Fact discovery might close 6-12 months after the initial scheduling conference. Missing discovery deadlines can result in sanctions, including having your evidence excluded at trial. Always calendar all discovery deadlines.",
    ],
    takeaways: [
      "Discovery prevents trial surprises by letting both sides see evidence before trial",
      "Key tools: interrogatories, document requests, admissions, and depositions",
      "Discovery scope is broad — relevant to claims/defenses, proportional to case needs",
      "Privileged communications and attorney work product are protected from discovery",
      "Missing discovery deadlines can lead to sanctions — track all dates carefully",
    ],
    relatedGuides: ["how-to-file-a-motion", "what-is-a-motion-to-compel", "evidence-management-for-pro-se"],
  },
  {
    id: "motion-to-dismiss-explained",
    title: "Motion to Dismiss: What It Is, When to File, and How to Respond",
    category: "Court Procedures",
    readTime: "11 min",
    paragraphs: [
      "A motion to dismiss is a request asking the court to throw out a case — or specific claims within it — usually before the defendant files an answer. Under Federal Rule of Civil Procedure 12(b), a party can move to dismiss for: lack of subject-matter jurisdiction, lack of personal jurisdiction, improper venue, insufficient process, insufficient service of process, failure to state a claim, and failure to join a necessary party.",
      'The most common ground is Rule 12(b)(6) — "failure to state a claim upon which relief can be granted." This means that even if everything the plaintiff says is true, the law doesn\'t provide a remedy. The Supreme Court established the modern pleading standard in Bell Atlantic Corp. v. Twombly, 550 U.S. 544 (2007), and Ashcroft v. Iqbal, 556 U.S. 662 (2009), requiring complaints to allege "enough facts to state a claim to relief that is plausible on its face."',
      "If you're the plaintiff facing a motion to dismiss, you have the right to file an opposition brief explaining why your complaint meets the legal standard. You can also amend your complaint once as a matter of course within 21 days after service of the motion to dismiss. If the court grants the motion with prejudice, the case is over. Without prejudice means you can fix the problems and refile.",
      "Timing matters: Rule 12(b) motions must be made before pleading if a responsive pleading is allowed. Most defenses must be raised in the first responsive filing or they're waived. A motion to dismiss also tolls the time to answer: if the motion is denied, the defendant typically has 14 days to file an answer.",
      "For self-represented litigants, responding to a motion to dismiss can be intimidating, but the key is addressing each ground the defendant raised. Don't just argue the facts — explain why your complaint meets the legal pleading standard. Cite cases that support your position. If needed, ask for leave to amend so you can fix any technical deficiencies.",
    ],
    takeaways: [
      "Rule 12(b) lists 7 grounds for dismissal — 12(b)(6) (failure to state a claim) is most common",
      "The Twombly/Iqbal standard requires 'plausible' factual allegations, not just legal conclusions",
      "Plaintiffs can amend once as a matter of course within 21 days of a motion to dismiss",
      "Dismissal with prejudice ends the case; without prejudice allows refiling",
      "Address each ground raised and explain why your complaint meets the legal standard",
    ],
    relatedGuides: ["how-to-file-a-motion", "what-is-a-complaint", "understanding-court-deadlines"],
  },
  {
    id: "what-is-a-complaint",
    title: "How to Draft a Complaint: The First Step in Filing a Civil Lawsuit",
    category: "Court Procedures",
    readTime: "13 min",
    paragraphs: [
      "A complaint is the document that starts a civil lawsuit. It tells the court what happened, why the defendant is legally responsible, and what relief you're seeking. Under Rule 8(a) of the Federal Rules of Civil Procedure, a complaint must contain: a short and plain statement of the grounds for jurisdiction, a short and plain statement of the claim showing entitlement to relief, and a demand for the relief sought.",
      "The Supreme Court's decisions in Twombly and Iqbal transformed pleading standards. Previously, a complaint only needed to provide 'fair notice' of the claim under Conley v. Gibson, 355 U.S. 41 (1957). Now, the complaint must contain sufficient factual matter to state a claim that is 'plausible on its face.' This means you can't just recite the legal elements — you need specific facts showing why you're entitled to relief.",
      "A well-drafted complaint typically includes: (1) a caption identifying the court, parties, and case number; (2) a jurisdictional statement explaining why this court has authority; (3) a statement of facts organized chronologically; (4) numbered counts or causes of action — each identifying a specific legal theory (e.g., 'Count I: Breach of Contract'); (5) a prayer for relief stating what you want (damages, injunction, etc.); and (6) a jury demand if you want a jury trial.",
      "Each count must identify the legal elements of the claim and specific facts supporting each element. For example, a breach of contract count needs facts showing: (1) a valid contract existed, (2) you performed your obligations, (3) the defendant breached, and (4) you suffered damages. Cite relevant case law where helpful, but the primary focus should be on factual allegations.",
      "Before filing, verify the statute of limitations hasn't expired, confirm the court has jurisdiction, and check if you need to demand a jury trial in the complaint (in federal court, you can demand a jury trial any time within 14 days after service of the last pleading). File the complaint with the court clerk, pay the filing fee (or request a fee waiver), and arrange for service of process on the defendant.",
    ],
    takeaways: [
      "A complaint must establish jurisdiction, state a claim, and demand relief (Rule 8(a))",
      "Include specific facts — not just legal conclusions — under the Twombly/Iqbal standard",
      "Organize by count; each count states a separate legal theory with supporting facts",
      "Verify statute of limitations and jurisdiction before filing",
      "Arrange proper service of process on the defendant after filing",
    ],
    relatedGuides: ["how-to-file-a-motion", "statute-of-limitations-guide", "motion-to-dismiss-explained"],
  },
  {
    id: "summary-judgment-explained",
    title: "Summary Judgment: How It Works and How to Oppose It",
    category: "Court Procedures",
    readTime: "10 min",
    paragraphs: [
      "Summary judgment is a procedural device that allows a court to decide a case — or specific issues — without a trial when there is no genuine dispute of material fact. Governed by Rule 56 of the Federal Rules of Civil Procedure, summary judgment is appropriate when 'the movant shows that there is no genuine dispute as to any material fact and the movant is entitled to judgment as a matter of law.'",
      "The landmark case of Celotex Corp. v. Catrett, 477 U.S. 317 (1986), established that the moving party doesn't need to produce evidence negating the opponent's claim — it can simply point out that the non-moving party lacks sufficient evidence. However, the Supreme Court clarified in Anderson v. Liberty Lobby, Inc., 477 U.S. 242 (1986), that courts must view all evidence in the light most favorable to the non-moving party.",
      "To oppose summary judgment, the non-moving party must go beyond the pleadings and present specific facts — through affidavits, deposition transcripts, documents, or other evidence — showing a genuine dispute for trial. Unsupported allegations or denials are insufficient. This is the time to put your evidence into the record. If you fail to properly oppose summary judgment, the court may grant it and end your case without trial.",
      "The 'materiality' standard means the disputed fact must affect the outcome of the case. A 'genuine' dispute means a reasonable jury could return a verdict for the non-moving party based on that evidence. The Supreme Court emphasized in Scott v. Harris, 550 U.S. 372 (2007), that when video evidence clearly contradicts a party's version of events, courts should view the facts in the light depicted by the video.",
      "Timing: under Rule 56(b), a party may file a motion for summary judgment at any time until 30 days after the close of discovery, unless a different time is set by local rule or court order. The non-moving party typically has 21 days to respond. Many cases are resolved at the summary judgment stage, making it one of the most critical junctures in civil litigation.",
    ],
    takeaways: [
      "Summary judgment ends a case without trial when no material facts are disputed",
      "The moving party can point to a lack of evidence (Celotex standard)",
      "To oppose: present specific evidence — not just denials — showing a genuine dispute",
      "Courts view evidence in the light most favorable to the non-moving party",
      "Most civil cases are resolved at or before summary judgment — prepare thoroughly",
    ],
    relatedGuides: ["what-is-discovery", "how-to-write-a-legal-brief", "motion-to-dismiss-explained"],
  },
  {
    id: "understanding-miranda-rights",
    title: "Miranda Rights: What They Are, When They Apply, and What Happens If Police Don't Read Them",
    category: "Criminal Law",
    readTime: "9 min",
    paragraphs: [
      "Miranda rights are the warnings that police must give to suspects before custodial interrogation. Established by Miranda v. Arizona, 384 U.S. 436 (1966), these rights include: the right to remain silent, the warning that anything you say can be used against you, the right to an attorney, and the right to have an attorney appointed if you cannot afford one. The purpose is to protect Fifth Amendment rights against self-incrimination.",
      "Miranda only applies when two conditions are met: (1) the suspect is in custody — meaning a reasonable person would not feel free to leave, and (2) the suspect is being interrogated — meaning police are asking questions or engaging in conduct likely to elicit an incriminating response. If either condition is missing, Miranda warnings are not required. Voluntary statements made without questioning are generally admissible.",
      "The Supreme Court has defined 'custody' through cases like Berkemer v. McCarty, 468 U.S. 420 (1984), which held that routine traffic stops are not custody for Miranda purposes. In J.D.B. v. North Carolina, 564 U.S. 261 (2011), the Court held that a child's age is relevant to the custody analysis. In Howes v. Fields, 565 U.S. 499 (2012), the Court ruled that prison inmates questioned about matters separate from their incarceration are not necessarily in custody.",
      "If police fail to give Miranda warnings when required, any statements obtained are generally inadmissible in the prosecution's case-in-chief. However, physical evidence discovered as a result of an unwarned statement may still be admissible under United States v. Patane, 542 U.S. 630 (2004), which held that the exclusionary rule does not apply to physical fruits of unwarned statements. Statements can also be used for impeachment if the defendant testifies inconsistently.",
      "You can waive Miranda rights, but the waiver must be knowing, intelligent, and voluntary. Invoking your rights must be clear and unambiguous. Under Berghuis v. Thompkins, 560 U.S. 370 (2010), remaining silent is not enough to invoke the right to remain silent — you must affirmatively state that you are invoking your right. Simply saying 'I want a lawyer' or 'I'm invoking my right to remain silent' is the clearest approach.",
    ],
    takeaways: [
      "Miranda requires warnings before custodial interrogation (both custody AND questioning)",
      "Rights: remain silent, statements can be used against you, right to attorney, appointed counsel",
      "Without warnings, statements are inadmissible in prosecution's case (but physical evidence may be OK)",
      "To invoke rights, be clear and unambiguous — silence alone is not enough (Berghuis)",
      "A child's age is relevant to whether they're 'in custody' for Miranda purposes",
    ],
    relatedGuides: ["fourth-amendment-search-seizure", "what-to-do-if-arrested", "understanding-plea-bargains"],
  },
  {
    id: "fourth-amendment-search-seizure",
    title: "Fourth Amendment: Search and Seizure — What Police Can and Cannot Do",
    category: "Criminal Law",
    readTime: "12 min",
    paragraphs: [
      "The Fourth Amendment protects against unreasonable searches and seizures and requires warrants to be supported by probable cause. As interpreted by the Supreme Court, the Amendment establishes that warrantless searches are presumptively unreasonable — but there are many important exceptions that police rely on daily.",
      "The key case for understanding when a 'search' occurs is Katz v. United States, 389 U.S. 347 (1967), which established the 'reasonable expectation of privacy' test. Under Katz, a search occurs when government conduct violates a person's actual (subjective) expectation of privacy that society recognizes as reasonable. This test replaced the earlier physical trespass approach from Olmstead v. United States, 277 U.S. 438 (1928).",
      "Major exceptions to the warrant requirement include: consent searches (Schneckloth v. Bustamonte, 412 U.S. 218 (1973)), searches incident to arrest (Chimel v. California, 395 U.S. 752 (1969)), the automobile exception (Carroll v. United States, 267 U.S. 132 (1925)), exigent circumstances, plain view, stop-and-frisk (Terry v. Ohio, 392 U.S. 1 (1968)), and border searches.",
      "The exclusionary rule — established in Weeks v. United States, 232 U.S. 383 (1914), and applied to states in Mapp v. Ohio, 367 U.S. 643 (1961) — generally prohibits the use of evidence obtained through Fourth Amendment violations. However, the good faith exception from United States v. Leon, 468 U.S. 897 (1984), allows evidence obtained through a defective warrant if officers reasonably relied on the warrant.",
      "For self-represented defendants, challenging a search requires filing a motion to suppress under Rule 41. You must have 'standing' — meaning your own Fourth Amendment rights were violated. You can't challenge a search of someone else's property. The burden is initially on the defendant to show a warrantless search occurred; the prosecution must then prove an exception applies.",
    ],
    takeaways: [
      "Fourth Amendment requires warrants based on probable cause, with many exceptions",
      "Katz: 'reasonable expectation of privacy' test determines if a search occurred",
      "Key exceptions: consent, search incident to arrest, automobile, exigent circumstances, Terry stop",
      "Exclusionary rule suppresses illegally obtained evidence, but good faith exception applies",
      "Challenge illegal searches by filing a motion to suppress — you must have standing",
    ],
    relatedGuides: ["understanding-miranda-rights", "what-to-do-if-arrested", "how-to-file-a-motion"],
  },
  {
    id: "child-custody-guide",
    title: "Child Custody: Understanding Legal vs. Physical Custody and Best Interests Standard",
    category: "Family Law",
    readTime: "11 min",
    paragraphs: [
      "Child custody involves two distinct concepts: legal custody (the right to make major decisions about a child's education, healthcare, and religious upbringing) and physical custody (where the child lives). Courts can award sole or joint custody on either dimension, creating various combinations. The overarching standard in all 50 states is the 'best interests of the child.'",
      "The best interests standard considers factors including: the child's age and health, the parents' physical and mental health, each parent's ability to provide a stable environment, the child's relationship with each parent, each parent's willingness to support the child's relationship with the other parent, any history of domestic violence or substance abuse, and (depending on the child's age and maturity) the child's own preference.",
      "Joint custody — especially joint legal custody — is increasingly favored by courts. Most states have statutory presumptions favoring joint custody or at least frequent and continuing contact with both parents. However, this trend is not absolute: courts will limit or deny custody to a parent if there's evidence of abuse, neglect, abandonment, or serious substance abuse problems.",
      "Child custody orders are always modifiable based on a 'substantial change in circumstances.' For interstate custody disputes, the Uniform Child Custody Jurisdiction and Enforcement Act (UCCJEA) determines which state has jurisdiction. Generally, the child's 'home state' (where the child has lived for the past 6 months) has jurisdiction.",
      "For self-represented parents, the most important things to do are: document everything (keep a journal of parenting time, communications, incidents), focus on the child's needs rather than grievances with the other parent, comply with all court orders, and present evidence of your involvement in the child's life. Courts value parents who support the child's relationship with the other parent.",
    ],
    takeaways: [
      "Two types of custody: legal (decisions) and physical (residence) — can be sole or joint",
      "Best interests standard: child's health, stability, relationships, and safety are key factors",
      "Most states favor joint custody and frequent contact with both parents",
      "Orders are modifiable when there's a substantial change in circumstances",
      "Document everything, focus on the child, and support co-parent relationships",
    ],
    relatedGuides: ["divorce-process-overview", "how-to-write-a-parenting-plan", "understanding-child-support"],
  },
  {
    id: "divorce-process-overview",
    title: "The Divorce Process: A Comprehensive Step-by-Step Guide",
    category: "Family Law",
    readTime: "14 min",
    paragraphs: [
      "Divorce (legally called 'dissolution of marriage') is the legal process of ending a marriage. Every state has its own divorce laws, but most follow either a 'fault' or 'no-fault' model — or a combination. No-fault divorce, now available in all 50 states, allows a divorce based on 'irreconcilable differences' or 'irretrievable breakdown' without proving wrongdoing.",
      "The divorce process begins when one spouse files a Petition for Dissolution of Marriage with the court. The petition identifies the parties, states the grounds for divorce, and outlines what relief is requested (property division, custody, support, etc.). The filing spouse must serve the petition on the other spouse, who then has a limited time (usually 20-30 days) to file a response. If no response is filed, the petitioner may seek a default judgment.",
      "After the response, parties typically engage in discovery — exchanging financial information, property valuations, income documentation, and other relevant evidence. Many states require mandatory financial disclosures using standardized forms. Temporary orders may be needed for immediate issues: temporary custody, child support, spousal support, who stays in the house, and who pays which bills during the divorce.",
      "The major issues to resolve are: property division (community property states like California divide marital property 50/50; equitable distribution states divide 'fairly' but not necessarily equally), spousal support/alimony, child custody and parenting time, and child support (usually calculated using state guidelines based on both parents' incomes and parenting time percentage).",
      "Most divorces settle before trial through negotiation, mediation, or collaborative law. If settlement isn't possible, the case goes to trial where a judge decides all disputed issues. Trials can take 1-5 days or more depending on complexity. After the judge issues a final decree (Judgment of Dissolution), either party may appeal within a limited time (typically 30 days).",
    ],
    takeaways: [
      "No-fault divorce (irreconcilable differences) is available in all 50 states",
      "Process: file petition → serve spouse → response → discovery → temporary orders → settlement/trial",
      "Key issues: property division, spousal support, child custody, child support",
      "Most cases settle via negotiation or mediation — trial is the last resort",
      "Appeal deadline is typically 30 days after final judgment",
    ],
    relatedGuides: ["child-custody-guide", "understanding-child-support", "how-to-file-a-motion"],
  },
  {
    id: "debt-collection-defense",
    title: "How to Defend Against a Debt Collection Lawsuit: 10 Essential Steps",
    category: "Debt Collection",
    readTime: "13 min",
    paragraphs: [
      "Being sued by a debt collector is intimidating, but you have rights under federal and state law. The Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692, prohibits debt collectors from using abusive, deceptive, or unfair practices. You also have procedural rights in court that can be used to defend against weak or improper claims.",
      "The most important step when sued is to file a written answer with the court within the deadline (usually 20-30 days). If you don't answer, the debt collector can get a default judgment and potentially garnish your wages or levy your bank account. Your answer should respond to each numbered paragraph in the complaint — admit, deny, or state that you lack sufficient information. Also raise affirmative defenses like statute of limitations, lack of standing, or failure to state a claim.",
      "Debt buyers (companies that purchase charged-off debts for pennies on the dollar) are the most common plaintiffs in debt collection lawsuits. Under cases like Midland Funding, LLC v. Johnson, 137 S. Ct. 1407 (2017), filing a time-barred proof of claim in bankruptcy does not violate the FDCPA. However, debt buyers must still prove they own the debt, the amount is correct, and they have standing to sue.",
      "Key defenses include: the statute of limitations has expired (typically 3-6 years depending on state and debt type), the plaintiff lacks standing (can't prove they own the debt), the amount is incorrect, identity theft/fraud, the debt was already paid or discharged in bankruptcy, or the debt collector violated the FDCPA. Always demand strict proof of the debt — account statements, chain of assignment, and the original contract.",
      "If you have valid defenses, consider filing a motion to dismiss. If the debt collector violated the FDCPA, you may have counterclaims for statutory damages up to $1,000 plus attorney fees. Many debt collection cases settle for less than the full amount. Never ignore a lawsuit — the worst outcome is a default judgment that can haunt you for years.",
    ],
    takeaways: [
      "Always file a written answer within the deadline — default judgments can lead to wage garnishment",
      "Common defenses: expired statute of limitations, lack of standing, wrong amount, identity theft",
      "Debt buyers must prove they own the debt — demand strict proof (chain of assignment)",
      "FDCPA violations can give you counterclaims for up to $1,000 in statutory damages",
      "Never ignore a lawsuit — even a partial settlement is better than a default judgment",
    ],
    relatedGuides: ["statute-of-limitations-guide", "how-to-file-a-motion", "what-is-a-complaint"],
  },
  {
    id: "eviction-process-guide",
    title: "The Eviction Process: A Tenant's Rights Guide for All 50 States",
    category: "Housing Law",
    readTime: "14 min",
    paragraphs: [
      "Eviction (legally called 'unlawful detainer' or 'forcible entry and detainer') is the legal process by which a landlord removes a tenant from rental property. Every state has specific procedures that landlords must follow — self-help evictions (changing locks, shutting off utilities, removing belongings) are illegal in all 50 states.",
      "The eviction process typically begins with a notice to the tenant: a pay-or-quit notice for non-payment of rent (usually 3-14 days depending on state), a cure-or-quit notice for lease violations, or an unconditional quit notice for serious violations. If the tenant doesn't comply within the notice period, the landlord can file an eviction lawsuit (summons and complaint) in court.",
      "Tenants have the right to receive proper service of the eviction lawsuit, file an answer raising defenses, and participate in a hearing. Common defenses include: the landlord didn't follow proper procedures, the eviction is retaliatory (in response to the tenant complaining about habitability issues), the eviction is discriminatory (violating the Fair Housing Act), the landlord failed to maintain habitable conditions, or the tenant has already paid or offered to pay the rent.",
      "Under the implied warranty of habitability — recognized in most states following Javins v. First National Realty Corp., 428 F.2d 1071 (D.C. Cir. 1970) — landlords must maintain rental properties in safe, livable condition. If the landlord fails to make essential repairs, tenants may have the right to withhold rent, repair and deduct, or break the lease without penalty. However, the procedures for exercising these rights vary significantly by state.",
      "The CARES Act of 2020 provided temporary eviction protections for tenants in federally backed housing, but most protections have expired. Check your state and local laws — some jurisdictions have permanent tenant protections including right to counsel in eviction cases, mandatory mediation programs, and source-of-income discrimination bans. If you receive an eviction notice, act immediately: contact legal aid, respond to the court, and document everything.",
    ],
    takeaways: [
      "Self-help evictions (lockouts, utility shutoffs) are illegal — landlords must go through court",
      "Process: notice → eviction lawsuit → answer/defenses → hearing → judgment → writ of possession",
      "Common defenses: procedural errors, retaliation, discrimination, breach of warranty of habitability",
      "The implied warranty of habitability requires landlords to maintain livable conditions (Javins)",
      "Act immediately when you receive an eviction notice — deadlines are short",
    ],
    relatedGuides: ["how-to-file-a-motion", "security-deposit-guide", "small-claims-court-guide"],
  },
  {
    id: "security-deposit-guide",
    title: "Security Deposits: Your Rights and How to Get Your Deposit Back",
    category: "Housing Law",
    readTime: "9 min",
    paragraphs: [
      "Security deposits are payments tenants make to landlords at the start of a tenancy to cover potential damages beyond normal wear and tear or unpaid rent. Every state regulates security deposits — maximum amounts (typically 1-2 months' rent), how they must be held, whether interest must be paid, and strict deadlines for returning deposits after move-out (usually 14-45 days).",
      "Landlords can only deduct from security deposits for specific reasons: unpaid rent, damage beyond normal wear and tear, cleaning costs if the unit is left unusually dirty, and (in some states) unpaid utility bills. Normal wear and tear — like minor scuffs on walls, worn carpet from regular use, or faded paint — cannot be deducted. The distinction between damage (tenant-caused) and wear and tear (ordinary use) is the most common dispute.",
      "Landlords must provide an itemized statement of deductions along with any remaining deposit within the state-mandated deadline. If they fail to do so, tenants may be entitled to the full deposit regardless of any damages, plus statutory penalties (often 2-3 times the deposit amount) in many states. Some states require landlords to provide receipts for any deductions over a certain amount.",
      "To protect yourself: take dated photos and video when you move in and move out, complete a move-in inspection checklist and keep a copy, report all needed repairs in writing, clean thoroughly before moving out, and provide a forwarding address in writing. Send everything by certified mail with return receipt so you have proof of delivery.",
      "If the landlord wrongfully withholds your deposit, you can sue in small claims court. Small claims court is designed for self-representation — the filing fees are low ($15-75), the process is simpler, and the monetary limit (typically $3,000-$10,000) covers most deposit disputes. Bring your evidence: photos, inspection reports, correspondence, and a copy of the lease.",
    ],
    takeaways: [
      "Every state regulates security deposits — know your state's deadline for returns",
      "Landlords can deduct for damages beyond normal wear and tear, not ordinary deterioration",
      "Landlords must provide an itemized statement — failure may lead to penalties (2-3x deposit)",
      "Document everything: move-in/move-out photos, inspection checklists, written correspondence",
      "Sue in small claims court if the landlord wrongfully withholds — bring all evidence",
    ],
    relatedGuides: ["eviction-process-guide", "small-claims-court-guide", "how-to-write-demand-letter"],
  },
  {
    id: "first-amendment-speech",
    title: "First Amendment: Freedom of Speech — What's Protected and What's Not",
    category: "Constitutional Law",
    readTime: "11 min",
    paragraphs: [
      "The First Amendment prohibits Congress (and through the Fourteenth Amendment, state and local governments) from 'abridging the freedom of speech.' But this protection is not absolute. The Supreme Court has recognized several categories of speech that receive less — or no — First Amendment protection, while strongly protecting political and ideological speech.",
      "The highest level of protection applies to political speech and speech on matters of public concern — the core of what the First Amendment was designed to protect. Under Brandenburg v. Ohio, 395 U.S. 444 (1969), even advocacy of illegal conduct is protected unless it is 'directed to inciting or producing imminent lawless action and is likely to incite or produce such action.' This is a very high bar.",
      "Unprotected or less-protected categories include: obscenity (Miller v. California, 413 U.S. 15 (1973), establishing the three-part Miller test), defamation (New York Times Co. v. Sullivan, 376 U.S. 254 (1964), requiring 'actual malice' for public figures), true threats, fighting words, child pornography, and fraud. Commercial speech receives intermediate protection under Central Hudson Gas & Electric Corp. v. Public Service Commission, 447 U.S. 557 (1980).",
      "Government can regulate the time, place, and manner of speech, but content-based restrictions face strict scrutiny and are presumptively unconstitutional. Content-neutral restrictions must be narrowly tailored to serve a significant government interest and leave open ample alternative channels for communication. The government generally cannot engage in viewpoint discrimination — favoring one perspective over another.",
      "The First Amendment also protects expressive conduct (symbolic speech) if the speaker intends to convey a particularized message and the message is likely to be understood by observers. In Texas v. Johnson, 491 U.S. 397 (1989), the Court held that flag burning is protected expressive conduct. However, the government can regulate the non-expressive elements of conduct — you can't burn a flag in violation of fire codes.",
    ],
    takeaways: [
      "Political speech receives the highest protection — even advocating illegal conduct is protected (Brandenburg)",
      "Unprotected categories: obscenity, defamation, true threats, fighting words, child pornography, fraud",
      "Content-based restrictions face strict scrutiny; content-neutral time/place/manner rules are easier to justify",
      "Symbolic speech (flag burning, armbands) is protected if it conveys a particularized message",
      "The government cannot engage in viewpoint discrimination in regulating speech",
    ],
    relatedGuides: ["fourth-amendment-search-seizure", "civil-rights-section-1983", "how-to-write-legal-brief"],
  },
  {
    id: "civil-rights-section-1983",
    title: "Civil Rights Lawsuits Under 42 U.S.C. § 1983: Suing Government Officials",
    category: "Civil Rights",
    readTime: "12 min",
    paragraphs: [
      "42 U.S.C. § 1983 — originally enacted as part of the Civil Rights Act of 1871 — allows individuals to sue state and local government officials for violations of constitutional rights. Under § 1983, a plaintiff must prove that: (1) the defendant acted under color of state law, and (2) the defendant's conduct deprived the plaintiff of rights secured by the Constitution or federal law.",
      "The 'under color of state law' requirement means the defendant must have been exercising power possessed by virtue of state law. This includes police officers, prison guards, public school officials, and municipal employees acting in their official capacity. Private actors can be sued if they conspire with state actors or perform traditionally exclusive public functions.",
      "Qualified immunity is a major barrier in § 1983 cases. Under this doctrine (established in Harlow v. Fitzgerald, 457 U.S. 800 (1982)), government officials are immune from damages unless they violated 'clearly established statutory or constitutional rights of which a reasonable person would have known.' This means plaintiffs must identify existing precedent with sufficiently similar facts placing the constitutional question beyond debate.",
      "Municipalities (cities, counties) can be sued under § 1983, but only for unconstitutional policies, practices, or customs — not on a respondeat superior (vicarious liability) theory. Under Monell v. Department of Social Services, 436 U.S. 658 (1978), a municipality is liable when the unconstitutional action implements an official policy or is part of a persistent, widespread custom. Isolated acts by individual employees are generally insufficient.",
      "Remedies under § 1983 include compensatory damages, nominal damages, and in some cases punitive damages. Injunctive relief (orders to stop unconstitutional practices) is also available. Attorney fees are available to prevailing plaintiffs under 42 U.S.C. § 1988, which makes these cases financially viable. The statute of limitations for § 1983 claims is the state's personal injury statute, typically 2-3 years.",
    ],
    takeaways: [
      "§ 1983 requires: action under color of state law + deprivation of constitutional/federal rights",
      "Qualified immunity protects officials unless they violate 'clearly established' rights",
      "Municipalities are liable for policies/customs, not for individual employee misconduct (Monell)",
      "Remedies: compensatory, nominal, and punitive damages; injunctive relief; attorney fees",
      "Statute of limitations: the state's personal injury statute, typically 2-3 years",
    ],
    relatedGuides: ["first-amendment-speech", "fourth-amendment-search-seizure", "statute-of-limitations-guide"],
  },
  {
    id: "wrongful-termination",
    title: "Wrongful Termination: Understanding At-Will Employment and Its Exceptions",
    category: "Employment Law",
    readTime: "10 min",
    paragraphs: [
      "Most U.S. employment is 'at-will,' meaning either the employer or employee can end the relationship at any time for any reason — or no reason at all — as long as the reason isn't illegal. The at-will doctrine means most terminations are legal, but there are important exceptions that create wrongful termination claims.",
      "The three main exceptions to at-will employment are: (1) statutory exceptions — federal and state laws prohibiting termination based on race, color, religion, sex, national origin (Title VII), age (ADEA), disability (ADA), pregnancy, military status, and other protected characteristics; (2) public policy exceptions — you can't be fired for refusing to commit an illegal act, reporting illegal conduct (whistleblowing), or exercising a legal right (like filing a workers' comp claim); (3) implied contract exceptions — when employee handbooks, offer letters, or oral promises create an expectation of continued employment.",
      "To prove wrongful termination under anti-discrimination laws, you typically need to show: (1) you're a member of a protected class, (2) you were qualified for the position, (3) you suffered an adverse employment action, and (4) the circumstances give rise to an inference of discrimination (like being replaced by someone outside your protected class). This is the McDonnell Douglas Corp. v. Green, 411 U.S. 792 (1973), burden-shifting framework.",
      "Before filing a lawsuit, most federal discrimination claims require exhausting administrative remedies: filing a charge with the EEOC (or equivalent state agency) within 180-300 days of the discriminatory act. The EEOC investigates and may issue a 'right to sue' letter. Only after receiving this letter can you file a lawsuit in federal court.",
      "Whistleblower protections come from multiple statutes: the Whistleblower Protection Act for federal employees, Sarbanes-Oxley for corporate fraud reporting, and various state laws. Retaliation claims — being fired for complaining about discrimination or participating in an investigation — are actually the most common type of EEOC charge, surpassing even discrimination claims in recent years.",
    ],
    takeaways: [
      "At-will employment means termination is legal unless it violates a specific law or contract",
      "Three exception categories: statutory (discrimination laws), public policy, and implied contract",
      "Discrimination claims follow the McDonnell Douglas burden-shifting framework",
      "Most federal discrimination claims require filing with the EEOC first (180-300 day deadline)",
      "Retaliation claims (fired for complaining) are now the most common EEOC charges",
    ],
    relatedGuides: ["statute-of-limitations-guide", "how-to-file-a-motion", "civil-rights-section-1983"],
  },
  {
    id: "how-to-write-legal-brief",
    title: "How to Write a Legal Brief: Structure, Format, and Best Practices",
    category: "Legal Writing",
    readTime: "15 min",
    paragraphs: [
      "A legal brief is a written document that presents legal arguments to a court. It is the primary tool for persuading a judge to rule in your favor. While specific formatting varies by court, effective briefs share a common structure: introduction, statement of facts, legal standard, argument, and conclusion. Good legal writing is clear, concise, well-organized, and supported by authority.",
      'The Introduction (or Preliminary Statement) should be 1-3 paragraphs that tell the court: what the case is about, what you\'re asking for, and why you should win. Think of it as your "elevator pitch." A strong introduction frames the case in your favor from the very first sentence. Avoid legal jargon here — make it accessible.',
      "The Statement of Facts should tell a compelling story while remaining rigorously accurate. Present facts in chronological order, cite to the record (affidavit paragraph numbers, deposition page numbers, etc.), and include only facts relevant to the issues before the court. Every fact should support your legal argument. Never misrepresent facts — your credibility with the court is everything.",
      "The Argument section is the heart of the brief. Organize by point headings (e.g., 'I. THE PLAINTIFF'S CLAIM IS BARRED BY THE STATUTE OF LIMITATIONS'). Under each heading: state the governing legal standard, cite controlling authority (statutes, rules, and case law), apply the law to your facts, and address counterarguments. The IRAC structure (Issue, Rule, Application, Conclusion) is the standard approach.",
      "Use case law strategically: cite binding precedent from your jurisdiction first, then persuasive authority from other jurisdictions. Parenthetical explanations after case citations help the court understand why a case matters. For example: 'See Smith v. Jones, 123 F.3d 456 (9th Cir. 2020) (holding that similar conduct constituted a breach of fiduciary duty where the defendant concealed material information).' Never cite a case you haven't read — opposing counsel and the court will check.",
    ],
    takeaways: [
      "Structure: Introduction → Statement of Facts → Legal Standard → Argument → Conclusion",
      "Introduction is your elevator pitch — frame the case in your favor in 1-3 paragraphs",
      "Statement of Facts: chronological, record-cited, and every fact supports your argument",
      "Argument: use IRAC (Issue, Rule, Application, Conclusion) and clear point headings",
      "Cite binding precedent first, use parenthetical explanations, and never cite unread cases",
    ],
    relatedGuides: ["how-to-file-a-motion", "what-is-discovery", "legal-research-fundamentals"],
  },
  {
    id: "small-claims-court-guide",
    title: "Small Claims Court: A Complete Guide to Suing Without a Lawyer",
    category: "Court Procedures",
    readTime: "11 min",
    paragraphs: [
      "Small claims court is designed for people to resolve disputes involving relatively small amounts of money without needing a lawyer. Each state sets its own monetary limit — typically $3,000 to $10,000, though some states go up to $25,000. Small claims court has simplified procedures: no formal discovery, relaxed evidence rules, and no juries (a judge decides everything).",
      "To file a small claims case, go to the courthouse in the county where the defendant lives or does business (or where the dispute occurred). Fill out a simple complaint form describing what happened, how much you're owed, and why. Pay the filing fee ($15-75, often recoverable if you win). The court clerk schedules a hearing date and issues a summons for the defendant.",
      "Before the hearing, consider sending a formal demand letter — it shows the court you tried to resolve the dispute. Prepare your evidence: contracts, receipts, photos, emails/texts, invoices, estimates, and witness statements. Organize everything chronologically. Practice explaining your case in 3-5 minutes — small claims hearings are short.",
      "At the hearing, arrive early, dress professionally, and bring all your evidence and copies for the judge and other party. When it's your turn, tell your story clearly and concisely. Stick to the facts. Show the judge your evidence. Answer questions directly. Be respectful — even if you're frustrated. The judge will either rule from the bench or mail a decision later.",
      "If you win, you get a judgment — but collecting can be the hardest part. You may need to garnish wages, levy bank accounts, or place liens on property. If you lose, appeal deadlines are short (typically 10-30 days) and appeals are usually limited to errors of law, not disagreements with the judge's factual findings.",
    ],
    takeaways: [
      "Small claims has simplified procedures with monetary limits of $3,000-$10,000 (varies by state)",
      "File where the defendant lives or does business; pay a small filing fee",
      "Send a demand letter first; organize evidence chronologically; practice your 3-5 minute summary",
      "Dress professionally, be respectful, bring copies of all evidence, stick to facts",
      "Winning is half the battle — collecting a judgment may require garnishment or liens",
    ],
    relatedGuides: ["how-to-write-demand-letter", "security-deposit-guide", "debt-collection-defense"],
  },
  {
    id: "what-is-summary-judgment",
    title: "What Happens After You File a Complaint: A Timeline of Civil Litigation",
    category: "Court Procedures",
    readTime: "13 min",
    paragraphs: [
      "Civil litigation follows a predictable timeline from complaint to resolution. Understanding each phase helps self-represented litigants prepare and avoid missing critical deadlines. The typical phases are: pleadings, discovery, dispositive motions, pretrial, trial, and post-trial. Most cases settle before trial — more than 95% of civil cases never reach a jury verdict.",
      "The pleadings phase: plaintiff files complaint → defendant served → defendant answers or moves to dismiss (typically 21 days) → plaintiff may amend complaint → case management conference where the judge sets a scheduling order with all key deadlines. The scheduling order is your roadmap for the entire case — put every deadline on a calendar immediately.",
      "Discovery phase (6-12 months typically): parties exchange information through interrogatories, document requests, requests for admissions, and depositions. Expert witness disclosures and reports follow (Rule 26(a)(2)). This is the most active phase of litigation and the most expensive. Compliance is mandatory — failure to respond can lead to sanctions or having facts deemed admitted.",
      "Dispositive motions phase: after discovery closes, parties may file motions for summary judgment arguing that no trial is needed because there are no genuine disputes of material fact. If summary judgment is denied (or not filed), the case proceeds to pretrial. The final pretrial conference addresses: witness lists, exhibit lists, jury instructions, motions in limine (excluding evidence), and settlement possibilities.",
      "Trial and post-trial: trial typically lasts 1-10 days depending on complexity. After judgment, the losing party may file post-trial motions (motion for new trial, motion for judgment as a matter of law) and/or appeal. Appeals take 12-24 months. If no appeal, the judgment becomes final and the winning party can begin collection efforts.",
    ],
    takeaways: [
      "Phases: pleadings → discovery → dispositive motions → pretrial → trial → post-trial/appeal",
      "The scheduling order sets all deadlines — calendar every date immediately",
      "Discovery (6-12 months) is the most active phase; non-compliance has consequences",
      "More than 95% of civil cases settle before trial",
      "Appeals take 12-24 months and focus on legal errors, not factual disagreements",
    ],
    relatedGuides: ["what-is-discovery", "summary-judgment-explained", "how-to-file-a-motion"],
    },
    {
    id: "restraining-order-guide",
    title: "How to Get a Restraining Order: Step-by-Step Guide",
    category: "Family Law",
    readTime: "8 min",
    paragraphs: [
    "A restraining order (also called a protective order or order of protection) is a court order that prohibits one person from contacting, harassing, or coming near another person. Restraining orders are most commonly sought in situations involving domestic violence, stalking, harassment, or threats. Every state has its own procedures, but the general process is similar across jurisdictions.",
    "The process starts by filing a petition at your local courthouse — usually in the civil or family court division. You'll need to describe in detail the incidents that led you to seek protection: dates, times, what happened, whether weapons were involved, and any injuries. Many courts have self-help centers or domestic violence advocates who can assist with the paperwork at no cost. You don't need a police report to file, though having one helps.",
    "After filing, a judge reviews your petition the same day in most cases. If the judge finds reasonable proof of a threat, they issue a temporary restraining order (TRO) that takes effect immediately — usually lasting 14-21 days until a full hearing can be held. The TRO can order the respondent to move out of a shared residence, stay away from your home/work/school, and have no contact with you. Police will serve the order on the respondent.",
    "The full hearing is your opportunity to present evidence and testimony before a judge. Both sides can appear and present their case. Bring all evidence: photos of injuries or damage, threatening messages (texts, emails, voicemails), police reports, medical records, and witnesses. The standard of proof is 'preponderance of the evidence' — meaning it's more likely than not that harassment or abuse occurred. If granted, a final restraining order typically lasts 1-5 years and can be renewed.",
    "If the respondent violates the restraining order, call police immediately. Violation is a criminal offense in all 50 states and can result in arrest, fines, and jail time. Keep a copy of the order with you at all times and provide copies to your employer, your children's school, and anyone else who needs to know. Register the order in any state you travel to if you'll be there for an extended period. Your safety is the priority — have a safety plan in place.",
    ],
    takeaways: [
    "File a petition at your local courthouse describing specific incidents with dates and details",
    "A temporary restraining order (TRO) takes effect same-day and lasts until the full hearing",
    "At the hearing, bring all evidence: messages, photos, police reports, medical records, witnesses",
    "Final orders typically last 1-5 years and can be renewed before expiration",
    "Violation is a criminal offense — call police immediately and keep a copy of the order with you",
    ],
    relatedGuides: ["child-custody-guide", "divorce-process-overview", "how-to-file-police-report"],
    },
    {
    id: "after-car-accident-guide",
    title: "What to Do After a Car Accident: Legal Steps to Protect Your Rights",
    category: "Personal Injury",
    readTime: "9 min",
    paragraphs: [
    "The moments after a car accident are chaotic, but the actions you take can significantly impact your legal rights and any future claim. Your first priority is safety: check for injuries, call 911, and move to a safe area if possible. Even if the accident seems minor, calling the police creates an official record that is invaluable if disputes arise later about fault or damages.",
    "At the scene, gather as much information as possible: the other driver's name, contact information, insurance details, license plate number, and vehicle description. Take photos of all vehicles from multiple angles, the accident scene, road conditions, traffic signals, skid marks, and any visible injuries. Get contact information from witnesses. Do not admit fault or apologize — even saying 'I'm sorry' can be used against you as an admission of liability. Stick to the facts when speaking with police.",
    "Seek medical attention promptly, even if you feel fine. Some injuries — particularly whiplash, soft tissue damage, and concussions — may not show symptoms for days. Medical records created soon after the accident are critical evidence linking your injuries to the crash. Follow all treatment recommendations and keep records of all medical visits, prescriptions, and expenses. Gaps in treatment can be used by insurance companies to argue your injuries weren't serious.",
    "Notify your insurance company about the accident promptly — most policies require reporting within a reasonable time. When speaking with any insurance adjuster (yours or the other party's), stick to the facts. You are generally not required to give a recorded statement to the other party's insurance, and it's often wise to decline until you've consulted an attorney. Be aware that anything you say can be used to minimize or deny your claim.",
    "The statute of limitations for personal injury claims varies by state — typically 1-3 years from the date of the accident. Don't wait until the deadline approaches to take action. Evidence disappears, memories fade, and witnesses become harder to locate. If the insurance company's settlement offer seems low, remember: you have the right to negotiate. Document all accident-related expenses including medical bills, lost wages, property damage, and even transportation costs to medical appointments.",
    ],
    takeaways: [
    "Call 911 for an official police report — critical evidence for any future claim",
    "Gather information: photos, witness contacts, other driver's insurance, never admit fault",
    "Seek medical attention immediately even if you feel fine — some injuries appear days later",
    "Be cautious with insurance adjusters: stick to facts, consider declining recorded statements",
    "Statute of limitations is typically 1-3 years — don't wait to pursue your claim",
    ],
    relatedGuides: ["statute-of-limitations-guide", "small-claims-court-guide", "how-to-write-demand-letter"],
    },
    {
    id: "power-of-attorney-guide",
    title: "Understanding Power of Attorney: Types and How to Create One",
    category: "Estate Planning",
    readTime: "7 min",
    paragraphs: [
    "A power of attorney (POA) is a legal document that gives one person (the agent or attorney-in-fact) the authority to act on behalf of another person (the principal). POAs are one of the most important — and most misunderstood — estate planning tools. They ensure that someone you trust can manage your affairs if you become incapacitated or unable to make decisions yourself.",
    "There are several types of powers of attorney, each serving different purposes. A general power of attorney gives broad authority over financial and legal matters. A limited (or special) power of attorney grants authority for a specific transaction — like selling a car or signing documents at a real estate closing. A durable power of attorney remains effective even if the principal becomes incapacitated; without durability language, the POA automatically terminates upon incapacity. A springing power of attorney only takes effect when a specific event occurs, usually the principal's incapacity as certified by a doctor.",
    "A healthcare power of attorney (also called a medical POA or healthcare proxy) is separate from financial POAs. It designates someone to make medical decisions for you if you're unable to communicate them yourself. This is often paired with a living will (advance directive) that specifies your wishes about life-sustaining treatment. Without these documents, family members may need to go to court to get guardianship — an expensive and time-consuming process.",
    "Creating a valid POA requires following your state's specific requirements. Most states require the principal to be of sound mind when signing, the document to be in writing, and the signature to be notarized and/or witnessed. Some states require specific statutory language or forms. While you can create a POA yourself using state-specific forms, consulting an attorney is advisable for complex situations — especially if you have significant assets, business interests, or blended family situations.",
    "Choosing your agent is the most important decision in a POA. Pick someone you trust absolutely — they will have significant power over your affairs. You can name co-agents (who must agree on decisions) or successor agents (who step in if the primary agent cannot serve). A POA can be revoked at any time as long as you're competent — you must do so in writing and notify all relevant parties. POAs automatically terminate upon the principal's death, at which point the executor named in the will takes over.",
    ],
    takeaways: [
    "A POA lets someone you trust manage your affairs — critical for incapacity planning",
    "Types: general (broad), limited (specific), durable (survives incapacity), springing (conditional)",
    "Healthcare POA is separate from financial POA — both are essential parts of an estate plan",
    "Most states require notarization and/or witnesses; check your state's specific requirements",
    "Choose your agent carefully — POAs are revocable while you're competent, terminate at death",
    ],
    relatedGuides: ["what-is-probate", "how-to-read-contract", "small-claims-court-guide"],
    },
    {
    id: "fight-traffic-ticket",
    title: "How to Fight a Traffic Ticket in Court: A Complete Guide",
    category: "Criminal Law",
    readTime: "8 min",
    paragraphs: [
    "Fighting a traffic ticket is your legal right, and in many cases it's worth the effort — even if you were technically in the wrong. A ticket isn't just a fine; it can mean points on your license, increased insurance premiums for years, and in some cases license suspension. Understanding the process and your options can save you hundreds or even thousands of dollars over time.",
    "The first decision: pay the fine or contest it? Paying the fine is an admission of guilt and typically results in points on your license. Contesting means you plead not guilty and request a hearing. Most jurisdictions allow you to do this by mail or online — check the instructions on your ticket. You'll receive a court date. In the meantime, gather evidence: photos of the scene (road conditions, signage visibility, speed limit signs), dashcam footage, witness statements, weather reports for that day, and your driving record.",
    "At the hearing, the officer must prove you committed the violation. Common defenses include: the officer made a mistake (misread the speed, identified the wrong vehicle), the signage was inadequate or obscured, you acted out of necessity (swerving to avoid an accident), or there's a factual error on the ticket (wrong date, location, license plate). If the officer doesn't show up at the hearing, the ticket is often dismissed — but don't count on it; many departments now require officers to attend.",
    "If you have a clean driving record, ask the judge about traffic school (defensive driving course) or a deferral program. Completing traffic school typically keeps the violation off your record and prevents insurance increases. Many courts offer these options for minor infractions, especially for first-time offenders. The course fee ($25-100) is usually less than the long-term insurance impact of a conviction.",
    "If you lose at the hearing, you can usually appeal to a higher court — but the appeal process varies by state and may require paying the fine first. The appeal isn't a new trial; it's a review for legal errors in the original hearing. For complex cases, consider consulting a traffic attorney who knows the local judges and procedures. In many jurisdictions, the cost of an attorney is offset by avoiding years of increased insurance premiums.",
    ],
    takeaways: [
    "Contesting a ticket preserves your right to avoid points, increased insurance, and license issues",
    "Plead not guilty and request a hearing; gather photos, witness info, weather reports, driving record",
    "Common defenses: officer mistake, inadequate signage, necessity, factual errors on the ticket",
    "Ask about traffic school or deferral programs — especially if you have a clean driving record",
    "If you lose, appeals are possible but limited to legal errors; consider a traffic attorney",
    ],
    relatedGuides: ["understanding-miranda-rights", "how-to-file-a-motion", "small-claims-court-guide"],
    },
    {
    id: "tenant-rights-guide",
    title: "Tenant Rights: What Your Landlord Can and Cannot Do",
    category: "Housing Law",
    readTime: "9 min",
    paragraphs: [
    "Tenant rights are a patchwork of federal, state, and local laws that protect renters from unfair treatment. While specific protections vary by jurisdiction, there are fundamental rights that apply broadly: the right to a habitable home, the right to privacy, protection against discrimination, and the right to due process before eviction. Understanding these rights is essential for every renter.",
    "The implied warranty of habitability — recognized in most states — requires landlords to maintain rental properties in safe, livable condition. This means working heat, hot water, plumbing, electricity, structural integrity, and freedom from pest infestations and mold. If the landlord fails to make essential repairs after reasonable notice, tenants may have remedies including: withholding rent (in some states, you must pay into an escrow account), repairing and deducting the cost from rent, or breaking the lease without penalty. Follow your state's exact procedures — doing it wrong can lead to eviction.",
    "Your right to privacy means the landlord cannot enter your unit whenever they want. Most states require 24-48 hours' notice (except in emergencies like a burst pipe or fire). Landlords cannot enter to harass you, show the unit to strangers without notice, or conduct repeated unnecessary inspections designed to force you out. If the landlord violates your privacy repeatedly, you may have grounds for a rent reduction or lease termination.",
    "The Fair Housing Act (federal) prohibits discrimination based on race, color, national origin, religion, sex, familial status, and disability. Many states and cities add protections for source of income, sexual orientation, gender identity, age, and marital status. Discrimination can include: refusing to rent, setting different terms, falsely claiming units are unavailable, steering families to specific buildings, or refusing reasonable accommodations for disabilities.",
    "Retaliation is illegal: your landlord cannot evict you, raise your rent, or reduce services because you complained about housing code violations, joined a tenant organization, or exercised your legal rights. Most states presume retaliation if the landlord takes adverse action within 6-12 months of a protected activity. Keep records of all complaints, repair requests, and landlord communications — dates, times, and what was said. Documentation wins these cases.",
    ],
    takeaways: [
    "Implied warranty of habitability: landlords must maintain safe, livable conditions",
    "Remedies for habitability violations: withhold rent (use escrow), repair and deduct, or break lease",
    "Landlords must give 24-48 hours' notice before entering (except emergencies)",
    "Fair Housing Act prohibits discrimination based on race, religion, sex, disability, and family status",
    "Retaliation for exercising your rights is illegal — document all communications with your landlord",
    ],
    relatedGuides: ["eviction-process-guide", "security-deposit-guide", "small-claims-court-guide"],
    },
    {
    id: "how-to-read-contract",
    title: "How to Read a Contract Before Signing: Key Clauses to Watch For",
    category: "Consumer Law",
    readTime: "7 min",
    paragraphs: [
    "Contracts govern nearly every aspect of modern life — employment agreements, rental leases, loan documents, service agreements, and online terms of service. Yet most people skim contracts (or skip them entirely) before signing. This is a mistake. A signed contract is legally binding, and courts generally hold that you're bound by what you signed — even if you didn't read it. Understanding key clauses before you sign can prevent costly disputes later.",
    "The most important clauses to scrutinize: (1) Payment terms — how much, when, and under what conditions. Look for hidden fees, automatic renewal clauses, and interest rates. (2) Duration and termination — how long does the contract last and how can either party end it early? Early termination fees can be substantial. (3) Liability and indemnification — who bears the risk if something goes wrong? Some contracts include broad indemnification clauses requiring you to cover the other party's legal fees.",
    "Watch for these red flags in consumer contracts: mandatory arbitration clauses (you give up the right to sue in court and must use a private arbitrator, often chosen by the company), class action waivers (you can't join a class action lawsuit), choice of law clauses selecting a jurisdiction favorable to the company, and one-sided modification clauses allowing the company to change terms at any time without your consent. These clauses are common in consumer contracts and often enforceable.",
    "Don't be afraid to negotiate. Many people assume contracts are take-it-or-leave-it, but especially in employment, service, and business-to-business contracts, terms are often negotiable. Cross out or amend terms you disagree with, initial the changes, and have the other party initial them too. If the other party refuses to negotiate important terms, consider whether the deal is worth the risk. A contract that heavily favors one side is a red flag for how disputes will be handled.",
    "If a contract is complex or involves significant money, have an attorney review it before signing. The cost of a contract review ($200-500 typically) is trivial compared to the cost of a contract dispute. At minimum, use the 'grandma test': can you explain every clause to your grandmother in plain English? If not, you need to understand it better before signing. Never sign under pressure — if someone says 'it has to be signed now,' that's a major red flag.",
    ],
    takeaways: [
    "You're legally bound by contracts you sign — even if you didn't read them",
    "Scrutinize: payment terms, duration/termination, liability/indemnification clauses",
    "Red flags: mandatory arbitration, class action waivers, one-sided modification rights",
    "Negotiate terms you disagree with — cross out, initial changes, get other party's initials",
    "For complex contracts: attorney review ($200-500) is cheap compared to litigation costs",
    ],
    relatedGuides: ["small-claims-court-guide", "debt-collection-defense", "power-of-attorney-guide"],
    },
    {
    id: "what-is-probate",
    title: "What Is Probate? A Beginner's Guide to the Probate Process",
    category: "Estate Planning",
    readTime: "10 min",
    paragraphs: [
    "Probate is the court-supervised process of administering a deceased person's estate — validating the will (if one exists), identifying and appraising assets, paying debts and taxes, and distributing remaining property to heirs. While probate has a reputation for being slow and expensive, the reality varies widely by state and by the complexity of the estate. Many estates go through simplified procedures or avoid probate entirely.",
    "The probate process begins when someone (usually the executor named in the will or a family member) files a petition with the probate court in the county where the deceased lived. The court validates the will (if one exists) and formally appoints the executor or personal representative. If there's no will (intestacy), the court appoints an administrator and distribution follows state intestacy laws — which may not match what the deceased would have wanted.",
    "Once appointed, the executor's duties include: notifying creditors and beneficiaries, creating an inventory of all assets, managing estate property (maintaining real estate, paying ongoing bills), settling valid creditor claims, filing final tax returns and paying estate taxes if applicable, and ultimately distributing remaining assets to beneficiaries. The executor is a fiduciary — legally required to act in the best interests of the estate and beneficiaries. Mismanagement can result in personal liability.",
    "Not all assets go through probate. Assets that pass outside of probate include: property held in joint tenancy with right of survivorship, assets with named beneficiaries (life insurance, retirement accounts, payable-on-death bank accounts), and assets held in a living trust. One of the primary goals of estate planning is to minimize assets subject to probate — saving time, reducing costs, and maintaining privacy (probate is a public process; trusts are private).",
    "Probate timelines vary dramatically. A simple, uncontested estate might be settled in 6-12 months. Complex estates with disputes, difficult-to-value assets, or creditor challenges can take years. Most states have simplified 'small estate' procedures for estates below a certain value (typically $50,000-$150,000). If you're named executor, understand that you can decline the role — serving as executor is a significant responsibility and commitment of time.",
    ],
    takeaways: [
    "Probate is the court-supervised process of validating the will and distributing estate assets",
    "Executor duties: notify creditors, inventory assets, pay debts/taxes, distribute to beneficiaries",
    "Assets bypassing probate: joint tenancy property, beneficiary-designated accounts, living trusts",
    "Simple estates: 6-12 months; complex/disputed estates: years. Small estate shortcuts exist",
    "Executors can decline the role — it's a fiduciary responsibility with potential personal liability",
    ],
    relatedGuides: ["power-of-attorney-guide", "how-to-read-contract", "small-claims-court-guide"],
    },
    {
    id: "workplace-harassment-laws",
    title: "Understanding Workplace Harassment Laws: Your Legal Rights",
    category: "Employment Law",
    readTime: "8 min",
    paragraphs: [
    "Workplace harassment is not just 'bad behavior' — it's illegal when it creates a hostile work environment based on a protected characteristic. Under Title VII of the Civil Rights Act of 1964, the Americans with Disabilities Act, the Age Discrimination in Employment Act, and parallel state laws, harassment is unlawful when: (1) enduring the offensive conduct becomes a condition of continued employment, or (2) the conduct is severe or pervasive enough to create a work environment that a reasonable person would consider intimidating, hostile, or abusive.",
    "Protected characteristics under federal law include race, color, religion, sex (including pregnancy, sexual orientation, and gender identity), national origin, age (40+), disability, and genetic information. Many states add additional protections — including marital status, political affiliation, and military status. Harassment can take many forms: offensive jokes, slurs, name-calling, physical assaults or threats, intimidation, ridicule, insults, offensive pictures or objects, and interference with work performance.",
    "The harasser can be a supervisor, a coworker, or even a non-employee (client, customer, vendor). The key legal question is whether the employer knew or should have known about the harassment and failed to take prompt, appropriate corrective action. This is why reporting harassment internally is critical — it establishes that the employer was on notice. If the harasser is a supervisor and the harassment results in a tangible employment action (firing, demotion, undesirable reassignment), the employer is automatically liable.",
    "To protect your rights: (1) Report the harassment internally following your employer's policy (check your employee handbook). Put your complaint in writing and keep a copy. (2) Document everything: dates, times, locations, what was said or done, and any witnesses. Save offensive emails, messages, and voicemails. Keep a contemporaneous journal. (3) Cooperate with any investigation. (4) If the harassment doesn't stop after reporting, file a charge with the EEOC or your state's fair employment agency. The deadline is typically 180-300 days from the last incident.",
    "Retaliation is separately illegal — your employer cannot fire, demote, or punish you for reporting harassment or participating in an investigation. Retaliation claims are actually the most common type of charge filed with the EEOC. If you experience retaliation, document it the same way you document harassment. A retaliation claim can succeed even if the underlying harassment claim does not, as long as you had a reasonable, good-faith belief that the conduct was illegal.",
    ],
    takeaways: [
    "Harassment is illegal when based on a protected characteristic and severe or pervasive",
    "Protected: race, color, religion, sex, national origin, age (40+), disability, genetic info",
    "Report harassment internally in writing first — this establishes employer notice",
    "Document everything: dates, times, what was said, witnesses; save offensive messages",
    "Retaliation for reporting is separately illegal; file with the EEOC within 180-300 days",
    ],
    relatedGuides: ["wrongful-termination", "civil-rights-section-1983", "how-to-write-demand-letter"],
    },
    {
    id: "how-to-file-police-report",
    title: "How to File a Police Report: When and How to Document an Incident",
    category: "Criminal Law",
    readTime: "6 min",
    paragraphs: [
    "A police report is an official record of an incident created by law enforcement. It's often the first step in the criminal justice process and can be critical evidence in civil cases, insurance claims, and protective order applications. Knowing when and how to file a police report ensures your experience is properly documented and can be acted upon.",
    "You should file a police report for: crimes (theft, assault, burglary, vandalism, fraud), traffic accidents (especially with injuries or significant damage), domestic violence or harassment, identity theft, missing persons, and any incident where you might need an official record for an insurance claim, restraining order, or future legal action. Even if you think nothing will come of it, having a report on file creates a paper trail that can be invaluable later.",
    "To file a report: for emergencies or crimes in progress, call 911 immediately. For non-emergencies (theft discovered after the fact, vandalism, fraud), call your local police non-emergency number or visit the station in person. Many departments now allow online reporting for minor incidents like theft under a certain dollar amount, lost property, or vandalism. Have all relevant information ready: dates, times, locations, descriptions of people involved, vehicle information, serial numbers of stolen items, and any evidence.",
    "When giving your statement, stick to the facts: what happened, when, where, who was involved, and what was taken or damaged. Be as specific as possible — 'the suspect was approximately 6 feet tall, wearing a red hoodie, and left heading north on Elm Street' is more helpful than 'some guy ran away.' Don't exaggerate or speculate. If you're not sure about something, say so. False statements to police can be a crime. Ask for the report number before you leave.",
    "After filing, request a copy of the report (there may be a small fee). Review it for accuracy — if there are errors, request a correction or supplement. Keep the report number and a copy for your records. If you need the report for an insurance claim, provide the report number to your adjuster. If the case goes to court, the police report is often key evidence. Follow up with the investigating officer periodically if you have additional information or haven't heard back.",
    ],
    takeaways: [
    "File a police report for crimes, accidents, harassment, identity theft — anything needing official record",
    "Call 911 for emergencies; use non-emergency line or in-person for other incidents",
    "Give a factual, specific statement — don't exaggerate or speculate; false statements can be a crime",
    "Get the report number and request a copy; review for accuracy and request corrections if needed",
    "A police report creates a paper trail critical for insurance claims, restraining orders, and court cases",
    ],
    relatedGuides: ["understanding-miranda-rights", "fourth-amendment-search-seizure", "restraining-order-guide"],
    },
    {
    id: "immigration-court-basics",
    title: "Immigration Court Basics: What to Expect and How to Prepare",
    category: "Immigration Law",
    readTime: "10 min",
    paragraphs: [
    "Immigration court is part of the Executive Office for Immigration Review (EOIR), a Department of Justice agency — not the judicial branch. Immigration judges decide whether non-citizens can remain in the United States or must be removed (deported). The process is civil (not criminal), which means you don't have the right to a court-appointed attorney. Understanding the process is critical because the stakes — separation from family, loss of livelihood, return to dangerous conditions — could not be higher.",
    "Immigration proceedings typically begin with a Notice to Appear (NTA), a document that lists the charges against you (e.g., overstayed a visa, entered without inspection, committed a crime) and states the date and location of your first hearing. The first hearing is a master calendar hearing — a short, procedural hearing where you state your name, address, and the relief you're seeking (asylum, cancellation of removal, adjustment of status, voluntary departure, etc.). You must attend every hearing; failure to appear usually results in an in absentia removal order.",
    "After the master calendar hearing, the judge schedules an individual (merits) hearing where you present your full case. This is your trial: you present evidence, call witnesses, and testify. The standard of proof varies by the type of relief sought. For asylum, you must show a 'well-founded fear of persecution' based on race, religion, nationality, political opinion, or membership in a particular social group. For cancellation of removal, you must meet specific residency, good moral character, and hardship requirements.",
    "Preparing for immigration court means gathering extensive documentation: identity documents (passport, birth certificate), evidence of time in the US (leases, bills, school records, pay stubs), evidence of good moral character (tax returns, community involvement, letters of support), country conditions evidence (news articles, human rights reports, expert affidavits about conditions in your home country), and — crucially — evidence supporting your specific form of relief. Medical and psychological records are important if you experienced trauma.",
    "While you don't have a right to appointed counsel, you have the right to hire an attorney at your own expense. Having qualified immigration counsel dramatically improves outcomes — studies show represented immigrants are several times more likely to win their cases. If you can't afford an attorney, seek help from nonprofit legal service providers, law school clinics, and pro bono programs. Never use a notario or immigration consultant who claims they can get you legal status but isn't a licensed attorney — this is a common scam with devastating consequences.",
    ],
    takeaways: [
    "Immigration court is civil, not criminal — no right to appointed counsel; stakes are extremely high",
    "Proceedings start with a Notice to Appear; master calendar hearing is procedural; merits hearing is trial",
    "Gather extensive documentation: identity, residency, good moral character, country conditions, relief evidence",
    "Asylum standard: well-founded fear of persecution based on protected grounds (race, religion, etc.)",
    "Represented immigrants are several times more likely to win — seek nonprofit legal aid if you can't afford counsel",
    ],
    relatedGuides: ["how-to-file-a-motion", "what-is-a-complaint", "statute-of-limitations-guide"],
    },
    ];
  {
    id: "how-to-write-demand-letter",
    title: "How to Write a Demand Letter: Templates and Legal Requirements",
    category: "Consumer Law",
    readTime: "7 min",
    paragraphs: [
      "A demand letter is a formal written request asking another party to take a specific action — usually to pay money owed, stop a harmful activity, or perform a contractual obligation. It's often the first step before filing a lawsuit and, in some cases, is legally required before you can sue. A well-crafted demand letter resolves many disputes without the need for litigation, saving time, money, and stress.",
      "A strong demand letter should include: (1) a clear statement of the facts — what happened, when, where, and who was involved; (2) the legal basis for your claim — what law, contract, or right was violated; (3) the specific remedy you're seeking — the exact dollar amount or action you want; (4) a deadline for response (typically 10-30 days); and (5) a statement of what you'll do if they don't comply — usually a notice that you intend to file a lawsuit. Keep the tone professional and factual, not emotional or threatening.",
      "The letter should be sent by certified mail with return receipt requested so you have proof of delivery. Keep a copy for your records. If you're sending to a business, address it to the registered agent or legal department. For individuals, use their last known address. In some cases, sending a copy by email as well is appropriate, but certified mail is the gold standard for establishing that the recipient received notice.",
      "Many courts and agencies require a demand letter before you can file certain types of cases. For example, the Fair Debt Collection Practices Act requires consumers to send a written dispute within 30 days of receiving a collection notice to trigger the debt collector's obligation to verify the debt. Small claims courts in many states require evidence that you attempted to resolve the dispute before filing. Even when not legally required, a demand letter shows the court that you tried to resolve the matter in good faith.",
      "Be specific about your demand. Instead of 'pay me what you owe,' state: 'Pay $3,247.50, representing unpaid rent for March and April 2026 at $1,623.75 per month, within 14 days of receipt of this letter.' Attach supporting documents: contracts, invoices, receipts, photos, correspondence. Avoid making threats you don't intend to carry out — if you say you'll file suit, be prepared to do it. A demand letter is not just a negotiation tool; it's potential evidence in court.",
    ],
    takeaways: [
      "A demand letter is a formal request for action — often the required first step before a lawsuit",
      "Include: facts, legal basis, specific remedy (exact dollar amount), deadline, and intended next steps",
      "Send by certified mail with return receipt — proof of delivery is essential evidence",
      "Many courts and agencies require a demand letter before you can file certain claims",
      "Be specific about your demand, attach supporting documents, and don't threaten what you won't do",
    ],
    relatedGuides: ["small-claims-court-guide", "debt-collection-defense", "security-deposit-guide"],
  },

const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

function Learn() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = ARTICLES.filter((a) => {
    const matchesCategory = selectedCategory === "All" || a.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (selectedArticle) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <button
            onClick={() => setSelectedArticle(null)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-gold"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Guides
          </button>
          <article className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_COLORS[selectedArticle.category] || "bg-gray-100 text-gray-800"}`}>
                {selectedArticle.category}
              </span>
              <span className="text-sm text-gray-400">{selectedArticle.readTime} read</span>
            </div>
            <h1 className="mb-6 text-3xl font-extrabold text-navy sm:text-4xl">{selectedArticle.title}</h1>
            <div className="prose prose-gray max-w-none space-y-4">
              {selectedArticle.paragraphs.map((p, i) => (
                <p key={i} className="leading-relaxed text-gray-700">{p}</p>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-gold/20 bg-navy/5 p-6">
              <h2 className="mb-4 text-xl font-bold text-navy">Key Takeaways</h2>
              <ul className="space-y-2">
                {selectedArticle.takeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="mt-0.5 text-gold">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <h3 className="mb-3 font-semibold text-navy">Related Guides</h3>
              <div className="flex flex-wrap gap-2">
                {selectedArticle.relatedGuides.map((guide) => (
                  <span key={guide} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                    📄 {ARTICLES.find(a => a.id === guide)?.title || guide}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-8 rounded-lg border border-yellow-100 bg-yellow-50 p-4 text-sm text-yellow-800">
              ⚖️ <strong>Educational Purpose:</strong> This guide is for legal education only. It does not constitute legal advice. Laws vary by jurisdiction and change over time. Always consult a licensed attorney for advice about your specific situation.
            </div>
          </article>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-navy px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">
            Free Legal Education Guides
          </h1>
          <p className="mb-8 text-lg text-white/70">
            Plain-English explanations of the law. No paywall — ever. Legal research and education for everyone.
          </p>
          <div className="mx-auto max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides... (e.g., 'motion to dismiss', 'statute of limitations')"
              className="w-full rounded-full border border-white/20 bg-white/10 px-6 py-3 text-white placeholder-white/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                selectedCategory === "All"
                  ? "bg-navy text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({ARTICLES.length})
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const count = ARTICLES.filter((a) => a.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-navy text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="card-hover rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[article.category] || "bg-gray-100 text-gray-800"}`}>
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-400">{article.readTime}</span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-navy line-clamp-2">{article.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{article.paragraphs[0]}</p>
              </button>
            ))}
          </div>
          {filteredArticles.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              No guides match your search. Try different keywords.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
