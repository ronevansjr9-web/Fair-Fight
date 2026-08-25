import { describe, expect, test } from "bun:test";
import { ARTICLES, GUIDE_REDIRECTS, getGuideBySlug } from "./guides";

describe("guide consolidation (SEO)", () => {
  test("guide count dropped from 60 to 58 after folding near-duplicates", () => {
    expect(ARTICLES.length).toBe(58);
  });

  test("folded/renamed slugs are no longer separately-indexed guides", () => {
    for (const slug of ["sue-in-small-claims", "renter-rights-full-guide", "what-is-summary-judgment"]) {
      expect(getGuideBySlug(slug), `${slug} should be removed from the public list`).toBeUndefined();
    }
  });

  test("canonical targets exist for every redirect", () => {
    for (const [from, to] of Object.entries(GUIDE_REDIRECTS)) {
      expect(from, `redirect source ${from} must not be a live guide`).not.toBeUndefined();
      expect(getGuideBySlug(from), `${from} must not still resolve as a guide`).toBeUndefined();
      expect(getGuideBySlug(to), `redirect target ${to} should exist`).toBeDefined();
    }
  });

  test("redirect map has exactly the three intended mappings", () => {
    expect(GUIDE_REDIRECTS).toEqual({
      "sue-in-small-claims": "small-claims-court-guide",
      "renter-rights-full-guide": "tenant-rights-guide",
      "what-is-summary-judgment": "what-happens-after-filing-lawsuit",
    });
  });

  test("slug fix: what-is-summary-judgment content now lives under a truthful slug", () => {
    const renamed = getGuideBySlug("what-happens-after-filing-lawsuit");
    expect(renamed).toBeDefined();
    // Its content is the broad civil-litigation timeline, not Rule 56.
    expect(renamed!.paragraphs.join(" ")).toContain("timeline");
    // The genuinely distinct Rule 56 guide is untouched and not merged.
    expect(getGuideBySlug("summary-judgment-explained")).toBeDefined();
  });

  test("every relatedGuides link from the consolidated guides resolves to a live guide", () => {
    for (const id of ["small-claims-court-guide", "tenant-rights-guide", "what-happens-after-filing-lawsuit"]) {
      const a = getGuideBySlug(id)!;
      expect(a, `${id} should exist`).toBeDefined();
      for (const rel of a.relatedGuides) {
        expect(getGuideBySlug(rel), `${id} links to missing guide ${rel}`).toBeDefined();
      }
    }
  });

  test("no guide slug collides with a redirect source", () => {
    const liveSlugs = new Set(ARTICLES.map((a) => a.id));
    for (const from of Object.keys(GUIDE_REDIRECTS)) {
      expect(liveSlugs.has(from), `redirect source ${from} should not also be a live guide`).toBe(false);
    }
  });
});
