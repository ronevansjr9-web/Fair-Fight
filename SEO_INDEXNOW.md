# IndexNow (Bing Active Indexing) — Fair Fight

- **Key:** `01cb7873252a9517eafc9e4d9341aed6` (32 hex chars, STABLE — do not change)
- **Key file (served at root):** `https://fairfight.ctonew.app/01cb7873252a9517eafc9e4d9341aed6.txt`
  - Source file: `public/01cb7873252a9517eafc9e4d9341aed6.txt` (content = the key, no newline)
  - Build serves `public/*` at the domain root, so the key file is reachable at the URL above.
- **Endpoint:** `https://api.indexnow.org/indexnow` (JSON POST)
- **Submission (2026-08-24):** HTTP 202 Accepted — all **63** sitemap URLs
  (home `/`, `/learn`, `/research`, + 60 `/learn/<slug>`).
- **After /learn guide consolidation (2026-08):** near-duplicate guides were folded
  and redirects added, so the sitemap now enumerates **58** `/learn/<slug>` guides
  + 3 canonical pages = **61** URLs. Folded/renamed slugs (`sue-in-small-claims`,
  `renter-rights-full-guide`, `what-is-summary-judgment`) are removed from the
  public list and 301-redirect server-side to their canonical page. Re-run
  `bun run scripts/gen-sitemap.ts` to regenerate, then re-submit these 61 URLs to
  IndexNow with the same key.

## Re-submitting (e.g. after adding guides)
```bash
# Rebuild urlList from public/sitemap.xml, then POST with the SAME key:
#   host=fairfight.ctonew.app
#   key=01cb7873252a9517eafc9e4d9341aed6
#   keyLocation=https://fairfight.ctonew.app/01cb7873252a9517eafc9e4d9341aed6.txt
```
If the `.txt` key file is not yet live (404) the first submission can still be
accepted (we observed 202), but keep the file committed/published so ongoing
validation succeeds.
