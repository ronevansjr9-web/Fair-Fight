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
cleanup() { rm -rf "$staging" "$PWD/.run/current.next" "$PWD/.run/rollback.next"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# Test-only listener override. Production never sets FF_TEST_PORT — the platform
# requires the canonical port 3000 — so only the isolated publish-branch tests set
# it; a malformed value is a test bug and must fail loudly rather than fall back to
# 3000 and collide with the real site.
if [ -n "${FF_TEST_PORT:-}" ]; then
  if ! [[ "$FF_TEST_PORT" =~ ^[1-9][0-9]*$ ]] || (( FF_TEST_PORT > 65535 )); then
    echo "invalid FF_TEST_PORT '$FF_TEST_PORT' (test-only override; must be 1-65535)" >&2
    exit 64
  fi
  listener_port="$FF_TEST_PORT"
else
  listener_port=3000
fi
base_url="http://127.0.0.1:$listener_port"
if [ -n "${FF_TEST_SKIP_BUILD:-}" ]; then
  # Test-only seam: exercise the promotion/rollback orchestration against a
  # pre-seeded dist/ (scripts/test-publish-branches.sh) instead of a full bun ci +
  # vite build. Production never sets FF_TEST_SKIP_BUILD; the same sanity checks
  # below still gate the staged output.
  [ -s dist/server/server.js ] || { echo "staged server missing" >&2; exit 1; }
  [ -d dist/client ] && find dist/client -type f | grep -q . || { echo "staged client missing" >&2; exit 1; }
  mkdir -p "$staging/dist"
  cp -a dist/. "$staging/dist/"
else
  # bun ci is the reproducible, complete build toolchain (Vite is a dev dependency).
  bun ci
  BUILD_DIR="$staging/dist" bun run build
  [ -s "$staging/dist/server/server.js" ] || { echo "staged server missing" >&2; exit 1; }
  [ -d "$staging/dist/client" ] && find "$staging/dist/client" -type f | grep -q . || { echo "staged client missing" >&2; exit 1; }
fi
mkdir -p "$release_dir"
mv "$staging/dist" "$release_dir/dist"
# Capture the launcher and its exact runtime dependency lock with this release.
cp serve.ts package.json bun.lock "$release_dir/"
if [ -z "${FF_TEST_SKIP_INSTALL:-}" ]; then
  (cd "$release_dir" && bun install --frozen-lockfile --production)
fi
printf '%s\n' "$release" > "$release_dir/RELEASE_ID"
cat > "$release_dir/manifest.json" <<EOF
{"release":"$release","server":"dist/server/server.js","client":"dist/client","launcher":"serve.ts"}
EOF
# A pre-atomic root dist is a valid rollback target on the first transition.
if [ -L .run/current ]; then old_release="$(readlink -f .run/current)";
elif [ -f dist/server/server.js ]; then
  legacy="$PWD/releases/legacy-$release"
  mkdir -p "$legacy"; cp -a dist "$legacy/dist"; cp serve.ts package.json bun.lock "$legacy/"
  if [ -z "${FF_TEST_SKIP_INSTALL:-}" ]; then
    (cd "$legacy" && bun install --frozen-lockfile --production)
  fi
  printf '%s\n' "legacy-$release" > "$legacy/RELEASE_ID"
  printf '%s\n' '{"release":"legacy-'\"$release\"'","legacy":true}' > "$legacy/manifest.json"
  old_release="$legacy"
fi
ln -s "$release_dir" .run/current.next
mv -Tf .run/current.next .run/current
# Stop the recorded process; legacy servers without a pid are also taken over.
if [ -s .run/server.pid ]; then kill "$(cat .run/server.pid)" 2>/dev/null || true; fi
for _ in $(seq 1 50); do
  if ! lsof -t -iTCP:"$listener_port" -sTCP:LISTEN >/dev/null 2>&1; then break; fi
  [ -s .run/server.pid ] && kill "$(cat .run/server.pid)" 2>/dev/null || true
  sleep .1
done
# Clear any inherited generic PORT (e.g. PORT=80) so no spawned release process can
# ever bind the wrong listener. The test-only FF_TEST_PORT override is cleared for
# production spawns (canonical port 3000); isolated tests that explicitly set it
# keep it so their listener stays on the disposable test port. The release process
# must NOT inherit the publish lock (fd 9) — `9>&-` closes it in the spawned
# process, otherwise the flock would stay held until the server exits and every
# later publish would fail with "publish already running".
start_release() {
  local d="$1"
  if [ -z "${FF_TEST_PORT:-}" ]; then
    env -u PORT -u FF_TEST_PORT setsid nohup bun "$d/serve.ts" 9>&- > .run/server.log 2>&1 < /dev/null & echo $! > .run/server.pid
  else
    env -u PORT setsid nohup bun "$d/serve.ts" 9>&- > .run/server.log 2>&1 < /dev/null & echo $! > .run/server.pid
  fi
}
start_release "$release_dir"
# Bounded readiness retry: a freshly spawned release is not immediately reachable
# (SSR bundle import, listener bind), so a single immediate probe races readiness.
# verify-ready.sh re-runs the full exact verifier (2xx, exact X-Release-ID, every
# same-origin asset) with backoff against the canonical port 3000 until healthy or
# the bound is exhausted. It never masks wrong identity, non-2xx, invalid assets, or
# a wrong port, and exits 1 if the process never becomes healthy. The wall-clock
# deadline (READY_DEADLINE_SECS) is enforced by verify-ready.sh and includes the
# time spent in full root/asset verification.
#
# Production hygiene: inherited READY_MAX_ATTEMPTS / READY_BACKOFF_MS /
# READY_DEADLINE_SECS are explicitly cleared so an inherited value can never change
# production readiness behavior or cause unbounded delay. Only the explicit
# test-only FF_TEST_READY_* seams (never set by the platform, and still validated
# and capped by verify-ready.sh) may shorten the bound for the isolated
# publish-branch tests.
verify_ready() {
  local expected="$1" html="$2" v ffv
  local -a ready_env=(env -u READY_MAX_ATTEMPTS -u READY_BACKOFF_MS -u READY_DEADLINE_SECS)
  for v in READY_MAX_ATTEMPTS READY_BACKOFF_MS READY_DEADLINE_SECS; do
    ffv="FF_TEST_${v}"
    if [ -n "${!ffv:-}" ]; then ready_env+=("$v=${!ffv}"); fi
  done
  "${ready_env[@]}" ./scripts/verify-ready.sh "$expected" "$html" "$base_url"
}
if verify_ready "$release" .run/health.html; then rm -f .run/health.html; find releases -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +7 | cut -d' ' -f2- | xargs -r rm -rf; echo "site published atomically: $release"; exit 0; fi
# Do not claim recovery until the old release identity and assets are healthy.
kill "$(cat .run/server.pid 2>/dev/null || true)" 2>/dev/null || true
if [ -n "$old_release" ] && [ -d "$old_release" ]; then
  ln -s "$old_release" .run/rollback.next; mv -Tf .run/rollback.next .run/current
  start_release "$old_release"
  if verify_ready "$(cat "$old_release/RELEASE_ID")" .run/rollback.html; then rm -rf "$release_dir"; rm -f .run/rollback.html; echo "release failed; rollback verified" >&2; exit 1; fi
fi
rm -rf "$release_dir"; rm -f .run/health.html .run/rollback.html; echo "release and rollback failed" >&2; exit 1
