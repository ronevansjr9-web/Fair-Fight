/**
 * First-party server-side error reporting for the fully-operational mandate.
 *
 * TanStack Start (v1.158, this repo) has no global server-error hook, so the
 * highest-risk server functions (payment checkout, AI generation, export /
 * delete) are wrapped with `withErrorReporting`, which reports the failure to
 * the same first-party `error_events` table the client hooks use (source =
 * 'server') and RETHROWS — wrapping never changes the caller's behavior.
 *
 * Deliberately NOT a process-level uncaughtException hook: attaching one
 * changes Node/Bun's default crash-and-restart semantics, which would alter
 * the platform's recovery behavior. Reporting is scoped to the functions that
 * can be wrapped without side effects.
 *
 * PII-free by contract: only the error message, a truncated stack, a fixed
 * source label, an optional fixed url, and an optional Clerk user id are
 * stored — never request bodies, never case content, never notes text.
 */
import { sql } from "~/db";

export const MAX_SERVER_MESSAGE = 500;
export const MAX_SERVER_STACK = 2000;

export interface ServerErrorContext {
  /** Stable label — e.g. "payment_checkout", "ai_generation", "export_user_data". */
  source: string;
  /** Optional fixed path to attribute the failure to. */
  url?: string;
  /** Optional authenticated Clerk user id when trivially available. */
  userId?: string;
}

/** Extract a safe, capped message from any thrown value. Pure — testable. */
export function serverErrorMessage(error: unknown): string {
  if (typeof error === "string") return error.slice(0, MAX_SERVER_MESSAGE);
  if (error instanceof Error) return error.message.slice(0, MAX_SERVER_MESSAGE);
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string" && m) return m.slice(0, MAX_SERVER_MESSAGE);
  }
  return "Unknown server error";
}

/** Extract a capped stack trace when the thrown value carries one. Pure. */
export function serverErrorStack(error: unknown): string | null {
  if (error && typeof error === "object" && "stack" in error) {
    const s = (error as { stack?: unknown }).stack;
    if (typeof s === "string" && s) return s.slice(0, MAX_SERVER_STACK);
  }
  return null;
}

/**
 * Best-effort INSERT into error_events (source='server'). Never throws — the
 * report must not take down the request that is already failing. The write is
 * fire-and-forget from `withErrorReporting` so a slow/hung DB cannot delay
 * the real error path.
 */
export async function reportServerError(
  error: unknown,
  ctx: ServerErrorContext,
): Promise<void> {
  try {
    const message = serverErrorMessage(error);
    const stack = serverErrorStack(error);
    await sql()`INSERT INTO error_events (source, message, stack, url, user_id)
      VALUES ('server', ${message}, ${stack}, ${ctx.url ?? null}, ${ctx.userId ?? null})`;
  } catch (reportError) {
    console.error("[ERROR-REPORT] failed to record server error:", reportError);
  }
}

/**
 * Wrap an async server-side operation: run it, and on failure report the
 * error (fire-and-forget, best-effort) then RETHROW unchanged. Behavior of
 * the wrapped call is otherwise untouched — a thrown error still propagates
 * to the caller's existing try/catch exactly as before.
 */
export async function withErrorReporting<T>(
  source: string,
  fn: () => Promise<T>,
  ctx?: Omit<ServerErrorContext, "source">,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    void reportServerError(error, { source, ...(ctx ?? {}) });
    throw error; // rethrow — wrapping never changes behavior
  }
}