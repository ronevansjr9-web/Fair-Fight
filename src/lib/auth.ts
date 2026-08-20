/**
 * Server-side Clerk auth helpers.
 *
 * WHY THIS FILE EXISTS (P0 fix — verified against installed packages, not docs):
 *
 * - The legacy `@clerk/tanstack-start@0.11.5` server helpers (`getAuth`,
 *   `clerkClient`) build their options via `loadOptions`/`commonEnvs`, which
 *   call `getEvent()` from `vinxi/http`. That reads `globalThis.app.config`,
 *   which does NOT exist in Fair Fight's runtime (TanStack Start's generated
 *   fetch handler is mounted via `src/serve.ts` and `Bun.serve` — there is no
 *   Vinxi app global). Every authenticated server function / API route that
 *   resolved Clerk auth crashed at runtime with
 *   `TypeError: Cannot read properties of undefined (reading 'config')`.
 *
 * - The maintained successor `@clerk/tanstack-react-start` does NOT export a
 *   `getAuth(request)` that accepts an explicit Request. Its server `auth()`
 *   takes no request; it reads `getGlobalStartContext().auth`, which is only
 *   populated when a `clerkMiddleware` (TanStack Start server middleware)
 *   wraps the request handler. Fair Fight's API-route handlers depend on
 *   `getCurrentAuth(request)` passing an explicit Request, and the app does not
 *   install a Clerk middleware chain around `Bun.serve`. Adopting that model
 *   would require rearchitecting the serve/router integration and would break
 *   the `getCurrentAuth(request?)` abstraction its callers rely on.
 *
 * - Therefore the contained fix: authenticate through `@clerk/backend`
 *   directly (the same engine the legacy package delegated to underneath),
 *   reading Clerk options from `process.env` instead of the Vinxi event
 *   context. `getEnvVariable` in the legacy path falls back to `process.env`
 *   when no Vinxi event context exists, so the values are identical — only the
 *   `globalThis.app` dereference is removed. This preserves the
 *   `getCurrentAuth(request?)` signature and every caller, removes the Vinxi
 *   dependency from the served auth path, and does not weaken auth.
 *
 * - `AuthObject` (from `@clerk/backend`) has NO `user` property. Email must be
 *   resolved through the Clerk Backend API (`clerkClient`), not `auth.user`.
 */
import { getRequest } from "@tanstack/react-start/server";

/**
 * Clerk client options, read directly from `process.env`.
 *
 * Mirrors the options the legacy `loadOptions()` produced from the (absent)
 * Vinxi event context; `getEnvVariable` falls back to `process.env`, which is
 * exactly where the platform injects these values. Omitting an unset variable
 * lets `@clerk/backend` apply its own defaults (e.g. `apiUrl` derived from the
 * publishable key, dev-mode key handling).
 */
interface ClerkEnv {
  secretKey?: string;
  publishableKey?: string;
  apiUrl?: string;
  jwtKey?: string;
  proxyUrl?: string;
  isSatellite?: boolean;
  domain?: string;
}

function loadEnv(): ClerkEnv {
  return {
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey:
      process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
    apiUrl: process.env.CLERK_API_URL,
    jwtKey: process.env.CLERK_JWT_KEY,
    proxyUrl: process.env.CLERK_PROXY_URL,
    isSatellite: process.env.CLERK_IS_SATELLITE === "true",
    domain: process.env.CLERK_DOMAIN,
  };
}

/**
 * Resolve the Clerk AuthObject for the current request.
 *
 * - Inside a server-fn handler: call `getCurrentAuth()` — the Request is
 *   pulled from the request lifecycle via `getRequest()`.
 * - Inside an API route handler: call `getCurrentAuth(request)` with the
 *   handler's `{ request }` argument.
 */
export async function getCurrentAuth(request?: Request) {
  const { createClerkClient } = await import("@clerk/backend");
  const { AuthStatus, stripPrivateDataFromObject } = await import(
    "@clerk/backend/internal"
  );
  const req = request ?? getRequest();

  const env = loadEnv();
  const requestState = await createClerkClient(env).authenticateRequest(req, {
    signInUrl: process.env.CLERK_SIGN_IN_URL,
    signUpUrl: process.env.CLERK_SIGN_UP_URL,
    afterSignInUrl: process.env.CLERK_AFTER_SIGN_IN_URL,
    afterSignUpUrl: process.env.CLERK_AFTER_SIGN_UP_URL,
  });

  const hasLocationHeader = requestState.headers.get("location");
  if (hasLocationHeader) {
    throw new Response(null, { status: 307, headers: requestState.headers });
  }
  if (requestState.status === AuthStatus.Handshake) {
    throw new Error("Clerk: unexpected handshake without redirect");
  }
  return stripPrivateDataFromObject(requestState.toAuth());
}

/**
 * Resolve a user's primary email via the Clerk Backend API.
 *
 * Returns `null` when unavailable (API failure, missing CLERK_SECRET_KEY, or
 * no primary email) so callers can fail safely — never silently pass an empty
 * string as customer/email data.
 */
export async function getPrimaryEmail(userId: string): Promise<string | null> {
  try {
    const { createClerkClient } = await import("@clerk/backend");
    const user = await createClerkClient(loadEnv()).users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    return null;
  }
}
