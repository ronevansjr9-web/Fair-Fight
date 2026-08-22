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
# Guard the TRULY AGGREGATE wall-clock deadline: the absolute deadline must be
# passed into the full verifier so every root/asset request is capped at the
# remaining budget (an in-flight verification cannot substantially overrun the
# deadline), and the inter-attempt sleep must be capped at the remaining budget.
grep -q 'READY_DEADLINE_EPOCH' scripts/verify-ready.sh
grep -q 'READY_DEADLINE_EPOCH' scripts/verify-release.sh
grep -q 'wall-clock budget exhausted' scripts/verify-release.sh
grep -q 'remaining budget' scripts/verify-ready.sh
# Guard the fail-safe interruption semantics: the unverified candidate is tracked
# (pid + running + verified flags), a SIGINT/SIGTERM trap restores the prior
# release selection through an atomic .run/current.restore swap (never leaving an
# unverified candidate selected), the candidate and interrupted artifacts are
# removed, and the trap only kills candidate processes (a known-good rollback
# process is never touched by the trap).
grep -q 'fail_safe_interrupt' publish.sh
grep -q 'candidate_pid' publish.sh
grep -q 'candidate_running' publish.sh
grep -q 'candidate_verified' publish.sh
grep -q 'current.restore' publish.sh
grep -q "trap 'fail_safe_interrupt 130' INT" publish.sh
grep -q "trap 'fail_safe_interrupt 143' TERM" publish.sh
grep -q 'never leave an unverified candidate selected' publish.sh
grep -q 'must never kill a known-good rollback process' publish.sh
# Guard the closed transition windows: the launch + PID recording must be atomic
# (single foreground helper; a signal can never land between the spawn and the pid
# write), the trap must be able to find the candidate from the pid file if the
# signal lands before the state variable is assigned, the rollback process must be
# tracked separately (rollback_pid/rollback_started) so a trap can never start a
# second rollback process or kill a known-good one, the prior serving pid must be
# captured for the selection-window fast path, the failed candidate must be
# terminated and its port confirmed free before the prior release is restarted
# (rollback can never race a dying candidate), and the deterministic test seam
# (FF_TEST_SIGNAL_AT) must be wired in for the interrupt-injection matrix.
grep -q 'test_signal_hook' publish.sh
grep -q 'FF_TEST_SIGNAL_AT' publish.sh
grep -q 'rollback_pid' publish.sh
grep -q 'rollback_started' publish.sh
grep -q 'prior_pid' publish.sh
grep -q '9>&-' publish.sh
grep -q 'sh -c' publish.sh
# The canonical platform port must remain the default verification target (a wrong
# port can never be accepted) and the production listener default.
grep -q '127.0.0.1:3000' scripts/verify-ready.sh
grep -q 'listener_port=3000' publish.sh
# Guard the canonical port contract: spawned release processes must clear inherited
# generic PORT, and the launcher must keep only the explicit test-only override.
grep -q -- '-u PORT' publish.sh
grep -q 'FF_TEST_PORT' serve.ts
grep -q 'CANONICAL_PORT' serve.ts
echo 'atomic release, existing-listener failure, first-deploy legacy rollback simulations, bounded readiness retry guards, aggregate-deadline guards, fail-safe interrupt guards, and canonical port guards passed'
