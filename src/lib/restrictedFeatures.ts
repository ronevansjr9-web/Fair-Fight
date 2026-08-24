/**
 * FAIL-CLOSED GATES over unverified customer flows.
 *
 * Background (2026-08-12 source audit, updated 2026-08 for the live-checkout
 * launch): several high-risk flows were gated closed pending end-to-end
 * verification. Checkout is now OPEN, the rest remain gated:
 *
 *   - checkoutProActivation (OPEN): the $99 one-time Stripe Checkout /
 *     customer-portal flow plus webhook entitlement recording is enabled for
 *     LIVE payments, per the owner-approved controlled live-checkout launch.
 *     The gate flag is the owner-approved launch control: flipping it to false
 *     (with the profile payment-history + billing copy restored) is the
 *     defined "open the gate" sequence. Real (non-test) payment is still
 *     confirmed only through the coordinated live checkout test — nothing is
 *     to be presented as an established live channel until that test passes.
 *
 *   - deleteUserData, exportUserData, evidenceUploads (STILL GATED): the
 *     self-serve data flows and evidence uploads are separate flows, NOT part
 *     of this checkout launch, and remain fail-closed with an honest
 *     "temporarily unavailable" response.
 *
 *   - generativeProTools (STILL GATED): the non-case-scoped paid AI tools
 *     (/documents and /chat) generate on our paid backend for ANY signed-in
 *     user without a per-case entitlement check. They are NOT part of the
 *     $99 case-scoped Pro launch, so they must not be exposed to every
 *     signed-in user just because the checkout gate opened. They remain
 *     fail-closed on this separate flag until a real Pro entitlement model is
 *     built for them. (Analysis / legal-argument, by contrast, are
 *     case-scoped and enforce `hasOwnedCaseEntitlement` server-side, so they
 *     open with the checkout gate.)
 *
 * NOT gated (per the business plan): public legal education and legal research,
 * statutes/case law/court rules, sign-in, and the durable case / timeline /
 * calendar surfaces.
 *
 * ── IMPORTANT: what clearing a flag does and does NOT do ──────────────────
 *
 * A flag below is a fail-closed gate over one flow. For flows whose
 * implementations were KEPT behind the flag (Stripe Checkout / portal, evidence
 * uploadFile, the webhook, ProGate/analysis/legal-argument entitlement), Open
 * re-exposes the existing, tested implementation. For flows whose
 * implementations were REMOVED or replaced while gated (the self-serve
 * export/delete handlers in routes/data-request.tsx, the evidence-manager UI,
 * the documents/chat generative surfaces), clearing the flag alone does NOT
 * restore anything — the implementation must be rebuilt first, then verified
 * end-to-end, then the flag cleared through a controlled deploy.
 *
 * So the rule is: clear a flag ONLY as the last step of re-enabling its
 * flow — never as the re-enabling action itself.
 */
export const RESTRICTED_FEATURES = {
  /** Stripe Checkout session creation + webhook entitlement recording (OPEN for live payments). */
  checkoutProActivation: false,
  /** Non-case-scoped paid AI tools /documents + /chat (rebuilt entitlement model required first). */
  generativeProTools: true,
  /** Self-serve deletion of all user data (files, payments, referrals...). */
  deleteUserData: true,
  /** Self-serve portable export of all user data. */
  exportUserData: true,
  /** Evidence file uploads (no `files` migration on master). */
  evidenceUploads: true,
} as const;

/** Honest, temporary-unavailable message shown to users. */
export const TEMP_UNAVAILABLE_MESSAGE =
  "This feature is temporarily unavailable while we finish safety verification. We're restoring it as soon as possible — your legal education, legal research, and core case tools are unaffected.";

/** HTTP status used by API routes when a restricted flow is attempted. */
export const TEMP_UNAVAILABLE_STATUS = 503;

/** Standard fail-closed payload for server functions. */
export function tempUnavailableError(): { error: string } {
  return { error: TEMP_UNAVAILABLE_MESSAGE };
}

/**
 * Whether client-controlled `?checkout=success` analytics may fire. The
 * checkout flow is restricted, so a client-supplied return parameter must not
 * be trusted to record a completed purchase. Re-enables automatically once
 * checkoutProActivation is cleared.
 */
export function shouldTrackCheckoutSuccess(): boolean {
  return !RESTRICTED_FEATURES.checkoutProActivation;
}
