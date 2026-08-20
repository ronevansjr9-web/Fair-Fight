/**
 * Client-side Clerk sign-in-ticket handoff.
 *
 * Clerk's Backend API can mint a one-time sign-in ticket
 * (`POST /v1/sign_in_tokens`).  The sanctioned way to consume it in a browser
 * is to open the app with `?__clerk_ticket=<token>`.  On this TanStack Start
 * SPA the embedded ClerkProvider only auto-processes that parameter when some
 * code actually reads it and drives the custom `signIn.create()` flow — there
 * is no dedicated sign-in route and the modal-only UI never consumed it.
 * Direct Frontend-API calls from the page are CORS-blocked, so we use the
 * maintained `@clerk/tanstack-react-start` hooks instead (which re-export the
 * signal-based API from `@clerk/react`).
 *
 * The flow (documented Clerk custom-flow API):
 *   1. `signIn.create({ strategy: "ticket", ticket })`
 *   2. on success the resource status becomes `'complete'` and
 *      `createdSessionId` is set
 *   3. `signIn.finalize()` sets that freshly created session as the active one
 *
 * Safety rules honored here:
 *   - The ticket is only read in the browser (never during SSR).
 *   - The ticket is NEVER logged and never written to any store.
 *   - No user is auto-created (`signUpIfMissing` is never set).
 *   - Normal password / OAuth / SSO sign-in is untouched.
 *   - The one-time ticket is stripped from the URL after handling so a reload
 *     cannot attempt to reuse it.
 *
 * This module keeps the browser-only + account-independent logic in tiny pure
 * functions so they can be unit-tested under bun without any DOM or Clerk
 * context.
 */

export const TICKET_PARAM = "__clerk_ticket";

/**
 * Read the ticket from a raw `location.search` string.
 * Returns the ticket value, or `""` when absent.
 */
export function getTicketFromSearch(search: string): string {
  if (!search) return "";
  return new URLSearchParams(search).get(TICKET_PARAM) ?? "";
}

/**
 * Return the query-string portion (leading `?`) with the ticket parameter
 * removed. Preserves `pathname` for building the replacement URL. When no
 * ticket is present, returns the original `search` unchanged.
 *
 * `pathname` may be provided so the result is a full replacement URL for
 * history.replaceState; if `pathname` is omitted the caller passes the
 * resulting string back into a URL that already carries the query.
 */
export function withoutTicketParam(search: string, pathname = ""): string {
  if (!search || !search.includes(TICKET_PARAM)) {
    return pathname ? `${pathname}${search}` : search;
  }
  const params = new URLSearchParams(search);
  params.delete(TICKET_PARAM);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Minimal, mock-friendly adapter over the Clerk `SignInFutureResource`.
 * The real implementation binds `signIn.create` / `signIn.finalize` and reads
 * `signIn.status`; tests substitute a fake with the same shape.
 */
export interface SignInTicketAdapter {
  create: (params: { strategy: "ticket"; ticket: string }) => Promise<{ error: unknown }>;
  finalize: () => Promise<{ error: unknown }>;
  /** Current `SignInStatus` ("complete" when the ticket created a session). */
  getStatus: () => string | null;
}

export type ConsumeTicketResult =
  | { status: "complete" }
  | { status: "error"; reason?: string };

/**
 * Consume a one-time ticket and (on success) finalize the created session so
 * it becomes active. Errors are swallowed into a result — the token is never
 * surfaced. Returns `{ status: "error" }` when the ticket is empty, the create
 * fails, the sign-in is not complete, or finalize fails.
 */
export async function consumeTicket(
  adapter: SignInTicketAdapter,
  ticket: string,
): Promise<ConsumeTicketResult> {
  if (!ticket || !adapter || typeof adapter.create !== "function") {
    return { status: "error", reason: "missing-input" };
  }
  try {
    const created = await adapter.create({ strategy: "ticket", ticket });
    if (created?.error) {
      return { status: "error", reason: "create-failed" };
    }
    if (adapter.getStatus() !== "complete") {
      return { status: "error", reason: "not-complete" };
    }
    const finalized = await adapter.finalize();
    if (finalized?.error) {
      return { status: "error", reason: "finalize-failed" };
    }
    return { status: "complete" };
  } catch {
    // Never rethrow — a failing ticket must not crash the page.
    return { status: "error", reason: "threw" };
  }
}
