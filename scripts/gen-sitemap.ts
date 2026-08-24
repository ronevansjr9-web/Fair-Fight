// Generates public/sitemap.xml from the public guide content and canonical pages.
// Run with: bun run scripts/gen-sitemap.ts
import { ARTICLES, SITE_ORIGIN } from "../src/lib/guides";
import { writeFileSync, mkdirSync } from "node:fs";

const urls: string[] = [
  `${SITE_ORIGIN}/`,
  `${SITE_ORIGIN}/learn`,
  `${SITE_ORIGIN}/research`,
];
for (const a of ARTICLES) {
  urls.push(`${SITE_ORIGIN}/learn/${a.id}`);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>`).join("\n")}
</urlset>
`;

mkdirSync("public", { recursive: true });
writeFileSync("public/sitemap.xml", xml);
console.log(`Wrote public/sitemap.xml with ${urls.length} URLs`);
