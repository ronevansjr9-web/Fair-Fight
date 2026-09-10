/**
 * Gate for client-side data fetches that require a definitively signed-in user.
 *
 * Clerk's `useAuth().isSignedIn` is `undefined` while auth is still hydrating on
 * the client. Firing an authenticated server fetch during that window can record
 * an `unauthorized` result that is never retried after sign-in resolves, leaving
 * the user stranded on an error screen. Fetch only once auth has definitively
 * resolved to signed-in (`true`); `undefined` (hydrating) and `false` (signed
 * out) both skip the fetch — signed-out users see the AuthenticatedGuard prompt
 * instead.
 */
export function shouldFetchForSignedInUser(isSignedIn: boolean | undefined): boolean {
  return isSignedIn === true;
}

/**
 * How long to wait between an `unauthorized` server response and the retry.
 *
 * Clerk `__session` JWTs are short-lived (~60s). On a fresh page load the Clerk
 * client SDK may not have rotated an expired token yet, so the very first authed
 * fetch can be rejected even though the user is fully signed in. 400ms gives the
 * forced token refresh (`getToken({ skipCache: true })`) time to land before the
 * single retry.
 */
export const UNAUTHORIZED_RETRY_DELAY_MS = 400;

export type AuthRetryOutcome<T> =
  | { state: "ready"; result: T; retriedUnauthorized: boolean }
  | { state: "auth_not_ready" };

/**
 * Fetch authed data with the hard-load token-freshness race handled.
 *
 * Contract:
 * - While Clerk auth is still hydrating (`isSignedIn === undefined`) or signed
 *   out (`false`) the fetch callback is NOT invoked; the caller renders the
 *   AuthenticatedGuard spinner/sign-in prompt instead.
 * - Once signed in, the session token is force-refreshed FIRST so the fetch
 *   never carries a stale/expired `__session` JWT into a server call.
 * - If the server still answers `unauthorized` (e.g. the refresh raced), wait
 *   `UNAUTHORIZED_RETRY_DELAY_MS`, refresh the token again, and retry EXACTLY
 *   once. A second unauthorized answer is returned as-is (no loop); the caller
 *   renders its error state. Any other result is returned after a single fetch.
 *
 * `getToken` is Clerk's `useAuth().getToken`; `isUnauthorized` tells the helper
 * which server response means "the session token was rejected" so every other
 * outcome (not_found, unavailable, loaded data, ...) is passed straight through.
 */
export async function fetchAuthedData<T>(opts: {
  isSignedIn: boolean | undefined;
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>;
  fetch: () => Promise<T>;
  isUnauthorized: (result: T) => boolean;
  retryDelayMs?: number;
}): Promise<AuthRetryOutcome<T>> {
  if (opts.isSignedIn !== true) return { state: "auth_not_ready" };
  await refreshSessionToken(opts.getToken);
  const first = await opts.fetch();
  if (!opts.isUnauthorized(first)) return { state: "ready", result: first, retriedUnauthorized: false };
  // Stale token rejected — rotate it, then retry exactly once.
  await new Promise((resolve) => setTimeout(resolve, opts.retryDelayMs ?? UNAUTHORIZED_RETRY_DELAY_MS));
  await refreshSessionToken(opts.getToken);
  const second = await opts.fetch();
  return { state: "ready", result: second, retriedUnauthorized: true };
}

/**
 * Force the Clerk client SDK to rotate the session token (and the `__session`
 * cookie the server authenticates against). Failures are swallowed: if the
 * token cannot be refreshed the server call itself is the judge.
 */
async function refreshSessionToken(
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>,
): Promise<void> {
  try {
    await getToken({ skipCache: true });
  } catch {
    // Session may have just ended; the fetch will resolve to unauthorized and
    // the guard/error UI handles it.
  }
}