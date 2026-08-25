import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { sql } from "~/db";

/**
 * POST /api/track — first-party, privacy-respecting analytics intake.
 *
 * Receives fire-and-forget beacons from the client (navigator.sendBeacon or
 * fetch keepalive) and appends one row to `analytics_events`. No cookies, no
 * third-party scripts, no entitlements — a dropped or invalid beacon must
 * never affect the app or the payment path. Deliberately tiny: validate,
 * insert, return 204.
 *
 * Body (JSON):
 *   route:      string, required — path (e.g. "/learn/small-claims-court-guide")
 *   session_id: string, required — random id stored in sessionStorage
 *   ref:        string, optional — document.referrer
 *   utm:        object, optional — sanitized UTM params from sessionStorage
 *   ev:         string, optional — funnel event name (AnalyticsEvents)
 */

const MAX_ROUTE = 500;
const MAX_REF = 1000;
const MAX_SESSION = 200;
const MAX_EV = 80;
const MAX_UTM_KEYS = 8;
const MAX_UTM_VALUE = 200;

export interface TrackInput {
  route: string;
  ref: string | null;
  utm: Record<string, string> | null;
  session_id: string;
  ev: string | null;
}

export type ParseTrackResult =
  | { ok: true; value: TrackInput }
  | { ok: false; error: string };

/** Pure validation + sanitization — unit-testable without a DB or HTTP layer. */
export function parseTrackBody(raw: unknown): ParseTrackResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid body" };
  }
  const body = raw as Record<string, unknown>;

  const route = typeof body.route === "string" ? body.route.trim() : "";
  if (!route || !route.startsWith("/") || route.length > MAX_ROUTE) {
    return { ok: false, error: "Invalid route" };
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!sessionId || sessionId.length > MAX_SESSION) {
    return { ok: false, error: "Invalid session_id" };
  }

  let ref: string | null = null;
  if (body.ref !== undefined && body.ref !== null) {
    if (typeof body.ref !== "string" || body.ref.length > MAX_REF) {
      return { ok: false, error: "Invalid ref" };
    }
    ref = body.ref.slice(0, MAX_REF);
  }

  let ev: string | null = null;
  if (body.ev !== undefined && body.ev !== null) {
    if (typeof body.ev !== "string" || !body.ev.trim() || body.ev.length > MAX_EV) {
      return { ok: false, error: "Invalid event" };
    }
    ev = body.ev.trim().slice(0, MAX_EV);
  }

  let utm: Record<string, string> | null = null;
  if (body.utm !== undefined && body.utm !== null) {
    if (typeof body.utm !== "object" || Array.isArray(body.utm)) {
      return { ok: false, error: "Invalid utm" };
    }
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(body.utm)) {
      if (typeof value !== "string" || Object.keys(cleaned).length >= MAX_UTM_KEYS) {
        continue; // drop non-string values and anything beyond the cap
      }
      cleaned[key.slice(0, 80)] = value.slice(0, MAX_UTM_VALUE);
    }
    if (Object.keys(cleaned).length > 0) utm = cleaned;
  }

  return { ok: true, value: { route, ref, utm, session_id: sessionId, ev } };
}

async function handlePost(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseTrackBody(raw);
  if (!parsed.ok) {
    return json({ error: parsed.error }, { status: 400 });
  }
  const { route, ref, utm, session_id, ev } = parsed.value;
  try {
    await sql()`INSERT INTO analytics_events (route, ref, utm, session_id, ev)
      VALUES (${route}, ${ref}, ${utm ?? null}, ${session_id}, ${ev})`;
  } catch (error) {
    // The client is fire-and-forget; a failure here must not break the app.
    console.error("[TRACK] insert failed:", error);
    return json({ error: "Failed to record" }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

export const Route = createFileRoute("/api/track")({
  server: { handlers: { POST: ({ request }) => handlePost(request) } },
});