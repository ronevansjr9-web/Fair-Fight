/**
 * Unit tests for the /api/errors error-capture intake route
 * (src/routes/api/errors.ts).
 *
 * Validates the pure parser (parseErrorEventBody), the HTTP handler mapping
 * (204 on valid, 400 on invalid, 500 on DB failure), and that the route is
 * registered the TanStack Start way (createFileRoute) — the Wave 5 lesson
 * (400df6e) that a bare POST export never mounts in production.
 *
 * The database is replaced with a deterministic test double. IMPORTANT (bun
 * mock.module cross-file scope): mock.module("~/db") is process-wide in this
 * repo, so this factory mirrors src/routes/api/track.test.ts's analytics
 * handler exactly (and records it the same way) so whichever file's mock is
 * active, both suites observe identical behavior. Everything that is not an
 * analytics_events or error_events insert resolves [] — same as track's.
 */
import { describe, expect, test, mock } from "bun:test";

const errorInserts: Record<string, unknown>[] = [];
const trackInserts: Record<string, unknown>[] = [];
let failInsert = false;
mock.module("~/db", () => ({
  sql:
    () =>
    (strings: TemplateStringsArray, ...params: unknown[]) => {
      const sqlText = strings.join("?");
      if (sqlText.includes("INSERT INTO error_events")) {
        if (failInsert) return Promise.reject(new Error("db down"));
        // NOTE: 'client' is a LITERAL in the SQL text — sql() only receives
        // the ${...} interpolations: [message, stack, url, userAgent, userId, timestamp].
        errorInserts.push({
          message: params[0],
          stack: params[1],
          url: params[2],
          user_agent: params[3],
          user_id: params[4],
          client_ts: params[5],
        });
      } else if (sqlText.includes("INSERT INTO analytics_events")) {
        // Mirror track.test.ts's capture exactly (cross-file mock safety).
        if (failInsert) return Promise.reject(new Error("db down"));
        trackInserts.push({
          route: params[0],
          ref: params[1],
          utm: params[2],
          session_id: params[3],
          ev: params[4],
        });
      }
      return Promise.resolve([]);
    },
}));

const { Route, parseErrorEventBody } = await import("./errors");
const POST = Route.options.server.handlers.POST;

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function reset() {
  errorInserts.length = 0;
  trackInserts.length = 0;
  failInsert = false;
}

const ISO = "2026-09-16T12:34:56.789Z";

describe("parseErrorEventBody", () => {
  test("accepts a minimal valid body (message only)", () => {
    const r = parseErrorEventBody({ message: "TypeError: x is undefined" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.message).toBe("TypeError: x is undefined");
      expect(r.value.stack).toBeUndefined();
      expect(r.value.url).toBeUndefined();
      expect(r.value.userAgent).toBeUndefined();
      expect(r.value.timestamp).toBeUndefined();
      expect(r.value.userId).toBeUndefined();
    }
  });
  test("trims the message and accepts the full payload", () => {
    const r = parseErrorEventBody({
      message: "  boom  ",
      stack: "Error: boom\n    at fn (app.ts:1:1)",
      url: "/dashboard?tab=1",
      userAgent: "Mozilla/5.0 (test)",
      timestamp: ISO,
      userId: "user_2abc",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        message: "boom",
        stack: "Error: boom\n    at fn (app.ts:1:1)",
        url: "/dashboard?tab=1",
        userAgent: "Mozilla/5.0 (test)",
        timestamp: ISO,
        userId: "user_2abc",
      });
    }
  });
  test("rejects a non-object body", () => {
    expect(parseErrorEventBody(null).ok).toBe(false);
    expect(parseErrorEventBody(undefined).ok).toBe(false);
    expect(parseErrorEventBody("boom").ok).toBe(false);
    expect(parseErrorEventBody([]).ok).toBe(false);
    expect(parseErrorEventBody(42).ok).toBe(false);
  });
  test("rejects a missing or empty message", () => {
    expect(parseErrorEventBody({}).ok).toBe(false);
    expect(parseErrorEventBody({ message: "   " }).ok).toBe(false);
    expect(parseErrorEventBody({ message: 42 }).ok).toBe(false);
    expect(parseErrorEventBody({ message: ["boom"] }).ok).toBe(false);
  });
  test("rejects an overlong message and stack", () => {
    expect(
      parseErrorEventBody({ message: "x".repeat(501) }).ok,
    ).toBe(false);
    expect(
      parseErrorEventBody({ message: "ok", stack: "s".repeat(2001) }).ok,
    ).toBe(false);
  });
  test("rejects a url that is not a path or is overlong", () => {
    expect(parseErrorEventBody({ message: "ok", url: "dashboard" }).ok).toBe(false);
    expect(parseErrorEventBody({ message: "ok", url: "https://evil.example/x" }).ok).toBe(false);
    expect(
      parseErrorEventBody({ message: "ok", url: "/" + "a".repeat(501) }).ok,
    ).toBe(false);
    expect(parseErrorEventBody({ message: "ok", url: 7 }).ok).toBe(false);
  });
  test("rejects an invalid or overlong timestamp", () => {
    expect(parseErrorEventBody({ message: "ok", timestamp: "not-a-date" }).ok).toBe(false);
    expect(parseErrorEventBody({ message: "ok", timestamp: 12345 }).ok).toBe(false);
    expect(
      parseErrorEventBody({ message: "ok", timestamp: "x".repeat(65) }).ok,
    ).toBe(false);
  });
  test("rejects an overlong or non-string userAgent and userId", () => {
    expect(parseErrorEventBody({ message: "ok", userAgent: "u".repeat(501) }).ok).toBe(false);
    expect(parseErrorEventBody({ message: "ok", userAgent: ["ua"] }).ok).toBe(false);
    expect(parseErrorEventBody({ message: "ok", userId: "u".repeat(201) }).ok).toBe(false);
    expect(parseErrorEventBody({ message: "ok", userId: { id: "x" } }).ok).toBe(false);
  });
  test("REJECTS unknown keys — the endpoint cannot exfiltrate arbitrary data", () => {
    const r = parseErrorEventBody({
      message: "ok",
      caseContent: "this is a secret legal note that must never land in the table",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Unknown field");
  });
});

describe("POST /api/errors handler", () => {
  test("valid body -> 204 and inserts a row (source=client)", async () => {
    reset();
    const res = await POST({
      request: jsonRequest({ message: "boom", url: "/analysis" }),
    });
    expect(res.status).toBe(204);
    expect(errorInserts.length).toBe(1);
    // source='client' is a literal in the SQL text (not a bound param);
    // the mock captures the interpolations only.
    expect(errorInserts[0]).toMatchObject({
      message: "boom",
      stack: null,
      url: "/analysis",
      user_agent: null,
      user_id: null,
      client_ts: null,
    });
  });
  test("full body -> 204 with every column populated", async () => {
    reset();
    const res = await POST({
      request: jsonRequest({
        message: "boom",
        stack: "Error: boom\n    at r (a.ts:1:1)",
        url: "/dashboard",
        userAgent: "Mozilla/5.0",
        timestamp: ISO,
        userId: "user_2abc",
      }),
    });
    expect(res.status).toBe(204);
    expect(errorInserts).toMatchObject([
      {
        message: "boom",
        stack: "Error: boom\n    at r (a.ts:1:1)",
        url: "/dashboard",
        user_agent: "Mozilla/5.0",
        user_id: "user_2abc",
        client_ts: ISO,
      },
    ]);
  });
  test("invalid body -> 400 and no insert", async () => {
    reset();
    const res = await POST({
      request: jsonRequest({ message: "   " }),
    });
    expect(res.status).toBe(400);
    expect(errorInserts.length).toBe(0);
  });
  test("unknown field -> 400 and no insert (no exfiltration)", async () => {
    reset();
    const res = await POST({
      request: jsonRequest({ message: "ok", notes: "secret" }),
    });
    expect(res.status).toBe(400);
    expect(errorInserts.length).toBe(0);
  });
  test("invalid JSON body -> 400", async () => {
    reset();
    const res = await POST({
      request: new Request("http://localhost/api/errors", {
        method: "POST",
        body: "not json",
      }),
    });
    expect(res.status).toBe(400);
    expect(errorInserts.length).toBe(0);
  });
  test("DB failure -> 500 (client is fire-and-forget)", async () => {
    reset();
    failInsert = true;
    const res = await POST({ request: jsonRequest({ message: "boom" }) });
    expect(res.status).toBe(500);
  });
});

describe("route registration (Wave 5 lesson 400df6e)", () => {
  test("the POST server handler is wired via createFileRoute options", () => {
    // In the unit-test runtime Route.id is not populated (it is assigned by
    // the router tree at build time) — the meaningful check is that the
    // createFileRoute options expose a POST handler, which is exactly what
    // production mounting requires. The exact "/api/errors" path string is
    // asserted at the source level in errors.registration.test.ts.
    expect(Route).toBeDefined();
    expect(typeof Route.options.server.handlers.POST).toBe("function");
  });
});