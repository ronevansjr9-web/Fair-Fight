const RESTRICTED_FEATURES = {
  /** Stripe Checkout session creation + webhook entitlement recording (OPEN for live payments). */
  checkoutProActivation: false,
  /** Non-case-scoped paid AI tools /documents + /chat (rebuilt entitlement model required first). */
  generativeProTools: true,
  /** Self-serve deletion of all user data (files, payments, referrals...). */
  deleteUserData: true,
  /** Self-serve portable export of all user data. */
  exportUserData: true,
  /** Evidence file uploads (no `files` migration on master). */
  evidenceUploads: true
};
const TEMP_UNAVAILABLE_MESSAGE = "This feature is temporarily unavailable while we finish safety verification. We're restoring it as soon as possible — your legal education, legal research, and core case tools are unaffected.";
function tempUnavailableError() {
  return { error: TEMP_UNAVAILABLE_MESSAGE };
}
function shouldTrackCheckoutSuccess() {
  return true;
}
export {
  RESTRICTED_FEATURES as R,
  TEMP_UNAVAILABLE_MESSAGE as T,
  shouldTrackCheckoutSuccess as s,
  tempUnavailableError as t
};
