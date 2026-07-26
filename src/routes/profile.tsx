import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/tanstack-start";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { AuthenticatedGuard } from "~/components/AuthenticatedGuard";
import { getSubscriptionStatus, createCustomerPortalSession, createCheckoutSession } from "~/lib/stripe";
import { getStorageUsed } from "~/lib/storage";
import { trackEvent, AnalyticsEvents } from "~/lib/analytics";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your Profile — Fair Fight" },
      { name: "description", content: "Manage your Fair Fight profile, membership tier, billing, and account settings." },
    ],
  }),
});

const getProfileData = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getAuth();
  if (!auth.userId) return { pro: false, storageUsed: 0 };

  const [subStatus, storageUsed] = await Promise.all([
    getSubscriptionStatus(auth.userId).catch(() => ({ active: false, customerId: undefined })),
    getStorageUsed(auth.userId).catch(() => 0),
  ]);

  return {
    pro: subStatus.active,
    customerId: subStatus.customerId,
    storageUsed,
  };
});

const startBillingPortal = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getAuth();
  if (!auth.userId) return { error: "Unauthorized" };

  const subStatus = await getSubscriptionStatus(auth.userId);
  if (!subStatus.active || !subStatus.customerId) {
    return { error: "No active Pro membership found." };
  }

  const result = await createCustomerPortalSession(subStatus.customerId);
  if ("error" in result) return { error: result.error };
  return { url: result.url };
});

const startUpgrade = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await getAuth();
  if (!auth.userId) return { error: "Please sign in first." };

  const email = auth.user?.primaryEmailAddress?.emailAddress || "";
  const result = await createCheckoutSession(auth.userId, email);
  if ("error" in result) return { error: result.error };
  return { url: result.url };
});

function ProfilePage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [profileData, setProfileData] = useState({ pro: false, customerId: undefined as string | undefined, storageUsed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfileData().then((d) => {
      setProfileData(d);
      setLoading(false);
    });
  }, []);

  const handleBillingPortal = async () => {
    const result = await startBillingPortal();
    if ("error" in result) {
      setError(result.error || "Failed to open billing portal");
    } else if (result.url) {
      window.location.href = result.url;
    }
  };

  const handleUpgrade = async () => {
    trackEvent(AnalyticsEvents.CHECKOUT_STARTED);
    const result = await startUpgrade();
    if ("error" in result) {
      setError(result.error || "Failed to start checkout");
    } else if (result.url) {
      window.location.href = result.url;
    }
  };

  if (!userLoaded) {
    return (
      <AuthenticatedGuard>
        <div className="flex min-h-screen items-center justify-center bg-navy">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
        </div>
      </AuthenticatedGuard>
    );
  }

  const formatStorage = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
                  {loading ? (
                    <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
                  ) : profileData.pro ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-sm font-semibold text-gold-dark">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Pro Member
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/70">
                      Free Plan
                    </span>
                  )}
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
                  {loading ? "..." : formatStorage(profileData.storageUsed)}
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
            <p className="mb-6 text-sm text-white/60">Manage your plan and billing information</p>

            {loading ? (
              <div className="space-y-3">
                <div className="h-10 animate-pulse rounded-lg bg-white/10" />
                <div className="h-10 animate-pulse rounded-lg bg-white/10" />
              </div>
            ) : profileData.pro ? (
              <div>
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-gold/30 bg-gold/5 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-xl">
                    ⭐
                  </div>
                  <div>
                    <p className="font-semibold text-white">Pro Plan — $99 per case</p>
                    <p className="text-sm text-white/60">Unlimited AI analyses, priority processing, timeline builder</p>
                  </div>
                </div>
                <button
                  onClick={handleBillingPortal}
                  className="w-full rounded-xl border-2 border-navy bg-white px-6 py-3 font-semibold text-white transition-all hover:bg-navy hover:text-white sm:w-auto"
                >
                  Manage Billing in Stripe Portal
                </button>
                {error && (
                  <div className="mt-3 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl">
                    📋
                  </div>
                  <div>
                    <p className="font-semibold text-white">Free Plan</p>
                    <p className="text-sm text-white/60">3 AI analyses, 5 file uploads, basic tools</p>
                  </div>
                </div>
                <button
                  onClick={handleUpgrade}
                  className="gold-gradient w-full rounded-full px-8 py-3 font-semibold text-navy shadow-md transition-all hover:shadow-lg sm:w-auto"
                >
                  Upgrade to Pro — $99/case
                </button>
                <p className="mt-3 text-xs text-white/40">
                  One-time payment per case. Includes unlimited AI analyses, document generation, timeline builder, and priority processing.
                </p>
                {error && (
                  <div className="mt-3 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <h2 className="mb-1 text-xl font-bold text-white">Payment History</h2>
            <p className="mb-6 text-sm text-white/60">Your recent transactions</p>

            {profileData.pro ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-sm text-white/60">
                  View your complete payment history in the{" "}
                  <button
                    onClick={handleBillingPortal}
                    className="font-semibold text-gold-dark underline hover:text-gold"
                  >
                    Stripe Billing Portal
                  </button>
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
                <div className="mx-auto mb-3 text-3xl">🧾</div>
                <p className="text-sm text-white/60">No payments yet.</p>
                <button
                  onClick={handleUpgrade}
                  className="mt-3 gold-gradient rounded-full px-6 py-2 text-sm font-semibold text-navy"
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>

          {/* Account Actions */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <h2 className="mb-1 text-xl font-bold text-white">Account Actions</h2>
            <p className="mb-6 text-sm text-white/60">Manage your account and data</p>
            <div className="flex flex-wrap gap-4">
              <a
                href="/data-request"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-navy hover:bg-navy hover:text-white"
              >
                Export My Data
              </a>
              <a
                href="/data-request"
                className="rounded-xl border border-red-800 px-5 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-900/20"
              >
                Delete My Data
              </a>
            </div>
          </div>
        </div>
      </main>
    </AuthenticatedGuard>
  );
}
