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
echo 'atomic release, existing-listener failure, and first-deploy legacy rollback simulations passed'
