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
