/**
 * First-party, PII-free error capture (client side).
 *
 * Part of the "fully operational" mandate: in-app error capture with NO
 * external service. `installErrorCapture` wires window.onerror +
 * unhandledrejection hooks that report minimal error metadata to our own
 * /api/errors endpoint, stored in Postgres (`error_events`). No Sentry, no
 * third-party script, no case content, no request bodies, no notes text.
 *
 * Fail-closed and loop-safe by construction:
 *   - the reporter never throws — any failure inside its own send path drops
 *     the event and never surfaces an exception (which would itself re-enter
 *     window.onerror and recurse);
 *   - a guard flag drops events that arrive while the reporter is already
 *     inside its own send path (re-entrancy / recursion protection);
 *   - naive dedupe: the same message+url within 30s is dropped;
 *   - all sends are fire-and-forget (sendBeacon / fetch keepalive) and never
 *     block rendering;
 *   - SSR-safe: no window/document/navigator access at module scope; the
 *     hooks are installed only from a useEffect (client-only, after
 *     hydration). The React component (src/components/ErrorReporter.tsx)
 *     supplies the authenticated Clerk user id when trivially available.
 */

export const ERROR_API_URL = "/api/errors";

export const MAX_MESSAGE = 500;
export const MAX_STACK = 2000;
export const MAX_URL = 500;
export const MAX_USER_AGENT = 500;
export const MAX_USER_ID = 200;
export const DEDUPE_WINDOW_MS = 30_000;

export interface ErrorEventInput {
  /** Required — the error message (e.g. `event.message` or `error.message`). */
  message: string;
  /** Optional — the stack trace text. */
  stack?: string | null;
  /** Optional — the page path ("/dashboard?x=1"). */
  url?: string | null;
  /** Optional — authenticated Clerk user id (null pre-auth). */
  userId?: string | null;
}

export interface ErrorEventPayload {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
  userId?: string;
}

/** Truncate a string to `max` chars without ever allocating past the cap. */
export function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Build the on-the-wire payload from raw event data. Purely defensive: every
 * field is coerced, capped, and never allowed to carry more than its budget —
 * the endpoint re-validates strictly server-side.
 */
export function buildErrorPayload(params: {
  message: string;
  stack?: string | null;
  url?: string | null;
  userId?: string | null;
  userAgent?: string;
  timestamp: string;
}): ErrorEventPayload {
  const payload: ErrorEventPayload = {
    message: truncate(params.message.trim() || "Unknown error", MAX_MESSAGE),
    timestamp: truncate(params.timestamp || new Date().toISOString(), 64),
  };
  if (params.stack) payload.stack = truncate(params.stack, MAX_STACK);
  if (params.url) payload.url = truncate(params.url, MAX_URL);
  if (params.userAgent) {
    payload.userAgent = truncate(params.userAgent, MAX_USER_AGENT);
  }
  if (params.userId) payload.userId = truncate(params.userId, MAX_USER_ID);
  return payload;
}

/**
 * Naive client-side dedupe: returns true when the same message+url was seen
 * within `windowMs` (default 30s), so a thrown-in-a-loop error can't flood
 * the table. Pure with an injectable clock — unit-testable without a browser.
 */
export function createErrorDedupe(deps: {
  now: () => number;
  windowMs?: number;
}): (message: string, url: string) => boolean {
  const windowMs = deps.windowMs ?? DEDUPE_WINDOW_MS;
  const seen = new Map<string, number>();
  return function shouldDrop(message: string, url: string): boolean {
    const now = deps.now();
    const key = `${truncate(message, MAX_MESSAGE)}\u0000${truncate(url || "", MAX_URL)}`;
    const last = seen.get(key);
    if (last !== undefined && now - last < windowMs) return true; // drop
    // Naive pruning: forget anything outside the window (bounded by volume in
    // the window — fine for the low-rate error pipeline).
    if (seen.size > 64) {
      for (const [k, t] of seen) {
        if (now - t >= windowMs) seen.delete(k);
      }
    }
    seen.set(key, now);
    return false;
  };
}

/**
 * Fire-and-forget POST to /api/errors. Prefers navigator.sendBeacon; falls
 * back to fetch with keepalive. Never throws and never blocks the caller.
 */
export function sendErrorBody(payload: ErrorEventPayload): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify(payload);
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.sendBeacon === "function") {
      nav.sendBeacon(ERROR_API_URL, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(ERROR_API_URL, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {
        /* fire-and-forget — ignore failures */
      });
    }
  } catch {
    /* error capture must never break the app */
  }
}

/**
 * The fail-closed reporter core: dedupe -> build payload -> send. A guard
 * flag makes it non-reentrant, so a failure inside `send` (or an error
 * raised while marshalling window state) can never loop back into the
 * window.onerror hook. Never throws. `context` supplies the browser-derived
 * fields so the core stays pure and unit-testable.
 */
export interface ErrorReporterDeps {
  dedupe: (message: string, url: string) => boolean;
  send: (payload: ErrorEventPayload) => void;
  context?: () => { userAgent?: string; timestamp: string };
}

export function createErrorReporter(deps: ErrorReporterDeps) {
  let inFlight = false;
  const context = deps.context ?? (() => ({ timestamp: new Date().toISOString() }));
  return function report(input: ErrorEventInput): void {
    if (inFlight) return; // loop guard — never recurse into the reporter
    inFlight = true;
    try {
      if (deps.dedupe(input.message, input.url || "")) return; // drop duplicate
      const ctx = context();
      const payload = buildErrorPayload({
        message: input.message,
        stack: input.stack ?? null,
        url: input.url ?? null,
        userId: input.userId ?? null,
        userAgent: ctx.userAgent,
        timestamp: ctx.timestamp,
      });
      deps.send(payload);
    } catch {
      // The reporter must never throw — dropping the event is correct and
      // fail-closed (any exception here would otherwise re-enter onerror).
    } finally {
      inFlight = false;
    }
  };
}

/** Minimal structural view of the browser globals the capture needs. */
export interface ErrorCaptureWindow {
  addEventListener(type: string, handler: (event: unknown) => void): void;
  removeEventListener(type: string, handler: (event: unknown) => void): void;
  location: { pathname: string; search: string };
  navigator: { userAgent: string };
}

export interface ErrorEventLike {
  message?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: unknown;
}

function stackOf(value: unknown): string | null {
  if (value && typeof value === "object" && "stack" in value) {
    const s = (value as { stack?: unknown }).stack;
    if (typeof s === "string" && s) return s;
  }
  return null;
}

function messageOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && "message" in value) {
    const m = (value as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  try {
    return JSON.stringify(value) || "Unknown error";
  } catch {
    return "Unknown error";
  }
}

/**
 * Install window.onerror + unhandledrejection capture. CLIENT-ONLY: call from
 * a useEffect after hydration — never at module scope or during SSR. Returns
 * a cleanup that removes both hooks (idempotent).
 */
export function installErrorCapture(
  win: ErrorCaptureWindow,
  report: (input: ErrorEventInput) => void,
): () => void {
  const currentUrl = () => `${win.location.pathname}${win.location.search}`.slice(0, MAX_URL);

  const onError = (event: ErrorEventLike) => {
    report({
      message: messageOf(event?.message ?? ""),
      stack: stackOf(event?.error) ?? undefined,
      url: currentUrl(),
      // userId is attached by the React component; the raw hook input never
      // carries user data beyond message/stack/url.
    });
  };

  const onUnhandledRejection = (event: unknown) => {
    const e = event as { reason?: unknown } | null;
    const reason = e && typeof e === "object" && "reason" in e ? e.reason : e;
    report({
      message: messageOf(reason),
      stack: stackOf(reason) ?? undefined,
      url: currentUrl(),
    });
  };

  win.addEventListener("error", onError);
  win.addEventListener("unhandledrejection", onUnhandledRejection);
  return () => {
    win.removeEventListener("error", onError);
    win.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}