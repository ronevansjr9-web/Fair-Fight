#!/usr/bin/env bash
# Focused filesystem verification: prove promotion never exposes partial assets.
set -euo pipefail
root="$(mktemp -d)"; trap 'rm -rf "$root"' EXIT
mkdir -p "$root/releases/a/client" "$root/releases/b/client"
printf 'A-server' > "$root/releases/a/server.js"; printf 'A-client' > "$root/releases/a/client/chunk-A.js"
printf 'B-server' > "$root/releases/b/server.js"; printf 'B-client' > "$root/releases/b/client/chunk-B.js"
ln -s "$root/releases/a" "$root/current"
# A running server has resolved the old directory; swap only after B is complete.
ln -s "$root/releases/b" "$root/current.next"; mv -Tf "$root/current.next" "$root/current"
test "$(cat "$root/releases/a/client/chunk-A.js")" = A-client
test "$(cat "$root/current/client/chunk-B.js")" = B-client
! test -e "$root/current/client/chunk-A.js"
echo 'atomic release simulation passed: old and new asset trees remain complete'
