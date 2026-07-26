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
];

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
