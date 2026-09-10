/**
 * Unit tests for the server-side Clerk auth helpers (src/lib/auth.ts).
 *
 * Verifies the two behaviors the P0 fix depends on:
 * - `getCurrentAuth()` pulls the Request from the request lifecycle and passes
 *   it to `@clerk/backend`'s `authenticateRequest`.
 * - `getCurrentAuth(request)` passes an explicitly provided Request through
 *   (API route handlers).
 * - `getPrimaryEmail()` resolves email via the Clerk Backend API and fails
 *   safely (returns null) instead of silently yielding an empty string.
 *
 * The helpers authenticate through `@clerk/backend` directly (no Vinxi /
 * `@clerk/tanstack-start/server`), so the mocks target `@clerk/backend` and
 * `@clerk/backend/internal`.
 */
import { describe, expect, test, mock } from "bun:test";

const authenticateRequestMock = mock((req: Request) => ({
  headers: new Headers(),
  status: "signed-in",
  toAuth: () => ({ userId: req.headers.get("x-user") }),
}));
const clerkUsersGetUserMock = mock(() => Promise.resolve({}));

mock.module("@clerk/backend", () => ({
  createClerkClient: () => ({
    authenticateRequest: authenticateRequestMock,
    users: { getUser: clerkUsersGetUserMock },
  }),
}));

mock.module("@clerk/backend/internal", () => ({
  AuthStatus: { Handshake: "handshake", SignedOut: "signed-out" },
  stripPrivateDataFromObject: (x: unknown) => x,
}));

mock.module("@tanstack/react-start/server", () => ({
  getRequest: () =>
    new Request("http://localhost/current", { headers: { "x-user": "user_ctx" } }),
}));

// Imports must come after mock.module so the mocked modules are used.
const { getCurrentAuth, getPrimaryEmail } = await import("./auth");

describe("getCurrentAuth", () => {
  test("passes the request from the request lifecycle (server fn handlers)", async () => {
    authenticateRequestMock.mockClear();
    const auth = await getCurrentAuth();
    expect(authenticateRequestMock).toHaveBeenCalledTimes(1);
    const requestArg = authenticateRequestMock.mock.calls[0]?.[0] as Request;
    expect(requestArg.url).toBe("http://localhost/current");
    expect((auth as { userId: string | null }).userId).toBe("user_ctx");
  });

  test("passes an explicit request through (API route handlers)", async () => {
    authenticateRequestMock.mockClear();
    const explicit = new Request("http://localhost/api", {
      headers: { "x-user": "user_api" },
    });
    const auth = await getCurrentAuth(explicit);
    expect(authenticateRequestMock).toHaveBeenCalledTimes(1);
    expect(authenticateRequestMock.mock.calls[0]?.[0]).toBe(explicit);
    expect((auth as { userId: string | null }).userId).toBe("user_api");
  });
});

describe("getPrimaryEmail", () => {
  test("returns the primary email when the Backend API succeeds", async () => {
    clerkUsersGetUserMock.mockImplementation(() =>
      Promise.resolve({
        primaryEmailAddress: { emailAddress: "user@example.com" },
      }),
    );
    expect(await getPrimaryEmail("user_1")).toBe("user@example.com");
  });

  test("fails safely with null when the Backend API throws", async () => {
    clerkUsersGetUserMock.mockImplementation(() =>
      Promise.reject(new Error("CLERK_SECRET_KEY missing")),
    );
    expect(await getPrimaryEmail("user_1")).toBeNull();
  });

  test("fails safely with null when the user has no primary email", async () => {
    clerkUsersGetUserMock.mockImplementation(() => Promise.resolve({}));
    expect(await getPrimaryEmail("user_1")).toBeNull();
  });
});

describe("getCurrentAuth clock-skew nbf wait", () => {
  function sessionCookie(payload: Record<string, unknown>): string {
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return "__session=header." + b64 + ".sig";
  }
  test("waits a bounded nbf margin and re-verifies the same token", async () => {
    authenticateRequestMock.mockClear();
    let calls = 0;
    authenticateRequestMock.mockImplementation((req: Request) => {
      calls += 1;
      if (calls === 1) {
        return {
          headers: new Headers(),
          status: "signed-out",
          reason: "session-token-nbf",
          toAuth: () => ({ userId: null }),
        };
      }
      return {
        headers: new Headers(),
        status: "signed-in",
        toAuth: () => ({ userId: "user_after_wait" }),
      };
    });
    const now = Math.floor(Date.now() / 1000);
    const nbfReq = new Request("http://localhost/dashboard", {
      headers: { cookie: sessionCookie({ iat: now, nbf: now, exp: now + 600 }) },
    });
    const auth = (await getCurrentAuth(nbfReq)) as { userId: string | null };
    expect(authenticateRequestMock).toHaveBeenCalledTimes(2);
    expect(authenticateRequestMock.mock.calls[1]?.[0]).toBe(nbfReq);
    expect(auth.userId).toBe("user_after_wait");
  });
  test("does not wait when no session cookie is present", async () => {
    authenticateRequestMock.mockClear();
    authenticateRequestMock.mockImplementation((req: Request) => ({
      headers: new Headers(),
      status: "signed-in",
      toAuth: () => ({ userId: req.headers.get("x-user") }),
    }));
    const auth = (await getCurrentAuth(new Request("http://localhost/dashboard"))) as {
      userId: string | null;
    };
    expect(authenticateRequestMock).toHaveBeenCalledTimes(1);
    expect(auth.userId).toBeNull();
  });
  test("does not wait beyond the 60s bound for a far-future nbf", async () => {
    authenticateRequestMock.mockClear();
    authenticateRequestMock.mockImplementation(() => ({
      headers: new Headers(),
      status: "signed-out",
      reason: "session-token-nbf",
      toAuth: () => ({ userId: null }),
    }));
    const far = Math.floor(Date.now() / 1000) + 7200;
    await getCurrentAuth(
      new Request("http://localhost/dashboard", {
        headers: { cookie: sessionCookie({ iat: far, nbf: far, exp: far + 600 }) },
      }),
    );
    expect(authenticateRequestMock).toHaveBeenCalledTimes(1);
  });
});
