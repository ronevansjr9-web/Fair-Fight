import { describe, expect, test } from "bun:test";
import {
  shouldFetchForSignedInUser,
  fetchAuthedData,
  UNAUTHORIZED_RETRY_DELAY_MS,
} from "./caseFetchGate";

describe("shouldFetchForSignedInUser", () => {
  test("does not fetch while Clerk auth is still hydrating (undefined)", () => {
    expect(shouldFetchForSignedInUser(undefined)).toBe(false);
  });
  test("does not fetch for signed-out users (false)", () => {
    expect(shouldFetchForSignedInUser(false)).toBe(false);
  });
  test("fetches only when auth has definitively resolved to signed in (true)", () => {
    expect(shouldFetchForSignedInUser(true)).toBe(true);
  });
});

describe("fetchAuthedData — hard-load token-freshness race", () => {
  const ok = (v: unknown = "data") => ({ ok: true, v });
  const unauthorized = () => ({ ok: false, reason: "unauthorized" });

  function makeGetToken(log: string[]) {
    return async (opts?: { skipCache?: boolean }) => {
      log.push(`getToken${opts?.skipCache ? ":skipCache" : ""}`);
      return `tok_${log.length}`;
    };
  }

  test("fetch callback is NOT invoked while auth is hydrating (undefined) or signed out (false)", async () => {
    let fetchCalls = 0;
    for (const isSignedIn of [undefined, false]) {
      fetchCalls = 0;
      const outcome = await fetchAuthedData({
        isSignedIn,
        getToken: async () => null,
        fetch: async () => {
          fetchCalls += 1;
          return ok();
        },
        isUnauthorized: (r: { ok: boolean }) => !r.ok,
        retryDelayMs: 0,
      });
      expect(outcome).toEqual({ state: "auth_not_ready" });
      expect(fetchCalls).toBe(0);
    }
  });

  test("refreshes the token before the first fetch, and does NOT retry on a successful fetch", async () => {
    const log: string[] = [];
    let fetchCalls = 0;
    const outcome = await fetchAuthedData({
      isSignedIn: true,
      getToken: makeGetToken(log),
      fetch: async () => {
        fetchCalls += 1;
        return ok("cases");
      },
      isUnauthorized: (r: { ok: boolean }) => !r.ok,
      retryDelayMs: 0,
    });
    expect(outcome.state).toBe("ready");
    if (outcome.state === "ready") {
      expect(outcome.retriedUnauthorized).toBe(false);
      expect(outcome.result).toEqual({ ok: true, v: "cases" });
    }
    expect(fetchCalls).toBe(1);
    // one forced refresh before the fetch, no refresh after a success
    expect(log).toEqual(["getToken:skipCache"]);
  });

  test("on unauthorized: waits, refreshes the token, and retries EXACTLY once (second fetch wins)", async () => {
    const log: string[] = [];
    let fetchCalls = 0;
    let first = true;
    const outcome = await fetchAuthedData({
      isSignedIn: true,
      getToken: makeGetToken(log),
      fetch: async () => {
        fetchCalls += 1;
        if (first) {
          first = false;
          return unauthorized();
        }
        return ok("real data");
      },
      isUnauthorized: (r: { ok: boolean }) => !r.ok,
      retryDelayMs: 0,
    });
    expect(fetchCalls).toBe(2);
    expect(outcome.state).toBe("ready");
    if (outcome.state === "ready") {
      expect(outcome.retriedUnauthorized).toBe(true);
      expect(outcome.result).toEqual({ ok: true, v: "real data" });
    }
    // token refreshed before first fetch AND before the single retry
    expect(log).toEqual(["getToken:skipCache", "getToken:skipCache"]);
  });

  test("a second unauthorized result is returned as-is — no third call, no retry loop", async () => {
    let fetchCalls = 0;
    const outcome = await fetchAuthedData({
      isSignedIn: true,
      getToken: async () => null,
      fetch: async () => {
        fetchCalls += 1;
        return unauthorized();
      },
      isUnauthorized: (r: { ok: boolean }) => !r.ok,
      retryDelayMs: 0,
    });
    expect(fetchCalls).toBe(2);
    expect(outcome.state).toBe("ready");
    if (outcome.state === "ready") {
      expect(outcome.retriedUnauthorized).toBe(true);
      expect(outcome.result).toEqual(unauthorized());
    }
  });

  test("a getToken failure does not block the fetch — the server call is the judge", async () => {
    let fetchCalls = 0;
    const outcome = await fetchAuthedData({
      isSignedIn: true,
      getToken: async () => {
        throw new Error("session just ended");
      },
      fetch: async () => {
        fetchCalls += 1;
        return ok();
      },
      isUnauthorized: (r: { ok: boolean }) => !r.ok,
      retryDelayMs: 0,
    });
    expect(fetchCalls).toBe(1);
    expect(outcome.state).toBe("ready");
  });

  test("UNAUTHORIZED_RETRY_DELAY_MS is the documented 400ms grace for the token rotation", () => {
    expect(UNAUTHORIZED_RETRY_DELAY_MS).toBe(400);
  });
});