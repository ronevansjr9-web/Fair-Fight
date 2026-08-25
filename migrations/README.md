# Migrations

All schema for the paid MVP lives here as numbered SQL files, applied **only**
by the locked, transactional, checksum-ledger runner (`src/lib/migrate.ts`,
invoked via `bun run migrate`) during a controlled deploy — never at request
time.

The files are numbered in **dependency order**: `cases` must exist before any
table that references it. A fresh install applies 001 → 005 in one Postgres
transaction; if any file fails, the whole batch rolls back (no partial schema).

| File | Purpose | Depends on |
| --- | --- | --- |
| `001_cases.sql` | **`cases`** — the base case table (user-owned, status enum) | — |
| `002_payments.sql` | **`payments`** entitlement ledger (status incl. `refunded`; `checkout_session_id` UNIQUE) | — |
| `003_case_analyses.sql` | **`case_analyses`** — durable per-case paid analysis workspace (UNIQUE `case_id` → `cases` ON DELETE CASCADE) | `001` |
| `004_webhook_events.sql` | **`webhook_events`** — Stripe webhook idempotency ledger (PK `event_id`) | — |
| `005_case_activity.sql` | **`timeline_entries`**, **`calendar_events`** (FK → `cases` ON DELETE CASCADE) | `001` |
| `006_analytics.sql` | **`analytics_events`** — append-only route-visit + funnel-event log (no cookie; session id from sessionStorage) | — |

## Runner guarantees (proven against a real, disposable PostgreSQL)

`scripts/pg-disposable-integration.sh` boots a throwaway PostgreSQL 16 cluster,
runs `src/lib/migrate.pg.test.ts` against it, and tears it down. That suite
proves, on a real server:

- **Fresh install** — all five migrations apply in order; `schema_migrations`
  records every version with its exact sha256 checksum.
- **Safe rerun** — a matching ledger applies nothing (idempotent replay).
- **Checksum mismatch** — an edited ledger entry aborts the run with a
  `Migration drift` error and never touches existing schema.
- **Rollback** — one failing migration aborts the single transaction and
  nothing persists (not even earlier files in the same batch).
- **Concurrent runners** — two runners serialize on
  `pg_advisory_xact_lock(MIGRATION_LOCK_KEY)` and both finish with a complete,
  consistent ledger.
- **Catalog** — required tables, columns, FKs, indexes, unique constraints,
  check constraints, and cascade behavior are asserted.

Run it locally (root, with `postgresql`/`postgresql-client` installed):

```bash
bash scripts/pg-disposable-integration.sh
# or: bun run test:pg
```

The suite is skipped automatically when `TEST_DATABASE_URL` is unset, so
ordinary `bun test` runs stay hermetic.

## Applying to the real database (controlled deploy)

1. Set `DATABASE_URL` in the deploy environment.
2. Run `bun run migrate` once, as part of a controlled publish (not
   request-time).
3. Confirm `schema_migrations` lists every version with its sha256 checksum.
4. Run the authenticated smoke checks before serving traffic.

The Neon (test) database was migrated on 2026-08-16 via `bun run migrate`
after the disposable-PostgreSQL suite passed; see the PR for the exact
resulting table list and ledger checksums. Re-running `bun run migrate` is a
no-op when the ledger matches.
