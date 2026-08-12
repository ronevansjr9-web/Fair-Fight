#!/usr/bin/env bash
# Bounded readiness verification for a promoted or rolled-back release.
#
# publish.sh spawns a release process and must confirm it before declaring the
# publish (or a rollback) successful. A freshly spawned process is not immediately
# reachable: it must import the SSR bundle, resolve its release directory, and bind
# the listener, so a single immediate probe races process readiness and fails with
# connection refused even though the process would have become healthy milliseconds
# later. This wrapper re-runs the FULL verifier (scripts/verify-release.sh: exact
# X-Release-ID, 2xx status, every same-origin asset 2xx) with backoff until the
# process is ready or a bound is exhausted.
#
# Bounds — the wall-clock deadline is the hard overall cap and is TRULY AGGREGATE:
# it covers the inter-attempt sleep AND every second an attempt spends inside the
# full root/asset verification. verify-ready.sh passes the absolute deadline to
# verify-release.sh (READY_DEADLINE_EPOCH), which caps every individual request —
# root and each same-origin asset — at the seconds remaining until that deadline
# and aborts the attempt the moment the budget is spent (re-checked before every
# request), so no in-flight verification can substantially overrun the deadline
# even with many slow assets. The inter-attempt backoff is likewise capped at the
# remaining budget. The attempt count is a secondary bound so a slow-but-progressing
# process still terminates promptly once the deadline is reached:
#   READY_MAX_ATTEMPTS  (default 30,  cap 120)  maximum verification attempts
#   READY_BACKOFF_MS    (default 500, cap 5000) sleep between failed attempts, ms
#   READY_DEADLINE_SECS (default 120, cap 600)  overall wall-clock deadline, seconds
# All three must be strict base-10 positive integers. Malformed, non-decimal,
# zero/negative, or oversized values are rejected (exit 64) BEFORE any arithmetic
# evaluation, sleep, or network work, so accidental or hostile values can never
# cause arithmetic surprises or unbounded delay.
#
# Safety: every retry is a complete, exact check — 2xx status, exact X-Release-ID,
# and every same-origin asset responding 2xx — against the same base URL. A wrong
# release identity, a non-2xx response, an invalid/missing asset, or a wrong
# listener port can never pass; the retry only delays the verdict. If the process
# never becomes healthy within the bounds, this exits 1 and the caller must treat
# the release as failed (publish.sh then rolls back; a failing rollback is
# reported).
#
# Usage: verify-ready.sh <expected-release-id> <html-file> [base-url]
#   base-url defaults to the canonical platform port http://127.0.0.1:3000.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ $# -ge 2 ]] || { echo "usage: verify-ready.sh <expected-release-id> <html-file> [base-url]" >&2; exit 64; }
expected="$1"
html="$2"
base_url="${3:-http://127.0.0.1:3000}"
# Strict positive base-10 integer validation with caps. Anything else — letters,
# signs, fractions, hex, exponents, zero — fails fast with a clear error and never
# reaches arithmetic evaluation or a sleep.
ready_bounds() { # name default cap
  local name="$1" default="$2" cap="$3" value
  value="${!name:-$default}"
  [[ "$value" =~ ^[1-9][0-9]*$ ]] || { echo "verify-ready: $name must be a positive integer (got '$value')" >&2; exit 64; }
  if (( value > cap )); then
    echo "verify-ready: $name=$value exceeds the maximum allowed $cap" >&2
    exit 64
  fi
  printf '%s' "$value"
}
attempts="$(ready_bounds READY_MAX_ATTEMPTS 30 120)"
backoff_ms="$(ready_bounds READY_BACKOFF_MS 500 5000)"
deadline_secs="$(ready_bounds READY_DEADLINE_SECS 120 600)"
deadline=$(( $(date +%s) + deadline_secs ))
i=0
while :; do
  if (( $(date +%s) >= deadline )); then
    echo "release $expected not healthy within the ${deadline_secs}s wall-clock deadline (${i} attempt(s)) against $base_url" >&2
    exit 1
  fi
  # Pass the absolute deadline into the full verifier: every root/asset request is
  # capped at the remaining budget, so an in-flight verification cannot
  # substantially overrun the deadline (the deadline is aggregate).
  if READY_DEADLINE_EPOCH="$deadline" "$SCRIPT_DIR/verify-release.sh" "$expected" "$base_url" "$html"; then
    exit 0
  fi
  i=$((i + 1))
  if (( i >= attempts )); then
    echo "release $expected not healthy after $attempts attempts (backoff ${backoff_ms}ms) against $base_url" >&2
    exit 1
  fi
  # Cap the inter-attempt sleep at the remaining budget: the wall-clock deadline is
  # the hard overall bound and includes sleep time, so a large backoff can never
  # push the run substantially past it.
  rem=$(( deadline - $(date +%s) ))
  if (( rem <= 0 )); then
    echo "release $expected not healthy within the ${deadline_secs}s wall-clock deadline (${i} attempt(s)) against $base_url" >&2
    exit 1
  fi
  sleep "$(awk -v ms="$backoff_ms" -v cap="$rem" 'BEGIN { s = ms / 1000; if (s > cap) s = cap; printf "%.3f", s }')"
done
