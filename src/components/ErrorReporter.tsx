import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import {
  createErrorDedupe,
  createErrorReporter,
  installErrorCapture,
  sendErrorBody,
  type ErrorEventInput,
} from "~/lib/errorReporter";

/**
 * First-party error capture (client side). Rendered once in the root layout
 * (inside ClerkProvider — errors also occur on public pages).
 *
 * SSR-SAFETY: every browser/Clerk read happens inside `useEffect` or a
 * handler — never at render time. `useEffect` never runs during server
 * rendering, so window.onerror / unhandledrejection are installed only after
 * hydration, and no window access happens at module scope.
 *
 * The authenticated Clerk user id is attached to each report WHEN TRIVIALLY
 * AVAILABLE (already-signed-in sessions); anonymous/pre-auth errors report
 * without a user id. The payload never contains case content, notes text, or
 * request bodies — see src/lib/errorReporter.ts for the fail-closed contract.
 */
export function ErrorReporter() {
  const auth = useAuth();
  const userIdRef = useRef<string | null>(null);

  // Keep the current Clerk user id available to the global hooks without
  // re-installing them on every auth change.
  useEffect(() => {
    userIdRef.current = auth.userId ?? null;
  }, [auth.userId]);

  useEffect(() => {
    // Client-only, after hydration. Lazy-init: nothing is installed during
    // SSR and the hooks are removed if the component ever unmounts.
    const report = createErrorReporter({
      dedupe: createErrorDedupe({ now: () => Date.now() }),
      send: sendErrorBody,
      context: () => ({
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
      }),
    });
    const send = (input: ErrorEventInput): void => {
      report({
        ...input,
        userId: userIdRef.current ?? undefined,
      });
    };
    return installErrorCapture(window, send);
  }, []);

  return null;
}