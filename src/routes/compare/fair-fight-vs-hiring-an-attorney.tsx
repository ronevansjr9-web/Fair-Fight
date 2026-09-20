import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_ORIGIN } from "~/lib/guides";

/**
 * Comparison page: Fair Fight vs. hiring an attorney.
 *
 * Fact-source contract: every statement traces to
 * /home/team/shared/marketing/comparison-fact-pack.md (compiled 2026-09-20).
 * Cost rules enforced here:
 *  - Attorney pricing is QUALITATIVE ONLY (fact pack §2.1, §2.3): no hourly
 *    figures, no flat-fee ranges, nothing from reviews or unsourced averages.
 *  - The only real number pair allowed is the federal civil filing fee, always
 *    with both citations adjacent: $350 (28 U.S.C. § 1914(a)) and $55
 *    (District Court Miscellaneous Fee Schedule, effective Dec 1, 2023).
 *  - No user counts, no endorsement quotes, no outcome promises.
 */

const SITE = SITE_ORIGIN;
const CANONICAL = `${SITE}/compare/fair-fight-vs-hiring-an-attorney`;

export const Route = createFileRoute("/compare/fair-fight-vs-hiring-an-attorney")({
  component: CompareAttorneyPage,
  head: () => ({
    meta: [
      { title: "Fair Fight vs. Hiring an Attorney: Cost, Privilege, and When You Need a Lawyer | Fair Fight" },
      {
        name: "description",
        content:
          "Compare Fair Fight's one-time $99 per-case educational workspace with hiring an attorney: how attorney fees are billed, what the attorney-client privilege protects, the federal civil filing fee, and when an attorney is strongly recommended. Not legal advice.",
      },
      { property: "og:title", content: "Fair Fight vs. Hiring an Attorney: Cost, Privilege, and When You Need a Lawyer | Fair Fight" },
      {
        property: "og:description",
        content:
          "One-time $99 per-case legal-education workspace vs. hiring an attorney — costs, what each provides, the attorney-client privilege, and when a lawyer is strongly recommended. Not legal advice.",
      },
      { property: "og:image", content: `${SITE}/og-image.png` },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Fair Fight vs. Hiring an Attorney: Cost, Privilege, and When You Need a Lawyer | Fair Fight" },
      {
        name: "twitter:description",
        content:
          "One-time $99 per-case legal-education workspace vs. hiring an attorney — costs, what each provides, and when a lawyer is strongly recommended. Not legal advice.",
      },
      { name: "twitter:image", content: `${SITE}/og-image.png` },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

function CompareAttorneyPage() {
  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/60">
          <Link to="/" className="hover:text-gold">Home</Link>
          <span className="mx-2 text-white/30">/</span>
          <Link to="/learn" className="hover:text-gold">Guides</Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/40">Fair Fight vs. Hiring an Attorney</span>
        </nav>

        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">Comparison</span>
        <h1 className="mb-6 mt-4 text-4xl font-extrabold text-white sm:text-5xl">
          Fair Fight vs. Hiring an Attorney: Which Should You Choose?
        </h1>

        <div className="space-y-5 text-lg leading-relaxed text-white/70">
          <p>
            If you are facing a legal problem, the first question is often whether to hire an attorney or
            handle it yourself. This page compares two very different options: Fair Fight, a paid
            legal-education workspace, and hiring a licensed attorney. Fair Fight is{" "}
            <strong className="text-white">not a law firm and does not provide legal advice</strong> — it is an
            educational tool that helps you organize your facts and understand possible legal issues{" "}
            <em>before</em> you talk to an attorney. An attorney, by contrast, can give legal advice, represent
            you in court, and protect confidential communications under the attorney-client privilege.
          </p>
          <p>
            The two options also cost very differently. Fair Fight&apos;s Pro Case Analysis is a{" "}
            <strong className="text-gold">one-time $99 purchase per case</strong>. Attorney fees are commonly
            billed hourly, and hourly rates vary widely by practice area, experience, and location — some
            attorneys offer flat fees for routine matters, so always ask for a written fee agreement. Because
            unverified &ldquo;average&rdquo; rate figures are not trustworthy, this page intentionally avoids
            quoting any attorney rate numbers; the only dollar figures below come from named, citable public
            sources.
          </p>
        </div>

        {/* Factual comparison section */}
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">Fair Fight vs. an attorney: side by side</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white">
                  <th className="px-4 py-3 font-semibold text-white/50">Comparison</th>
                  <th className="px-4 py-3 font-semibold text-gold">Fair Fight</th>
                  <th className="px-4 py-3 font-semibold text-white">An attorney</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/70">
                <tr>
                  <td className="px-4 py-4 align-top font-medium text-white">Price model</td>
                  <td className="px-4 py-4 align-top">
                    One-time $99 per case (Fair Fight homepage). No subscription.
                  </td>
                  <td className="px-4 py-4 align-top">
                    Attorney fees are commonly billed hourly, and hourly rates vary widely by practice area,
                    experience, and location. Some attorneys offer flat fees for routine matters — ask for a
                    written fee agreement.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-medium text-white">What you get</td>
                  <td className="px-4 py-4 align-top">
                    A durable case workspace: a plain-English summary of your situation, possible legal
                    issues, candidate arguments and counterarguments, and traceable public sources; evidence
                    upload; AI-drafted educational document templates; and a court calendar for tracking court
                    dates and deadlines.
                  </td>
                  <td className="px-4 py-4 align-top">
                    Legal advice specific to your situation, representation in court, and confidential
                    communications protected by the attorney-client privilege.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-medium text-white">Who it&apos;s for</td>
                  <td className="px-4 py-4 align-top">
                    Self-represented litigants and people preparing for conversations with attorneys — the
                    homepage&apos;s promise is to help you &ldquo;prepare before you talk to an attorney.&rdquo;
                  </td>
                  <td className="px-4 py-4 align-top">
                    People who need legal advice for a specific problem, someone to represent them in court,
                    or help navigating complex legal procedures.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-medium text-white">Confidentiality</td>
                  <td className="px-4 py-4 align-top">
                    No attorney-client privilege claim. Fair Fight is not a law firm and gives no legal
                    advice.
                  </td>
                  <td className="px-4 py-4 align-top">
                    The attorney-client privilege protects confidential communications between a lawyer and
                    their client that relate to the client&apos;s seeking of legal advice or services (Cornell
                    LII WEX).
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-medium text-white">What it cannot do</td>
                  <td className="px-4 py-4 align-top">
                    No legal advice, no representation, no appearance in court, no outcome guarantees;
                    AI-drafted templates are educational, not filing-ready documents; evidence upload is
                    educational tooling, not secure legal-grade evidence preservation.
                  </td>
                  <td className="px-4 py-4 align-top">
                    Attorneys can give legal advice, represent clients in court, and assert the
                    attorney-client privilege on the client&apos;s behalf.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Filing fee — the ONE real number pair, always with both citations adjacent */}
        <section className="mt-10 rounded-2xl border border-gold/20 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-2xl font-bold text-gold">A citable cost example: the federal civil filing fee</h2>
          <p className="leading-relaxed text-white/70">
            If you are comparing costs, one figure we can state precisely is the federal civil filing fee. The
            clerk of each U.S. district court requires parties instituting a civil action to pay a filing fee
            of <strong className="text-white">$350</strong> — 28 U.S.C. § 1914(a), text in effect as of
            September 19, 2026, via uscode.house.gov — plus a{" "}
            <strong className="text-white">$55 administrative fee</strong> for filing a civil action, per the
            District Court Miscellaneous Fee Schedule (Administrative Office of the U.S. Courts, effective
            December 1, 2023, via uscourts.gov). The two published components together total $405, though
            neither government page prints a combined total. The $55 administrative fee does not apply to
            applications for a writ of habeas corpus or to persons granted in forma pauperis status under 28
            U.S.C. § 1915. State courts set their own filing fees, which this page does not attempt to
            summarize.
          </p>
        </section>

        {/* Honest "when you need an attorney" section */}
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">When you need an attorney</h2>
          <div className="space-y-5 leading-relaxed text-white/70">
            <p>
              Some functions are reserved to lawyers by design. The Administrative Office of the U.S. Courts,
              in its page <em>Filing Without an Attorney</em> (bankruptcy context), states that{" "}
              <span className="text-white">&ldquo;court employees and bankruptcy judges are prohibited by law from
              offering legal advice,&rdquo;</span> and that non-attorney petition preparers{" "}
              <span className="text-white">&ldquo;are prohibited from providing legal advice, explaining answers to
              legal questions, or assisting you in bankruptcy court.&rdquo;</span> That is an authoritative
              federal example of the boundary: legal advice is an attorney&apos;s job, and even court staff
              cannot cross that line.
            </p>
            <p>
              Confidential communications with a lawyer are also protected in a way no app can replicate.
              Cornell Law School&apos;s Legal Information Institute (WEX) defines the privilege this way:{" "}
              <span className="text-white">&ldquo;Attorney-client privilege protects confidential communications
              between a lawyer and their client that relate to the client&apos;s seeking of legal advice or
              services.&rdquo;</span>
            </p>
            <p>
              The same U.S. Courts page states that{" "}
              <span className="text-white">&ldquo;seeking the advice of a qualified attorney is strongly
              recommended,&rdquo;</span> and Fair Fight&apos;s own posture matches that at the sitewide level:{" "}
              <strong className="text-white">
                for complex cases or cases involving potential jail exposure, an attorney is strongly
                recommended.
              </strong>{" "}
              Fair Fight is designed for people who want to understand their legal situation — including
              self-represented litigants preparing a case — but it is not a substitute for a lawyer when the
              stakes are high.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-3 text-lg font-bold text-gold">What Fair Fight is not</h3>
              <ul className="list-disc space-y-2 pl-6">
                <li>Not a law firm, and it does not provide legal advice.</li>
                <li>It does not represent you, appear in court for you, or file documents on your behalf.</li>
                <li>It offers candidate arguments for education — it makes no outcome guarantees, and its AI-drafted document templates are not filing-ready documents.</li>
                <li>Its evidence upload is educational tooling, not secure legal-grade evidence preservation.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Sources */}
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-bold text-white">Sources</h2>
          <ul className="space-y-1.5 text-sm text-white/50">
            <li><a className="text-gold hover:underline" href="https://fairfight.ctonew.app/">Fair Fight homepage</a> — accessed September 20, 2026.</li>
            <li><a className="text-gold hover:underline" href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title28-section1914&amp;num=0&amp;edition=prelim">28 U.S.C. § 1914(a)</a> — U.S. House of Representatives, Office of the Law Revision Counsel; text in effect September 19, 2026; accessed September 20, 2026.</li>
            <li><a className="text-gold hover:underline" href="https://www.uscourts.gov/court-programs/fees/district-court-miscellaneous-fee-schedule">District Court Miscellaneous Fee Schedule</a> — Administrative Office of the U.S. Courts; effective December 1, 2023; accessed September 20, 2026.</li>
            <li><a className="text-gold hover:underline" href="https://www.law.cornell.edu/wex/attorney-client_privilege">Attorney-client privilege</a> — Cornell Law School, Legal Information Institute (WEX); accessed September 20, 2026.</li>
            <li><a className="text-gold hover:underline" href="https://www.uscourts.gov/court-programs/bankruptcy/filing-without-an-attorney">Filing Without an Attorney</a> — Administrative Office of the U.S. Courts; accessed September 20, 2026.</li>
          </ul>
        </section>

        {/* Cross-links */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-lg font-bold text-white">Keep comparing</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/compare/fair-fight-vs-donotpay"
              className="rounded-full border border-gold/40 px-5 py-2 text-sm font-medium text-gold hover:bg-gold/10"
            >
              Compare Fair Fight vs. DoNotPay →
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
            <Link to="/compare/fair-fight-vs-donotpay" className="hover:text-gold">vs. DoNotPay</Link>
          </div>
          <p>© {new Date().getFullYear()} Fair Fight. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}