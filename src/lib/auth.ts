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
function sessionNbfAheadMs(req: Request): number {
  try {
    const raw = req.headers.get("cookie") ?? "";
    const m = raw.match(/(?:^|;\s*)__session=([^;]+)/);
    if (!m) return 0;
    const payload = JSON.parse(
      Buffer.from(m[1].split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    const nbf = payload?.nbf;
    return typeof nbf === "number" ? nbf * 1000 - Date.now() + 1100 : 0;
  } catch {
    return 0;
  }
}

export async function getCurrentAuth(request?: Request) {
  const { createClerkClient } = await import("@clerk/backend");
  const { AuthStatus, stripPrivateDataFromObject } = await import(
    "@clerk/backend/internal"
  );
  const req = request ?? getRequest();

  // TanStack Start's server-fn handler reads the request body (`request.json()`)
  // BEFORE the user handler runs whenever the client sent a payload. That
  // consumes the body stream; Clerk's `authenticateRequest` then CLONES the
  // request internally, and cloning a body-disturbed Request throws
  // "Response body object should not be disturbed or locked" — which sank every
  // POST server fn that carried data (dashboard worked only because it sends
  // no body). Clerk only needs HEADERS (cookies/authorization) to
  // authenticate, so when the body is already consumed we hand it a fresh
  // header-only Request built from the disturbed one (URL + headers are still
  // readable). Auth strength is unchanged: the same cookies/JWT are verified.
  const env = loadEnv();
  const clerk = createClerkClient(env);
  let authRequest = req;
  try {
    req.clone();
  } catch {
    authRequest = new Request(req.url, { method: req.method, headers: req.headers });
  }
  let requestState = await clerk.authenticateRequest(authRequest, {
    signInUrl: process.env.CLERK_SIGN_IN_URL,
    signUpUrl: process.env.CLERK_SIGN_UP_URL,
    afterSignInUrl: process.env.CLERK_AFTER_SIGN_IN_URL,
    afterSignUpUrl: process.env.CLERK_AFTER_SIGN_UP_URL,
  });
  // Defense-in-depth for clock-skewed hosts. Clerk rejects session tokens whose
  // `nbf`/`iat` claims are ahead of the server clock (reasons below). For
  // non-navigational requests (server functions, API routes) the handshake path
  // degrades to signed-out, so a host clock that lags Clerk's FAPI by >~5s makes
  // every authenticated call fail even with a fresh token. When the token is
  // only *not yet valid* (nbf bounded ahead), wait for validity and re-verify
  // the SAME token — every check (signature, audience, issuer, exp, nbf, iat)
  // re-runs unchanged, preserving auth strength.
  if (
    requestState.status === AuthStatus.SignedOut &&
    (requestState.reason === "session-token-nbf" ||
      requestState.reason === "session-token-iat-in-the-future")
  ) {
    const waitMs = sessionNbfAheadMs(req);
    if (waitMs > 0 && waitMs <= 60_000) {
      if (process.env.FF_AUTH_DEBUG === "1") {
        console.error(
          `[auth-debug] ${req.method} ${new URL(req.url).pathname} reason=${requestState.reason} waiting ${waitMs}ms for token validity`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      requestState = await clerk.authenticateRequest(authRequest, {
        signInUrl: process.env.CLERK_SIGN_IN_URL,
        signUpUrl: process.env.CLERK_SIGN_UP_URL,
        afterSignInUrl: process.env.CLERK_AFTER_SIGN_IN_URL,
        afterSignUpUrl: process.env.CLERK_AFTER_SIGN_UP_URL,
      });
    }
  }

  // Temporary diagnostics (env-gated; ship/remove decision in PR#49): log
  // Clerk's authenticateRequest verdict plus which auth-relevant cookies the
  // request carried — NAMES/PRESENCE ONLY, never values. This pinpoints
  // dev-mode secondary-token (__clerk_db_jwt) rejects vs dropped cookies.
  if (process.env.FF_AUTH_DEBUG === "1") {
    try {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const names = new Set(
        cookieHeader
          .split(";")
          .map((c) => c.trim().split("=")[0])
          .filter(Boolean),
      );
      const flags = ["__session", "__client_uat", "__clerk_db_jwt", "__clerk_redirect_count"]
        .map((n) => `${n}:${names.has(n) ? "1" : "0"}`)
        .join(",");
      const url = new URL(req.url);
      const claims = (() => {
        try {
          const m = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/);
          if (!m) return "no-session";
          const [, payloadB64] = m[1].split(".");
          const payload = JSON.parse(
            Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
          );
          const serverNow = Math.floor(Date.now() / 1000);
          return JSON.stringify({
            iat: payload.iat,
            nbf: payload.nbf,
            exp: payload.exp,
            serverNow,
            nbfAheadOfServer: (payload.nbf ?? 0) - serverNow,
          });
        } catch {
          return "decode-failed";
        }
      })();
      console.error(
        `[auth-debug] ${req.method} ${url.pathname} status=${requestState.status} reason=${String(requestState.reason)} cookies=${flags} claims=${claims} location=${requestState.headers.get("location") ? "1" : "0"}`,
      );
    } catch (e) {
      console.error(`[auth-debug] logging failed: ${String(e)}`);
    }
  }

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
