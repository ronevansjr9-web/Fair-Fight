# Database migration contract

The repository-owned execution contract is `scripts/migrate.sh`. It is an operator-invoked migration tool, not an application startup or deployment step. It requires `DATABASE_URL` and `psql`, creates the repository-owned `public.schema_migrations` ledger, and applies the explicitly listed migrations in dependency order with `ON_ERROR_STOP=1`. Each SQL file runs in its own transaction; the ledger is updated only after that file succeeds.

## Fresh database

From the repository root, run:

```sh
DATABASE_URL='…' ./scripts/migrate.sh
```

The script applies `000_cases.sql`, then `001_case_activity.sql`, then `002_payments.sql`. It does not discover files by filename order, and it does not run automatically as part of build, publish, or application startup.

## Existing environments

The ledger is authoritative after this contract is adopted. Before adoption, if an older migration mechanism already applied a file, the operator must verify that history from that mechanism's records and seed the corresponding exact filename into `schema_migrations` before running this script; never infer history from table presence. Do not seed a file unless its complete migration was recorded as successful. Then run the script to apply remaining files once in the listed dependency order. A failed migration stops immediately and its transaction rolls back; investigate rather than forcing it.

`000_cases.sql` assumes an existing `cases.id` is non-null text/varchar with a single-column primary key; `user_id` and `title` exist as non-null text/varchar columns. Missing defaulted workspace columns are backfilled with constants/current timestamps. Existing values are not rewritten. Existing `status` values must be `active`, `resolved`, or `closed`. Incompatible IDs, required-column types/nullability, keys, or status values abort with a generic diagnostic before the migration commits. No migration in this set drops or truncates data.
