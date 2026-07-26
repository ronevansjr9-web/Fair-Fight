/**
 * Analytics event tracking helpers.
 * Uses @vercel/analytics for server-side and client-side tracking.
 */

// Event names for key business actions
export const AnalyticsEvents = {
  SIGNUP_COMPLETED: "signup_completed",
  CASE_CREATED: "case_created",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  AI_ANALYSIS_RUN: "ai_analysis_run",
} as const;

/**
 * Track a custom event with Vercel Analytics.
 * Safe to call on both server and client — no-ops gracefully when `va` is unavailable.
 */
export async function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
): Promise<void> {
  try {
    // Dynamic import so it only loads on the client
    const va = await import("@vercel/analytics/react").then((m) => m.va).catch(() => null);
    if (va) {
      va.track(eventName, properties);
    }
  } catch {
    // analytics unavailable — no-op
  }
}

/**
 * Read persisted UTM params from sessionStorage.
 * Returns null on the server side.
 */
export function getUTMParams(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("ff_utm");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Augment event properties with UTM params for attribution.
 */
export function withUTM(
  properties?: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const utm = getUTMParams();
  if (!utm) return properties ?? {};
  return { ...utm, ...(properties ?? {}) };
}
