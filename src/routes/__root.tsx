import {
  HeadContent,
  Outlet,
  Scripts,
  Link,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ClerkProvider, UserButton, SignInButton, SignUpButton, useAuth } from "@clerk/tanstack-react-start";
import { trackEvent, AnalyticsEvents } from "~/lib/analytics";
import { SECURITY_HEADERS } from "~/lib/security-headers";
import { SignInTicketHandler } from "~/components/SignInTicketHandler";
import { RouteVisitTracker } from "~/components/RouteVisitTracker";
import { ErrorReporter } from "~/components/ErrorReporter";

import appCss from "~/styles/app.css?url";

const PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_Y29taWMtc2VhaG9yc2UtODAuY2xlcmsuYWNjb3VudHMuZGV2JA";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Fair Fight — Legal Education & Pro Case Analysis" },
      {
        name: "description",
        content:
          "Fair Fight provides plain-English legal education, public guides, and a paid Pro Case Analysis workspace for people preparing to speak with an attorney. It is not a law firm and does not provide legal advice.",
      },
      { name: "keywords", content: "legal education, self-represented litigant, how to file a motion, statute of limitations, small claims court, discovery, case law research, plain English law guide, Pro Case Analysis" },
      { name: "robots", content: "index, follow" },
      { name: "msvalidate.01", content: "2AB8EC22CA4E3890BC9A1558CC16F02C" },
      { name: "author", content: "Fair Fight" },
      { property: "og:title", content: "Fair Fight — Legal Education & Pro Case Analysis" },
      {
        property: "og:description",
        content:
          "Plain-English legal education, public guides, and a paid Pro Case Analysis workspace for people preparing to speak with an attorney. Not legal advice.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Fair Fight" },
      { property: "og:image", content: "https://fairfight.ctonew.app/og-image.png" },
      { property: "og:url", content: "https://fairfight.ctonew.app" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Fair Fight — Legal Education & Pro Case Analysis" },
      {
        name: "twitter:description",
        content:
          "Plain-English legal education and paid Pro Case Analysis for people preparing to speak with an attorney. Not legal advice.",
      },
      { name: "twitter:image", content: "https://fairfight.ctonew.app/og-image.png" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Fair Fight" },
      { name: "theme-color", content: "#0A2342" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://fairfight.ctonew.app" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Fair Fight",
          description:
            "Fair Fight helps you understand your legal situation with plain-English education, public legal resources, case organization, and paid Pro Case Analysis. It is not a law firm and does not provide legal advice.",
          url: "https://fairfight.ctonew.app",
          sameAs: [
            "https://twitter.com/fairfightai",
            "https://linkedin.com/company/fairfightai",
          ],
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
      <AuthTracker />
      <RouteVisitTracker />
      <SignInTicketHandler />
      <ErrorReporter />
      <SiteHeader />
      <Outlet />
    </RootDocument>
  );
}

function AuthTracker() {
  const auth = useAuth();
  const prevSignedIn = useRef(auth.isSignedIn);

  // Track signup completion when user transitions from signed-out to signed-in
  useEffect(() => {
    if (auth.isSignedIn && !prevSignedIn.current) {
      trackEvent(AnalyticsEvents.SIGNUP_COMPLETED);
    }
    prevSignedIn.current = auth.isSignedIn;
  }, [auth.isSignedIn]);

  return null;
}

// Main app routes a signed-in user must be able to reach on small screens,
// where the desktop primary nav is hidden. Drawn from the existing desktop nav.
const SIGNED_IN_MOBILE_LINKS = [
  { to: "/dashboard" as const, label: "Dashboard" },
  { to: "/chat" as const, label: "Chat" },
  { to: "/evidence" as const, label: "Evidence" },
  { to: "/calendar" as const, label: "Calendar" },
  { to: "/profile" as const, label: "Profile" },
];

function SiteHeader() {
  const auth = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Pressing Escape closes the mobile menu (accessibility).
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy shadow-lg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-6 md:gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-extrabold text-white sm:text-xl"
          >
            <span className="text-gold">⚖️</span>
            Fair Fight
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
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
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav-menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              >
                {mobileOpen ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
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

      {/* Mobile navigation drawer (signed-in only; desktop nav covers md+). */}
      {auth.isSignedIn && (
        <nav
          id="mobile-nav-menu"
          aria-label="Mobile"
          className="relative md:hidden"
        >
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            className={mobileOpen ? "block border-t border-white/10 bg-navy-dark px-4 pb-4 pt-2" : "hidden"}
            style={{ position: "relative", zIndex: 50 }}
          >
            {SIGNED_IN_MOBILE_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-3 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-gold"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/learn"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-3 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-gold"
            >
              Guides
            </Link>
          </div>
        </nav>
      )}
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

        {/* UTM capture — persist UTM params to sessionStorage for attribution */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=new URLSearchParams(location.search);var utm={};["utm_source","utm_medium","utm_campaign","utm_term","utm_content","ref"].forEach(function(k){if(p.get(k))utm[k]=p.get(k)});if(Object.keys(utm).length)try{sessionStorage.setItem("ff_utm",JSON.stringify(utm))}catch(e){}})();`,
          }}
        />

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
