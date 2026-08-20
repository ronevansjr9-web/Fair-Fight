/**
 * Unit tests for the Clerk sign-in-ticket handoff logic (src/lib/signInTicket.ts).
 *
 * These run under bun's built-in test runner with no DOM and no Clerk context —
 * only the tiny browser-independent pure functions are exercised here:
 *   - no-ticket / no-op detection
 *   - ticket-parameter cleanup (history replacement target)
 *   - consumeTicket success / failure paths (create + finalize), including that
 *     the ticket value is never surfaced in any returned object.
 */
import { describe, expect, test } from "bun:test";
import {
  consumeTicket,
  getTicketFromSearch,
  withoutTicketParam,
  TICKET_PARAM,
  type SignInTicketAdapter,
} from "./signInTicket";

function fakeAdapter(overrides: Partial<SignInTicketAdapter> = {}): SignInTicketAdapter {
  return {
    create: async () => ({ error: null }),
    finalize: async () => ({ error: null }),
    getStatus: () => "complete",
    ...overrides,
  };
}

describe("getTicketFromSearch", () => {
  test("returns empty when there is no query string", () => {
    expect(getTicketFromSearch("")).toBe("");
  });

  test("returns empty when no __clerk_ticket param present (no-op)", () => {
    expect(getTicketFromSearch("?utm_source=x")).toBe("");
    expect(getTicketFromSearch("?foo=bar&baz=1")).toBe("");
  });

  test("returns the ticket value when present", () => {
    expect(getTicketFromSearch(`?${TICKET_PARAM}=skt_abc123`)).toBe("skt_abc123");
    expect(
      getTicketFromSearch(`?foo=1&${TICKET_PARAM}=sit_xyz%2Ftoken&bar=2`),
    ).toBe("sit_xyz/token");
  });
});

describe("withoutTicketParam", () => {
  test("no-op when ticket absent", () => {
    expect(withoutTicketParam("", "/")).toBe("/");
    expect(withoutTicketParam("?a=1", "/")).toBe("/?a=1");
  });

  test("strips only the ticket param, preserving others and pathname", () => {
    const next = withoutTicketParam(`?a=1&${TICKET_PARAM}=skt_abc&b=2`, "/dashboard");
    expect(next).toBe("/dashboard?a=1&b=2");
  });

  test("returns bare pathname when ticket is the only param", () => {
    expect(withoutTicketParam(`?${TICKET_PARAM}=skt_abc`, "/")).toBe("/");
    expect(withoutTicketParam(`?${TICKET_PARAM}=skt_abc`, "/dashboard")).toBe("/dashboard");
  });
});

describe("consumeTicket", () => {
  test("no-op / empty ticket -> error result, nothing created", async () => {
    const adapter = fakeAdapter();
    const r = await consumeTicket(adapter, "");
    expect(r.status).toBe("error");
    expect(r).not.toHaveProperty("ticket");
  });

  test("null adapter -> error result, no throw", async () => {
    const r = await consumeTicket(null as unknown as SignInTicketAdapter, "skt_abc");
    expect(r.status).toBe("error");
  });

  test("success: create then finalize, status complete", async () => {
    const calls: string[] = [];
    const adapter = fakeAdapter({
      create: async (p) => {
        calls.push("create");
        expect(p.strategy).toBe("ticket");
        expect(p.ticket).toBe("skt_abc");
        return { error: null };
      },
      finalize: async () => {
        calls.push("finalize");
        return { error: null };
      },
    });
    const r = await consumeTicket(adapter, "skt_abc");
    expect(r).toEqual({ status: "complete" });
    expect(calls).toEqual(["create", "finalize"]);
  });

  test("successful handoff: ticket value never appears in the return value", async () => {
    const r = await consumeTicket(fakeAdapter(), "skt-super-secret-token");
    expect(JSON.stringify(r)).toBe('{"status":"complete"}');
  });

  test("create failure -> error, finalize not called, no throw", async () => {
    const calls: string[] = [];
    const adapter = fakeAdapter({
      create: async () => {
        calls.push("create");
        return { error: { code: "sign_in_token_expired" } };
      },
      finalize: async () => {
        calls.push("finalize");
        return { error: null };
      },
    });
    const r = await consumeTicket(adapter, "skt_bad");
    expect(r.status).toBe("error");
    expect(calls).toEqual(["create"]);
  });

  test("not-complete after create -> error, finalize not called", async () => {
    const calls: string[] = [];
    const adapter = fakeAdapter({
      getStatus: () => "needs_second_factor",
      finalize: async () => {
        calls.push("finalize");
        return { error: null };
      },
    });
    const r = await consumeTicket(adapter, "skt_abc");
    expect(r.status).toBe("error");
    expect(calls).toEqual([]);
  });

  test("finalize failure -> error result, no throw", async () => {
    const adapter = fakeAdapter({
      finalize: async () => ({ error: { code: "something" } }),
    });
    const r = await consumeTicket(adapter, "skt_abc");
    expect(r.status).toBe("error");
  });

  test("adapter that throws -> error result, never rethrown", async () => {
    const adapter = fakeAdapter({
      create: async () => {
        throw new Error("boom");
      },
    });
    const r = await consumeTicket(adapter, "skt_abc");
    expect(r.status).toBe("error");
  });
});
