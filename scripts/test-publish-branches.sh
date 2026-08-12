#!/usr/bin/env bash
# Executes the REAL publish.sh promotion, rollback, both-failed, and interrupted
# branches end-to-end in an isolated sandbox — a disposable copy of the publish
# machinery on a test-only port (23000-25999, never the canonical 3000) — instead
# of grep-only assertions:
#   1. PROMOTION branch: a valid release is staged from the seeded dist, promoted
#      atomically, verified (exact X-Release-ID + 2xx + every same-origin asset 2xx)
#      and reported "site published atomically" — even with hostile inherited
#      READY_MAX_ATTEMPTS / READY_BACKOFF_MS / READY_DEADLINE_SECS in the
#      environment, which production must explicitly ignore;
#   2. ROLLBACK branch: a release whose same-origin asset is missing fails the exact
#      verifier, the old release is re-promoted and verified, and publish.sh reports
#      "release failed; rollback verified" with exit 1;
#   3. BOTH-FAILED branch: with the rolled-back release's asset corrupted too,
#      publish.sh reports "release and rollback failed" with exit 1;
#   4. INTERRUPTED-PUBLISH branch: a real SIGINT (whole process group) arrives while
#      the unverified candidate is selected and running. publish.sh must terminate
#      the candidate process, atomically restore .run/current to the prior release,
#      restart and re-verify the prior release, remove the interrupted candidate
#      directory, exit 130, and never leave the unverified candidate selected;
#   5. INTERRUPTED-ROLLBACK branch: SIGINT arrives while the rollback verification
#      is running. publish.sh must NOT touch the running (known-good) rollback
#      process — the trap must never kill a known-good rollback process — it only
#      removes the orphaned candidate directory and exits 130 with the rollback
#      process still alive and serving.
#   6. DETERMINISTIC SIGNAL-INJECTION MATRIX: FF_TEST_SIGNAL_AT makes publish.sh
#      inject SIGINT into itself at exactly each formerly unsafe transition point
#      (promote-selected, promote-stopped, promote-tracked, rollback-killed,
#      rollback-selected, rollback-started) — no wall-clock races. Each injection
#      asserts .run/current resolves to the intended prior release, the
#      candidate/superseded process is reaped (kill -0 fails), exactly one
#      listener survives, no candidate directory or markers remain, the
#      still-serving known-good process at promote-selected is never killed, and
#      the launched rollback process at rollback-started is never killed.
# Every phase ends with pid-level no-orphan assertions (the tracked process is
# actually gone — kill -0 fails — or, where a release must keep serving, is proven
# alive), not merely the absence of a listener. The sandbox uses the FF_TEST_*
# seams (FF_TEST_PORT, FF_TEST_SKIP_BUILD, FF_TEST_SKIP_INSTALL, FF_TEST_READY_*)
# that production never sets; the inherited READY_* overrides are ignored by
# production and phase 1 proves it.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
sandbox="$(mktemp -d /tmp/ff-publish-branches.XXXXXX)"
tracked_pids=()
track_pid() { tracked_pids+=("$1"); }   # every captured pid is killed AND waited in cleanup
cleanup() {
  local p
  # Reap every captured pid: the phase-5 candidate/verifier/rollback/publish/
  # timeout pids and the sandbox's recorded server pid, so no process outlives the
  # test on any (including failing) exit path. kill may no-op for already-reaped
  # pids; wait only succeeds for children of this shell (publish's own children
  # were reaped by the publish/timeout trees, and the setsid'd servers are
  # reparented), so both are best-effort and guarded.
  for p in "${tracked_pids[@]:-}"; do kill "$p" 2>/dev/null || true; done
  if [ -f "$sandbox/.run/server.pid" ]; then kill "$(cat "$sandbox/.run/server.pid")" 2>/dev/null || true; fi
  for p in "${tracked_pids[@]:-}"; do wait "$p" 2>/dev/null || true; done
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
assert_pid_gone() { # pid context — PROVE the process is gone (kill -0 fails), not
  local pid="$1" ctx="$2" i  # merely that nothing listens on its port anymore
  for i in $(seq 1 50); do
    if ! kill -0 "$pid" 2>/dev/null; then return 0; fi
    sleep .1
  done
  echo "process $pid still alive $ctx" >&2
  exit 1
}
assert_pid_alive() { # pid context
  local pid="$1" ctx="$2"
  kill -0 "$pid" 2>/dev/null || { echo "process $pid not alive $ctx" >&2; exit 1; }
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
pid1="$(cat "$sandbox/.run/server.pid")"
assert_pid_alive "$pid1" "after phase 1 promotion"
echo "phase 1: promoted release $rel1 verified (identity + 2xx + same-origin assets; server pid $pid1 alive)"
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
pid2="$(cat "$sandbox/.run/server.pid")"
assert_pid_alive "$pid2" "after phase 2 rollback"
echo "phase 2: rolled-back release $rel1 re-verified after promotion failure (server pid $pid2 alive)"
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
pid3="$(cat "$sandbox/.run/server.pid")"
assert_pid_alive "$pid3" "after phase 3 both-failed (rollback process keeps serving)"
echo "phase 3: both-failed branch reported failure with exit 1 (rollback process $pid3 untouched)"
# --- Phase 4a: re-seed and promote a healthy known-good release to roll back to --
printf 'app-js\n' > "$sandbox/dist/client/app.js"   # restore the seed for phase 4a
printf 'app-js\n' > "$current1/dist/client/app.js"  # restore rel1 so it stays a valid retained release
set +e
(
  cd "$sandbox"
  env -u PORT FF_TEST_PORT="$port" FF_TEST_SKIP_BUILD=1 FF_TEST_SKIP_INSTALL=1 \
    bash ./publish.sh
) >"$sandbox/phase4a.log" 2>&1
rc4a=$?
set -e
(( rc4a == 0 )) || { echo "phase 4a failed (rc=$rc4a):"; cat "$sandbox/phase4a.log"; exit 1; }
grep -q "site published atomically" "$sandbox/phase4a.log" || { echo "phase 4a success message missing"; cat "$sandbox/phase4a.log"; exit 1; }
rel4="$(basename "$(readlink -f "$sandbox/.run/current")")"
"$SCRIPT_DIR/verify-release.sh" "$rel4" "http://127.0.0.1:$port" "$sandbox/phase4a-verify.html"
p4b_pid="$(cat "$sandbox/.run/server.pid")"
assert_pid_alive "$p4b_pid" "after phase 4a (known-good release $rel4)"
echo "phase 4a: known-good release $rel4 promoted and verified (server pid $p4b_pid)"
# --- Phase 4b: INTERRUPTED PUBLISH (SIGINT while the unverified candidate is
# selected and running). The candidate's asset is missing so its verification keeps
# failing (a multi-second window); SIGINT goes to publish.sh's whole process group
# (setsid gave it its own session/pgid — the spawned release server is a separate
# session and is NOT signalled; publish.sh's fail-safe trap terminates it). After
# the interrupt: the prior release must be selected and serving again, the
# candidate process must be gone, the candidate directory removed, and the exit
# code must be 130 (SIGINT).
echo "phase 4b: interrupted publish — SIGINT while the unverified candidate is selected"
rm -f "$sandbox/dist/client/app.js"   # candidate will keep failing verification
# Deliver the SIGINT with `timeout` (whole process group, proven deterministic in
# test-verify-ready): timeout runs the publish in its own process group and sends
# SIGINT to that ENTIRE group at the given wall-clock point — publish.sh, its
# verifier children, and the in-flight curl — while the setsid'd release servers
# (separate sessions) are NOT signalled and the test itself is untouched. The
# publish starts at ~1 s; its candidate verification keeps failing (missing asset)
# for ~10 s, so the 6 s INT lands mid-verification while the unverified candidate
# is selected and running. timeout exits 124 when it fires.
timeout --signal=INT --kill-after=5 6 env -u PORT FF_TEST_PORT="$port" FF_TEST_SKIP_BUILD=1 FF_TEST_SKIP_INSTALL=1 \
    FF_TEST_READY_MAX_ATTEMPTS=30 FF_TEST_READY_BACKOFF_MS=300 FF_TEST_READY_DEADLINE_SECS=30 \
    bash "$sandbox/publish.sh" < /dev/null >"$sandbox/phase4b.log" 2>&1 &
pub_pid=$!
track_pid "$pub_pid"
cand_dir=""
for _ in $(seq 1 400); do
  cur="$(readlink -f "$sandbox/.run/current" 2>/dev/null || true)"
  sp="$(cat "$sandbox/.run/server.pid" 2>/dev/null || true)"
  if [ -n "$cur" ] && [ "$cur" != "$current1" ] && [ "$cur" != "$sandbox/releases/$rel4" ] \
     && [ -n "$sp" ] && [ "$sp" != "$p4b_pid" ] \
     && lsof -t -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    cand_dir="$cur"; break
  fi
  sleep .1
done
[ -n "$cand_dir" ] || { echo "phase 4b candidate never became selected/listening:"; cat "$sandbox/phase4b.log"; exit 1; }
cand_pid="$(cat "$sandbox/.run/server.pid")"
track_pid "$cand_pid"
assert_pid_alive "$cand_pid" "phase 4b candidate before interrupt"
echo "phase 4b: candidate $cand_dir (pid $cand_pid) selected and listening; waiting for timeout SIGINT"
set +e
wait "$pub_pid"; rc4b=$?
set -e
(( rc4b == 124 )) || { echo "phase 4b publish exited $rc4b, expected 124 (timeout SIGINT):"; cat "$sandbox/phase4b.log"; exit 1; }
grep -q "publish interrupted; prior release $rel4 restored and verified" "$sandbox/phase4b.log" \
  || { echo "phase 4b restore message missing:"; cat "$sandbox/phase4b.log"; exit 1; }
# The prior (known-good) release must be selected again and its server must be the
# one serving the port; the candidate process must be gone.
current4b="$(readlink -f "$sandbox/.run/current")"
[[ "$current4b" == "$sandbox/releases/$rel4" ]] || { echo "phase 4b current not restored to $rel4: $current4b"; exit 1; }
assert_pid_gone "$cand_pid" "phase 4b candidate after interrupt"
restored_pid="$(cat "$sandbox/.run/server.pid")"
assert_pid_alive "$restored_pid" "phase 4b restored prior release after interrupt"
"$SCRIPT_DIR/verify-release.sh" "$rel4" "http://127.0.0.1:$port" "$sandbox/phase4b-verify.html"
# Cleanup: the interrupted candidate directory must be gone; no staging or
# swap/interrupt markers may remain.
! test -e "$cand_dir" || { echo "phase 4b candidate directory still present: $cand_dir"; exit 1; }
! test -e "$sandbox/.run/current.next" && ! test -e "$sandbox/.run/rollback.next" && ! test -e "$sandbox/.run/current.restore" \
  || { echo "phase 4b interrupt markers left behind:"; ls -la "$sandbox/.run"; exit 1; }
! find "$sandbox/.run" -maxdepth 1 -name 'staging.*' | grep -q . || { echo "phase 4b staging dir left behind"; exit 1; }
echo "phase 4b: interrupted publish terminated the unverified candidate, restored $rel4 (pid $restored_pid verified), and cleaned up"
# --- Phase 5: INTERRUPTED ROLLBACK (SIGINT while the rollback verification is
# running). Both the candidate AND the rollback target fail verification, so the
# rollback process keeps running unverified for a multi-second window. SIGINT must
# NOT kill the known-good rollback process — publish.sh's trap only removes the
# orphaned candidate directory, terminates/reaps the in-flight verifier, and exits
# 130 — and the rollback process must still be alive and the SOLE listener
# afterwards, with the current selection retained and the publish lock acquirable.
echo "phase 5: interrupted rollback — SIGINT must not kill the known-good rollback process"
rm -f "$sandbox/dist/client/app.js" "$sandbox/releases/$rel4/dist/client/app.js"  # candidate AND rollback target fail verification
# The rollback process this phase must observe is the one STARTED by this publish
# (a new pid): phase 4b's trap restarted the prior release, so the pid serving at
# phase-5 start is the phase-4b restored server, not p4b_pid — comparing against
# p4b_pid would falsely match the leftover as the "rollback process" before this
# publish even rolls back.
phase5_start_pid="$(cat "$sandbox/.run/server.pid")"
# Phase 5 timeline: candidate verification keeps failing for ~12 s (40 attempts x
# 300 ms), then the rollback starts and its verification keeps failing for another
# ~12 s. The test observes the ACTUAL rollback transition — .run/current back on
# rel4 with a NEW server pid distinct from BOTH the phase-5 start pid and the
# candidate pid — and only THEN injects SIGINT into the publish's whole process
# group, so the trap demonstrably runs mid-rollback-verification with no wall-clock
# guess. timeout is only a long deadman: in a non-interactive script it moves
# ITSELF to a fresh process group (pgid == timeout's pid == $!) that the publish
# bash and its verifier children share, and it passes the child's exit code
# through — so the publish must exit 130 from the injected SIGINT, never 124 from
# the deadman.
(
  cd "$sandbox"
  exec timeout --signal=INT --kill-after=5 120 env -u PORT FF_TEST_PORT="$port" FF_TEST_SKIP_BUILD=1 FF_TEST_SKIP_INSTALL=1 \
      FF_TEST_READY_MAX_ATTEMPTS=40 FF_TEST_READY_BACKOFF_MS=300 FF_TEST_READY_DEADLINE_SECS=40 \
      bash ./publish.sh < /dev/null
) >"$sandbox/phase5.log" 2>&1 &
tm_pid=$!
track_pid "$tm_pid"
# The publish bash is timeout's direct child (the exec chains preserve the pid)
# and shares timeout's process group, so a group signal must target -$tm_pid.
publish5_pid=""
for _ in $(seq 1 100); do
  publish5_pid="$(pgrep -P "$tm_pid" 2>/dev/null | head -1 || true)"
  [ -n "$publish5_pid" ] && break
  sleep .1
done
[ -n "$publish5_pid" ] || { echo "phase 5 publish never started:"; cat "$sandbox/phase5.log"; exit 1; }
# Observe the unverified candidate: a NEW release selected with its own pid and
# listening (its verification keeps failing — the candidate asset is missing).
cand5_dir=""; cand5_pid=""
for _ in $(seq 1 500); do
  cur="$(readlink -f "$sandbox/.run/current" 2>/dev/null || true)"
  sp="$(cat "$sandbox/.run/server.pid" 2>/dev/null || true)"
  if [ -n "$cur" ] && [ "$cur" != "$sandbox/releases/$rel4" ] && [ -n "$sp" ] \
     && [ "$sp" != "$phase5_start_pid" ] \
     && lsof -t -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    cand5_dir="$cur"; cand5_pid="$sp"; break
  fi
  sleep .1
done
[ -n "$cand5_dir" ] && [ -n "$cand5_pid" ] || { echo "phase 5 candidate never became selected/listening:"; cat "$sandbox/phase5.log"; exit 1; }
track_pid "$cand5_pid"
assert_pid_alive "$cand5_pid" "phase 5 candidate before rollback"
echo "phase 5: candidate $cand5_dir (pid $cand5_pid) selected and failing verification; waiting for the rollback transition"
# Wait for the ACTUAL rollback transition: current back on rel4 with a NEW server
# pid distinct from the phase-5 start pid AND the candidate pid, and listening.
rollback_pid=""
for _ in $(seq 1 500); do
  cur="$(readlink -f "$sandbox/.run/current" 2>/dev/null || true)"
  sp="$(cat "$sandbox/.run/server.pid" 2>/dev/null || true)"
  if [ "$cur" = "$sandbox/releases/$rel4" ] && [ -n "$sp" ] \
     && [ "$sp" != "$phase5_start_pid" ] && [ "$sp" != "$cand5_pid" ] \
     && lsof -t -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    rollback_pid="$sp"; break
  fi
  sleep .1
done
[ -n "$rollback_pid" ] || { echo "phase 5 rollback never started:"; cat "$sandbox/phase5.log"; exit 1; }
track_pid "$rollback_pid"
assert_pid_alive "$rollback_pid" "phase 5 rollback process before interrupt"
# Capture the in-flight rollback verifier — publish.sh's only child while it waits
# in verify_ready — so the interrupt must terminate AND reap that exact verifier.
verifier5_pid=""
for _ in $(seq 1 50); do
  verifier5_pid="$(pgrep -P "$publish5_pid" -f 'verify-ready' 2>/dev/null | head -1 || true)"
  [ -n "$verifier5_pid" ] && break
  sleep .1
done
[ -n "$verifier5_pid" ] || { echo "phase 5 rollback verifier never observed:"; cat "$sandbox/phase5.log"; exit 1; }
track_pid "$verifier5_pid"
assert_pid_alive "$verifier5_pid" "phase 5 rollback verifier before interrupt"
echo "phase 5: rollback process $rollback_pid (verifier $verifier5_pid) running unverified; injecting SIGINT into the publish process group"
kill -INT -- "-$tm_pid"
set +e
wait "$tm_pid"; rc5=$?
set -e
(( rc5 == 130 )) || { echo "phase 5 publish exited $rc5, expected 130 (SIGINT handler), not 124 (deadman):"; cat "$sandbox/phase5.log"; exit 1; }
# The rollback process must be UNTOUCHED: same pid, still alive, still the SOLE
# listener, still the selected release; the trap must not have restored anything.
current5="$(readlink -f "$sandbox/.run/current")"
[[ "$current5" == "$sandbox/releases/$rel4" ]] || { echo "phase 5 current changed: $current5"; exit 1; }
assert_pid_alive "$rollback_pid" "phase 5 rollback process after interrupt (trap must not kill it)"
test "$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | wc -l)" = 1 || { echo "phase 5: not exactly one listener on port $port"; exit 1; }
test "$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1)" = "$rollback_pid" \
  || { echo "phase 5: the sole listener is not the rollback pid $rollback_pid"; exit 1; }
grep -q "restored and verified" "$sandbox/phase5.log" && { echo "phase 5 trap wrongly restored over the rollback process"; exit 1; }
# The candidate process, the in-flight verifier, and the publish itself must be
# GONE (kill -0 fails): the verifier is killed by the group signal (its INT/QUIT
# are reset to default) and/or the trap's verifier cleanup, and must never survive
# holding the publish lock open.
assert_pid_gone "$cand5_pid" "phase 5 candidate after interrupt"
assert_pid_gone "$verifier5_pid" "phase 5 verifier after interrupt"
assert_pid_gone "$publish5_pid" "phase 5 publish after interrupt"
# The orphaned candidate directory must be removed (release count back to 3:
# rel1 + legacy + rel4), and no interrupt markers may remain.
! test -e "$cand5_dir" || { echo "phase 5 candidate release left behind: $cand5_dir"; exit 1; }
! test -e "$sandbox/.run/current.next" && ! test -e "$sandbox/.run/rollback.next" && ! test -e "$sandbox/.run/current.restore" \
  && ! test -e "$sandbox/.run/restore.html" && ! test -e "$sandbox/.run/health.html" && ! test -e "$sandbox/.run/rollback.html" \
  || { echo "phase 5 interrupt markers left behind:"; ls -la "$sandbox/.run"; exit 1; }
# The publish lock must be acquirable: the interrupted verifier must not still
# hold fd 9 on .run/publish.lock — otherwise the very next publish fails with
# "publish already running" (exit 75).
if ! ( exec 9>"$sandbox/.run/publish.lock"; flock -n 9 ) 2>/dev/null; then
  echo "phase 5 publish lock still held after interrupt" >&2; exit 1
fi
echo "phase 5: interrupted rollback left the known-good rollback process $rollback_pid alive, the sole listener, current selection retained, and the publish lock acquirable"
# --- Phase 6: DETERMINISTIC SIGNAL-INJECTION MATRIX --------------------------
# Every formerly unsafe transition window is now covered by a deterministic hook
# (FF_TEST_SIGNAL_AT): publish.sh re-arms its trap and injects SIGINT into itself
# at exactly the named point, so the fail-safe is proven without wall-clock races:
#   promote-selected  (candidate selected, prior process still serving — the trap
#                      must restore the selection WITHOUT killing the known-good
#                      process)
#   promote-stopped   (prior process stopped, candidate not yet started)
#   promote-tracked   (candidate running and fully tracked — deterministic twin of
#                      the timeout-based phase 4b)
#   rollback-killed   (failed candidate terminated, prior release not yet re-selected)
#   rollback-selected (prior release selected, rollback process not yet started)
#   rollback-started  (rollback process launched but unverified — deterministic
#                      twin of the timeout-based phase 5: known-good rollback must
#                      never be killed)
# After every injection: .run/current must resolve to the intended (prior) release,
# the candidate/superseded process must be reaped (kill -0 fails), exactly one
# listener (the serving release) may remain, no candidate directory or swap/
# interrupt markers may survive, and the exit code must be 130 (SIGINT).
echo "phase 6: deterministic signal-injection matrix across every formerly unsafe transition window"
# Repair the phase-5 damage so rel4 is a healthy known-good release again, and make
# the matrix candidates fail verification fast (broken asset) so the rollback
# section is reachable for the rollback-* points.
printf 'app-js\n' > "$sandbox/releases/$rel4/dist/client/app.js"
rm -f "$sandbox/dist/client/app.js"
inject_point() { # point expected-msg
  local point="$1" expect_msg="$2" rc cur cand_release server_pid lsnr i
  set +e
  (
    cd "$sandbox"
    env -u PORT FF_TEST_PORT="$port" FF_TEST_SKIP_BUILD=1 FF_TEST_SKIP_INSTALL=1 \
      FF_TEST_READY_MAX_ATTEMPTS=3 FF_TEST_READY_BACKOFF_MS=200 FF_TEST_READY_DEADLINE_SECS=20 \
      FF_TEST_SIGNAL_AT="$point" bash ./publish.sh
  ) >"$sandbox/phase6-$point.log" 2>&1
  rc=$?
  set -e
  (( rc == 130 )) || { echo "phase 6 $point: expected exit 130, got $rc:"; cat "$sandbox/phase6-$point.log"; exit 1; }
  # .run/current must resolve to the intended (prior) release.
  cur="$(readlink -f "$sandbox/.run/current")"
  [[ "$cur" == "$sandbox/releases/$rel4" ]] || { echo "phase 6 $point: current not prior release $rel4: $cur"; cat "$sandbox/phase6-$point.log"; exit 1; }
  # Exactly one candidate release directory was created by the interrupted publish;
  # it must be gone (never leave an unverified candidate selected or its directory
  # behind).
  cand_release="$(find "$sandbox/releases" -mindepth 1 -maxdepth 1 -type d -newer "$sandbox/releases/$rel4" | head -1)"
  [ -z "$cand_release" ] || { echo "phase 6 $point: candidate release left behind: $cand_release"; exit 1; }
  # No swap/interrupt markers or staging may remain.
  ! test -e "$sandbox/.run/current.next" && ! test -e "$sandbox/.run/rollback.next" && ! test -e "$sandbox/.run/current.restore" && ! test -e "$sandbox/.run/restore.html" \
    || { echo "phase 6 $point: markers left behind:"; ls -la "$sandbox/.run"; exit 1; }
  ! find "$sandbox/.run" -maxdepth 1 -name 'staging.*' | grep -q . || { echo "phase 6 $point: staging dir left behind"; exit 1; }
  # Exactly one server process must be tracked, alive, and the sole listener.
  server_pid="$(cat "$sandbox/.run/server.pid")"
  assert_pid_alive "$server_pid" "phase 6 $point serving release"
  lsnr=""
  for i in $(seq 1 50); do
    lsnr="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
    [ -n "$lsnr" ] && [ "$lsnr" = "$server_pid" ] && break
    sleep .1
  done
  [ -n "$lsnr" ] && [ "$lsnr" = "$server_pid" ] || { echo "phase 6 $point: listener '$lsnr' != tracked server pid $server_pid"; exit 1; }
  test "$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | wc -l)" = 1 || { echo "phase 6 $point: more than one listener on $port"; exit 1; }
  [ -z "$expect_msg" ] || grep -q "$expect_msg" "$sandbox/phase6-$point.log" \
    || { echo "phase 6 $point: expected message '$expect_msg' missing:"; cat "$sandbox/phase6-$point.log"; exit 1; }
  "$SCRIPT_DIR/verify-release.sh" "$rel4" "http://127.0.0.1:$port" "$sandbox/phase6-$point-verify.html"
  echo "phase 6 $point: prior release $rel4 selected, candidate reaped, exactly one listener (pid $server_pid) verified"
}
# 6a promote-selected: the trap must restore the selection WITHOUT killing the
# still-serving known-good process (same pid keeps serving afterwards).
prior_serving_pid="$(cat "$sandbox/.run/server.pid")"
inject_point promote-selected 'restored (still serving)'
assert_pid_alive "$prior_serving_pid" "phase 6 promote-selected (known-good process must not be killed)"
test "$(cat "$sandbox/.run/server.pid")" = "$prior_serving_pid" \
  || { echo "phase 6 promote-selected: server pid changed ($(cat "$sandbox/.run/server.pid") != $prior_serving_pid)"; exit 1; }
# 6b promote-stopped: the trap must restore AND restart the prior release.
inject_point promote-stopped 'restored and verified'
# 6c promote-tracked: the trap must terminate the unverified candidate process and
# restore/restart the prior release (deterministic twin of phase 4b).
inject_point promote-tracked 'restored and verified'
# 6d rollback-killed: the candidate is already dead and the port free; the trap
# must complete the restore without trying to kill anything.
inject_point rollback-killed 'restored and verified'
# 6e rollback-selected: the trap must START the rollback process so .run/current
# never points at a release with no serving process.
inject_point rollback-selected 'restarted and verified'
# 6f rollback-started: the trap must NOT kill the launched (unverified) rollback
# process and must NOT start a second one — the rollback process launched by the
# publish is proven alive and the sole listener inside inject_point, and the trap
# must not have restored/restarted over it. The server running before 6f is the
# previous phase's rollback: the publish itself stops it at promote (normal
# promote behavior — a fresh publish always takes the port), so it must be gone;
# the "known-good rollback process" the trap protects is the one THIS publish
# launched.
rollback_before_pid="$(cat "$sandbox/.run/server.pid")"
inject_point rollback-started ''
assert_pid_gone "$rollback_before_pid" "phase 6 rollback-started (superseded by this publish's promote)"
grep -q 'restored and verified\|restarted and verified' "$sandbox/phase6-rollback-started.log" \
  && { echo "phase 6 rollback-started: trap wrongly restored/restarted over the rollback process"; exit 1; }
echo "phase 6: deterministic matrix passed — promote-selected (known-good process untouched), promote-stopped, promote-tracked, rollback-killed, rollback-selected, rollback-started (known-good rollback never killed)"
# --- Final cleanup: no process or listener may survive any branch --------------
if [ -f "$sandbox/.run/server.pid" ]; then
  final_pid="$(cat "$sandbox/.run/server.pid")"
  kill "$final_pid" 2>/dev/null || true
  assert_pid_gone "$final_pid" "final server after all branches"
fi
assert_no_listener "$port" "after publish-branch tests"
releases_left="$(find "$sandbox/releases" -mindepth 1 -maxdepth 1 -type d | wc -l)"
(( releases_left == 3 )) || { echo "unexpected release count $releases_left after branches:"; find "$sandbox/releases" -mindepth 1 -maxdepth 1 -type d; exit 1; }
echo "publish.sh promotion, rollback, both-failed, interrupted-publish, and interrupted-rollback branches executed and verified with no process or listener left behind"
