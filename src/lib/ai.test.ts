/**
 * Tests for the Gemini API key resolution. The platform injects the key as
 * GOOGLE_API_KEY; GEMINI_API_KEY wins when both are present (compatibility
 * with other hosts). A missing key resolves to "" and the callers fail closed.
 */
import { describe, expect, test } from "bun:test";
import { resolveGeminiApiKey, ANALYSIS_MODEL } from "./ai";

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

describe("ANALYSIS_MODEL (canonical model constant)", () => {
  test("is a non-empty current gemini model — guards against the retired gemini-2.0-flash regression", () => {
    // 2026-08-20: gemini-2.0-flash returns 404 "no longer available"; the API
    // and /v1beta/models recommend gemini-3.6-flash. The durable Pro-analysis
    // save silently fails closed when the model is retired, so never revert to
    // the dead model name.
    expect(ANALYSIS_MODEL).not.toBe("gemini-2.0-flash");
    expect(ANALYSIS_MODEL).toMatch(/^gemini-/);
    expect(ANALYSIS_MODEL.length).toBeGreaterThan(0);
  });
});
