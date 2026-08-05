import { describe, expect, test } from "bun:test";
import { shouldFetchForSignedInUser } from "./caseFetchGate";

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
