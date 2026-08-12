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

The server always binds the platform-required port 3000. An inherited generic `PORT`
(e.g. `PORT=80`) is deliberately ignored — it can never choose the listener — and
`publish.sh` clears it (plus the test-only override) for every spawned release
process. Only the explicit test-only `FF_TEST_PORT` override, used exclusively by
`scripts/test-release-launcher.sh`, relocates the listener for isolated tests.

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
setsid nohup env -u PORT -u FF_TEST_PORT RELEASE_DIR="$release" bun run start > .run/server.log 2>&1 < /dev/null &
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

Verification of a spawned process (both the promoted release and, on failure, the
rolled-back release) is a **bounded readiness retry** (`scripts/verify-ready.sh`):
a freshly spawned process is not immediately reachable — it must import the SSR
bundle and bind the listener — so a single immediate probe races readiness and can
falsely fail with connection refused. Instead the full verifier (exact
`X-Release-ID`, 2xx status, every same-origin asset) is re-run with backoff against
the canonical port 3000 until the process is healthy or a bound is exhausted. Two
bounds are enforced: the **wall-clock deadline** (default 120 s, cap 600 s) is the
hard overall cap and is **truly aggregate** — it covers the inter-attempt sleep
AND every second an attempt spends inside the full root/asset verification.
`verify-ready.sh` computes the absolute deadline once and passes it to the full
verifier as `READY_DEADLINE_EPOCH`; `scripts/verify-release.sh` then caps every
individual request (the root and each same-origin asset, with the budget
re-checked before every request) at the seconds remaining until that deadline and
aborts the attempt the moment the budget is spent, so an in-flight multi-asset
verification can never substantially overrun the deadline even with many slow
assets. The inter-attempt backoff is likewise capped at the remaining budget.
Standalone/direct callers that do not pass an epoch get the fixed per-request
defaults (2 s connect / 5 s max time) instead. The **attempt count** (default
30, cap 120) with per-attempt backoff (default 500 ms, cap 5000 ms) is the
secondary bound so a slow-but-progressing process still terminates promptly. All
three values (`READY_MAX_ATTEMPTS`, `READY_BACKOFF_MS`, `READY_DEADLINE_SECS`) must
be strict base-10 positive integers and are rejected with a usage error before any
arithmetic, sleep, or network work if malformed, zero/negative, or oversized, so
hostile or accidental values can never cause unbounded delay. Every retry is a
complete, exact check, so a wrong release identity, a non-2xx response, an invalid
or missing asset, or a wrong listener port can never pass — the retry only delays
the verdict. If the process never becomes healthy within the bounds, the release is
treated as failed and rollback proceeds; if the rolled-back release never becomes
healthy either, the publish reports failure rather than claiming recovery.

Production readiness bounds are fixed: `publish.sh` explicitly clears any inherited
`READY_MAX_ATTEMPTS` / `READY_BACKOFF_MS` / `READY_DEADLINE_SECS` for every spawned
verifier (`env -u` per spawn), so an inherited value can never change production
behavior or cause unbounded delay. Overrides can only ever shorten the bound, and
only through the explicit test-only seams — `FF_TEST_READY_MAX_ATTEMPTS`,
`FF_TEST_READY_BACKOFF_MS`, `FF_TEST_READY_DEADLINE_SECS` (never set by the
platform, and still validated/capped by `verify-ready.sh`): when one is set,
`publish.sh` forwards it as the corresponding `READY_*` value for that spawned
verifier; when none are set, production runs with the fixed defaults. These seams
are used by `scripts/test-verify-ready.sh` for deterministic delayed starts and by
`scripts/test-publish-branches.sh`, which executes the real `publish.sh` promotion,
rollback, and both-failed branches in a disposable sandbox on a test-only port.
The other test-only seams (`FF_TEST_PORT` relocates the listener, `FF_TEST_SKIP_BUILD`
and `FF_TEST_SKIP_INSTALL` skip the heavy build/install steps against a pre-seeded
dist) are likewise never set by the platform; production always builds, installs,
and verifies on the canonical port 3000 with the fixed defaults.

### Interruption fail-safe

After the atomic promotion/start, `publish.sh` installs SIGINT/SIGTERM traps that
make interruption fail-safe (`fail_safe_interrupt`), so an operator interrupt can
never leave an unverified release selected or a known-good process killed:

- **Candidate-selected path.** If the unverified candidate release is currently
  selected (`.run/current` → the new release) when SIGINT/SIGTERM arrives, the
  trap terminates the unverified candidate process (tracked via
  `candidate_pid`/`candidate_running`/`candidate_verified` and killed until the
  listener is free), atomically restores `.run/current` to the prior release
  through `.run/current.restore` + `mv -Tf`, restarts the prior release and
  best-effort re-verifies it (logging "prior release … restored and verified" or
  "… restored but readiness verification failed"), removes the interrupted
  candidate directory, and never leaves an unverified candidate selected. If no
  prior release exists, `.run/current` is removed rather than left pointing at the
  candidate. It exits 130 (SIGINT) / 143 (SIGTERM).
- **Rollback path.** If the signal arrives while a rollback verification is
  running (the candidate is already stopped and `.run/current` already points at
  the prior release), the trap only removes the orphaned candidate directory — it
  deliberately does **not** touch the running rollback process, because a trap
  must never kill a known-good rollback process.
- Both paths clean the interrupted-artifact markers (`.run/health.html`,
  `.run/rollback.html`) and the EXIT cleanup removes the swap markers
  (`.run/current.next`, `.run/rollback.next`, `.run/current.restore`).

The swap is intentionally a brief restart rather than a zero-downtime handoff.
A hard host failure during the restart can still require operator intervention,
though immutable releases remain available. This preview procedure is not the
Vercel `go-live` flow; production-hosting deploys have their own atomicity.
