import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/tanstack-react-start";
import { createServerFn } from "@tanstack/react-start";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { getCurrentAuth } from "~/lib/auth";
import { listUserPayments, type PaymentHistoryRecord } from "~/lib/dataProtection";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your Profile — Fair Fight" },
      { name: "description", content: "Manage your Fair Fight profile, billing, and account settings." },
    ],
  }),
});

const getProfileData = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return { unavailable: false, pro: false };
  // Checkout is OPEN for live $99 payments. Payment history is fetched by the
  // separate ownership-scoped `getPaymentHistory` server function below; Pro
  // status is per-case and derived at the analysis surface, and storage usage
  // has no real measurement, so no fabricated entitlement or storage figure is
  // reported here.
  return { unavailable: false, pro: false };
});

/**
 * Ownership-scoped payment history. Returns ONLY the authenticated user's own
 * stored `payments` rows (the single source of truth we actually query) —
 * it never invents Stripe-detail we don't store, and it is scoped so no other
 * user's rows are exposed. Empty list when there are none or on a DB error.
 */
const getPaymentHistory = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return { payments: [] };
  const payments = await listUserPayments(auth.userId);
  return { payments };
});

/**
 * Billing/membership copy reflects the CURRENT, OPEN checkout state.
 *
 * The checkout/Pro-activation gate is now open for live $99 payments
 * (owner-approved controlled launch, see `src/lib/restrictedFeatures.ts`), so
 * the profile shows the truthful paid billing copy directly below — no
 * "no payments accepted" fallback. Payment history is fetched by the
 * ownership-scoped `getPaymentHistory` server function above. (Storage usage
 * remains "temporarily unavailable" because there is no real storage figure —
 * that is a separate, still-gated surface, not part of this launch.)
 */
function ProfilePage() {
  const { user, isLoaded: userLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentHistoryRecord[] | null>(null);

  // Checkout is OPEN: payments are accepted, so the profile shows the truthful
  // paid billing copy (no gate-closed fallback).

  useEffect(() => {
    getProfileData()
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
    getPaymentHistory()
      .then((res) => setPayments(res.payments ?? []))
      .catch(() => setPayments([]));
  }, []);

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch {
      return iso;
    }
  }

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
              {"Pro Case Analysis is available as a one-time $99 purchase per case"}
            </p>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-3 text-3xl">📋</div>
              <p className="text-sm text-white/70">
                {"Pro Case Analysis is available as a one-time $99 purchase per case: a plain-English summary, possible issues, candidate arguments, and traceable public sources — educational only, not legal advice. Legal education and your core case tools remain available in your workspace."}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div className="mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <h2 className="mb-1 text-xl font-bold text-white">Payment History</h2>
            <p className="mb-6 text-sm text-white/60">
              Pro Case Analysis purchases recorded on your account.
            </p>
            {payments === null ? (
              <p className="text-sm text-white/60">Loading…</p>
            ) : payments.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
                <div className="mx-auto mb-3 text-3xl">🧾</div>
                <p className="text-sm text-white/60">
                  No payment records found for this account.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Case</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="py-3 pr-4 text-white/80">{formatDate(p.createdAt)}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-white/60">{p.caseId}</td>
                        <td className="py-3 pr-4 text-white/80">
                          ${(p.amountCents / 100).toFixed(2)} {p.currency.toUpperCase()}
                        </td>
                        <td className="py-3 capitalize text-white/80">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
