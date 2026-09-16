/**
 * Unit tests for the first-party client error reporter (src/lib/errorReporter.ts).
 *
 * Covers the fail-closed contract: payload build/truncation, naive dedupe
 * (same message+url within 30s dropped), the loop guard (a reporter that
 * errors or re-enters must never throw or recurse), and the SSR-safe
 * install/cleanup of the window hooks against a fake window. Hermetic — no
 * browser, no DB.
 */
import { describe, expect, test } from "bun:test";
import {
  buildErrorPayload,
  createErrorDedupe,
  createErrorReporter,
  DEDUPE_WINDOW_MS,
  installErrorCapture,
  MAX_MESSAGE,
  MAX_STACK,
  MAX_URL,
  type ErrorEventPayload,
} from "./errorReporter";

describe("buildErrorPayload", () => {
  test("truncates message, stack, url, and userAgent to their caps", () => {
    const payload = buildErrorPayload({
      message: "m".repeat(MAX_MESSAGE + 50),
      stack: "s".repeat(MAX_STACK + 50),
      url: "/" + "u".repeat(MAX_URL + 50),
      userAgent: "ua".repeat(500),
      timestamp: "2026-09-16T00:00:00.000Z",
    });
    expect(payload.message.length).toBe(MAX_MESSAGE);
    expect(payload.stack!.length).toBe(MAX_STACK);
    expect(payload.url!.length).toBe(MAX_URL);
    expect(payload.userAgent!.length).toBe(500);
  });
  test("omits optional fields that are absent, keeps present ones", () => {
    const minimal = buildErrorPayload({ message: "boom", timestamp: "t" });
    expect(minimal).toEqual({ message: "boom", timestamp: "t" });
    const full = buildErrorPayload({
      message: "boom",
      stack: "Error",
      url: "/x",
      userId: "user_1",
      userAgent: "UA",
      timestamp: "t",
    });
    expect(full).toEqual({
      message: "boom",
      stack: "Error",
      url: "/x",
      userId: "user_1",
      userAgent: "UA",
      timestamp: "t",
    });
  });
  test("never lets an empty/whitespace message through as empty", () => {
    expect(buildErrorPayload({ message: "   ", timestamp: "t" }).message).toBe(
      "Unknown error",
    );
  });
  test("capped userId cannot carry arbitrary large data", () => {
    const payload = buildErrorPayload({
      message: "boom",
      userId: "x".repeat(10_000),
      timestamp: "t",
    });
    expect(payload.userId!.length).toBeLessThanOrEqual(200);
  });
});

describe("createErrorDedupe", () => {
  test("drops the same message+url within the 30s window", () => {
    let now = 1_000;
    const dedupe = createErrorDedupe({ now: () => now });
    expect(dedupe("boom", "/dashboard")).toBe(false); // first sighting
    now += 5_000;
    expect(dedupe("boom", "/dashboard")).toBe(true); // duplicate -> drop
  });
  test("passes again after the window elapses", () => {
    let now = 1_000;
    const dedupe = createErrorDedupe({ now: () => now });
    dedupe("boom", "/dashboard");
    now += DEDUPE_WINDOW_MS + 1;
    expect(dedupe("boom", "/dashboard")).toBe(false);
  });
  test("different message or different url is not a duplicate", () => {
    let now = 1_000;
    const dedupe = createErrorDedupe({ now: () => now });
    dedupe("boom", "/dashboard");
    expect(dedupe("other", "/dashboard")).toBe(false);
    expect(dedupe("boom", "/analysis")).toBe(false);
    now += 5_000;
    expect(dedupe("boom", "/dashboard")).toBe(true);
  });
});

describe("createErrorReporter (fail-closed core)", () => {
  test("reports through send with a built payload", () => {
    const sent: ErrorEventPayload[] = [];
    const reporter = createErrorReporter({
      dedupe: () => false,
      send: (p) => sent.push(p),
      context: () => ({ userAgent: "UA", timestamp: "2026-09-16T00:00:00.000Z" }),
    });
    reporter({ message: "boom", stack: "Error: boom", url: "/x", userId: "user_1" });
    expect(sent).toEqual([
      {
        message: "boom",
        stack: "Error: boom",
        url: "/x",
        userId: "user_1",
        userAgent: "UA",
        timestamp: "2026-09-16T00:00:00.000Z",
      },
    ]);
  });
  test("NEVER throws even when send throws (fail-closed)", () => {
    const reporter = createErrorReporter({
      dedupe: () => false,
      send: () => {
        throw new Error("transmitter broken");
      },
    });
    expect(() => reporter({ message: "boom", url: "/x" })).not.toThrow();
  });
  test("loop guard: a re-entrant report is dropped (no recursion)", () => {
    let sendCalls = 0;
    let reporter: (input: { message: string; url?: string | null }) => void;
    reporter = createErrorReporter({
      dedupe: () => false,
      send: () => {
        sendCalls += 1;
        // Simulate a failure inside the transmit path that re-enters the
        // window.onerror hook — must be dropped by the in-flight guard.
        reporter({ message: "recursive", url: "/x" });
      },
    });
    reporter({ message: "boom", url: "/x" });
    expect(sendCalls).toBe(1); // the nested report never reached send
  });
  test("dedupe drops the event BEFORE send", () => {
    const sent: ErrorEventPayload[] = [];
    let now = 0;
    const reporter = createErrorReporter({
      dedupe: createErrorDedupe({ now: () => now }),
      send: (p) => sent.push(p),
      context: () => ({ timestamp: "t" }),
    });
    reporter({ message: "same", url: "/p" });
    reporter({ message: "same", url: "/p" });
    expect(sent.length).toBe(1);
  });
});

describe("installErrorCapture (window hooks)", () => {
  function fakeWindow() {
    const listeners = new Map<string, Array<(e: unknown) => void>>();
    return {
      listeners,
      addEventListener(type: string, h: (e: unknown) => void) {
        const arr = listeners.get(type) ?? [];
        arr.push(h);
        listeners.set(type, arr);
      },
      removeEventListener(type: string, h: (e: unknown) => void) {
        const arr = (listeners.get(type) ?? []).filter((x) => x !== h);
        listeners.set(type, arr);
      },
      location: { pathname: "/dashboard", search: "?tab=1" },
      navigator: { userAgent: "Mozilla/5.0 (test)" },
    };
  }

  test("installs error + unhandledrejection hooks and cleanup removes them", () => {
    const win = fakeWindow();
    const received: { message: string; url?: string | null }[] = [];
    const cleanup = installErrorCapture(win, (input) => received.push(input));
    expect(win.listeners.get("error")?.length).toBe(1);
    expect(win.listeners.get("unhandledrejection")?.length).toBe(1);

    win.listeners.get("error")![0]({ message: "boom", error: new Error("boom") });
    win.listeners.get("unhandledrejection")![0]({
      reason: new Error("async boom"),
    });
    expect(received).toHaveLength(2);
    expect(received[0].message).toBe("boom");
    expect(received[0].stack).toContain("Error: boom"); // full V8 stack trace
    expect(received[0].url).toBe("/dashboard?tab=1");
    expect(received[1].message).toBe("async boom");
    expect(received[1].stack).toContain("Error: async boom");
    expect(received[1].url).toBe("/dashboard?tab=1");

    cleanup();
    expect(win.listeners.get("error")?.length).toBe(0);
    expect(win.listeners.get("unhandledrejection")?.length).toBe(0);
  });

  test("non-Error rejection reasons (strings/objects) are marshalled safely", () => {
    const win = fakeWindow();
    const received: { message: string }[] = [];
    installErrorCapture(win, (input) => received.push(input));
    win.listeners.get("unhandledrejection")![0]({ reason: "plain string" });
    win.listeners.get("unhandledrejection")![0]({
      reason: { message: "object message" },
    });
    expect(received.map((r) => r.message)).toEqual([
      "plain string",
      "object message",
    ]);
  });

  test("window.error without an Error object still captures the event message", () => {
    const win = fakeWindow();
    const received: { message: string }[] = [];
    installErrorCapture(win, (input) => received.push(input));
    win.listeners.get("error")![0]({ message: "Script error." });
    expect(received[0].message).toBe("Script error.");
  });
});