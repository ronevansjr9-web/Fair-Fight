# Migrations

All schema for the paid MVP lives here as numbered SQL files. They are applied
**only** by the locked, transactional, checksum-ledger runner
(`src/lib/migrate.ts`, invoked via `bun run migrate`) during a controlled
deploy — never at request time.

| File | Purpose |
| --- | --- |
| `001_case_activity.sql` | `timeline_entries`, `calendar_events` (pre-existing) |
| `002_payments.sql` | `payments` entitlement ledger (pre-existing; status incl. `refunded`) |
| `003_cases.sql` | **`cases`** — the missing base table every other table references |
| `004_case_analyses.sql` | **`case_analyses`** — durable per-case paid analysis workspace |
| `005_webhook_events.sql` | **`webhook_events`** — Stripe webhook idempotency ledger |

## How to apply (blocked integration step)

1. Set `DATABASE_URL` in the deploy environment.
2. Run `bun run migrate` once, as part of a controlled publish (not request-time).
3. Confirm `schema_migrations` lists every version with its sha256 checksum.
4. Run the authenticated smoke checks before serving traffic.

## Why this is blocked right now

- `DATABASE_URL` is not available in the build sandbox, so the runner has only
  been exercised against a mocked query function (see `src/lib/migrate.test.ts`),
  not a real PostgreSQL instance.
- The business plan requires the runner to be proven against a disposable
  PostgreSQL before any real database application. That verification is a
  follow-up controlled-deploy step for the lead, not something this PR can do.

## Rules for new migrations

- Filename: `NNN_snake_case.sql` with a **zero-padded numeric prefix** that is
  globally unique; the prefix is the ledger version.
- No semicolons inside string literals (the runner splits on `;` at line ends).
- Prefer `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` so the
  runner stays idempotent across retries.
- Never edit an applied file — change history aborts the next run with a drift
  error by design. Add a new numbered file instead.
