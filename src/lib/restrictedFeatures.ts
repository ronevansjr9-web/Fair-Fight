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
 * NOT gated (per the business plan): free legal education, legal research,
 * statutes/case law/court rules, sign-in, and the durable case / timeline /
 * calendar surfaces.
 *
 * Flip a flag to `false` only when the corresponding flow has been repaired,
 * covered by tests, and enabled through a controlled deploy.
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
  "This feature is temporarily unavailable while we finish safety verification. We're restoring it as soon as possible — free legal education, legal research, and your core case tools are unaffected.";

/** HTTP status used by API routes when a restricted flow is attempted. */
export const TEMP_UNAVAILABLE_STATUS = 503;

/** Standard fail-closed payload for server functions. */
export function tempUnavailableError(): { error: string } {
  return { error: TEMP_UNAVAILABLE_MESSAGE };
}
