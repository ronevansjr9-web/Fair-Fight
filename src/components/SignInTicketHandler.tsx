/**
 * SignInTicketHandler — consumes a Clerk one-time sign-in ticket carried in the
 * URL as `?__clerk_ticket=<token>`.
 *
 * Mounted inside <ClerkProvider> at the root/auth boundary (see __root.tsx) so
 * it is (a) within the Clerk context and (b) never rendered above the provider
 * (the clerk-ssr-safe pattern). It:
 *   - detects `__clerk_ticket` ONLY in the browser (client effect);
 *   - waits for Clerk to load, and no-ops when already signed in;
 *   - calls the maintained @clerk/tanstack-react-start signal API
 *     (`signIn.create({ strategy: "ticket", ticket })` then `finalize()`);
 *   - never logs the token, never auto-creates a user, never touches normal
 *     password/OAuth sign-in;
 *   - strips the one-time ticket from the URL via history.replaceState so a
 *     reload / share can't reuse it.
 */
import { useEffect, useRef } from "react";
import { useAuth, useSignIn } from "@clerk/tanstack-react-start";
import {
  consumeTicket,
  getTicketFromSearch,
  withoutTicketParam,
} from "~/lib/signInTicket";

export function SignInTicketHandler() {
  const auth = useAuth();
  const { signIn } = useSignIn();
  const started = useRef(false);

  useEffect(() => {
    // No-op unless we're in the browser and Clerk has loaded.
    if (started.current) return;
    if (typeof window === "undefined") return;
    if (!auth.isLoaded) return;

    const ticket = getTicketFromSearch(window.location.search);
    if (!ticket) return;
    started.current = true;

    // Strip the one-time ticket from the address bar IMMEDIATELY — before any
    // async work — so a reload or Clerk's own post-finalize navigation cannot
    // resurrect or reuse it. Runs regardless of sign-in state.
    cleanupTicketParam();

    // Already authenticated (e.g. a stale ticket param on an existing
    // session): nothing to consume, the URL is now clean.
    if (auth.isSignedIn) return;

    // Bind the signal resource's methods once so they stay stable.
    const adapter =
      signIn && typeof signIn.create === "function"
        ? {
            create: signIn.create.bind(signIn),
            finalize: signIn.finalize.bind(signIn),
            getStatus: () => signIn.status ?? null,
          }
        : null;

    (async () => {
      if (!adapter) return;
      await consumeTicket(adapter, ticket).catch(() => undefined);
    })().finally(() => {
      // Re-assert a clean URL after the async settles as a safety net.
      cleanupTicketParam();
    });
  }, [auth.isLoaded, auth.isSignedIn, signIn]);

  return null;
}

function cleanupTicketParam() {
  try {
    const next = withoutTicketParam(
      window.location.search,
      window.location.pathname,
    );
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", next);
    }
  } catch {
    /* history.replaceState unavailable — ignore, param clears on nav */
  }
}
