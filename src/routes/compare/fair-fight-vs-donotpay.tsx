import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_ORIGIN } from "~/lib/guides";

/**
 * Comparison page: Fair Fight vs. DoNotPay.
 *
 * Fact-source contract: every statement traces to
 * /home/team/shared/marketing/comparison-fact-pack.md (compiled 2026-09-20).
 * Rules enforced here:
 *  - DoNotPay's price appears ONLY as its own published "$36.00 every 2
 *    months, auto-renewing" (fact pack §3.1). No third-party user-review
 *    price figures are used (excluded by the pack).
 *  - DoNotPay categories/claims appear ONLY as attributed quotes from their
 *    own site/store/TOS. No quality or outcome characterization of DoNotPay.
 *  - Fair Fight side uses public homepage copy only; internal product facts
 *    (payment identifiers, evidence storage limits, data portability
 *    mechanics) are not printed — "evidence upload" generically, at most.
 */

const SITE = SITE_ORIGIN;
const CANONICAL = `${SITE}/compare/fair-fight-vs-donotpay`;

export const Route = createFileRoute("/compare/fair-fight-vs-donotpay")({
  component: CompareDoNotPayPage,
  head: () => ({
    meta: [
      { title: "Fair Fight vs. DoNotPay: $99 One-Time vs. $36.00 Every 2 Months | Fair Fight" },
      {
        name: "description",
        content:
          "Fair Fight is a one-time $99-per-case legal-education workspace; DoNotPay's own sign-up flow discloses a $36.00-every-2-months auto-renewing subscription. Prices as published by each company, September 2026. Not legal advice.",
      },
      { property: "og:title", content: "Fair Fight vs. DoNotPay: $99 One-Time vs. $36.00 Every 2 Months | Fair Fight" },
      {
        property: "og:description",
        content:
          "One-time $99-per-case legal-education workspace vs. DoNotPay's $36.00-every-2-months auto-renewing subscription. Prices as published by each company, September 2026. Not legal advice.",
      },
      { property: "og:image", content: `${SITE}/og-image.png` },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Fair Fight vs. DoNotPay: $99 One-Time vs. $36.00 Every 2 Months | Fair Fight" },
      {
        name: "twitter:description",
        content:
          "One-time $99-per-case legal-education workspace vs. DoNotPay's $36.00-every-2-months auto-renewing subscription. Not legal advice.",
      },
      { name: "twitter:image", content: `${SITE}/og-image.png` },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

function CompareDoNotPayPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/60">
          <Link to="/" className="hover:text-gold">Home</Link>
          <span className="mx-2 text-white/30">/</span>
          <Link to="/learn" className="hover:text-gold">Guides</Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/40">Fair Fight vs. DoNotPay</span>
        </nav>

        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">Comparison</span>
        <h1 className="mb-6 mt-4 text-4xl font-extrabold text-white sm:text-5xl">
          Fair Fight vs. DoNotPay: Price and What Each Product Says It Does
        </h1>

        <div className="space-y-5 text-lg leading-relaxed text-white/70">
          <p>
            Fair Fight and DoNotPay both sell AI-assisted help for people dealing with companies, courts, and
            bureaucracy — but the products and the pricing models are very different. This page compares them
            using only each company&apos;s own published words: Fair Fight&apos;s homepage, and DoNotPay&apos;s
            website, app listings, and Terms of Service. It is a facts-and-quotes comparison, not a rating of
            either service. Pricing and features change frequently, so verify current details on each
            company&apos;s own site before you decide.
          </p>
          <p>
            The headline difference is structural:{" "}
            <strong className="text-gold">Fair Fight&apos;s Pro Case Analysis is a one-time $99 purchase per
            case</strong> — no subscription. <strong className="text-white">DoNotPay&apos;s own sign-up flow
            discloses a recurring subscription: &ldquo;$36.00 every 2 months&rdquo; that
            &ldquo;renews automatically&rdquo;</strong> (as published on donotpay.com, accessed September 20,
            2026).
          </p>
        </div>

        {/* Price contrast */}
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">Price and billing, side by side</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white">
                  <th className="px-4 py-3 font-semibold text-white/50">Comparison</th>
                  <th className="px-4 py-3 font-semibold text-gold">Fair Fight</th>
                  <th className="px-4 py-3 font-semibold text-white">DoNotPay (their own published words)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/70">
                <tr>
                  <td className="px-4 py-4 align-top font-medium text-white">Price</td>
                  <td className="px-4 py-4 align-top">
                    One-time $99 per case (Fair Fight homepage). No subscription.
                  </td>
                  <td className="px-4 py-4 align-top">
                    &ldquo;By connecting your bank account or credit card, you agree to charge a $36.00 every 2
                    months subscription that renews automatically to this payment method. It is easy to cancel
                    at any time online.&rdquo; (DoNotPay sign-up flow, accessed September 20, 2026)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-medium text-white">How you pay</td>
                  <td className="px-4 py-4 align-top">One-time purchase at checkout.</td>
                  <td className="px-4 py-4 align-top">
                    Recurring subscription charged to a linked bank account or credit card, which DoNotPay&apos;s
                    Terms of Service say they require (among other reasons) to process payments and pay external
                    government or corporation fees on your behalf.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-medium text-white">Commitment</td>
                  <td className="px-4 py-4 align-top">None — one purchase covers one case.</td>
                  <td className="px-4 py-4 align-top">
                    Auto-renewing until cancelled. DoNotPay&apos;s Terms of Service (§22) state that to avoid
                    auto-renewal you must cancel at least 2 calendar days (48 hours) before the renewal date.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-medium text-white">Verify current pricing</td>
                  <td className="px-4 py-4 align-top">Price is stated on the Fair Fight homepage.</td>
                  <td className="px-4 py-4 align-top">
                    DoNotPay has no public pricing page — the figure above is what its own sign-up flow disclosed
                    on September 20, 2026. Prices and plans change; always verify the current price on
                    DoNotPay&apos;s own site before connecting a payment method.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-white/40">
            Note on pricing figures: the only DoNotPay price we publish is the one DoNotPay&apos;s own site
            displays, quoted verbatim and dated to the day it was captured (September 20, 2026). We do not use
            dollar figures from third-party user reviews. Prices change over time — every price on this page is
            dated, and you should verify the current price on each company&apos;s own site before paying for
            anything.
          </p>
        </section>

        {/* What each says it does */}
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">What each product says it does</h2>

          <h3 className="mb-3 text-xl font-bold text-gold">Fair Fight — from its own homepage</h3>
          <ul className="mb-8 list-disc space-y-2 pl-6 text-white/70">
            <li><strong className="text-white">Pro Case Analysis:</strong> &ldquo;a one-time $99 purchase per case: a plain-English summary, possible issues, candidate arguments, counterarguments, and traceable public sources.&rdquo;</li>
            <li><strong className="text-white">Legal Research:</strong> &ldquo;Access to public case law, statutes, and court rules. 62 public plain-English guides on court procedures and legal topics.&rdquo;</li>
            <li><strong className="text-white">Evidence Manager:</strong> evidence upload within a per-case workspace — &ldquo;educational tooling, not secure legal-grade evidence preservation.&rdquo;</li>
            <li><strong className="text-white">Document Generator:</strong> &ldquo;AI-drafted educational templates — not filing-ready documents or legal advice.&rdquo;</li>
            <li><strong className="text-white">Court Calendar:</strong> &ldquo;Track court dates and deadlines per case — events are saved and persist across sessions. Do not rely on Fair Fight for filing deadlines; confirm dates with the court or an attorney.&rdquo;</li>
            <li><strong className="text-white">Legal Argument Builder:</strong> &ldquo;Build candidate legal arguments with jurisdiction-specific case law as part of Pro Case Analysis &mdash; unlocked for a case with the one-time $99 purchase. Educational, not legal advice.&rdquo;</li>
          </ul>

          <h3 className="mb-3 text-xl font-bold text-white">DoNotPay — from its own website and app listings</h3>
          <p className="mb-3 text-white/70">
            DoNotPay&apos;s homepage describes the product this way:{" "}
            <span className="text-white">&ldquo;The AI that fights for you&rdquo;</span>;{" "}
            <span className="text-white">&ldquo;DoNotPay uses artificial intelligence to help you fight big
            corporations, protect your privacy, find hidden money, and beat bureaucracy&rdquo;</span>; and{" "}
            <span className="text-white">&ldquo;DoNotPay gives you 100+ AI-powered tools to take control, save
            time, and get what you deserve.&rdquo;</span> Its own qualifier:{" "}
            <span className="text-white">&ldquo;Everyone&apos;s situation is different. Of course, our self help
            tools are not guaranteed to help with every situation.&rdquo;</span>
          </p>
          <p className="mb-3 text-white/70">
            DoNotPay&apos;s website footer groups its offerings into categories including:{" "}
            <span className="text-white">Protect Your Money</span> (Burner Phones, Virtual Credit Cards, Get Free
            Trials &amp; Don&apos;t Get Charged, Warranty Claims), <span className="text-white">Fight Spam</span>{" "}
            (Fight Email Spam, Fight Text Spam, Robocall Compensation),{" "}
            <span className="text-white">Jump the Phone Queue for Any Company</span>,{" "}
            <span className="text-white">Late Delivery Refunds</span>,{" "}
            <span className="text-white">Item Return Request</span>,{" "}
            <span className="text-white">Cancel A Subscription</span>,{" "}
            <span className="text-white">Chargebacks and Refunds</span>,{" "}
            <span className="text-white">Appeal Banned Account</span>,{" "}
            <span className="text-white">Find Hidden Money</span> (Gift Card Cash Back, Find Unclaimed Money),{" "}
            <span className="text-white">Help With Bills</span>,{" "}
            <span className="text-white">College Fee Waivers</span>,{" "}
            <span className="text-white">Discover and Apply for Scholarships</span>,{" "}
            <span className="text-white">Financial Aid Appeal Letters</span>, and{" "}
            <span className="text-white">Beat Bureaucracy</span> (Connect With an Inmate, Mailing as a Service,
            Online Fax, Schedule Appointments With the DMV, Government Tests, Notarize Documents, FOIA, Contact
            Embassies and Consulates, Contact Government Representatives, Create Passport Photos, Notice of
            Intent To Homeschool, Sex Offender Search).
          </p>
          <p className="mb-3 text-white/70">
            Its Google Play listing (DoNotPay Inc) summarizes the categories as{" "}
            <span className="text-white">&ldquo;FIGHT CORPORATIONS · MANAGE YOUR SUBSCRIPTIONS · LOWER YOUR BILLS ·
            FIND HIDDEN MONEY · BEAT BUREAUCRACY.&rdquo;</span>
          </p>
          <p className="text-white/70">
            For context on how each handles acting on your behalf: DoNotPay&apos;s own app listing describes
            agency-style acts — &ldquo;we will contact the corporation on your behalf,&rdquo; &ldquo;generate
            complaint letters for you and mail it on your behalf,&rdquo; &ldquo;our expert negotiator will fight
            to get you a better rate.&rdquo; Fair Fight&apos;s own copy makes no such claim — it is explicitly
            &ldquo;plain-English legal education, case organization, and AI-assisted analysis&rdquo; and
            &ldquo;Not legal advice.&rdquo;
          </p>
        </section>

        {/* Each on law firms / legal advice */}
        <section className="mt-10 rounded-2xl border border-gold/20 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-2xl font-bold text-gold">What each company says about law firms and legal advice</h2>
          <div className="space-y-4 text-white/70">
            <p>
              Fair Fight&apos;s homepage:{" "}
              <span className="text-white">&ldquo;Plain-English legal education, case organization, and
              AI-assisted analysis to help you prepare before you talk to an attorney. Not legal
              advice.&rdquo;</span>
            </p>
            <p>
              DoNotPay&apos;s homepage:{" "}
              <span className="text-white">&ldquo;DoNotPay is not a law firm and does not provide legal advice.
              DoNotPay provides a platform for legal information and self-help.&rdquo;</span>
            </p>
            <p>
              DoNotPay&apos;s Terms of Service (§6, last updated April 20, 2024):{" "}
              <span className="text-white">
                &ldquo;DoNotPay provides a platform for legal information and self-help. The information
                provided by DoNotPay &hellip; does not constitute advice. We do not review any information you
                provide us for legal accuracy or sufficiency, draw legal conclusions, provide opinions about
                your selection of forms, or apply the law to the facts of your situation. If you need advice
                for a specific problem, you should consult with a licensed attorney. As DoNotPay is not a law
                firm, please note that any communications between you and DoNotPay may not be protected under
                the attorney-client privilege doctrine.&rdquo;
              </span>
            </p>
            <p>
              Notably, the two products land on the same disclaimer from different directions: both say in
              their own words that they are not law firms and do not provide legal advice. If you need advice
              for a specific problem, both companies&apos; own words point the same way — consult a licensed
              attorney.
            </p>
          </div>
        </section>

        {/* Honest bottom line */}
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">The structural difference</h2>
          <div className="space-y-4 leading-relaxed text-white/70">
            <p>
              We are not grading either service. What the published record shows is a structural difference:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong className="text-white">Fair Fight</strong> is a one-time, per-case educational workspace for a single legal situation — organize your facts, understand possible issues, and prepare before you talk to an attorney.</li>
              <li><strong className="text-white">DoNotPay</strong> (in its own words) is a subscription platform covering a wide range of consumer tasks — &ldquo;100+ AI-powered tools&rdquo; across subscriptions, refunds, chargebacks, bills, tickets, privacy, and bureaucracy.</li>
              <li><strong className="text-white">Pricing model</strong>: one-time $99 per case versus $36.00 every 2 months, auto-renewing, until cancelled.</li>
              <li><strong className="text-white">Legal posture</strong>: both say they are not law firms and do not provide legal advice; DoNotPay&apos;s own Terms of Service add that it does not &ldquo;apply the law to the facts of your situation&rdquo; and that communications with it &ldquo;may not be protected under the attorney-client privilege doctrine.&rdquo;</li>
            </ul>
            <p>
              Choose based on what you actually need — and verify the current price and features on each
              company&apos;s own site before you pay for anything.
            </p>
          </div>
        </section>

        {/* Sources */}
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-bold text-white">Sources (all accessed September 20, 2026)</h2>
          <ul className="space-y-1.5 text-sm text-white/50">
            <li><a className="text-gold hover:underline" href="https://fairfight.ctonew.app/">Fair Fight homepage</a></li>
            <li><a className="text-gold hover:underline" href="https://donotpay.com/">DoNotPay homepage and footer navigation</a></li>
            <li><a className="text-gold hover:underline" href="https://donotpay.com/login">DoNotPay sign-up flow pricing screen (/connect)</a> — verbatim pricing quote captured September 20, 2026; screenshot on file.</li>
            <li><a className="text-gold hover:underline" href="https://donotpay.com/learn/terms-of-service/">DoNotPay Terms of Service</a> — last updated April 20, 2024.</li>
            <li><a className="text-gold hover:underline" href="https://play.google.com/store/apps/details?id=com.donotpayapp">DoNotPay Google Play listing</a> — DoNotPay Inc.</li>
          </ul>
        </section>

        {/* Cross-links */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-lg font-bold text-white">Keep comparing</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/compare/fair-fight-vs-hiring-an-attorney"
              className="rounded-full border border-gold/40 px-5 py-2 text-sm font-medium text-gold hover:bg-gold/10"
            >
              Compare Fair Fight vs. hiring an attorney →
            </Link>
            <Link
              to="/learn"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
            >
              Browse all legal guides
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-xs text-white/40">
            For educational purposes only. Fair Fight is not a law firm and does not provide legal advice.
            Always consult with a qualified attorney about your specific situation.
          </p>
        </div>
      </div>

      <footer className="border-t border-white/10 bg-navy-dark px-4 py-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center text-xs text-white/40">
          <p>⚖️ Fair Fight is not a law firm and does not provide legal advice. For educational purposes only.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="hover:text-gold">Home</Link>
            <Link to="/learn" className="hover:text-gold">Legal Guides</Link>
            <Link to="/privacy" className="hover:text-gold">Privacy Policy</Link>
            <Link to="/compare/fair-fight-vs-hiring-an-attorney" className="hover:text-gold">vs. Hiring an Attorney</Link>
          </div>
          <p>© {new Date().getFullYear()} Fair Fight. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}