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
 *   - deleteUserData, exportUserData (STILL GATED): the self-serve data flows
 *     remain fail-closed with an honest "temporarily unavailable" response.
 *
 *   - evidenceUploads (OPEN — Wave 4, 2026-08-25): the Evidence Manager is
 *     REBUILT as a real, durable per-case workspace (migration 008:
 *     `evidence_files` in the existing Neon DB; server fns in src/lib/evidence.ts;
 *     UI in src/routes/evidence.tsx). Evidence is part of the case workspace —
 *     available to the signed-in OWNER of the case (ownership joins on
 *     cases.user_id, same as timeline/calendar) and NOT gated behind the $99
 *     paid AI-tool entitlement. Limits (10 MB per file; PDF/JPG/PNG/WebP/TXT)
 *     are enforced server-side and surfaced in UI copy; the page honestly says
 *     this is educational tooling, not secure legal-grade evidence
 *     preservation. The old uploadFile/api-upload surface (a never-migrated
 *     `files` table) was REMOVED, not un-gated.
 *
 *   - generativeProTools (OPEN — Wave 1, 2026-08-24): the non-case-scoped paid
 *     AI tools (/documents and /chat) are LIVE for verified Pro members. Their
 *     entitlement model was rebuilt first (this Wave 1 change): server-side
 *     Clerk auth, then `hasProMembership(userId)` — the payments table has ≥1
 *     row for that user with status='succeeded' (any verified $99 Pro Case
 *     Analysis purchase; no case-binding for these two member tools, per the
 *     paid-only plan). Signed-out and unpaid users fail closed before any
 *     rate-limit/AI work and see truthful member-tool copy with a dashboard
 *     CTA (analysis / legal-argument stay case-scoped via
 *     `hasOwnedCaseEntitlement` server-side).
 *
 * NOT gated (per the business plan): public legal education and legal research,
 * statutes/case law/court rules, sign-in, and the durable case / timeline /
 * calendar surfaces.
 *
 * ── IMPORTANT: what clearing a flag does and does NOT do ──────────────────
 *
 * A flag below is a fail-closed gate over one flow. For flows whose
 * implementations were KEPT behind the flag (Stripe Checkout / portal, the
 * webhook, ProGate/analysis/legal-argument entitlement), clearing the flag
 * re-exposes the existing, tested implementation. For flows whose
 * implementations were REMOVED or replaced while gated (the self-serve
 * export/delete handlers in routes/data-request.tsx, the documents/chat
 * generative surfaces, the evidence manager), clearing the flag alone does NOT
 * restore anything — the implementation must be rebuilt first, then verified
 * end-to-end, then the flag cleared through a controlled deploy.
 *
 * So the rule is: clear a flag ONLY as the last step of re-enabling its
 * flow — never as the re-enabling action itself.
 */
export const RESTRICTED_FEATURES = {
  /** Stripe Checkout session creation + webhook entitlement recording (OPEN for live payments). */
  checkoutProActivation: false,
  /** Non-case-scoped paid AI tools /documents + /chat (Wave 1: live for verified Pro members via hasProMembership). */
  generativeProTools: false,
  /** Self-serve deletion of all user data (files, payments...). */
  deleteUserData: true,
  /** Self-serve portable export of all user data. */
  exportUserData: true,
  /** Evidence file uploads (Wave 4: rebuilt as a durable per-case workspace — LIVE). */
  evidenceUploads: false,
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
