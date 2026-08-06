/**
 * Unit tests for the server-side Clerk auth helpers (src/lib/auth.ts).
 *
 * Verifies the two behaviors the P0 fix depends on:
 * - `getCurrentAuth()` pulls the Request from the request lifecycle and passes
 *   it to Clerk's `getAuth` (which throws when given no Request).
 * - `getCurrentAuth(request)` passes an explicitly provided Request through
 *   (API route handlers).
 * - `getPrimaryEmail()` resolves email via the Clerk Backend API and fails
 *   safely (returns null) instead of silently yielding an empty string.
 *
 * Uses bun's mock.module to replace the Clerk / TanStack server modules.
 */
import { describe, expect, test, mock } from "bun:test";

const getAuthMock = mock((req: Request) =>
  Promise.resolve({ userId: req.headers.get("x-user") }),
);
const clerkUsersGetUserMock = mock(() => Promise.resolve({}));

mock.module("@clerk/tanstack-start/server", () => ({
  getAuth: getAuthMock,
  clerkClient: () => ({
    users: { getUser: clerkUsersGetUserMock },
  }),
}));

mock.module("@tanstack/react-start/server", () => ({
  getRequest: () =>
    new Request("http://localhost/current", { headers: { "x-user": "user_ctx" } }),
}));

// Imports must come after mock.module so the mocked modules are used.
const { getCurrentAuth, getPrimaryEmail } = await import("./auth");

describe("getCurrentAuth", () => {
  test("passes the request from the request lifecycle (server fn handlers)", async () => {
    getAuthMock.mockClear();
    const auth = await getCurrentAuth();
    expect(getAuthMock).toHaveBeenCalledTimes(1);
    const requestArg = getAuthMock.mock.calls[0]?.[0] as Request;
    expect(requestArg.url).toBe("http://localhost/current");
    expect((auth as { userId: string | null }).userId).toBe("user_ctx");
  });

  test("passes an explicit request through (API route handlers)", async () => {
    getAuthMock.mockClear();
    const explicit = new Request("http://localhost/api", {
      headers: { "x-user": "user_api" },
    });
    const auth = await getCurrentAuth(explicit);
    expect(getAuthMock).toHaveBeenCalledTimes(1);
    expect(getAuthMock.mock.calls[0]?.[0]).toBe(explicit);
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
