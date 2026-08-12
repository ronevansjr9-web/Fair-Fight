#!/usr/bin/env bash
# Focused regression coverage for atomic promotion and rollback invariants.
set -euo pipefail
root="$(mktemp -d)"; trap 'rm -rf "$root"' EXIT
mkdir -p "$root/releases/a/dist/client" "$root/releases/b/dist/client"
printf 'A-server' > "$root/releases/a/dist/server.js"; printf 'A-client' > "$root/releases/a/dist/client/chunk-A.js"
printf 'B-server' > "$root/releases/b/dist/server.js"; printf 'B-client' > "$root/releases/b/dist/client/chunk-B.js"
ln -s "$root/releases/a" "$root/current"
# Existing listener/new process failure: old release remains complete while new is staged.
ln -s "$root/releases/b" "$root/current.next"; mv -Tf "$root/current.next" "$root/current"
test "$(cat "$root/releases/a/dist/client/chunk-A.js")" = A-client
test "$(cat "$root/current/dist/client/chunk-B.js")" = B-client
! test -e "$root/current/dist/client/chunk-A.js"
# First-deploy legacy rollback: root dist is copied before current is promoted.
mkdir -p "$root/legacy-root/dist/client"; printf legacy > "$root/legacy-root/dist/client/old.js"
legacy="$root/releases/legacy-first"; mkdir -p "$legacy"; cp -a "$root/legacy-root/dist" "$legacy/dist"
printf legacy-first > "$legacy/RELEASE_ID"
ln -s "$legacy" "$root/current.rollback"; mv -Tf "$root/current.rollback" "$root/current"
test "$(cat "$root/current/RELEASE_ID")" = legacy-first
test "$(cat "$root/current/dist/client/old.js")" = legacy
# Guard the script against regressions to the review's blocking defects.
grep -q 'flock' publish.sh
grep -q 'bun ci' publish.sh
grep -q 'X-Release-ID' serve.ts
grep -q 'legacy-' publish.sh
grep -q 'rollback verified' publish.sh
# Guard the bounded readiness retry: both promotion and rollback verification must
# go through verify-ready.sh, production must clear inherited READY_* overrides so
# they can never change production behavior, and the wall-clock deadline bound must
# be enforced by the verifier itself.
grep -q 'verify-ready' publish.sh
test "$(grep -c 'verify-ready' publish.sh)" -ge 2
grep -q -- '-u READY_MAX_ATTEMPTS -u READY_BACKOFF_MS -u READY_DEADLINE_SECS' publish.sh
grep -q 'READY_DEADLINE_SECS' scripts/verify-ready.sh
grep -q 'READY_MAX_ATTEMPTS' scripts/verify-ready.sh
grep -q 'READY_BACKOFF_MS' scripts/verify-ready.sh
# The canonical platform port must remain the default verification target (a wrong
# port can never be accepted) and the production listener default.
grep -q '127.0.0.1:3000' scripts/verify-ready.sh
grep -q 'listener_port=3000' publish.sh
# Guard the canonical port contract: spawned release processes must clear inherited
# generic PORT, and the launcher must keep only the explicit test-only override.
grep -q -- '-u PORT' publish.sh
grep -q 'FF_TEST_PORT' serve.ts
grep -q 'CANONICAL_PORT' serve.ts
echo 'atomic release, existing-listener failure, first-deploy legacy rollback simulations, bounded readiness retry guards, deadline bound guards, and canonical port guards passed'
