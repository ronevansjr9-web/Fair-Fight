# Database migration contract

The repository-owned execution contract is `scripts/migrate.sh`. It is operator-invoked, requires `DATABASE_URL` and `psql`, and applies the explicitly listed migrations in dependency order. For each item, the runner opens one transaction, takes a transaction-scoped advisory lock, creates/checks the ledger, conditionally runs the SQL, inserts the ledger row, and commits. Migration SQL must not issue `BEGIN` or `COMMIT`; the runner owns transaction boundaries.

```sh
DATABASE_URL='…' ./scripts/migrate.sh
```

The order is `000_cases.sql`, `001_case_activity.sql`, then `002_payments.sql`. It does not discover files by filename order and does not run during build, publish, or application startup. A failed migration rolls back both schema changes and its ledger insertion; investigate rather than forcing it. The lock prevents concurrent runners from racing on an absent ledger row, and the ledger query uses `SELECT EXISTS`/psql `\gset`, never grep or a pipeline.

Existing environments: the ledger is authoritative. If an older mechanism already applied a file, verify that history independently and seed the exact filename before running this tool; never infer history from table presence.

`000_cases.sql` fails closed for any preexisting `cases` schema unless all canonical columns match: text/varchar are the only accepted text-compatible types; required columns are NOT NULL; timestamp columns are `TIMESTAMPTZ`; defaults are absent only for `id`, `user_id`, and `title`, and match the canonical defaults otherwise. Missing known-safe workspace columns are added with defaults and backfilled. Existing status values must be allowed, and a check constraint is validated by its definition (not its name). No migration drops, truncates, or rewrites existing values.
