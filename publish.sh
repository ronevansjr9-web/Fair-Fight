#!/usr/bin/env bash
# Build, promote, and verify an immutable release. Only one publish may run at a time.
set -euo pipefail
cd "$(dirname "$0")"
umask 002
mkdir -p .run releases
exec 9>.run/publish.lock
if ! flock -n 9; then echo "publish already running" >&2; exit 75; fi
# Test-only listener override. Production never sets FF_TEST_PORT — the platform
# requires the canonical port 3000 — so only the isolated publish-branch tests set
# it; a malformed value is a test bug and must fail loudly rather than fall back to
# 3000 and collide with the real site. Parsed before the traps are installed so the
# fail-safe can rely on the listener port from the first possible signal.
listener_port=3000
if [ -n "${FF_TEST_PORT:-}" ]; then
  if ! [[ "$FF_TEST_PORT" =~ ^[1-9][0-9]*$ ]] || (( FF_TEST_PORT > 65535 )); then
    echo "invalid FF_TEST_PORT '$FF_TEST_PORT' (test-only override; must be 1-65535)" >&2
    exit 64
  fi
  listener_port="$FF_TEST_PORT"
fi
base_url="http://127.0.0.1:$listener_port"
release="$(date -u +%Y%m%dT%H%M%S)-$$"
staging="$(mktemp -d "$PWD/.run/staging.$release.XXXXXX")"
release_dir="$PWD/releases/$release"
old_release=""
candidate_pid=""          # pid of the unverified new-release process, if any
candidate_running=0       # 1 once start_release spawned the unverified candidate
candidate_verified=0      # 1 only after the candidate passed the exact verifier
rollback_pid=""           # pid of the rollback (prior-release) process, if started
rollback_started=0        # 1 once the rollback process was launched
prior_pid=""              # pid serving before the atomic switch (fail-safe reference)
cleanup() { rm -rf "$staging" "$PWD/.run/current.next" "$PWD/.run/rollback.next" "$PWD/.run/current.restore"; }
trap cleanup EXIT
# Clear any inherited generic PORT (e.g. PORT=80) so no spawned release process can
# ever bind the wrong listener. The test-only FF_TEST_PORT override is cleared for
# production spawns (canonical port 3000); isolated tests that explicitly set it
# keep it so their listener stays on the disposable test port. The release process
# must NOT inherit the publish lock (fd 9) — `9>&-` closes it in the spawned
# process, otherwise the flock would stay held until the server exits and every
# later publish would fail with "publish already running".
start_release() {
  local d="$1" uports
  if [ -z "${FF_TEST_PORT:-}" ]; then uports='-u PORT -u FF_TEST_PORT'; else uports='-u PORT'; fi
  # Spawn through a short-lived shell so the process start and its PID recording
  # happen inside ONE foreground child: bash only runs signal traps between
  # commands, so a SIGINT/SIGTERM can never land between the spawn and the PID
  # write (the formerly unsafe "process start/PID recording" window). The helper
  # ignores INT/TERM so a group signal can never abort it mid-launch, and it forks
  # a child that resets INT/TERM to default before exec'ing the server — so the
  # release process always has default, terminable dispositions even though the
  # parent may be running with traps installed. The child's exec chain
  # (env -> setsid -> nohup -> bun) preserves its PID, which is what is recorded;
  # setsid detaches the server from the publisher's process group so a later group
  # signal never reaches it directly (only the fail-safe trap terminates it).
  # 9>&- closes the publish lock (fd 9) in the spawned process.
  sh -c 'trap "" INT TERM; (trap - INT TERM; exec env '"$uports"' setsid nohup bun "$1/serve.ts" 9>&- > .run/server.log 2>&1 < /dev/null) & printf "%s\n" "$!" > .run/server.pid' _ "$d"
}
# Bounded readiness retry: a freshly spawned release is not immediately reachable
# (SSR bundle import, listener bind), so a single immediate probe races readiness.
# verify-ready.sh re-runs the full exact verifier (2xx, exact X-Release-ID, every
# same-origin asset) with backoff against the canonical port 3000 until healthy or
# the bound is exhausted. It never masks wrong identity, non-2xx, invalid assets, or
# a wrong port, and exits 1 if the process never becomes healthy. The wall-clock
# deadline (READY_DEADLINE_SECS) is enforced by verify-ready.sh and is aggregate:
# it includes the time every attempt spends inside the full root/asset verification
# (each request is capped at the remaining budget by verify-release.sh), so no
# in-flight verification can substantially overrun the deadline.
#
# Production hygiene: inherited READY_MAX_ATTEMPTS / READY_BACKOFF_MS /
# READY_DEADLINE_SECS are explicitly cleared so an inherited value can never change
# production readiness behavior or cause unbounded delay. Only the explicit
# test-only FF_TEST_READY_* seams (never set by the platform, and still validated
# and capped by verify-ready.sh) may adjust the bound — shorter or longer, always
# within verify-ready.sh's caps — for the isolated publish-branch tests.
verify_ready() {
  local expected="$1" html="$2" v ffv vp rc
  local -a ready_env=(env -u READY_MAX_ATTEMPTS -u READY_BACKOFF_MS -u READY_DEADLINE_SECS)
  for v in READY_MAX_ATTEMPTS READY_BACKOFF_MS READY_DEADLINE_SECS; do
    ffv="FF_TEST_${v}"
    if [ -n "${!ffv:-}" ]; then ready_env+=("$v=${!ffv}"); fi
  done
  # Run the verifier as a background child and wait on it: bash executes INT/TERM
  # traps IMMEDIATELY while waiting via the wait builtin (a foreground child would
  # defer the trap until the child exits), so a signal landing mid-verification is
  # never held for the remaining retry bound — the fail-safe restores/cleans up and
  # exits within milliseconds. The background child stays in the publish process
  # group, so a group signal reaches it too.
  "${ready_env[@]}" ./scripts/verify-ready.sh "$expected" "$html" "$base_url" &
  vp=$!
  if wait "$vp"; then
    return 0
  else
    rc=$?
  fi
  # Reap the verifier if the trap already exited around it (a direct SIGINT to
  # publish.sh alone would otherwise leave it running).
  kill -0 "$vp" 2>/dev/null && kill "$vp" 2>/dev/null || true
  return "$rc"
}
# Deterministic test-only signal injection (FF_TEST_SIGNAL_AT): re-arms the traps
# and injects SIGINT into publish.sh at exactly the named transition point, so the
# isolated publish-branch tests can prove the fail-safe in every formerly unsafe
# window without wall-clock races. Production never sets FF_TEST_SIGNAL_AT; unset,
# this is a no-op.
test_signal_hook() {
  [ -n "${FF_TEST_SIGNAL_AT:-}" ] && [ "$FF_TEST_SIGNAL_AT" = "$1" ] || return 0
  echo "test hook: injecting SIGINT at $1" >&2
  trap 'fail_safe_interrupt 130' INT
  trap 'fail_safe_interrupt 143' TERM
  kill -INT $$
}
# Fail-safe interruption. The traps are installed before the build and stay armed
# for the whole run; every transition below is state-tracked so a SIGINT/SIGTERM
# can never leave an unverified candidate process orphaned, delete a directory
# while its process survives, or leave .run/current pointing at a release with no
# serving process.
#   * Candidate-selected path: if the unverified candidate release is selected
#     (.run/current -> release_dir) when a signal arrives, terminate the candidate
#     process (the recorded pid plus anything still listening — the prior process
#     was already stopped, so any listener here is the candidate, never a
#     known-good process), atomically restore .run/current to the prior release
#     through .run/current.restore + mv -Tf, restart the prior release and
#     best-effort re-verify it, remove the interrupted candidate directory, and
#     never leave an unverified candidate selected. If the signal lands in the
#     selection window before the candidate was ever started and the prior release
#     is still serving, the selection is restored atomically WITHOUT touching the
#     known-good process.
#   * Rollback path: if .run/current already points at the prior release (a
#     rollback selection), the trap never kills a known-good rollback process and
#     never starts a second one — it only removes the orphaned candidate directory
#     and, if the rollback process was not yet started, starts it so .run/current
#     never points at a release with no serving process.
fail_safe_interrupt() {
  local rc="$1" lsnr sp
  # Block further signals while the fail-safe runs (the caught signal is already
  # blocked during its own trap; mask the other one too to prevent re-entry).
  trap '' INT TERM
  if (( ! candidate_verified )) && [ -n "$release_dir" ] && [ "$(readlink -f .run/current 2>/dev/null || true)" = "$release_dir" ]; then
    # The unverified candidate is selected. Fall back to the recorded pid file in
    # case the signal landed between the launch and the state-variable assignment.
    [ -n "$candidate_pid" ] || candidate_pid="$(cat .run/server.pid 2>/dev/null || true)"
    lsnr="$(lsof -t -iTCP:"$listener_port" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
    if [ -n "$prior_pid" ] && [ "$candidate_pid" = "$prior_pid" ] && [ "$lsnr" = "$prior_pid" ] && kill -0 "$prior_pid" 2>/dev/null; then
      # The candidate was never started (signal in the selection window) and the
      # prior release is still serving: restore the selection atomically and leave
      # the known-good process completely untouched.
      if [ -n "$old_release" ] && [ -d "$old_release" ]; then
        ln -s "$old_release" .run/current.restore 2>/dev/null || true
        mv -Tf .run/current.restore .run/current
        echo "publish interrupted; prior release $(basename "$old_release") restored (still serving)" >&2
      fi
    else
      # Terminate the candidate process and wait until the listener is actually
      # free, so the restored release can never race a dying candidate for the port
      # and the candidate directory is never deleted while its process survives.
      if [ -n "$candidate_pid" ] && kill -0 "$candidate_pid" 2>/dev/null; then
        kill "$candidate_pid" 2>/dev/null || true
      fi
      for _ in $(seq 1 50); do
        if ! lsof -t -iTCP:"$listener_port" -sTCP:LISTEN >/dev/null 2>&1; then break; fi
        [ -n "$candidate_pid" ] && kill "$candidate_pid" 2>/dev/null || true
        sleep .1
      done
      candidate_running=0
      if [ -n "$old_release" ] && [ -d "$old_release" ]; then
        ln -s "$old_release" .run/current.restore 2>/dev/null || true
        mv -Tf .run/current.restore .run/current
        start_release "$old_release"
        rollback_pid="$(cat .run/server.pid)"
        rollback_started=1
        if verify_ready "$(cat "$old_release/RELEASE_ID")" .run/restore.html; then
          echo "publish interrupted; prior release $(basename "$old_release") restored and verified" >&2
        else
          echo "publish interrupted; prior release restored but readiness verification failed" >&2
        fi
        rm -f .run/restore.html
      else
        # No prior release to restore: never leave an unverified candidate selected.
        rm -f .run/current
      fi
    fi
    rm -rf "$release_dir"
  elif [ -n "$old_release" ] && [ -d "$old_release" ] && [ "$(readlink -f .run/current 2>/dev/null || true)" = "$old_release" ]; then
    # Rollback path: current already points at the prior release.
    sp="$(cat .run/server.pid 2>/dev/null || true)"
    if (( rollback_started )) || { [ -n "$sp" ] && [ "$sp" != "$candidate_pid" ] && kill -0 "$sp" 2>/dev/null; }; then
      # A rollback process is running (or at least launched): never kill it and
      # never start a second one — a trap must never kill a known-good rollback process.
      :
    elif ! lsof -t -iTCP:"$listener_port" -sTCP:LISTEN >/dev/null 2>&1; then
      # Rollback selected but not yet started: start it so .run/current never
      # points at a release with no serving process.
      start_release "$old_release"
      rollback_pid="$(cat .run/server.pid)"
      rollback_started=1
      if verify_ready "$(cat "$old_release/RELEASE_ID")" .run/restore.html; then
        echo "publish interrupted; prior release $(basename "$old_release") restarted and verified" >&2
      else
        echo "publish interrupted; prior release restarted but readiness verification failed" >&2
      fi
      rm -f .run/restore.html
    fi
    # The orphaned candidate directory: its process was terminated (and the
    # listener confirmed free) before the rollback began, so removing it can never
    # delete a directory whose process survives.
    if [ -n "$release_dir" ] && [ -d "$release_dir" ] && { [ -z "$candidate_pid" ] || ! kill -0 "$candidate_pid" 2>/dev/null; }; then
      rm -rf "$release_dir"
    fi
  elif (( ! candidate_verified )); then
    # Pre-promotion abort (or no prior release): no candidate process exists, so
    # only the staged candidate directory (never a directory whose process
    # survives) may remain.
    rm -rf "$release_dir"
  fi
  rm -f .run/health.html .run/rollback.html .run/restore.html
  exit "$rc"
}
trap 'fail_safe_interrupt 130' INT
trap 'fail_safe_interrupt 143' TERM
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
  printf '%s\n' '{"release":"legacy-'"$release"'","legacy":true}' > "$legacy/manifest.json"
  old_release="$legacy"
fi
# Capture the currently-serving process before the switch: the fail-safe trap uses
# it to recognize "candidate never started, prior still serving".
prior_pid="$(cat .run/server.pid 2>/dev/null || true)"
ln -s "$release_dir" .run/current.next
mv -Tf .run/current.next .run/current
test_signal_hook promote-selected
# Stop the recorded process; legacy servers without a pid are also taken over.
if [ -s .run/server.pid ]; then kill "$(cat .run/server.pid)" 2>/dev/null || true; fi
for _ in $(seq 1 50); do
  if ! lsof -t -iTCP:"$listener_port" -sTCP:LISTEN >/dev/null 2>&1; then break; fi
  [ -s .run/server.pid ] && kill "$(cat .run/server.pid)" 2>/dev/null || true
  sleep .1
done
test_signal_hook promote-stopped
start_release "$release_dir"
candidate_pid="$(cat .run/server.pid)"
candidate_running=1
test_signal_hook promote-tracked
if verify_ready "$release" .run/health.html; then
  candidate_verified=1
  candidate_running=0
  rm -f .run/health.html; find releases -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +7 | cut -d' ' -f2- | xargs -r rm -rf; echo "site published atomically: $release"; exit 0
fi
# Do not claim recovery until the old release identity and assets are healthy.
# The candidate is terminated and its port confirmed free BEFORE the prior release
# is re-selected and restarted, so the rollback can never race a dying candidate
# for the listener (the formerly unsafe "failed candidate termination -> prior
# release restoration/restart" window).
if [ -n "$candidate_pid" ] && kill -0 "$candidate_pid" 2>/dev/null; then kill "$candidate_pid" 2>/dev/null || true; fi
for _ in $(seq 1 50); do
  if ! lsof -t -iTCP:"$listener_port" -sTCP:LISTEN >/dev/null 2>&1; then break; fi
  [ -n "$candidate_pid" ] && kill "$candidate_pid" 2>/dev/null || true
  sleep .1
done
candidate_running=0
test_signal_hook rollback-killed
if [ -n "$old_release" ] && [ -d "$old_release" ]; then
  ln -s "$old_release" .run/rollback.next; mv -Tf .run/rollback.next .run/current
  test_signal_hook rollback-selected
  start_release "$old_release"
  rollback_pid="$(cat .run/server.pid)"
  rollback_started=1
  test_signal_hook rollback-started
  if verify_ready "$(cat "$old_release/RELEASE_ID")" .run/rollback.html; then rm -rf "$release_dir"; rm -f .run/rollback.html; echo "release failed; rollback verified" >&2; exit 1; fi
fi
rm -rf "$release_dir"; rm -f .run/health.html .run/rollback.html; echo "release and rollback failed" >&2; exit 1
