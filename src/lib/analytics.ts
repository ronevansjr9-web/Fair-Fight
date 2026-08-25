/**
 * First-party, privacy-respecting analytics.
 *
 * Events and page views are POSTed to our own /api/track endpoint and stored
 * in Postgres (`analytics_events`). There is no third-party analytics script;
 * session identity is a random id kept in sessionStorage for the life of the
 * tab (no cookies). All sends are fire-and-forget and non-blocking — analytics
 * must never affect page load or the payment path.
 */

export const AnalyticsEvents = {
  SIGNUP_COMPLETED: "signup_completed",
  CASE_CREATED: "case_created",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  AI_ANALYSIS_RUN: "ai_analysis_run",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

const API_TRACK_URL = "/api/track";
const SESSION_KEY = "ff_session_id";
const UTM_KEY = "ff_utm";

export interface TrackStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function makeRandomId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Return a stable, tab-scoped session id, creating and persisting one the first
 * time it is seen. Falls back to a fresh random id if storage is unavailable.
 */
export function getOrCreateSessionId(storage: TrackStorage | null | undefined): string {
  if (!storage) return makeRandomId();
  try {
    const existing = storage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = makeRandomId();
    storage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return makeRandomId();
  }
}

/** Session id for the current tab (empty on the server). */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  return getOrCreateSessionId(window.sessionStorage);
}

/**
 * Read persisted UTM params from storage (populated by the UTM-capture script
 * in the root layout). Returns null on the server or when none are present.
 */
export function readUtmFrom(storage: TrackStorage | null | undefined): Record<string, string> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(UTM_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") out[key] = value;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** UTM params for the current tab (null on the server). */
export function getUTMParams(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  return readUtmFrom(window.sessionStorage);
}

export interface TrackPayload {
  route: string;
  ref: string | null;
  utm: Record<string, string> | null;
  session_id: string;
  ev: string | null;
}

/** Build the on-the-wire payload. Pure — unit-testable without a browser. */
export function buildTrackPayload(params: {
  route: string;
  ref?: string | null;
  utm?: Record<string, string> | null;
  sessionId: string;
  ev?: string | null;
}): TrackPayload {
  return {
    route: params.route,
    ref: params.ref ?? null,
    utm: params.utm ?? null,
    session_id: params.sessionId,
    ev: params.ev ?? null,
  };
}

/**
 * Fire-and-forget POST to /api/track. Prefers navigator.sendBeacon; falls back
 * to fetch with keepalive. Never throws and never blocks the caller.
 */
export function sendAnalyticsBody(payload: TrackPayload): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify(payload);
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.sendBeacon === "function") {
      nav.sendBeacon(API_TRACK_URL, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(API_TRACK_URL, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {
        /* fire-and-forget — ignore failures */
      });
    }
  } catch {
    /* analytics must never break the app */
  }
}

function currentContext(): Omit<TrackPayload, "ev"> {
  const ref = typeof document !== "undefined" && document.referrer ? document.referrer.slice(0, 1000) : null;
  return {
    route: window.location.pathname + window.location.search,
    ref,
    utm: getUTMParams(),
    session_id: getSessionId(),
  };
}

/** Record a named funnel event (signup, case creation, checkout start/complete). */
export function trackEvent(eventName: string): void {
  if (typeof window === "undefined") return;
  sendAnalyticsBody(buildTrackPayload({ ...currentContext(), ev: eventName }));
}

/** Record a page view for a route (path + search). Called on route change. */
export function trackPageView(route: string): void {
  if (typeof window === "undefined") return;
  sendAnalyticsBody(buildTrackPayload({ ...currentContext(), route }));
}