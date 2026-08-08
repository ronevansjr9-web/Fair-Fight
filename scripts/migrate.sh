#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL must be set}"
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
# Every migration and its ledger row share one transaction. The advisory lock is
# database-wide and transaction-scoped, preventing concurrent runners from
# both observing an absent ledger row. Migration files must not BEGIN/COMMIT.
for version in 000_cases 001_case_activity 002_payments; do
  file="$root/migrations/$version.sql"
  [ -f "$file" ] || { echo "missing migration: $file" >&2; exit 1; }
  tmp=$(mktemp)
  trap 'rm -f "$tmp"' EXIT HUP INT TERM
  {
    echo 'BEGIN;'
    echo 'SELECT pg_advisory_xact_lock(hashtextextended('"'fair-fight/schema-migrations'"', 0));'
    echo 'CREATE TABLE IF NOT EXISTS public.schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());'
    printf "SELECT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '%s.sql') AS already_applied;\\gset\n" "$version"
    echo '\if :already_applied'
    printf "\\echo already applied: %s.sql\n" "$version"
    echo '\else'
    printf '\echo applying: %s.sql\n' "$version"
    printf '\\i %s\n' "$file"
    printf "INSERT INTO public.schema_migrations(version) VALUES ('%s.sql');\n" "$version"
    echo '\endif'
    echo 'COMMIT;'
  } > "$tmp"
  psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 --file "$tmp"
  rm -f "$tmp"
  trap - EXIT HUP INT TERM
done
