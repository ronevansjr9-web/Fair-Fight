#!/usr/bin/env bash
# Deterministic bounded-readiness regression tests for scripts/verify-ready.sh.
#
# The P0 deployment race: publish.sh spawns a release and previously verified it
# with a single immediate probe, so a process still importing its bundle or binding
# its listener failed with connection refused. verify-ready.sh retries the FULL
# exact verifier (2xx, exact X-Release-ID, same-origin assets) with backoff up to
# bounded attempts and a wall-clock deadline. These tests prove, deterministically:
#   1. a delayed promoted release that becomes healthy within the bound passes;
#   2. a delayed rolled-back release that becomes healthy within the bound passes;
#   3. a never-ready release fails cleanly (exit 1) within the attempt bound;
#   4. retries never mask a wrong release identity that appears after the delay;
#   5. retries never mask a non-2xx root response that appears after the delay;
#   6. retries never mask a MISSING same-origin asset after a valid root identity;
#   7. retries never mask a FAILING (500) same-origin asset after a valid root;
#   8. malformed/hostile/oversized retry env values are rejected fast with exit 64
#      (never reaching arithmetic evaluation, sleep, or network work);
#   9. the wall-clock deadline is the hard overall bound (deadline exhaustion exits
#      within a bounded real time even with a huge attempt count);
#  10. an interrupted readiness run cleans up and leaves no test listener behind;
#  11. the deadline is TRULY AGGREGATE: a multi-asset server that stalls every
#      request cannot make an in-flight root/asset verification substantially
#      overrun the deadline — the run exits within a bounded real time of a small
#      deadline even with many slow assets (each request is capped at the remaining
#      wall-clock budget by verify-release.sh).
# Every scenario uses a disposable port from the 20000-22999 range (probed free, no
# collision with the canonical 3000, the launcher's 18000s range, or the
# publish-branch test's 23000s range), tracks its server pid, reaps it, and asserts
# both that the process is actually gone (kill -0 fails — not merely that no
# listener remains) and that no listener remains on normal, error, and
# interruption paths.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
root="$(mktemp -d /tmp/ff-verify-ready.XXXXXX)"
pids=()
track_pid() { pids+=("$1"); }   # every started server is reaped by cleanup even on early exit
cleanup() {
  local p
  for p in "${pids[@]:-}"; do kill "$p" 2>/dev/null || true; done
  for p in "${pids[@]:-}"; do wait "$p" 2>/dev/null || true; done
  rm -rf "$root"
}
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap cleanup EXIT
pick_free_port() { # 20000-22999, never the canonical 3000 or another test's range
  local p
  for _ in $(seq 1 100); do
    p=$((20000 + RANDOM % 3000))
    if ! lsof -t -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "$p"; return 0; fi
  done
  echo "no free test port found" >&2; exit 1
}
# Start a Python HTTP server that sleeps BEFORE binding (genuine connection-refused
# for a fixed window, not a flaky race), then serves / with the given
# identity/status and the given asset_status for every same-origin asset path.
# An optional stall sleeps inside each request to hold a verification attempt open
# for interruption coverage; an optional asset count emits that many same-origin
# stylesheet/script tags so multi-asset verification timing is exercised. Stdio is
# redirected so the backgrounded server never holds the caller's command-substitution
# pipe open (otherwise the pid capture would block until the server exits).
start_server() { # port delay identity root_status asset_status [stall [assets]]
  local port="$1" delay="$2" identity="$3" root_status="$4" asset_status="$5"
  local stall="${6:-0}" assets="${7:-2}"
  python3 - "$port" "$delay" "$identity" "$root_status" "$asset_status" "$stall" "$assets" >/dev/null 2>&1 <<'PY' &
import http.server, sys, time
port, delay = int(sys.argv[1]), float(sys.argv[2])
identity, root_status = sys.argv[3], int(sys.argv[4])
asset_status, stall = sys.argv[5], float(sys.argv[6])
assets = int(sys.argv[7])
if delay:
    time.sleep(delay)  # deterministic delayed start: connection refused until this elapses
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if stall:
            time.sleep(stall)
        if self.path == '/':
            links = ''.join('<link rel="stylesheet" href="/a%d.css">' % i for i in range(assets))
            scripts = ''.join('<script src="/a%d.js"></script>' % i for i in range(assets))
            body = '<html><head>%s</head><body>ok%s</body></html>' % (links, scripts)
            self.send_response(root_status)
            self.send_header('X-Release-ID', identity)
            self.end_headers()
            self.wfile.write(body.encode())
        elif asset_status == '404':
            self.send_response(404); self.end_headers()
        elif asset_status == '500':
            self.send_response(500); self.end_headers()
        else:
            self.send_response(200); self.end_headers(); self.wfile.write(b'asset')
    def log_message(self, *args):
        pass
http.server.HTTPServer(('127.0.0.1', port), H).serve_forever()
PY
  echo $!
}
# Reap a stopped server and PROVE the process is gone (kill -0 fails), not merely
# that the port no longer has a listener — a process can be alive without listening.
assert_pid_gone() { # pid context
  local pid="$1" ctx="$2" i
  for i in $(seq 1 50); do
    if ! kill -0 "$pid" 2>/dev/null; then return 0; fi
    sleep .1
  done
  echo "process $pid still alive $ctx" >&2
  exit 1
}
stop_server() { # pid — used when a scenario ends; the EXIT trap covers failure paths
  local pid="$1"
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  assert_pid_gone "$pid" "(stopped at end of scenario)"
}
assert_no_listener() { # port context
  local port="$1" ctx="$2"
  for _ in $(seq 1 30); do
    lsof -t -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || return 0
    sleep .1
  done
  echo "listener still on port $port $ctx" >&2
  exit 1
}
# Bound for delayed scenarios: 12 attempts x 500 ms backoff comfortably absorbs a
# 2.0 s delayed start; a delayed broken server must exhaust the bound and fail.
attempts=12
backoff=500
delay=2.0
# 1. Delayed promoted release becomes ready within the bound.
port="$(pick_free_port)"
pid="$(start_server "$port" "$delay" "release-promoted" 200 200)"; track_pid "$pid"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-promoted" "$root/promoted.html" "http://127.0.0.1:$port" >"$root/s1.log" 2>&1; then
  echo "1. delayed promoted release became ready within bound"
else
  echo "1. delayed promoted release did not become ready within bound" >&2
  cat "$root/s1.log" >&2
  exit 1
fi
stop_server "$pid"; pid=""
assert_no_listener "$port" "after scenario 1"
# 2. Delayed rolled-back release becomes ready within the bound.
port="$(pick_free_port)"
pid="$(start_server "$port" "$delay" "release-rolled-back" 200 200)"; track_pid "$pid"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-rolled-back" "$root/rollback.html" "http://127.0.0.1:$port" >"$root/s2.log" 2>&1; then
  echo "2. delayed rolled-back release became ready within bound"
else
  echo "2. delayed rolled-back release did not become ready within bound" >&2
  cat "$root/s2.log" >&2
  exit 1
fi
stop_server "$pid"; pid=""
assert_no_listener "$port" "after scenario 2"
# 3. Never-ready release fails cleanly within a small attempt bound (nothing is
#    listening, so every attempt is an instant connection-refused failure).
port="$(pick_free_port)"
if READY_MAX_ATTEMPTS=4 READY_BACKOFF_MS=200 "$SCRIPT_DIR/verify-ready.sh" "release-never" "$root/never.html" "http://127.0.0.1:$port" >"$root/never.out" 2>&1; then
  echo "3. never-ready release unexpectedly passed verification" >&2
  exit 1
fi
grep -q "not healthy after 4 attempts" "$root/never.out" || { echo "3. attempt-bound failure message missing" >&2; exit 1; }
assert_no_listener "$port" "after scenario 3"
echo "3. never-ready release failed cleanly within attempt bound"
# 4. Delayed server with the WRONG identity must still fail (retries do not mask
#    wrong release identity once the process becomes ready).
port="$(pick_free_port)"
pid="$(start_server "$port" "$delay" "other-release" 200 200)"; track_pid "$pid"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-promoted" "$root/wrong.html" "http://127.0.0.1:$port" >"$root/s4.log" 2>&1; then
  echo "4. delayed wrong-identity release unexpectedly passed verification" >&2
  exit 1
fi
stop_server "$pid"; pid=""
assert_no_listener "$port" "after scenario 4"
echo "4. delayed wrong-identity release correctly failed"
# 5. Delayed server answering 500 with the correct identity must still fail
#    (retries do not mask non-2xx root responses).
port="$(pick_free_port)"
pid="$(start_server "$port" "$delay" "release-promoted" 500 200)"; track_pid "$pid"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-promoted" "$root/fail.html" "http://127.0.0.1:$port" >"$root/s5.log" 2>&1; then
  echo "5. delayed 500 release unexpectedly passed verification" >&2
  exit 1
fi
stop_server "$pid"; pid=""
assert_no_listener "$port" "after scenario 5"
echo "5. delayed 500 release correctly failed"
# 6. Delayed server with a VALID root identity but a MISSING same-origin asset must
#    still fail (retries do not mask invalid/missing assets).
port="$(pick_free_port)"
pid="$(start_server "$port" "$delay" "release-promoted" 200 404)"; track_pid "$pid"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-promoted" "$root/missing-asset.html" "http://127.0.0.1:$port" >"$root/s6.log" 2>&1; then
  echo "6. missing-asset release unexpectedly passed verification" >&2
  exit 1
fi
stop_server "$pid"; pid=""
assert_no_listener "$port" "after scenario 6"
echo "6. missing same-origin asset after valid root identity correctly failed"
# 7. Delayed server with a VALID root identity but a FAILING (500) same-origin
#    asset must still fail.
port="$(pick_free_port)"
pid="$(start_server "$port" "$delay" "release-promoted" 200 500)"; track_pid "$pid"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-promoted" "$root/bad-asset.html" "http://127.0.0.1:$port" >"$root/s7.log" 2>&1; then
  echo "7. failing-asset release unexpectedly passed verification" >&2
  exit 1
fi
stop_server "$pid"; pid=""
assert_no_listener "$port" "after scenario 7"
echo "7. failing (500) same-origin asset after valid root identity correctly failed"
# 8. Malformed/hostile/oversized retry env values must be rejected fast with exit 64
#    BEFORE any arithmetic evaluation, sleep, or network work (no server needed).
expect_rejected() { # description name=value...
  local desc="$1"; shift
  local start rc elapsed
  start="$(date +%s)"
  if env "$@" "$SCRIPT_DIR/verify-ready.sh" "release-x" "$root/hostile.html" >/dev/null 2>&1; then
    echo "8. hostile config '$desc' unexpectedly accepted" >&2
    exit 1
  else
    rc=$?
  fi
  (( rc == 64 )) || { echo "8. hostile config '$desc' exited $rc, expected 64" >&2; exit 1; }
  elapsed=$(( $(date +%s) - start ))
  (( elapsed < 3 )) || { echo "8. hostile config '$desc' took ${elapsed}s to reject" >&2; exit 1; }
  echo "8. hostile config '$desc' rejected fast with 64"
}
expect_rejected "alpha attempts" READY_MAX_ATTEMPTS=abc
expect_rejected "zero attempts" READY_MAX_ATTEMPTS=0
expect_rejected "hex attempts" READY_MAX_ATTEMPTS=0x10
expect_rejected "exponent attempts" READY_MAX_ATTEMPTS=1e3
expect_rejected "oversized attempts" READY_MAX_ATTEMPTS=999999999999
expect_rejected "negative backoff" READY_BACKOFF_MS=-5
expect_rejected "fractional backoff" READY_BACKOFF_MS=1.5
expect_rejected "exponent backoff" READY_BACKOFF_MS=1e9
expect_rejected "oversized backoff" READY_BACKOFF_MS=6000
expect_rejected "zero deadline" READY_DEADLINE_SECS=0
expect_rejected "fractional deadline" READY_DEADLINE_SECS=1.5
expect_rejected "oversized deadline" READY_DEADLINE_SECS=601
# 9. Deadline exhaustion: the wall-clock deadline is the hard overall bound and is
#    enforced even with a huge attempt count and backoff that would otherwise take
#    minutes. A 1 s deadline must terminate in a few seconds at most.
port="$(pick_free_port)"
start="$(date +%s)"
if READY_MAX_ATTEMPTS=120 READY_BACKOFF_MS=500 READY_DEADLINE_SECS=1 "$SCRIPT_DIR/verify-ready.sh" "release-deadline" "$root/deadline.html" "http://127.0.0.1:$port" >"$root/deadline.out" 2>&1; then
  echo "9. deadline-exhausted release unexpectedly passed verification" >&2
  exit 1
fi
elapsed=$(( $(date +%s) - start ))
(( elapsed <= 4 )) || { echo "9. deadline exhaustion took ${elapsed}s (deadline was 1 s)" >&2; exit 1; }
grep -q "wall-clock deadline" "$root/deadline.out" || { echo "9. deadline failure message missing" >&2; exit 1; }
assert_no_listener "$port" "after scenario 9"
echo "9. wall-clock deadline exhaustion enforced within bounded real time"
# 10. Interruption cleanup: a verification stalled on an unresponsive server must
#     die promptly when interrupted and leave no test listener behind. timeout
#     delivers SIGINT to the verifier's whole process group (so the in-flight curl
#     is interrupted too — a lone SIGINT to the script would be deferred until the
#     request completes) and the test's tracked-server cleanup then frees the port.
port="$(pick_free_port)"
pid="$(start_server "$port" 0 "release-interrupt" 200 200 30)"; track_pid "$pid"
if timeout --signal=INT --kill-after=3 2 env READY_MAX_ATTEMPTS=120 READY_BACKOFF_MS=500 READY_DEADLINE_SECS=60 \
    "$SCRIPT_DIR/verify-ready.sh" "release-interrupt" "$root/interrupt.html" "http://127.0.0.1:$port" >"$root/interrupt.out" 2>&1; then
  echo "10. interrupted verification unexpectedly succeeded" >&2
  exit 1
else
  rc=$?
fi
(( rc == 124 )) || { echo "10. interrupted verification exited $rc, expected 124 (timeout)" >&2; exit 1; }
stop_server "$pid"; pid=""
assert_no_listener "$port" "after scenario 10 interruption"
echo "10. interrupted readiness run cleaned up with no listener left"
# 11. TRULY AGGREGATE deadline: a multi-asset server that stalls EVERY request
#     (root and each of 12 same-origin assets for 30 s each) must not make the
#     verification substantially overrun a 2 s wall-clock deadline. Without the
#     per-request remaining-budget cap this would take 13 x 5 s = 65 s per attempt;
#     with it, the run ends within a couple seconds of the deadline because every
#     request is capped at the seconds remaining and the attempt aborts the moment
#     the budget is spent.
port="$(pick_free_port)"
pid="$(start_server "$port" 0 "release-stall" 200 200 30 6)"; track_pid "$pid"
start="$(date +%s)"
if READY_MAX_ATTEMPTS=120 READY_BACKOFF_MS=500 READY_DEADLINE_SECS=2 "$SCRIPT_DIR/verify-ready.sh" "release-stall" "$root/stall.html" "http://127.0.0.1:$port" >"$root/stall.out" 2>&1; then
  echo "11. stalling multi-asset release unexpectedly passed verification" >&2
  exit 1
fi
elapsed=$(( $(date +%s) - start ))
(( elapsed <= 8 )) || { echo "11. stalling multi-asset verification took ${elapsed}s (deadline was 2 s) — in-flight verification overran the deadline" >&2; cat "$root/stall.out" >&2; exit 1; }
grep -q "wall-clock deadline" "$root/stall.out" || { echo "11. deadline failure message missing" >&2; cat "$root/stall.out" >&2; exit 1; }
stop_server "$pid"; pid=""
assert_no_listener "$port" "after scenario 11 stalling multi-asset"
echo "11. stalling multi-asset verification bounded by the remaining wall-clock budget (aggregate deadline)"
echo 'bounded readiness retry: delayed promotion, delayed rollback, never-ready, wrong-identity, 500, missing-asset, failing-asset, hostile-env, deadline-exhaustion, interruption, and aggregate-deadline stalling tests passed'
