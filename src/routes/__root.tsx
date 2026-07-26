import {
  HeadContent,
  Outlet,
  Scripts,
  Link,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ClerkProvider, UserButton, SignInButton, SignUpButton, useAuth } from "@clerk/tanstack-start";
import { SECURITY_HEADERS } from "~/lib/security-headers";

import appCss from "~/styles/app.css?url";

const PUBLISHABLE_KEY = "pk_test_Y29taWMtc2VhaG9yc2UtODAuY2xlcmsuYWNjb3VudHMuZGV2JA";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Fair Fight — AI-Powered Legal Education | Free Legal Research & Case Analysis" },
      {
        name: "description",
        content:
          "Fair Fight is the TurboTax of legal education — AI-powered plain-English explanations of statutes, case law, and legal procedures. Free guides on motions, discovery, small claims, statutes of limitations, and more. No paywall on legal information.",
      },
      { name: "keywords", content: "legal education, AI legal assistant, pro se, self-represented litigant, how to file a motion, statute of limitations, small claims court, discovery, legal brief, case law research, plain English law guide, free legal research" },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "Fair Fight" },
      { property: "og:title", content: "Fair Fight — AI-Powered Legal Education | Free Legal Research & Case Analysis" },
      {
        property: "og:description",
        content:
          "The TurboTax of legal education — AI-powered plain-English explanations of statutes, case law, and legal procedures. Free motion guides, discovery help, small claims court prep, and statute of limitations info for all 50 states.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Fair Fight" },
      { property: "og:image", content: "https://fairfight.ai/og-image.png" },
      { property: "og:url", content: "https://fairfight.ai" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Fair Fight — AI-Powered Legal Education | Free Legal Research & Case Analysis" },
      {
        name: "twitter:description",
        content:
          "The TurboTax of legal education — AI-powered plain-English explanations of statutes, case law, and legal procedures. Free motion guides, discovery help, small claims court prep, and statute of limitations info.",
      },
      { name: "twitter:image", content: "https://fairfight.ai/og-image.png" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Fair Fight" },
      { name: "theme-color", content: "#0A2342" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://fairfight.ai" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Fair Fight",
          description:
            "Fair Fight helps you understand your legal situation with plain-English explanations, evidence organization, and AI-powered case preparation tools. Free legal research access — no paywall.",
          url: "https://fairfight.ai",
          sameAs: [
            "https://twitter.com/fairfightai",
            "https://linkedin.com/company/fairfightai",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is Fair Fight?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Fair Fight is an AI-powered legal education platform that helps you understand your legal situation in plain English. It provides case law research, statute explanations, evidence organization tools, and court deadline tracking. Fair Fight is not a law firm and does not provide legal advice — it is an educational tool to help you prepare before meeting with an attorney."
              }
            },
            {
              "@type": "Question",
              "name": "Is Fair Fight a law firm? Does it provide legal advice?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "No. Fair Fight is not a law firm and does not provide legal advice. It is an educational platform that uses AI to explain legal concepts in plain English. Always consult a licensed attorney for legal advice specific to your situation."
              }
            },
            {
              "@type": "Question",
              "name": "How much does Fair Fight cost?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Fair Fight has a generous free tier that includes AI analysis, document uploads, full legal research access, case summaries, and court calendar tools. The Pro tier costs $99 per case and includes unlimited AI analyses, unlimited document uploads, advanced document generation, timeline builder, and priority AI processing."
              }
            },
            {
              "@type": "Question",
              "name": "Can I represent myself in court using Fair Fight?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Fair Fight provides educational resources about self-representation (pro se), including guides on how to file motions, write legal briefs, understand discovery, and prepare for court. However, Fair Fight does not replace an attorney. For complex cases or cases involving potential jail time, hiring a licensed attorney is strongly recommended."
              }
            },
            {
              "@type": "Question",
              "name": "What is a statute of limitations?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "A statute of limitations is a legal deadline for filing a lawsuit. If you miss the deadline, you permanently lose the right to sue — regardless of how strong your case is. Deadlines vary by state and case type: personal injury claims range from 1 to 6 years depending on the state. Fair Fight's free legal education center includes guides on statutes of limitations for all 50 states."
              }
            },
            {
              "@type": "Question",
              "name": "How does the AI case analysis work?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "You describe your legal situation in plain English, and Fair Fight's AI provides an educational analysis including: a summary of your situation, relevant legal concepts explained in plain English, practical next steps, and smart questions to ask your attorney. The analysis is for educational purposes only and does not constitute legal advice."
              }
            }
          ]
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Prepare a Legal Argument with Fair Fight",
          "description": "Use Fair Fight's AI-powered platform to prepare a legal argument template with jurisdiction-specific case law citations in three steps.",
          "step": [
            {
              "@type": "HowToStep",
              "position": 1,
              "name": "Describe Your Legal Situation",
              "text": "Create a case on Fair Fight and describe your legal situation in plain English. Upload any documents, evidence, or court papers you have. The more detail you provide, the better the analysis."
            },
            {
              "@type": "HowToStep",
              "position": 2,
              "name": "AI Analyzes Your Case",
              "text": "Fair Fight's AI identifies relevant statutes, case law, and legal principles from your jurisdiction. It generates plain-English summaries, relevant legal concepts, and potential arguments based on the law."
            },
            {
              "@type": "HowToStep",
              "position": 3,
              "name": "Review and Refine Your Argument",
              "text": "Review the AI-generated legal argument template. The platform provides jurisdiction-specific case citations, best possible arguments, counter-arguments to anticipate, and a detailed strategy outline. Use this to prepare for meetings with your attorney."
            }
          ],
          "totalTime": "PT15M"
        }),
      },
    ],
    // Security headers applied at the HTTP level
    ...Object.fromEntries(
      Object.entries(SECURITY_HEADERS).map(([key, value]) => [
        `header-${key}`,
        value,
      ])
    ),
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <SiteHeader />
      <Outlet />
    </RootDocument>
  );
}

function SiteHeader() {
  const auth = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-white">
            <span className="text-gold">⚖️</span>
            Fair Fight
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/learn" className="nav-link">Guides</Link>
            {auth.isSignedIn && (
              <>
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/chat" className="nav-link">Chat</Link>
                <Link to="/evidence" className="nav-link">Evidence</Link>
                <Link to="/calendar" className="nav-link">Calendar</Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {auth.isSignedIn ? (
            <>
              <Link
                to="/profile"
                className="hidden rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 sm:inline-block"
              >
                Profile
              </Link>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9 ring-2 ring-gold/30",
                  },
                }}
              />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="gold-gradient rounded-full px-4 py-1.5 text-sm font-semibold text-navy">
                  Get Started
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>{children}</ClerkProvider>
        <Scripts />

        {/* Persistent educational disclaimer — rendered server-side, outside all client components.
            Uses inline styles so it is never stripped by Tailwind purge during SSR. */}
        <div
          id="legal-disclaimer"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderTop: "1px solid rgba(201, 162, 39, 0.3)",
            backgroundColor: "#0A2342",
            padding: "0.375rem 1rem",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "rgba(255,255,255,0.8)", margin: 0 }}>
            <span aria-hidden="true" style={{ marginRight: "0.375rem" }}>⚖️</span>
            For educational purposes only. Fair Fight is not a law firm and does not provide legal advice. Always consult with a qualified attorney.
          </p>
        </div>
        <noscript>
          <div style={{ padding: "8px", textAlign: "center", backgroundColor: "#0A2342", color: "white", fontSize: "12px" }}>
            ⚖️ For educational purposes only. Fair Fight is not a law firm and does not provide legal advice. Always consult with a qualified attorney.
          </div>
        </noscript>
      </body>
    </html>
  );
}
