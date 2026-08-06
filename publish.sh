#!/usr/bin/env bash
# Build and atomically deploy a release without mutating the running release.
set -euo pipefail
cd "$(dirname "$0")"
umask 002
mkdir -p .run releases

release="$(date -u +%Y%m%dT%H%M%S)-$$"
staging="$(mktemp -d "$PWD/.run/build.XXXXXX")"
release_dir="$PWD/releases/$release"
old_release=""
cleanup() { rm -rf "$staging"; }
trap cleanup EXIT

# Build outside releases/current. Vite/TanStack writes all output below BUILD_DIR.
BUILD_DIR="$staging/dist" bun install --production
BUILD_DIR="$staging/dist" bun run build
[ -s "$staging/dist/server/server.js" ] || { echo "staged server missing" >&2; exit 1; }
[ -d "$staging/dist/client" ] || { echo "staged client assets missing" >&2; exit 1; }
find "$staging/dist/client" -type f | grep -q . || { echo "staged client is empty" >&2; exit 1; }
mv "$staging/dist" "$release_dir"

if [ -L .run/current ]; then old_release="$(readlink -f .run/current)"; fi
ln -s "$release_dir" .run/current.next
mv -Tf .run/current.next .run/current

# Stop the known server, with a one-time fallback for pre-atomic servers.
if [ -s .run/server.pid ]; then
  kill "$(cat .run/server.pid)" 2>/dev/null || true
  for _ in $(seq 1 25); do kill -0 "$(cat .run/server.pid)" 2>/dev/null || break; sleep .2; done
fi
setsid nohup env RELEASE_DIR="$release_dir" bun run start > .run/server.log 2>&1 < /dev/null &
echo $! > .run/server.pid

rollback() {
  echo "release failed verification; rolling back" >&2
  kill "$(cat .run/server.pid 2>/dev/null || true)" 2>/dev/null || true
  if [ -n "$old_release" ] && [ -d "$old_release" ]; then
    ln -s "$old_release" .run/current.rollback
    mv -Tf .run/current.rollback .run/current
    setsid nohup env RELEASE_DIR="$old_release" bun run start > .run/server.log 2>&1 < /dev/null &
    echo $! > .run/server.pid
  fi
}
healthy=false
for _ in $(seq 1 50); do
  if curl -sf http://localhost:3000/ -o .run/health.html; then healthy=true; break; fi
  sleep .2
done
if [ "$healthy" != true ]; then rollback; exit 1; fi
# Check every same-origin script/stylesheet reference emitted by the health page.
while read -r asset; do
  case "$asset" in /*) curl -sf "http://localhost:3000$asset" -o /dev/null || { echo "asset failed: $asset" >&2; rollback; exit 1; };; esac
done < <(grep -oE '(src|href)="/[^"]+"' .run/health.html | sed -E 's/^[^\"]+"(\/[^\"]+)"$/\1/' | sort -u)
rm -f .run/health.html
find releases -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf
echo "site published atomically: $release"
