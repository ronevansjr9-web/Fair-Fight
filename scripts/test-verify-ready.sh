#!/usr/bin/env bash
# Bounded readiness retry regression tests for scripts/verify-ready.sh.
#
# The P0 deployment race: publish.sh spawns a release and previously verified it
# with a single immediate probe, so a process still importing its bundle or binding
# its listener failed with connection refused. verify-ready.sh retries the FULL
# exact verifier (2xx, exact X-Release-ID, same-origin assets) with backoff up to a
# bound. These tests prove, deterministically, that:
#   1. a delayed promoted release that becomes healthy within the bound passes;
#   2. a delayed rolled-back release that becomes healthy within the bound passes;
#   3. a never-ready release fails cleanly (exit 1) within the bound;
#   4. retries never mask a wrong release identity that appears after the delay;
#   5. retries never mask a non-2xx response that appears after the delay.
# Delays are implemented by a Python HTTP server that sleeps BEFORE binding, so the
# port is genuinely connection-refused for a deterministic window — not a flaky race.
set -euo pipefail
root="$(mktemp -d)"; trap 'rm -rf "$root"' EXIT
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start a server that binds only after `delay` seconds, then serves the given
# identity/status for / and for every same-origin asset path. Stdio is redirected so
# the backgrounded server never holds the caller's command-substitution pipe open
# (otherwise `pid="$(start_delayed_server ...)"` would block until the server exits).
start_delayed_server() { # port delay identity status
  local port="$1" delay="$2" identity="$3" status="$4"
  python3 - "$port" "$delay" "$identity" "$status" >/dev/null 2>&1 <<'PY' &
import http.server, sys, time
port, delay, identity, status = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3], int(sys.argv[4])
time.sleep(delay)  # deterministic delayed start: connection refused until this elapses
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(status)
        self.send_header("X-Release-ID", identity)
        self.end_headers()
        self.wfile.write(b'<html><script src="/app.js"></script></html>')
    def log_message(self, *args):
        pass
http.server.HTTPServer(("127.0.0.1", port), H).serve_forever()
PY
  echo $!
}

stop_server() { # pid
  local pid="$1"
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

# Bound: 12 attempts x 500ms backoff = ~5.5s of waiting. Delays of 2.0s must be
# absorbed comfortably; a 2.0s-delayed broken server must exhaust the bound and fail.
attempts=12
backoff=500
delay=2.0
port=$((20000 + RANDOM % 3000))
pid=""

# 1. Delayed promoted release becomes ready within the bound.
pid="$(start_delayed_server "$port" "$delay" "release-promoted" 200)"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-promoted" "$root/promoted.html" "http://127.0.0.1:$port"; then
  echo "delayed promoted release became ready within bound"
else
  echo "delayed promoted release did not become ready within bound" >&2
  stop_server "$pid"; exit 1
fi
stop_server "$pid"; pid=""

# 2. Delayed rolled-back release becomes ready within the bound.
rport=$((port + 1))
pid="$(start_delayed_server "$rport" "$delay" "release-rolled-back" 200)"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-rolled-back" "$root/rollback.html" "http://127.0.0.1:$rport"; then
  echo "delayed rolled-back release became ready within bound"
else
  echo "delayed rolled-back release did not become ready within bound" >&2
  stop_server "$pid"; exit 1
fi
stop_server "$pid"; pid=""

# 3. Never-ready release fails cleanly within a small bound.
nport=$((port + 2))
if READY_MAX_ATTEMPTS=4 READY_BACKOFF_MS=200 "$SCRIPT_DIR/verify-ready.sh" "release-never" "$root/never.html" "http://127.0.0.1:$nport"; then
  echo "never-ready release unexpectedly passed verification" >&2
  exit 1
fi
echo "never-ready release failed cleanly within bound"

# 4. Delayed server with the WRONG identity must still fail (retries do not mask
#    wrong release identity once the process becomes ready).
wport=$((port + 3))
pid="$(start_delayed_server "$wport" "$delay" "other-release" 200)"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-promoted" "$root/wrong.html" "http://127.0.0.1:$wport"; then
  echo "delayed wrong-identity release unexpectedly passed verification" >&2
  stop_server "$pid"; exit 1
fi
stop_server "$pid"; pid=""
echo "delayed wrong-identity release correctly failed"

# 5. Delayed server answering 500 with the correct identity must still fail
#    (retries do not mask non-2xx responses).
fport=$((port + 4))
pid="$(start_delayed_server "$fport" "$delay" "release-promoted" 500)"
if READY_MAX_ATTEMPTS="$attempts" READY_BACKOFF_MS="$backoff" "$SCRIPT_DIR/verify-ready.sh" "release-promoted" "$root/fail.html" "http://127.0.0.1:$fport"; then
  echo "delayed 500 release unexpectedly passed verification" >&2
  stop_server "$pid"; exit 1
fi
stop_server "$pid"; pid=""
echo "delayed 500 release correctly failed"

echo 'bounded readiness retry: delayed promotion, delayed rollback, never-ready, wrong-identity, and 500 tests passed'
