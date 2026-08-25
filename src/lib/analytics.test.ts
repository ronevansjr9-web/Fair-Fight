/**
 * Unit tests for the first-party analytics helpers (src/lib/analytics.ts).
 *
 * Exercises the pure, storage-injected helpers (getOrCreateSessionId,
 * readUtmFrom, buildTrackPayload) and the fire-and-forget transport
 * (sendAnalyticsBody) with stubbed browser globals. Fully hermetic — no real
 * network or DB.
 */
import { describe, expect, test, afterEach } from "bun:test";
import {
  getOrCreateSessionId,
  readUtmFrom,
  buildTrackPayload,
  sendAnalyticsBody,
  type TrackStorage,
} from "./analytics";

function fakeStorage(initial: Record<string, string> = {}): TrackStorage & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("getOrCreateSessionId", () => {
  test("creates and persists a new id on first call", () => {
    const storage = fakeStorage();
    const id = getOrCreateSessionId(storage);
    expect(id).toBeTruthy();
    expect(storage.getItem("ff_session_id")).toBe(id);
  });
  test("reuses an existing id", () => {
    const storage = fakeStorage({ ff_session_id: "existing-id" });
    expect(getOrCreateSessionId(storage)).toBe("existing-id");
  });
  test("returns a fresh random id when storage is unavailable", () => {
    const id = getOrCreateSessionId(null);
    expect(id).toBeTruthy();
    expect(getOrCreateSessionId(undefined)).toBeTruthy();
  });
  test("returns a fallback id when storage throws", () => {
    const bad: TrackStorage = {
      getItem: () => {
        throw new Error("nope");
      },
      setItem: () => undefined,
    };
    expect(getOrCreateSessionId(bad)).toBeTruthy();
  });
});

describe("readUtmFrom", () => {
  test("returns parsed UTM params", () => {
    const storage = fakeStorage({
      ff_utm: JSON.stringify({ utm_source: "devto", utm_campaign: "guides" }),
    });
    expect(readUtmFrom(storage)).toEqual({
      utm_source: "devto",
      utm_campaign: "guides",
    });
  });
  test("returns null when nothing is stored", () => {
    expect(readUtmFrom(fakeStorage())).toBeNull();
    expect(readUtmFrom(null)).toBeNull();
  });
  test("returns null on malformed JSON", () => {
    expect(readUtmFrom(fakeStorage({ ff_utm: "{not json" }))).toBeNull();
  });
  test("drops non-string values", () => {
    const storage = fakeStorage({ ff_utm: JSON.stringify({ a: "1", b: 2 }) });
    expect(readUtmFrom(storage)).toEqual({ a: "1" });
  });
});

describe("buildTrackPayload", () => {
  test("defaults optional fields to null", () => {
    expect(buildTrackPayload({ route: "/", sessionId: "s1" })).toEqual({
      route: "/",
      ref: null,
      utm: null,
      session_id: "s1",
      ev: null,
    });
  });
  test("passes through provided values", () => {
    const payload = buildTrackPayload({
      route: "/learn/x",
      sessionId: "s1",
      ref: "https://google.com",
      utm: { utm_source: "x" },
      ev: "case_created",
    });
    expect(payload).toEqual({
      route: "/learn/x",
      session_id: "s1",
      ref: "https://google.com",
      utm: { utm_source: "x" },
      ev: "case_created",
    });
  });
});

const savedGlobals = {
  window: (globalThis as Record<string, unknown>).window,
  navigator: (globalThis as Record<string, unknown>).navigator,
  fetch: (globalThis as Record<string, unknown>).fetch,
};

function setWindow() {
  (globalThis as Record<string, unknown>).window = {};
}

afterEach(() => {
  // Restore globals so tests stay hermetic and independent of each other.
  (globalThis as Record<string, unknown>).window = savedGlobals.window;
  (globalThis as Record<string, unknown>).navigator = savedGlobals.navigator;
  (globalThis as Record<string, unknown>).fetch = savedGlobals.fetch;
});

describe("sendAnalyticsBody", () => {
  test("no-op when there is no browser window", () => {
    // window is restored to undefined after the previous test; ensure it is
    // really undefined here.
    (globalThis as Record<string, unknown>).window = undefined;
    expect(() =>
      sendAnalyticsBody(buildTrackPayload({ route: "/", sessionId: "s1" })),
    ).not.toThrow();
  });
  test("prefers navigator.sendBeacon", async () => {
    setWindow();
    let beaconUrl = "";
    let beaconBlob: Blob | null = null;
    (globalThis as Record<string, unknown>).navigator = {
      sendBeacon: (url: string, data: Blob) => {
        beaconUrl = url;
        beaconBlob = data;
        return true;
      },
    };
    sendAnalyticsBody(
      buildTrackPayload({ route: "/learn/small-claims-court-guide", sessionId: "s1", ev: "checkout_started" }),
    );
    expect(beaconUrl).toBe("/api/track");
    const body = await beaconBlob!.text();
    expect(body).toContain('"route":"/learn/small-claims-court-guide"');
    expect(body).toContain('"session_id":"s1"');
    expect(body).toContain('"ev":"checkout_started"');
  });
  test("falls back to fetch keepalive when sendBeacon is unavailable", async () => {
    setWindow();
    (globalThis as Record<string, unknown>).navigator = {}; // no sendBeacon
    let calledUrl = "";
    let calledInit: RequestInit = {};
    (globalThis as Record<string, unknown>).fetch = (
      url: string,
      init: RequestInit,
    ) => {
      calledUrl = url;
      calledInit = init;
      return Promise.resolve(new Response(null, { status: 204 }));
    };
    sendAnalyticsBody(buildTrackPayload({ route: "/dashboard", sessionId: "s1", utm: { utm_source: "devto" } }));
    await Promise.resolve(); // let the microtask run
    expect(calledUrl).toBe("/api/track");
    expect(calledInit.keepalive).toBe(true);
    expect(calledInit.method).toBe("POST");
    expect(String(calledInit.body)).toContain('"utm_source":"devto"');
  });
  test("does not throw when fetch rejects", async () => {
    setWindow();
    (globalThis as Record<string, unknown>).navigator = {};
    (globalThis as Record<string, unknown>).fetch = () =>
      Promise.reject(new Error("network down"));
    expect(() =>
      sendAnalyticsBody(buildTrackPayload({ route: "/", sessionId: "s1" })),
    ).not.toThrow();
  });
});