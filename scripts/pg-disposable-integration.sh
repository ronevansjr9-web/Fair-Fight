#!/usr/bin/env bash
# Disposable-PostgreSQL integration proof for the migration runner.
#
# Boots a throwaway PostgreSQL 16 cluster (installed via apt), creates a scratch
# database, runs src/lib/migrate.pg.test.ts against it with TEST_DATABASE_URL
# set, then tears the cluster down. Nothing survives: the data directory is
# under /tmp and removed on exit (also on failure, via trap).
#
# Requirements: root (initdb refuses to run as root, so commands are dropped to
# the `postgres` system user created by the postgresql package), network for
# apt if postgres is not yet installed.
#
# Usage: bash scripts/pg-disposable-integration.sh
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
if [ ! -x "$PGBIN/initdb" ] || [ ! -x "$PGBIN/pg_ctl" ]; then
  echo "error: PostgreSQL 16 binaries not found under $PGBIN" >&2
  echo "hint: apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-client" >&2
  exit 1
fi

DATA="$(mktemp -d /tmp/ff-pgtest.XXXXXX)"
PORT="$((55000 + RANDOM % 2000))"
LOG="$DATA/server.log"
DB="migrate_test"

cleanup() {
  if [ -d "$DATA" ]; then
    su postgres -s /bin/bash -c "$PGBIN/pg_ctl -D '$DATA' stop -m fast" >/dev/null 2>&1 || true
    rm -rf "$DATA"
  fi
}
trap cleanup EXIT

chown postgres:postgres "$DATA"
echo "== initdb (disposable cluster at $DATA, port $PORT)"
su postgres -s /bin/bash -c "$PGBIN/initdb -D '$DATA' -A trust -U postgres --no-locale" >/dev/null
echo "== starting postgres"
su postgres -s /bin/bash -c "$PGBIN/pg_ctl -D '$DATA' -o '-p $PORT -k $DATA -c listen_addresses=127.0.0.1' -l '$LOG' start" >/dev/null
for _ in $(seq 1 30); do
  if "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then break; fi
  sleep 1
done
"$PGBIN/pg_isready" -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1 || { echo "error: postgres did not become ready"; exit 1; }
echo "== creating scratch database $DB"
su postgres -s /bin/bash -c "$PGBIN/createdb -h 127.0.0.1 -p $PORT $DB"

cd "$(dirname "$0")/.."
export TEST_DATABASE_URL="postgres://postgres@127.0.0.1:$PORT/$DB"
echo "== running src/lib/migrate.pg.test.ts"
timeout 300 bun test src/lib/migrate.pg.test.ts "$@"
echo "== integration tests passed; tearing down disposable cluster"
