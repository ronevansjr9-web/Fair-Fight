/**
 * Unit tests for the /api/track analytics intake route (src/routes/api/track.ts).
 *
 * Validates the pure parser (parseTrackBody) and the HTTP handler mapping.
 * The database is replaced with a deterministic test double — no real DB
 * writes, fully hermetic.
 */
import { describe, expect, test, mock } from "bun:test";

const inserts: Record<string, unknown>[] = [];
let failInsert = false;
mock.module("~/db", () => ({
  sql:
    () =>
    (strings: TemplateStringsArray, ...params: unknown[]) => {
      const sqlText = strings.join("?");
      if (sqlText.includes("INSERT INTO analytics_events")) {
        if (failInsert) return Promise.reject(new Error("db down"));
        inserts.push({
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

const { Route, parseTrackBody } = await import("./track");
const POST = Route.options.server.handlers.POST;

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function reset() {
  inserts.length = 0;
  failInsert = false;
}

describe("parseTrackBody", () => {
  test("accepts a minimal valid beacon", () => {
    const r = parseTrackBody({ route: "/learn/x", session_id: "abc" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.route).toBe("/learn/x");
      expect(r.value.session_id).toBe("abc");
      expect(r.value.ref).toBeNull();
      expect(r.value.utm).toBeNull();
      expect(r.value.ev).toBeNull();
    }
  });
  test("trims route and session_id whitespace", () => {
    const r = parseTrackBody({ route: "  /dashboard  ", session_id: " s1 " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.route).toBe("/dashboard");
      expect(r.value.session_id).toBe("s1");
    }
  });
  test("parses ref, utm, and ev when present", () => {
    const r = parseTrackBody({
      route: "/learn/small-claims-court-guide",
      session_id: "s1",
      ref: "https://google.com/",
      utm: { utm_source: "devto", utm_campaign: "guide" },
      ev: "checkout_started",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.ref).toBe("https://google.com/");
      expect(r.value.utm).toEqual({ utm_source: "devto", utm_campaign: "guide" });
      expect(r.value.ev).toBe("checkout_started");
    }
  });
  test("rejects a non-object body", () => {
    expect(parseTrackBody(null).ok).toBe(false);
    expect(parseTrackBody("hello").ok).toBe(false);
    expect(parseTrackBody([]).ok).toBe(false);
    expect(parseTrackBody(undefined).ok).toBe(false);
  });
  test("rejects missing route", () => {
    expect(parseTrackBody({ session_id: "s1" }).ok).toBe(false);
  });
  test("rejects a route that does not start with /", () => {
    expect(parseTrackBody({ route: "dashboard", session_id: "s1" }).ok).toBe(false);
  });
  test("rejects an overlong route", () => {
    expect(
      parseTrackBody({ route: "/" + "a".repeat(600), session_id: "s1" }).ok,
    ).toBe(false);
  });
  test("rejects missing session_id", () => {
    expect(parseTrackBody({ route: "/" }).ok).toBe(false);
  });
  test("rejects overlong session_id and ref", () => {
    expect(parseTrackBody({ route: "/", session_id: "x".repeat(300) }).ok).toBe(false);
    expect(
      parseTrackBody({ route: "/", session_id: "s1", ref: "x".repeat(2000) }).ok,
    ).toBe(false);
  });
  test("rejects non-string ev and overlong ev", () => {
    const badType = parseTrackBody({ route: "/", session_id: "s1", ev: 42 });
    expect(badType.ok).toBe(false);
    const over = parseTrackBody({
      route: "/",
      session_id: "s1",
      ev: "x".repeat(120),
    });
    expect(over.ok).toBe(false);
  });
  test("drops non-string utm values and caps utm keys", () => {
    const r = parseTrackBody({
      route: "/",
      session_id: "s1",
      utm: { utm_source: "a", num: 5, ok: "keep" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.utm).toEqual({ utm_source: "a", ok: "keep" });
    }
    const big = parseTrackBody({
      route: "/",
      session_id: "s1",
      utm: Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [`k${i}`, `v${i}`]),
      ),
    });
    expect(big.ok).toBe(true);
    if (big.ok && big.value.utm) {
      expect(Object.keys(big.value.utm).length).toBeLessThanOrEqual(8);
    }
  });
  test("accepts an empty object utm as null", () => {
    const r = parseTrackBody({ route: "/", session_id: "s1", utm: {} });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.utm).toBeNull();
  });
});

describe("POST /api/track handler", () => {
  test("valid beacon -> 204 and inserts a row", async () => {
    reset();
    const res = await POST({ request: jsonRequest({ route: "/learn/x", session_id: "s1" }) });
    expect(res.status).toBe(204);
    expect(inserts.length).toBe(1);
    expect(inserts[0]).toMatchObject({ route: "/learn/x", session_id: "s1", ref: null, utm: null, ev: null });
  });
  test("full beacon -> 204 with ref/utm/ev populated", async () => {
    reset();
    const res = await POST({
      request: jsonRequest({
        route: "/analysis",
        session_id: "s1",
        ref: "https://fairfight.ctonew.app/learn/x",
        utm: { utm_source: "devto" },
        ev: "checkout_started",
      }),
    });
    expect(res.status).toBe(204);
    expect(inserts).toMatchObject([
      {
        route: "/analysis",
        session_id: "s1",
        ref: "https://fairfight.ctonew.app/learn/x",
        utm: { utm_source: "devto" },
        ev: "checkout_started",
      },
    ]);
  });
  test("invalid route -> 400 and no insert", async () => {
    reset();
    const res = await POST({ request: jsonRequest({ route: "nope", session_id: "s1" }) });
    expect(res.status).toBe(400);
    expect(inserts.length).toBe(0);
  });
  test("missing session_id -> 400 and no insert", async () => {
    reset();
    const res = await POST({ request: jsonRequest({ route: "/" }) });
    expect(res.status).toBe(400);
    expect(inserts.length).toBe(0);
  });
  test("invalid JSON body -> 400", async () => {
    reset();
    const res = await POST({
      request: new Request("http://localhost/api/track", {
        method: "POST",
        body: "not json",
      }),
    });
    expect(res.status).toBe(400);
    expect(inserts.length).toBe(0);
  });
  test("DB failure -> 500 (client is fire-and-forget)", async () => {
    reset();
    failInsert = true;
    const res = await POST({ request: jsonRequest({ route: "/", session_id: "s1" }) });
    expect(res.status).toBe(500);
  });
});