import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/tanstack-react-start";
import { getReferrerInfo } from "~/lib/referral";

export const Route = createFileRoute("/")({
  component: Home,
});

/* ────────────────────────────────────────────
   Home Component
   ──────────────────────────────────────────── */
function Home() {
  const navigate = useNavigate();
  const auth = useAuth();

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-navy px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-navy-light px-4 py-1.5 text-sm text-gold-light">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            Plain-English Legal Education
          </div>
          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            Understand the Law.
            <br />
            <span className="text-gold">Fight Your Fair Fight.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/70 sm:text-xl">
            Plain-English legal education, case organization, and AI-assisted analysis to help you prepare before you talk to an attorney. Not legal advice.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {auth.isSignedIn ? (
              <button
                      onClick={() => navigate({ to: "/dashboard" })}
                      className="gold-gradient rounded-full px-8 py-3.5 font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)] transition-all hover:shadow-[0_0_30px_rgba(201,162,39,0.5)]"
                    >
                      Go to Dashboard
                    </button>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button className="gold-gradient rounded-full px-8 py-3.5 font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)] transition-all hover:shadow-[0_0_30px_rgba(201,162,39,0.5)]">
                    Create account
                  </button>
                </SignUpButton>
                <div className="flex items-center gap-2">
                  <SignUpButton mode="modal">
                    <button className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-medium text-white transition-all hover:bg-white/10" aria-label="Sign up with Google">
                      <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Google
                    </button>
                  </SignUpButton>
                  <SignUpButton mode="modal">
                    <button className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-medium text-white transition-all hover:bg-white/10" aria-label="Sign up with Apple">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                      Apple
                    </button>
                  </SignUpButton>
                </div>
              </>
            )}
            <a
              href="/learn"
              className="rounded-full border border-white/20 px-8 py-3.5 font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Legal Guides
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-navy-dark px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-white sm:text-4xl">
            Everything you need to understand your legal situation
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Pro Case Analysis",
                desc: "One-time $99 per case: plain-English summary, possible legal issues, candidate arguments, and traceable public sources. Educational — not legal advice.",
                icon: "🧠",
              },
              {
                title: "Legal Research",
                desc: "Access to public case law, statutes, and court rules. 60 public plain-English guides on court procedures and legal topics.",
                icon: "📚",
              },
              {
                title: "Evidence Manager",
                desc: "Organizing and uploading case evidence is temporarily unavailable while we verify durable file storage.",
                icon: "📎",
              },
              {
                title: "Document Generator",
                desc: "The AI Document Generator is temporarily unavailable while we verify Pro activation. When available, outputs will be educational templates only — not filing-ready documents or legal advice.",
                icon: "📝",
              },
              {
                title: "Court Calendar",
                desc: "Court Calendar is temporarily unavailable while we verify deadline handling. Do not rely on Fair Fight for filing deadlines; confirm dates with the court or an attorney.",
                icon: "📅",
              },
              {
                title: "Legal Argument Builder",
                desc: "Structure legal arguments with jurisdiction-specific case law. Temporarily unavailable while Pro activation is verified.",
                icon: "⚖️",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="card-hover rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
              >
                <div className="mb-4 text-3xl">{feature.icon}</div>
                <h3 className="mb-2 text-xl font-bold text-white">{feature.title}</h3>
                <p className="text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-navy px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Understand your legal situation before you talk to an attorney
          </h2>
          <p className="mb-8 text-lg text-white/70">
            Fair Fight Pro Case Analysis is a one-time $99 purchase per case: a plain-English summary,
            possible issues, candidate arguments, counterarguments, and traceable public sources.
            Legal research and plain-English legal education help you prepare before you talk to an attorney.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {auth.isSignedIn ? (
              <button
                      onClick={() => navigate({ to: "/dashboard" })}
                      className="gold-gradient rounded-full px-8 py-3.5 font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)]"
                    >
                      Go to Dashboard
                    </button>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button className="gold-gradient rounded-full px-8 py-3.5 font-semibold text-navy shadow-[0_0_20px_rgba(201,162,39,0.3)]">
                    Create account
                  </button>
                </SignUpButton>
                <div className="flex items-center gap-2">
                  <SignUpButton mode="modal">
                    <button className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-medium text-white transition-all hover:bg-white/10" aria-label="Sign up with Google">
                      <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Google
                    </button>
                  </SignUpButton>
                  <SignUpButton mode="modal">
                    <button className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-medium text-white transition-all hover:bg-white/10" aria-label="Sign up with Apple">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                      Apple
                    </button>
                  </SignUpButton>
                </div>
              </>
            )}
            <a
              href="/learn"
              className="rounded-full border border-white/20 px-8 py-3.5 font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Legal Guides
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-navy-dark px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-4">
            <div>
              <h4 className="mb-3 font-bold text-gold">Fair Fight</h4>
              <p className="text-sm text-white/40">AI-powered legal education platform.</p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">Features</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="/chat" className="hover:text-gold">AI Legal Chat</a></li>
                <li><a href="/research" className="hover:text-gold">Legal Research</a></li>
                <li><a href="/documents" className="hover:text-gold">Documents</a></li>
                <li><a href="/evidence" className="hover:text-gold">Evidence</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">Resources</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="/learn" className="hover:text-gold">Legal Guides</a></li>
                <li><a href="/calendar" className="hover:text-gold">Court Calendar</a></li>
                <li><a href="/timeline" className="hover:text-gold">Timeline</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="/privacy" className="hover:text-gold">Privacy Policy</a></li>
                <li><a href="/data-request" className="hover:text-gold">Data Request</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/40">
            <p>⚖️ Fair Fight is not a law firm and does not provide legal advice. For educational purposes only.</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} Fair Fight. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}