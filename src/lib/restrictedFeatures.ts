/**
 * P0 SAFETY RESTRICTIONS — temporary fail-closed gates for unverified
 * customer flows.
 *
 * Background (2026-08-12 source audit): Checkout/Pro activation, self-serve
 * deletion/export, and evidence uploads are not yet verified end-to-end:
 *   - One-time Stripe Checkout does not yet grant a verified durable Pro
 *     entitlement (no webhook/production-origin/authenticated test evidence).
 *   - The deletion/export flow can omit uploaded files and payment/subscription
 *     records, uses mismatched timeline/calendar tables, and is not
 *     transactional.
 *   - The `files` table has no migration on master; `/api/upload` is not
 *     registered as a TanStack route, so uploaded evidence is not durable.
 *
 * Until each flow is repaired, tested, and deployed behind an approved
 * process, every UI and server/API entry point for these flows fails closed
 * with an honest "temporarily unavailable" response.
 *
 * NOT gated (per the business plan): public legal education and legal research,
 * statutes/case law/court rules, sign-in, and the durable case / timeline /
 * calendar surfaces.
 *
 * ── IMPORTANT: what clearing a flag does and does NOT do ──────────────────
 *
 * A flag below is a temporary fail-closed gate over one unverified flow. It
 * does NOT by itself restore a working flow. This change did two different
 * kinds of work, and re-enabling each flow needs both:
 *
 *   (a) Flows whose implementations were KEPT behind the flag (only gated):
 *       - Stripe Checkout / customer-portal session creation (lib/stripe.ts)
 *       - Evidence uploadFile (lib/storage.ts)
 *       - API routes: /api/upload, /api/user/export-data,
 *         /api/user/delete-data, /api/stripe/webhook
 *       - ProGate.checkProAccess and legal-argument.generateArgument
 *       For these, clearing the flag re-exposes the existing implementation,
 *       which must first be repaired, covered by tests, and enabled through a
 *       controlled deploy.
 *
 *   (b) Flows whose implementations were REMOVED or replaced by this change:
 *       - the `startCheckout` server function and the purchase funnel
 *         (replaced by the ProGate unavailable panel),
 *       - the evidence-manager UI (upload form, file list, delete actions —
 *         replaced by the unavailable panel),
 *       - the self-serve export/delete server-fn handlers in
 *         routes/data-request.tsx (their working bodies were removed and both
 *         now return the temporary-unavailable error unconditionally),
 *       - the profile storage/payment-history lookups in routes/profile.tsx
 *         (removed; the page reports an honest unavailable state).
 *       For these, clearing the flag alone does NOT restore anything: the
 *       implementation must be rebuilt first, then verified end-to-end, then
 *       the flag cleared through a controlled deploy.
 *
 * So the rule is: clear a flag ONLY as the last step of re-enabling its
 * flow — never as the re-enabling action itself.
 */
export const RESTRICTED_FEATURES = {
  /** Stripe Checkout session creation + webhook entitlement recording. */
  checkoutProActivation: true,
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
