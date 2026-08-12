import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentAuth } from "~/lib/auth";
import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
} from "~/lib/restrictedFeatures";
import { hasOwnedCaseEntitlement } from "~/lib/argumentAccess";

export const checkProAccess = createServerFn({ method: "GET" }).validator((v: unknown) => { const caseId = (v as any)?.caseId; if (typeof caseId !== "string" || !/^[A-Za-z0-9_-]+$/.test(caseId)) throw new Error("A case is required"); return { caseId }; }).handler(async ({ data }) => {
  try {
    const auth = await getCurrentAuth();
    if (!auth.userId) return { hasAccess: false, isAuthenticated: false };
    // P0 fail-closed gate: Pro activation is not yet verified, so no new
    // entitlement can exist. Only pre-existing paid entitlements (if any)
    // keep working.
    if (RESTRICTED_FEATURES.checkoutProActivation) {
      return { hasAccess: false, isAuthenticated: true };
    }
    try {
      const hasAccess = await hasOwnedCaseEntitlement(auth.userId, data.caseId);
      return { hasAccess, isAuthenticated: true };
    } catch { return { hasAccess: false, isAuthenticated: true }; }
  } catch { return { hasAccess: false, isAuthenticated: false }; }
});

interface ProGateProps { feature: string; caseId?: string; children: React.ReactNode; }

export function ProGate({ feature, caseId, children }: ProGateProps) {
  const [hasPro, setHasPro] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let c = false;
    // Access is exact-case: without a selected owned case there is nothing to
    // authorize, so there is no access.
    if (!caseId || !/^[A-Za-z0-9_-]+$/.test(caseId)) {
      setHasPro(false);
      setIsChecking(false);
      return () => { c = true; };
    }
    setIsChecking(true);
    checkProAccess({ data: { caseId } }).then(r => { if (!c) { setHasPro(r.hasAccess); setIsChecking(false); } }).catch(() => { if (!c) setIsChecking(false); });
    return () => { c = true; };
  }, [caseId]);

  if (isChecking) return <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" /></div>;
  if (hasPro) return <>{children}</>;
  // Fail-closed: Pro activation is temporarily unavailable, so present the
  // honest status instead of a purchase/sign-in funnel.
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
        <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="mb-2 text-xl font-bold text-white">{feature} — Temporarily Unavailable</h3>
      <p className="mx-auto mb-2 max-w-xl text-white/70">{TEMP_UNAVAILABLE_MESSAGE}</p>
      <p className="text-sm text-white/40">
        Free legal education, legal research, statutes, case law, and court rules remain free and available.
      </p>
    </div>
  );
}
