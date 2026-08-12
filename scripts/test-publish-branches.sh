#!/usr/bin/env bash
# Executes the REAL publish.sh promotion and rollback branches end-to-end in an
# isolated sandbox — a disposable copy of the publish machinery on a test-only port
# (23000-25999, never the canonical 3000) — instead of grep-only assertions:
#   1. PROMOTION branch: a valid release is staged from the seeded dist, promoted
#      atomically, verified (exact X-Release-ID + 2xx + every same-origin asset 2xx)
#      and reported "site published atomically" — even with hostile inherited
#      READY_MAX_ATTEMPTS / READY_BACKOFF_MS / READY_DEADLINE_SECS in the
#      environment, which production must explicitly ignore;
#   2. ROLLBACK branch: a release whose same-origin asset is missing fails the exact
#      verifier, the old release is re-promoted and verified, and publish.sh reports
#      "release failed; rollback verified" with exit 1;
#   3. BOTH-FAILED branch: with the rolled-back release's asset corrupted too,
#      publish.sh reports "release and rollback failed" with exit 1.
# The sandbox uses the FF_TEST_* seams (FF_TEST_PORT, FF_TEST_SKIP_BUILD,
# FF_TEST_SKIP_INSTALL, FF_TEST_READY_*) that production never sets; the inherited
# READY_* overrides are ignored by production and the test proves it. Every normal,
# error, and interrupted path leaves no process or listener behind.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
sandbox="$(mktemp -d /tmp/ff-publish-branches.XXXXXX)"
cleanup() {
  if [ -f "$sandbox/.run/server.pid" ]; then kill "$(cat "$sandbox/.run/server.pid")" 2>/dev/null || true; fi
  rm -rf "$sandbox"
}
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap cleanup EXIT
pick_free_port() { # 23000-25999: disjoint from every other test's range
  local p
  for _ in $(seq 1 100); do
    p=$((23000 + RANDOM % 3000))
    if ! lsof -t -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "$p"; return 0; fi
  done
  echo "no free test port found" >&2; exit 1
}
assert_no_listener() { # port context
  local port="$1" ctx="$2"
  for _ in $(seq 1 40); do
    lsof -t -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || return 0
    sleep .1
  done
  echo "listener still on port $port $ctx" >&2
  exit 1
}
port="$(pick_free_port)"
# --- Sandbox: real publish machinery + a seeded self-contained dist ------------
mkdir -p "$sandbox/scripts" "$sandbox/dist/server" "$sandbox/dist/client"
cp "$ROOT_REPO/publish.sh" "$sandbox/publish.sh"
cp "$ROOT_REPO/serve.ts" "$sandbox/serve.ts"
cp "$ROOT_REPO/package.json" "$sandbox/package.json"
cp "$ROOT_REPO/bun.lock" "$sandbox/bun.lock"
cp "$ROOT_REPO/scripts/verify-ready.sh" "$sandbox/scripts/verify-ready.sh"
cp "$ROOT_REPO/scripts/verify-release.sh" "$sandbox/scripts/verify-release.sh"
chmod +x "$sandbox/publish.sh" "$sandbox/scripts/verify-ready.sh" "$sandbox/scripts/verify-release.sh"
cat > "$sandbox/dist/server/server.js" <<'JS'
// Self-contained stand-in for the SSR handler: serves the root document (whose
// same-origin assets /app.js and /app.css are served by serve.ts from dist/client)
// and 404s every other path, so a release whose client asset is missing fails the
// exact same-origin asset check deterministically instead of SPA-falling through.
export default { fetch(req) { const url = new URL(req.url); if (url.pathname === '/') { return new Response('<!doctype html><html><head><link rel="stylesheet" href="/app.css"></head><body>ok<script src="/app.js"></script></body></html>', { headers: { 'Content-Type': 'text/html' } }); } return new Response('not found', { status: 404 }); } };
JS
printf 'app-js\n' > "$sandbox/dist/client/app.js"
printf 'app-css\n' > "$sandbox/dist/client/app.css"
# --- Phase 1: PROMOTION branch (with hostile inherited READY_* envs) -----------
echo "phase 1: promotion branch (hostile inherited READY_* envs must be ignored)"
set +e
(
  cd "$sandbox"
  env -u PORT FF_TEST_PORT="$port" FF_TEST_SKIP_BUILD=1 FF_TEST_SKIP_INSTALL=1 \
    READY_MAX_ATTEMPTS=abc READY_BACKOFF_MS=-5 READY_DEADLINE_SECS=999999999 \
    bash ./publish.sh
) >"$sandbox/phase1.log" 2>&1
rc1=$?
set -e
(( rc1 == 0 )) || { echo "phase 1 failed (rc=$rc1):"; cat "$sandbox/phase1.log"; exit 1; }
grep -q "site published atomically" "$sandbox/phase1.log" || { echo "phase 1 success message missing"; cat "$sandbox/phase1.log"; exit 1; }
current1="$(readlink -f "$sandbox/.run/current")"
[[ "$current1" == "$sandbox"/releases/* ]] || { echo "phase 1 current not a release dir: $current1"; exit 1; }
rel1="$(basename "$current1")"
test "$(cat "$current1/RELEASE_ID")" = "$rel1"
test -s "$current1/dist/client/app.js"
# The exact verifier must pass against the promoted release on the test port.
"$SCRIPT_DIR/verify-release.sh" "$rel1" "http://127.0.0.1:$port" "$sandbox/phase1-verify.html"
echo "phase 1: promoted release $rel1 verified (identity + 2xx + same-origin assets)"
# --- Phase 2: ROLLBACK branch (new release misses an asset; old must recover) --
echo "phase 2: rollback branch (new release fails the same-origin asset check)"
rm -f "$sandbox/dist/client/app.js"
set +e
(
  cd "$sandbox"
  env -u PORT FF_TEST_PORT="$port" FF_TEST_SKIP_BUILD=1 FF_TEST_SKIP_INSTALL=1 \
    FF_TEST_READY_MAX_ATTEMPTS=3 FF_TEST_READY_BACKOFF_MS=200 FF_TEST_READY_DEADLINE_SECS=20 \
    bash ./publish.sh
) >"$sandbox/phase2.log" 2>&1
rc2=$?
set -e
(( rc2 == 1 )) || { echo "phase 2 expected exit 1, got $rc2:"; cat "$sandbox/phase2.log"; exit 1; }
grep -q "release failed; rollback verified" "$sandbox/phase2.log" || { echo "phase 2 rollback message missing"; cat "$sandbox/phase2.log"; exit 1; }
# Rollback preserved the prior release as the active one and it still verifies.
current2="$(readlink -f "$sandbox/.run/current")"
[[ "$current2" == "$current1" ]] || { echo "phase 2 rollback did not restore prior release ($current2 != $current1)"; exit 1; }
"$SCRIPT_DIR/verify-release.sh" "$rel1" "http://127.0.0.1:$port" "$sandbox/phase2-verify.html"
echo "phase 2: rolled-back release $rel1 re-verified after promotion failure"
# --- Phase 3: BOTH-FAILED branch (rollback target corrupted too) ---------------
echo "phase 3: both-failed branch (rolled-back release fails verification too)"
rm -f "$current1/dist/client/app.js"
set +e
(
  cd "$sandbox"
  env -u PORT FF_TEST_PORT="$port" FF_TEST_SKIP_BUILD=1 FF_TEST_SKIP_INSTALL=1 \
    FF_TEST_READY_MAX_ATTEMPTS=3 FF_TEST_READY_BACKOFF_MS=200 FF_TEST_READY_DEADLINE_SECS=20 \
    bash ./publish.sh
) >"$sandbox/phase3.log" 2>&1
rc3=$?
set -e
(( rc3 == 1 )) || { echo "phase 3 expected exit 1, got $rc3:"; cat "$sandbox/phase3.log"; exit 1; }
grep -q "release and rollback failed" "$sandbox/phase3.log" || { echo "phase 3 both-failed message missing"; cat "$sandbox/phase3.log"; exit 1; }
# --- Final cleanup: no listener or process may survive any branch ---------------
if [ -f "$sandbox/.run/server.pid" ]; then kill "$(cat "$sandbox/.run/server.pid")" 2>/dev/null || true; fi
assert_no_listener "$port" "after publish-branch tests"
# The failed phase-2 release must have been removed; only the rolled-back release
# (plus the first-deploy legacy rollback target) remains.
releases_left="$(find "$sandbox/releases" -mindepth 1 -maxdepth 1 -type d | wc -l)"
(( releases_left == 2 )) || { echo "unexpected release count $releases_left after branches:"; find "$sandbox/releases" -mindepth 1 -maxdepth 1 -type d; exit 1; }
echo "publish.sh promotion, rollback, and both-failed branches executed and verified with no listener left behind"
