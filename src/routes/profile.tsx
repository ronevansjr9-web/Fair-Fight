import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/tanstack-react-start";
import { createServerFn } from "@tanstack/react-start";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { getCurrentAuth } from "~/lib/auth";
import { RESTRICTED_FEATURES } from "~/lib/restrictedFeatures";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your Profile — Fair Fight" },
      { name: "description", content: "Manage your Fair Fight profile and account settings. Paid Pro activation is temporarily unavailable." },
    ],
  }),
});

const getProfileData = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return { unavailable: true, pro: false };

  // P0 fail-closed gate: Pro entitlement, billing status, and storage usage
  // are not verified, and the lookups that would produce them were removed.
  // Report an honest unavailable state instead of fabricated zeros. Clearing
  // the flag alone does NOT restore the removed lookups (see
  // lib/restrictedFeatures.ts); re-enabling requires restoring and verifying
  // them first.
  if (RESTRICTED_FEATURES.checkoutProActivation) {
    return { unavailable: true, pro: false };
  }

  // The verified entitlement/storage/payment-history lookups belong here once
  // the flow is repaired and tested; until then the honest state is reported.
  return { unavailable: true, pro: false };
});

/**
 * Billing/membership copy is driven by the CURRENT gate state so it can never
 * drift out of date:
 *
 *   - While `checkoutProActivation` is true (today), payments are NOT being
 *     accepted, so the honest copy says exactly that.
 *
 *   - The moment the gate is cleared for real (non-test) payments, the
 *     "no payments are being accepted" claims below would become FALSE. That
 *     transition is a launch blocker and must be handled deliberately — see
 *     `src/lib/restrictedFeatures.ts` for what clearing the flag does and does
 *     NOT restore (the payment-history/entitlement lookups were REMOVED when the
 *     flow was restricted and must be rebuilt and verified first).
 *
 * TODO(gate-open): when `checkoutProActivation` is cleared for real payments,
 * revisit EVERY branch keyed off `paymentsAccepted` in this file, replace the
 * "not being accepted" wording with the true live payment state, and restore the
 * payment-history/entitlement lookups. Do NOT simply flip the flag and expect
 * this copy to be valid — payments history is not yet shown.
 */
function ProfilePage() {
  const { user, isLoaded: userLoaded } = useUser();
  const [loading, setLoading] = useState(true);

  // Truthful to the CURRENT gate state. Never claim payments are open while the
  // checkout/Pro activation gate is still active.
  const paymentsAccepted = !RESTRICTED_FEATURES.checkoutProActivation;

  useEffect(() => {
    getProfileData()
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  }, []);

  if (!userLoaded) {
    return (
      <AuthenticatedGuard>
        <div className="flex min-h-screen items-center justify-center bg-navy">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
        </div>
      </AuthenticatedGuard>
    );
  }

  return (
    <AuthenticatedGuard>
      <main className="min-h-screen bg-navy px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-3xl font-extrabold text-white">Your Profile</h1>

          {/* Profile Card */}
          <div className="mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <div className="flex items-start gap-6">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || "Profile photo"}
                  className="h-20 w-20 rounded-full border-4 border-gold/30 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-2xl font-bold text-white">
                  {(user?.firstName?.[0] || user?.fullName?.[0] || "?").toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {user?.fullName || user?.firstName || "User"}
                </h2>
                <p className="mt-1 text-white/60">
                  {user?.primaryEmailAddress?.emailAddress || ""}
                </p>
                {user?.username && (
                  <p className="text-sm text-white/40">@{user.username}</p>
                )}
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/70">
                    Pro — temporarily unavailable
                  </span>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">User ID</p>
                <p className="mt-1 font-mono text-sm text-white/80">{user?.id || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">Member Since</p>
                <p className="mt-1 text-sm text-white/80">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">Storage Used</p>
                <p className="mt-1 text-sm text-white/80">
                  {loading ? "..." : "Temporarily unavailable"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">Last Sign In</p>
                <p className="mt-1 text-sm text-white/80">
                  {user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Membership & Billing */}
          <div className="mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <h2 className="mb-1 text-xl font-bold text-white">Membership & Billing</h2>
            <p className="mb-6 text-sm text-white/60">
              {paymentsAccepted
                ? "Pro Case Analysis is available as a one-time $99 purchase per case"
                : "Paid Pro activation is temporarily unavailable"}
            </p>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-3 text-3xl">📋</div>
              <p className="text-sm text-white/70">
                {paymentsAccepted
                  ? "Pro Case Analysis is available as a one-time $99 purchase per case: a plain-English summary, possible issues, candidate arguments, and traceable public sources — educational only, not legal advice. Legal education and your core case tools remain available in your workspace."
                  : "Legal education, legal research, statutes, case law, court rules, and your core case tools remain available in your workspace. We're verifying the paid Pro flow before re-enabling it; no Pro Case Analysis payments are being accepted right now."}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div className="mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <h2 className="mb-1 text-xl font-bold text-white">Payment History</h2>
            <p className="mb-6 text-sm text-white/60">
              {paymentsAccepted
                ? "Payment history — temporarily unavailable"
                : "Payment history is temporarily unavailable"}
            </p>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-3 text-3xl">🧾</div>
              <p className="text-sm text-white/60">
                {paymentsAccepted
                  ? "Payment history will appear here once we finish restoring this view. Your Pro Case Analysis purchases are recorded on your account."
                  : "Payment history is temporarily unavailable while we finish safety verification. No payments are being accepted right now."}
              </p>
            </div>
          </div>

          {/* Account Actions */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <h2 className="mb-1 text-xl font-bold text-white">Account Actions</h2>
            <p className="mb-6 text-sm text-white/60">Manage your account and data</p>
            <a
              href="/data-request"
              className="inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-navy hover:bg-navy hover:text-white"
            >
              Data Request (export / deletion)
            </a>
          </div>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
