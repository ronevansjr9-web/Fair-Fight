/**
 * Tests for the Gemini API key resolution. The platform injects the key as
 * GOOGLE_API_KEY; GEMINI_API_KEY wins when both are present (compatibility
 * with other hosts). A missing key resolves to "" and the callers fail closed.
 */
import { describe, expect, test } from "bun:test";
import { resolveGeminiApiKey } from "./ai";

describe("resolveGeminiApiKey", () => {
  test("prefers GEMINI_API_KEY when both are set", () => {
    expect(resolveGeminiApiKey({ GEMINI_API_KEY: "gemini", GOOGLE_API_KEY: "google" })).toBe("gemini");
  });

  test("falls back to GOOGLE_API_KEY when GEMINI_API_KEY is absent", () => {
    expect(resolveGeminiApiKey({ GOOGLE_API_KEY: "google" })).toBe("google");
    expect(resolveGeminiApiKey({ GEMINI_API_KEY: "", GOOGLE_API_KEY: "google" })).toBe("google");
  });

  test("resolves to empty string when no key is configured (callers fail closed)", () => {
    expect(resolveGeminiApiKey({})).toBe("");
    expect(resolveGeminiApiKey({ GEMINI_API_KEY: "  " })).toBe("  ");
  });
});
