/**
 * Unit tests for the first-party server-side error reporter
 * (src/lib/serverErrorReporter.ts).
 *
 * Covers the rethrow contract (withErrorReporting reports, then rethrows the
 * ORIGINAL error so the caller's behavior is unchanged) and the never-throws
 * reporting path (reportServerError swallows DB failures). The database is
 * replaced with the same cross-file-safe test double pattern as
 * src/routes/api/track.test.ts / errors.test.ts (bun mock.module is
 * process-wide in this repo — the factory mirrors analytics_events handling).
 */
import { describe, expect, test, mock } from "bun:test";

const errorInserts: Record<string, unknown>[] = [];
let failInsert = false;
mock.module("~/db", () => ({
  sql:
    () =>
    (strings: TemplateStringsArray, ...params: unknown[]) => {
      const sqlText = strings.join("?");
      if (sqlText.includes("INSERT INTO error_events")) {
        if (failInsert) return Promise.reject(new Error("db down"));
        // 'server' is a LITERAL in the SQL text — sql() only receives the
        // ${...} interpolations: [message, stack, url, userId].
        errorInserts.push({
          message: params[0],
          stack: params[1],
          url: params[2],
          user_id: params[3],
        });
      }
      return Promise.resolve([]);
    },
}));

const {
  reportServerError,
  withErrorReporting,
  serverErrorMessage,
  serverErrorStack,
} = await import("./serverErrorReporter");

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("serverErrorMessage / serverErrorStack", () => {
  test("extracts message from Error, string, and message-carrying objects", () => {
    expect(serverErrorMessage(new Error("boom"))).toBe("boom");
    expect(serverErrorMessage("raw string")).toBe("raw string");
    expect(serverErrorMessage({ message: "obj message" })).toBe("obj message");
    expect(serverErrorMessage(42)).toBe("Unknown server error");
  });
  test("caps the message and stack at the contract limits", () => {
    const long = new Error("x".repeat(10_000));
    expect(serverErrorMessage(long).length).toBe(500);
    const stack = serverErrorStack(long);
    expect(stack).not.toBeNull();
    expect(stack!.length).toBeLessThanOrEqual(2000);
  });
  test("null stack when the thrown value carries none", () => {
    expect(serverErrorStack("plain string")).toBeNull();
  });
});

describe("reportServerError", () => {
  test("inserts a server row (source=server) with context", async () => {
    errorInserts.length = 0;
    const err = new Error("checkout exploded");
    await reportServerError(err, {
      source: "payment_checkout",
      url: "/analysis",
      userId: "user_9",
    });
    expect(errorInserts).toMatchObject([
      {
        message: "checkout exploded",
        stack: expect.stringContaining("checkout exploded"),
        url: "/analysis",
        user_id: "user_9",
      },
    ]);
  });
  test("NEVER throws when the DB write fails", async () => {
    failInsert = true;
    await expect(
      reportServerError(new Error("boom"), { source: "ai_generation" }),
    ).resolves.toBeUndefined();
    failInsert = false;
  });
});

describe("withErrorReporting", () => {
  test("RETHROWS the original error — caller behavior unchanged", async () => {
    const original = new Error("the real failure");
    await expect(
      withErrorReporting("ai_generation", async () => {
        throw original;
      }),
    ).rejects.toBe(original); // same instance passes through untouched
  });
  test("reports the failure (fire-and-forget) before rethrowing", async () => {
    errorInserts.length = 0;
    await expect(
      withErrorReporting(
        "export_user_data",
        async () => {
          throw new Error("export boom");
        },
        { url: "/api/user/export-data", userId: "user_1" },
      ),
    ).rejects.toThrow("export boom");
    await flush(); // let the fire-and-forget report settle
    expect(errorInserts).toMatchObject([
      {
        message: "export boom",
        url: "/api/user/export-data",
        user_id: "user_1",
      },
    ]);
  });
  test("resolves normally (no report) when the wrapped fn succeeds", async () => {
    errorInserts.length = 0;
    const value = await withErrorReporting("payment_checkout", async () => 42);
    expect(value).toBe(42);
    await flush();
    expect(errorInserts.length).toBe(0);
  });
  test("the report failure never changes the rethrow", async () => {
    failInsert = true;
    const original = new Error("db is down but the caller still sees me");
    await expect(
      withErrorReporting("ai_generation", async () => {
        throw original;
      }),
    ).rejects.toBe(original);
    failInsert = false;
  });
});