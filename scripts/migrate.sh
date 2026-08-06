#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL must be set}"
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL
# If an older environment has no ledger, the operator must explicitly attest to
# its recorded history; table presence is never treated as migration history.
for version in 000_cases 001_case_activity 002_payments; do
  if psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 --tuples-only --no-align \
      -c "SELECT 1 FROM public.schema_migrations WHERE version = '$version.sql'" | grep -q 1; then
    echo "already applied: $version.sql"
    continue
  fi
  file="$root/migrations/$version.sql"
  [ -f "$file" ] || { echo "missing migration: $file" >&2; exit 1; }
  echo "applying: $version.sql"
  psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 --file "$file"
  psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 \
    -c "INSERT INTO public.schema_migrations(version) VALUES ('$version.sql')"
done
