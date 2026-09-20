import { describe, expect, test } from "bun:test";
import {
  GLOSSARY_GROUPS,
  GLOSSARY_TERMS,
  GLOSSARY_URL,
  getGlossaryTerm,
  glossaryDefinedTermSetSchema,
  glossaryStructuredDataScripts,
} from "./glossary";
import { getGuideBySlug, SITE_ORIGIN } from "./guides";

const BANNED_PATTERN =
  /\bwin your case\b|\bwin your lawsuit\b|\bguarantee(?:d)?\b|\bbest argument\b|sure to win|promise[d]? (?:you )?(?:will|to) win/i;

describe("glossary data integrity", () => {
  test("glossary has ~45 curated terms", () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(43);
    expect(GLOSSARY_TERMS.length).toBeLessThanOrEqual(50);
  });

  test("every group is non-empty and groups partition the flat list without duplication", () => {
    const seen = new Set<string>();
    for (const group of GLOSSARY_GROUPS) {
      expect(group.title.length).toBeGreaterThan(0);
      expect(group.terms.length).toBeGreaterThan(0);
      for (const t of group.terms) {
        expect(seen.has(t.slug), `duplicate slug: ${t.slug}`).toBe(false);
        seen.add(t.slug);
      }
    }
    expect(seen.size).toBe(GLOSSARY_TERMS.length);
  });

  test("slugs are unique, kebab-case, and used as anchor ids", () => {
    const slugs = GLOSSARY_TERMS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) {
      expect(s, `bad slug: ${s}`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(s, `slug must not collide with a top-level route: ${s}`).not.toBe("glossary");
    }
  });

  test("every term is non-empty, well-formed, and within length bounds", () => {
    for (const t of GLOSSARY_TERMS) {
      expect(t.term.trim().length, `empty term for ${t.slug}`).toBeGreaterThan(0);
      const d = t.definition.trim();
      expect(d.length, `definition too short for ${t.term}`).toBeGreaterThanOrEqual(50);
      expect(d.length, `definition too long for ${t.term}`).toBeLessThanOrEqual(600);
      expect(d.endsWith("."), `definition must end with a period: ${t.term}`).toBe(true);
    }
  });

  test("no banned outcome-promising language in any definition", () => {
    for (const t of GLOSSARY_TERMS) {
      expect(
        BANNED_PATTERN.test(t.definition),
        `banned language in "${t.term}": ${t.definition}`,
      ).toBe(false);
    }
  });

  test("getGlossaryTerm resolves every slug", () => {
    for (const t of GLOSSARY_TERMS) {
      expect(getGlossaryTerm(t.slug)?.term).toBe(t.term);
    }
    expect(getGlossaryTerm("not-a-term")).toBeUndefined();
  });
});

describe("glossary -> guide links", () => {
  test("every relatedGuideIds entry resolves to a live /learn guide (no dead links)", () => {
    for (const t of GLOSSARY_TERMS) {
      for (const id of t.relatedGuideIds ?? []) {
        expect(getGuideBySlug(id), `${t.term} links to missing guide ${id}`).toBeDefined();
      }
    }
  });

  test("no relatedGuideIds entry is a self-link or redirect source", () => {
    for (const t of GLOSSARY_TERMS) {
      for (const id of t.relatedGuideIds ?? []) {
        expect(id, `${t.term} must not link to a redirect source`).not.toBe(
          "sue-in-small-claims",
        );
        expect(id, `${t.term} must not link to a redirect source`).not.toBe(
          "renter-rights-full-guide",
        );
        expect(id, `${t.term} must not link to a redirect source`).not.toBe(
          "what-is-summary-judgment",
        );
      }
    }
  });

  test("every linked guide exists as a real article with content", () => {
    const linked = new Set(GLOSSARY_TERMS.flatMap((t) => t.relatedGuideIds ?? []));
    for (const id of linked) {
      const guide = getGuideBySlug(id)!;
      expect(guide.paragraphs.length, `${id} has no paragraphs`).toBeGreaterThan(0);
    }
  });
});

describe("glossary JSON-LD", () => {
  test("GLOSSARY_URL is the canonical site URL", () => {
    expect(GLOSSARY_URL).toBe(`${SITE_ORIGIN}/glossary`);
  });

  test("DefinedTermSet schema is well-formed and covers every term", () => {
    const schema = glossaryDefinedTermSetSchema();
    expect(schema["@type"]).toBe("DefinedTermSet");
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema.url).toBe(GLOSSARY_URL);
    expect(schema.inLanguage).toBe("en");
    const terms = schema.hasDefinedTerm as Array<{
      "@type": string;
      name: string;
      description: string;
      url: string;
    }>;
    expect(terms.length).toBe(GLOSSARY_TERMS.length);
    for (const t of terms) {
      expect(t["@type"]).toBe("DefinedTerm");
      // Every schema entry maps 1:1 to a real glossary entry (name+slug anchor).
      const entry = getGlossaryTerm(t.url.split("#")[1]);
      expect(entry, `schema entry missing for ${t.name}`).toBeDefined();
      expect(t.name).toBe(entry!.term);
      expect(t.description).toBe(entry!.definition);
      expect(t.url).toBe(`${GLOSSARY_URL}#${entry!.slug}`);
    }
  });

  test("head script blocks serialize to valid JSON-LD", () => {
    const scripts = glossaryStructuredDataScripts();
    expect(scripts.length).toBe(1);
    expect(scripts[0].type).toBe("application/ld+json");
    const parsed = JSON.parse(scripts[0].children) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("DefinedTermSet");
    expect((parsed.hasDefinedTerm as unknown[]).length).toBe(GLOSSARY_TERMS.length);
  });
});