import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { SignInButton } from "@clerk/tanstack-start";
import { getCurrentAuth, getPrimaryEmail } from "~/lib/auth";
import { createCheckoutSession } from "~/lib/stripe";
import { hasOwnedCaseEntitlement, isCaseOwner } from "~/lib/argumentAccess";
import { trackEvent, AnalyticsEvents } from "~/lib/analytics";

const checkProAccess = createServerFn({ method: "GET" }).validator((v: unknown) => { const caseId = (v as any)?.caseId; if (typeof caseId !== "string" || !/^[A-Za-z0-9_-]+$/.test(caseId)) throw new Error("A case is required"); return { caseId }; }).handler(async ({ data }) => {
  try {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { hasAccess: false, isAuthenticated: false };
    try {
      const hasAccess = await hasOwnedCaseEntitlement(auth.userId, data.caseId);
      return { hasAccess, isAuthenticated: true };
    } catch { return { hasAccess: false, isAuthenticated: true }; }
  } catch { return { hasAccess: false, isAuthenticated: false }; }
});

export const startCheckout = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    return { caseId: (d.caseId as string) || undefined };
  })
  .handler(async ({ data }) => {
    try {
      const auth = await getCurrentAuth();
      if (!auth.userId) return { error: "Please sign in first" };
      if (!data.caseId) return { error: "Select a case before purchasing Pro." };
      const isOwner = await isCaseOwner(auth.userId, data.caseId);
      if (!isOwner) return { error: "This case does not exist or you do not have permission to access it" };
      // AuthObject has no `user` property; resolve email via Clerk Backend API.
      // `null` (lookup failure) is passed as undefined so Stripe omits
      // customer_email instead of receiving an empty string.
      const email = (await getPrimaryEmail(auth.userId)) ?? undefined;
      const result = await createCheckoutSession(auth.userId, email, data.caseId);
      if ("error" in result) return { error: result.error };
      return { url: result.url };
    } catch { return { error: "Auth error. Try again." }; }
  });

interface ProGateProps { feature: string; caseId?: string; children: React.ReactNode; }

export function ProGate({ feature, caseId, children }: ProGateProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hasPro, setHasPro] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [needsCase, setNeedsCase] = useState(false);
  const [returnUrl, setReturnUrl] = useState("/");

  // Read only the current same-origin browser URL for Clerk's post-auth return.
  // This preserves the gated page/case context without accepting an open redirect.
  useEffect(() => {
    if (typeof window !== "undefined") {
      setReturnUrl(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    let c = false;
    // Access is exact-case: without a selected owned case there is nothing to
    // authorize, so ask for one instead of showing the purchase/sign-in flow.
    if (!caseId || !/^[A-Za-z0-9_-]+$/.test(caseId)) {
      setHasPro(false);
      setShowUpgrade(false);
      setNeedsCase(true);
      setIsChecking(false);
      return () => { c = true; };
    }
    setNeedsCase(false);
    setIsChecking(true);
    checkProAccess({ data: { caseId } }).then(r => { if (!c) { if (r.hasAccess) setHasPro(true); else if (r.isAuthenticated) setShowUpgrade(true); setIsChecking(false); } }).catch(() => { if (!c) setIsChecking(false); });
    return () => { c = true; };
  }, [caseId]);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const result = await startCheckout({ data: { caseId } });
      if ("error" in result) {
        alert(result.error || "Unable to start checkout. Please try again.");
      } else if (result.url) {
        // This is checkout initiation, not payment completion.
        await trackEvent(AnalyticsEvents.CHECKOUT_STARTED, { source: "pro_gate" });
        window.location.href = result.url;
      }
    } catch {
      alert("Unable to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) return <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" /></div>;
  if (hasPro) return <>{children}</>;
  if (needsCase) return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10"><svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
      <h3 className="mb-2 text-xl font-bold text-white">Select a Case First</h3>
      <p className="mb-6 text-white/70">Pro access is granted per case. Enter the case ID from your dashboard above to check access for {feature.toLowerCase()}.</p>
    </div>
  );
  if (showUpgrade) return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10"><svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
      <h3 className="mb-2 text-xl font-bold text-white">Pro Feature: {feature}</h3>
      <p className="mb-6 text-white/70">Upgrade to Fair Fight Pro to access {feature.toLowerCase()}. $99 one-time per case.</p>
      <button onClick={handleUpgrade} disabled={isLoading} className="gold-gradient inline-flex items-center rounded-full px-8 py-3 font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20 disabled:opacity-50">{isLoading ? "Redirecting..." : "Upgrade to Pro — $99"}</button>
    </div>
  );
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10"><svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
      <h3 className="mb-2 text-xl font-bold text-white">Sign In Required</h3>
      <p className="mb-6 text-white/70">Sign in to access {feature.toLowerCase()} and all Fair Fight features.</p>
      <SignInButton mode="modal" forceRedirectUrl={returnUrl} fallbackRedirectUrl={returnUrl}>
        <button className="gold-gradient inline-flex items-center rounded-full px-8 py-3 font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20">Sign In to Continue</button>
      </SignInButton>
    </div>
  );
}
