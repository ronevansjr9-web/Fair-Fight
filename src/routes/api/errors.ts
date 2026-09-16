import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { sql } from "~/db";

/**
 * POST /api/errors — first-party, PII-free error capture intake.
 *
 * The app's own "no external service" error pipeline: client-side
 * window.onerror / unhandledrejection hooks and the server-side reporter both
 * land rows here (server-side rows are inserted directly by
 * src/lib/serverErrorReporter.ts with source='server'; this endpoint records
 * client captures with source='client'). No Sentry, no third-party script,
 * no request bodies, no case content, no notes text — the payload is exactly
 * message/stack/url/userAgent/timestamp/userId, each capped and validated
 * strictly server-side.
 *
 * Unauthenticated on purpose: errors happen pre-auth and on public pages. The
 * same fail-closed posture as /api/track applies — invalid payloads are
 * rejected (400), the DB write is best-effort (500 on failure), success is a
 * silent 204. Safe to call from any page.
 *
 * Body (JSON), all optional except message:
 *   message:   string, required, trimmed, <= 500 chars
 *   stack:     string, optional, <= 2000 chars
 *   url:       string, optional, must start with "/", <= 500 chars
 *   userAgent: string, optional, <= 500 chars
 *   timestamp: string, optional, valid ISO date string, <= 64 chars
 *   userId:    string, optional, <= 200 chars (Clerk user id when signed in)
 * Unknown top-level keys are rejected — the endpoint can never be used to
 * exfiltrate arbitrary data into the table.
 */

export const MAX_ERROR_MESSAGE = 500;
export const MAX_ERROR_STACK = 2000;
export const MAX_ERROR_URL = 500;
export const MAX_ERROR_USER_AGENT = 500;
export const MAX_ERROR_USER_ID = 200;
export const MAX_ERROR_TIMESTAMP = 64;

export interface ErrorEventBody {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  userId?: string;
}

export type ParseErrorEventResult =
  | { ok: true; value: ErrorEventBody }
  | { ok: false; error: string };

const ALLOWED_KEYS = new Set([
  "message",
  "stack",
  "url",
  "userAgent",
  "timestamp",
  "userId",
]);

function isPlainString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

/** Pure validation + sanitization — unit-testable without a DB or HTTP layer. */
export function parseErrorEventBody(raw: unknown): ParseErrorEventResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid body" };
  }
  const body = raw as Record<string, unknown>;

  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) {
      return { ok: false, error: `Unknown field: ${key}` };
    }
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return { ok: false, error: "Invalid message" };
  if (message.length > MAX_ERROR_MESSAGE) {
    return { ok: false, error: "Invalid message" };
  }

  let stack: string | undefined;
  if (body.stack !== undefined) {
    if (!isPlainString(body.stack, MAX_ERROR_STACK)) {
      return { ok: false, error: "Invalid stack" };
    }
    stack = body.stack;
  }

  let url: string | undefined;
  if (body.url !== undefined) {
    if (!isPlainString(body.url, MAX_ERROR_URL) || !body.url.startsWith("/")) {
      return { ok: false, error: "Invalid url" };
    }
    url = body.url;
  }

  let userAgent: string | undefined;
  if (body.userAgent !== undefined) {
    if (!isPlainString(body.userAgent, MAX_ERROR_USER_AGENT)) {
      return { ok: false, error: "Invalid userAgent" };
    }
    userAgent = body.userAgent;
  }

  let timestamp: string | undefined;
  if (body.timestamp !== undefined) {
    if (
      !isPlainString(body.timestamp, MAX_ERROR_TIMESTAMP) ||
      Number.isNaN(Date.parse(body.timestamp))
    ) {
      return { ok: false, error: "Invalid timestamp" };
    }
    timestamp = body.timestamp;
  }

  let userId: string | undefined;
  if (body.userId !== undefined) {
    if (!isPlainString(body.userId, MAX_ERROR_USER_ID)) {
      return { ok: false, error: "Invalid userId" };
    }
    userId = body.userId;
  }

  return { ok: true, value: { message, stack, url, userAgent, timestamp, userId } };
}

async function handlePost(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseErrorEventBody(raw);
  if (!parsed.ok) {
    return json({ error: parsed.error }, { status: 400 });
  }
  const { message, stack, url, userAgent, timestamp, userId } = parsed.value;
  try {
    // client_ts stores the client-clock error time when present; `ts` is
    // always the server ingest clock (both go in the same row).
    await sql()`INSERT INTO error_events (source, message, stack, url, user_agent, user_id, client_ts)
      VALUES ('client', ${message}, ${stack ?? null}, ${url ?? null}, ${userAgent ?? null}, ${userId ?? null}, ${timestamp ?? null})`;
  } catch (error) {
    // The client is fire-and-forget; a failure here must not break the app.
    console.error("[ERRORS] insert failed:", error);
    return json({ error: "Failed to record" }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

// Route registration — TanStack Start only mounts a server handler when the
// route file declares it via createFileRoute (Wave 5 lesson 400df6e: a bare
// `export async function POST` never mounts and 404s in production while
// direct-handler unit tests still pass). The bare `POST` handler above stays
// so unit tests can exercise the handler directly.
export const Route = createFileRoute("/api/errors")({
  server: { handlers: { POST: ({ request }) => handlePost(request) } },
});