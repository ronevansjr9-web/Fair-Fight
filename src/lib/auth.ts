/**
 * Server-side Clerk auth helpers.
 *
 * WHY THIS FILE EXISTS (P0 fix — verified against installed packages, not docs):
 *
 * - `@clerk/tanstack-start@0.11.5` exports `getAuth(request: Request, opts?)`.
 *   Its implementation (dist/server/getAuth.js) THROWS when no request is
 *   passed ("noFetchFnCtxPassedInGetAuth"). Every previous call site used
 *   `getAuth()` bare or `getAuth(ctx)` where `ctx` is a TanStack Start
 *   `ServerFnCtx` ({ data, serverFnMeta, context, method } — NO Request), so
 *   every authenticated server function / API route crashed at runtime.
 *
 * - TanStack Start server-function handlers do NOT receive the Request on
 *   their context. The supported way to obtain it is `getRequest()` from
 *   `@tanstack/react-start/server`, which reads the AsyncLocalStorage event
 *   created by the Start request handler (so it works inside any server fn
 *   handler and any API route). API route handlers additionally receive
 *   `{ request }` directly — pass that Request in for explicitness.
 *
 * - `AuthObject` (from `@clerk/backend`) has NO `user` property. The old code
 *   read `auth.user?.primaryEmailAddress?.emailAddress`, which was always
 *   `undefined` and silently passed empty email data to Stripe / exports.
 *   Email must be resolved through the Clerk Backend API (`clerkClient`).
 */
import { getRequest } from "@tanstack/react-start/server";

/**
 * Resolve the Clerk AuthObject for the current request.
 *
 * - Inside a server-fn handler: call `getCurrentAuth()` — the Request is
 *   pulled from the request lifecycle via `getRequest()`.
 * - Inside an API route handler: call `getCurrentAuth(request)` with the
 *   handler's `{ request }` argument.
 */
export async function getCurrentAuth(request?: Request) {
  const { getAuth } = await import("@clerk/tanstack-start/server");
  return getAuth(request ?? getRequest());
}

/**
 * Resolve a user's primary email address via the Clerk Backend API.
 *
 * Returns `null` when unavailable (API failure, missing CLERK_SECRET_KEY, or
 * no primary email) so callers can fail safely — never silently pass an empty
 * string as customer/email data.
 */
export async function getPrimaryEmail(userId: string): Promise<string | null> {
  try {
    const { clerkClient } = await import("@clerk/tanstack-start/server");
    const user = await clerkClient().users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    return null;
  }
}
