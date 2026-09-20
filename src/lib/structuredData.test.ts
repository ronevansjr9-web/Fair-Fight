import { describe, expect, test } from "bun:test";
import { getGuideBySlug, guidePageDescription, guidePageH1 } from "./guides";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  guideStructuredDataScripts,
  howToSchema,
  isHowToGuide,
} from "./structuredData";

describe("isHowToGuide", () => {
  test("flags procedural how-to guides", () => {
    for (const slug of [
      "how-to-file-a-motion",
      "eviction-process-guide",
      "small-claims-court-guide",
      "restraining-order-guide",
      "how-to-write-a-will", // "...A Step-by-Step Guide"
    ]) {
      const a = getGuideBySlug(slug)!;
      expect(a, `${slug} should exist`).toBeDefined();
      expect(isHowToGuide(a), `${slug} should be HowTo`).toBe(true);
    }
  });

  test("does not flag explainer/reference guides", () => {
    for (const slug of [
      "statute-of-limitations-guide",
      "what-is-discovery",
      "eminent-domain",
      "understanding-miranda-rights",
      "first-amendment-speech",
      "tenant-rights-guide",
      "medical-malpractice-guide",
    ]) {
      const a = getGuideBySlug(slug)!;
      expect(a, `${slug} should exist`).toBeDefined();
      expect(isHowToGuide(a), `${slug} should NOT be HowTo`).toBe(false);
    }
  });
});

describe("articleSchema", () => {
  test("includes required truthful fields", () => {
    const a = getGuideBySlug("how-to-file-a-motion")!;
    const s = articleSchema(a);
    expect(s["headline"]).toBe(guidePageH1(a));
    expect(s["inLanguage"]).toBe("en");
    expect(s["datePublished"]).toBeTruthy();
    expect(s["dateModified"]).toBeTruthy();
    expect(s["description"]).toBe(guidePageDescription(a));
    expect((s["mainEntityOfPage"] as any)["@id"]).toContain(`/learn/${a.id}`);
    expect((s["author"] as any)["name"]).toBe("Fair Fight");
    expect((s["publisher"] as any)["name"]).toBe("Fair Fight");
  });
});

describe("breadcrumbSchema", () => {
  test("produces Home -> Learn -> guide", () => {
    const a = getGuideBySlug("what-is-discovery")!;
    const s = breadcrumbSchema(a) as any;
    expect(s["@type"]).toBe("BreadcrumbList");
    const list = s["itemListElement"];
    expect(list.length).toBe(3);
    expect(list[0].name).toBe("Home");
    expect(list[1].name).toBe("Learn");
    expect(list[2].name).toBe(guidePageH1(a)); // non-pilot: equals a.title
    expect(list[2].item).toContain(`/learn/${a.id}`);
    expect(list[0].position).toBe(1);
    expect(list[2].position).toBe(3);
  });
});

describe("guideStructuredDataScripts", () => {
  test("how-to guides get Article + BreadcrumbList + HowTo", () => {
    const a = getGuideBySlug("how-to-file-a-motion")!;
    const scripts = guideStructuredDataScripts(a);
    const types = scripts.map((s) => JSON.parse(s.children)["@type"]);
    expect(types).toContain("Article");
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("HowTo");
  });

  test("explainer guides get Article + BreadcrumbList only (no HowTo)", () => {
    const a = getGuideBySlug("statute-of-limitations-guide")!;
    const types = guideStructuredDataScripts(a).map((s) =>
      JSON.parse(s.children)["@type"]
    );
    expect(types).toContain("Article");
    expect(types).toContain("BreadcrumbList");
    expect(types).not.toContain("HowTo");
  });

  test("HowTo steps are derived from guide takeaways (no fabrication)", () => {
    const a = getGuideBySlug("eviction-process-guide")!;
    const h = howToSchema(a) as any;
    expect(h["step"].length).toBe(a.takeaways.length);
    // Every step text is verbatim guide content.
    expect(h["step"][0].text).toBe(a.takeaways[0]);
  });
  test("tier-1 guides with faqs get an FAQPage script block alongside Article/Breadcrumb/HowTo", () => {
    const a = getGuideBySlug("small-claims-court-guide")!;
    const types = guideStructuredDataScripts(a).map((s) => JSON.parse(s.children)["@type"]);
    expect(types).toContain("FAQPage");
    expect(types).toContain("Article");
    expect(types).toContain("BreadcrumbList");
    const faqScript = guideStructuredDataScripts(a).find(
      (s) => JSON.parse(s.children)["@type"] === "FAQPage"
    )!;
    expect(JSON.parse(faqScript.children)["mainEntity"].length).toBe(3);
  });
  test("guides without faqs keep the exact legacy script set (no FAQPage)", () => {
    const a = getGuideBySlug("what-is-discovery")!;
    const types = guideStructuredDataScripts(a).map((s) => JSON.parse(s.children)["@type"]);
    expect(types).not.toContain("FAQPage");
    expect(types).toEqual(["Article", "BreadcrumbList"]);
  });
});

describe("faqSchema", () => {
  test("emits FAQPage JSON-LD with well-formed Question/acceptedAnswer entries", () => {
    const a = getGuideBySlug("how-to-file-a-motion")!;
    const s = faqSchema(a) as any;
    expect(s["@type"]).toBe("FAQPage");
    expect(s["mainEntity"].length).toBe(3);
    s["mainEntity"].forEach((q: any, i: number) => {
      expect(q["@type"]).toBe("Question");
      expect(q["name"], "question text").toBeTruthy();
      expect(q["acceptedAnswer"]["@type"]).toBe("Answer");
      expect(q["acceptedAnswer"]["text"], "answer text").toBeTruthy();
      // Visible FAQ section and JSON-LD must stay in sync.
      expect(q["name"]).toBe(a.faqs![i].question);
      expect(q["acceptedAnswer"]["text"]).toBe(a.faqs![i].answer);
    });
  });
  test("returns null for guides without faqs", () => {
    expect(faqSchema(getGuideBySlug("what-is-discovery")!)).toBeNull();
  });
});
