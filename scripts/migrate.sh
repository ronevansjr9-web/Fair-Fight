#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL must be set}"
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
sql_quote() { printf "%s" "$1" | sed "s/'/''/g"; }
for version in 000_cases 001_case_activity 002_payments; do
  file="$root/migrations/$version.sql"
  [ -f "$file" ] || { echo "missing migration: $file" >&2; exit 1; }
  tmp=$(mktemp)
  trap 'rm -f "$tmp"' EXIT HUP INT TERM
  version_sql=$(sql_quote "$version.sql")
  file_sql=$(sql_quote "$file")
  {
    printf '%s\n' 'BEGIN;'
    printf '%s\n' "SELECT pg_advisory_xact_lock(hashtextextended('fair-fight/schema-migrations', 0));"
    printf '%s\n' 'CREATE TABLE IF NOT EXISTS public.schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());'
    printf '%s\n' "SELECT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '$version_sql') AS already_applied;\\gset"
    printf '%s\n' '\if :already_applied'
    printf '%s\n' "\\echo already applied: $version.sql"
    printf '%s\n' '\else'
    printf '%s\n' "\\echo applying: $version.sql"
    printf '%s\n' "\\i '$file_sql'"
    printf '%s\n' "INSERT INTO public.schema_migrations(version) VALUES ('$version_sql');"
    printf '%s\n' '\endif'
    printf '%s\n' 'COMMIT;'
  } > "$tmp"
  psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 --file "$tmp"
  rm -f "$tmp"
  trap - EXIT HUP INT TERM
done
