#!/usr/bin/env bash
# Build, promote, and verify an immutable release. Only one publish may run at a time.
set -euo pipefail
cd "$(dirname "$0")"
umask 002
mkdir -p .run releases
exec 9>.run/publish.lock
if ! flock -n 9; then echo "publish already running" >&2; exit 75; fi
release="$(date -u +%Y%m%dT%H%M%S)-$$"
staging="$(mktemp -d "$PWD/.run/staging.$release.XXXXXX")"
release_dir="$PWD/releases/$release"
old_release=""
cleanup() { rm -rf "$staging"; }
trap cleanup EXIT
# bun ci is the reproducible, complete build toolchain (Vite is a dev dependency).
bun ci
BUILD_DIR="$staging/dist" bun run build
[ -s "$staging/dist/server/server.js" ] || { echo "staged server missing" >&2; exit 1; }
[ -d "$staging/dist/client" ] && find "$staging/dist/client" -type f | grep -q . || { echo "staged client missing" >&2; exit 1; }
mkdir -p "$release_dir"
mv "$staging/dist" "$release_dir/dist"
# Capture the launcher and its exact runtime dependency lock with this release.
cp serve.ts package.json bun.lock "$release_dir/"
(cd "$release_dir" && bun install --frozen-lockfile --production)
printf '%s\n' "$release" > "$release_dir/RELEASE_ID"
cat > "$release_dir/manifest.json" <<EOF
{"release":"$release","server":"dist/server/server.js","client":"dist/client","launcher":"serve.ts"}
EOF
# A pre-atomic root dist is a valid rollback target on the first transition.
if [ -L .run/current ]; then old_release="$(readlink -f .run/current)";
elif [ -f dist/server/server.js ]; then
  legacy="$PWD/releases/legacy-$release"
  mkdir -p "$legacy"; cp -a dist "$legacy/dist"; cp serve.ts package.json bun.lock "$legacy/"
  (cd "$legacy" && bun install --frozen-lockfile --production)
  printf '%s\n' "legacy-$release" > "$legacy/RELEASE_ID"
  printf '%s\n' '{"release":"legacy-'"$release"'","legacy":true}' > "$legacy/manifest.json"
  old_release="$legacy"
fi
ln -s "$release_dir" .run/current.next
mv -Tf .run/current.next .run/current
# Stop the recorded process; legacy servers without a pid are also taken over.
if [ -s .run/server.pid ]; then kill "$(cat .run/server.pid)" 2>/dev/null || true; fi
for _ in $(seq 1 50); do
  if ! lsof -t -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then break; fi
  [ -s .run/server.pid ] && kill "$(cat .run/server.pid)" 2>/dev/null || true
  sleep .1
done
# Clear any inherited generic PORT (e.g. PORT=80) and the test-only override so every
# spawned release process binds the canonical platform port 3000.
start_release() { local d="$1"; env -u PORT -u FF_TEST_PORT setsid nohup bun "$d/serve.ts" > .run/server.log 2>&1 < /dev/null & echo $! > .run/server.pid; }
start_release "$release_dir"
verify() {
  local expected="$1" html="$2"
  ./scripts/verify-release.sh "$expected" "http://127.0.0.1:3000" "$html"
}
if verify "$release" .run/health.html; then rm -f .run/health.html; find releases -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +7 | cut -d' ' -f2- | xargs -r rm -rf; echo "site published atomically: $release"; exit 0; fi
# Do not claim recovery until the old release identity and assets are healthy.
kill "$(cat .run/server.pid 2>/dev/null || true)" 2>/dev/null || true
if [ -n "$old_release" ] && [ -d "$old_release" ]; then
  ln -s "$old_release" .run/rollback.next; mv -Tf .run/rollback.next .run/current
  start_release "$old_release"
  if verify "$(cat "$old_release/RELEASE_ID")" .run/rollback.html; then rm -rf "$release_dir"; rm -f .run/rollback.html; echo "release failed; rollback verified" >&2; exit 1; fi
fi
rm -rf "$release_dir"; rm -f .run/health.html .run/rollback.html; echo "release and rollback failed" >&2; exit 1
