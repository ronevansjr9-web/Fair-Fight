# Your site

This is the team's website. It's a [TanStack Start](https://tanstack.com/start)
app (React + Vite + Tailwind), served on **port 3000**. It starts life as a simple
"coming soon" placeholder (the headline reads the business name from `site.json` at
request time), but it's a real full-stack framework — build it out into the real
site and grow it into a dynamic app without changing hosting or starting a second
server.

## Layout

```
src/
  routes/
    __root.tsx     # the HTML shell: <head>, fonts, global layout
    index.tsx      # the landing page ("/")
  styles/app.css   # Tailwind entrypoint + base styles
vite.config.ts     # serves on 0.0.0.0:3000
```

Add a page by creating a new file under `src/routes/` — e.g. `about.tsx` becomes
`/about`. Files are routes; the router is generated automatically.

## Publishing changes

After editing, run:

```bash
bun run publish
```

This builds a complete release in an isolated staging directory, validates the
server and client output, then atomically switches `.run/current` before restarting
the server. The running process resolves one immutable release directory at startup,
so a rebuild cannot delete chunks still needed by an in-flight process. The last five
releases are retained under `releases/`; `.env*`, `DATABASE_URL`, and other process
environment configuration are not copied into or removed from releases. The server
log is `.run/server.log`.

### Rollback

If a release fails its smoke check, `publish.sh` automatically points `.run/current`
back to the prior retained release and restarts it. For a manual rollback, stop the
server, select a retained directory, atomically replace the symlink, and restart with
the same environment:

```bash
cd /path/to/site
release="$(find releases -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\\n' | sort -nr | sed -n '2p' | cut -d' ' -f2-)"
kill "$(cat .run/server.pid)" 2>/dev/null || true
ln -s "$release" .run/current.rollback && mv -Tf .run/current.rollback .run/current
setsid nohup env RELEASE_DIR="$release" bun run start > .run/server.log 2>&1 < /dev/null &
echo $! > .run/server.pid
```

Do not delete the active or rollback target release until the replacement server
has passed its route and asset smoke checks.

## Going live (production hosting)

The preview above (port 3000) is where the site runs _while you build it_ — instant and free, but a
preview: it can sleep, and it has no custom domain. To put the site **live on the web** — a fast,
always-on URL the owner can share and point their own domain at — publish it to a real host (Vercel).

```bash
export VERCEL_TOKEN=...   # the team lead collects this from the owner
bun run go-live           # builds, deploys, makes the project public, prints "LIVE: <url>"
```

`go-live` bundles the SSR handler (via `vercel-entry.ts`, which adapts Vercel's Node function
signature to the site's web fetch handler) into `.vercel/output` — no Git repo needed — then deploys
it. It resolves the token's team scope automatically and makes the new project public (new Vercel
projects inherit org SSO protection, which would otherwise show a login wall), so the owner only ever
pastes a `VERCEL_TOKEN`. Pass `DATABASE_URL` in the environment too if the site uses a database. The
team lead runs this flow and reports the live URL; don't hand-roll hosting or tunnels.

## Making it dynamic

The site is static today, but adding backend behavior is one file away — no second
process, no extra port, all served on the same port 3000:

- **Server function** — call server-only code (DB, secrets, fetch) directly from a
  component:

  ```tsx
  import { createServerFn } from "@tanstack/react-start";

  const getMessage = createServerFn().handler(async () => {
    return { message: "Hello from the server" };
  });
  ```

- **API route** — add `src/routes/api/<name>.ts` for a REST endpoint.

Run `bun run publish` after either, and the dynamic behavior is live.

## Adding a database

When the site needs to store data (form submissions, content, accounts), connect a
database rather than writing to files:

1. Call `discover_tools` for a database (e.g. "serverless Postgres with a free
   tier"). The owner connects it (Neon) from the card, which provides `DATABASE_URL`.
2. Query it from server-only code with the built-in helper — never from the client:

   ```tsx
   import { createServerFn } from "@tanstack/react-start";
   import { sql } from "~/db";

   const getPosts = createServerFn().handler(async () => {
     const rows = await sql()`select id, title, created_at from posts`;
     // Coerce non-primitive columns before returning — timestamps come back as JS
     // Dates, which React will not render:
     return rows.map((r) => ({ ...r, created_at: String(r.created_at) }));
   });
   ```

`DATABASE_URL` is injected into this sandbox automatically once connected, and it's
passed to the live host by `bun run go-live` — so the same code works in the preview
and in production. If you connect the database _after_ going live, re-run
`bun run go-live` so production picks up `DATABASE_URL`. One database serves both the
preview and the live site.

## Atomic preview publishing and rollback

`bun run publish` uses an immutable release layout:

1. It creates a unique staging directory under `.run/` and builds there (the source
   `dist/` is never modified). The staged server bundle and non-empty client asset
   directory are required before promotion.
2. The complete staging output is renamed into `releases/<UTC-timestamp>-<pid>`.
   `.run/current` is switched with a same-filesystem `mv -T`, so it is never a
   partially-built tree. The server resolves the selected release once at startup;
   it never follows a changed symlink while serving requests.
3. The old process is stopped using `.run/server.pid`; the new process starts with
   `RELEASE_DIR` and is checked with `GET /`. Every same-origin `src`/`href` asset
   in the returned HTML must also respond successfully.
4. If startup or asset verification fails, the new process is stopped and
   `.run/current` is atomically restored to the prior release, which is restarted.
   The last five releases are retained for diagnosis/rollback; failed staging is
   removed automatically.

The swap is intentionally a brief restart rather than a zero-downtime handoff.
A hard host failure during the restart can still require operator intervention,
though immutable releases remain available. This preview procedure is not the
Vercel `go-live` flow; production-hosting deploys have their own atomicity.
