#!/usr/bin/env bash
# Bounded readiness verification for a promoted or rolled-back release.
#
# publish.sh spawns a release process and must confirm it before declaring the
# publish (or a rollback) successful. A freshly spawned process is not immediately
# reachable: it must import the SSR bundle, resolve its release directory, and bind
# the listener, so a single immediate probe races process readiness and fails with
# connection refused even though the process would have become healthy milliseconds
# later. This wrapper re-runs the FULL verifier (scripts/verify-release.sh) with
# backoff until the process is ready or the bound is exhausted.
#
# Safety: every retry is a complete, exact check — 2xx status, exact X-Release-ID,
# and every same-origin asset responding 2xx — against the same base URL. A wrong
# release identity, a non-2xx response, an invalid/missing asset, or a wrong
# listener port can never pass; the retry only delays the verdict. If the process
# never becomes healthy within the bound, this exits 1 and the caller must treat the
# release as failed (publish.sh then rolls back; a failing rollback is reported).
#
# Usage: verify-ready.sh <expected-release-id> <html-file> [base-url]
#   base-url defaults to the canonical platform port http://127.0.0.1:3000.
# Env overrides (test seam for deterministic delayed-start coverage):
#   READY_MAX_ATTEMPTS  (default 30)  total verification attempts
#   READY_BACKOFF_MS    (default 500) sleep between failed attempts, in milliseconds
set -euo pipefail
[[ $# -ge 2 ]] || { echo "usage: verify-ready.sh <expected-release-id> <html-file> [base-url]" >&2; exit 64; }
expected="$1"
html="$2"
base_url="${3:-http://127.0.0.1:3000}"
attempts="${READY_MAX_ATTEMPTS:-30}"
backoff_ms="${READY_BACKOFF_MS:-500}"
i=0
while :; do
  if ./scripts/verify-release.sh "$expected" "$base_url" "$html"; then
    exit 0
  fi
  i=$((i + 1))
  if (( i >= attempts )); then
    echo "release $expected not healthy after $attempts attempts (backoff ${backoff_ms}ms) against $base_url" >&2
    exit 1
  fi
  sleep "$(awk -v ms="$backoff_ms" 'BEGIN { printf "%.3f", ms / 1000 }')"
done
