#!/usr/bin/env bash
# Isolated copied-launcher and verifier regression tests; never uses production port.
#
# Canonical port contract coverage: every spawn inherits generic PORT=80 on purpose.
# The launcher must ignore it — the listener lands only on the explicit test-only
# FF_TEST_PORT override, or on the canonical platform port 3000 in the default path.
set -euo pipefail
root="$(mktemp -d)"; port=$((18000 + RANDOM % 1000)); pid=""; trap '[[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true; rm -rf "$root"' EXIT
mkdir -p "$root/release/dist/server" "$root/release/dist/client"
printf 'launcher-test\n' > "$root/release/RELEASE_ID"
printf 'asset\n' > "$root/release/dist/client/app.js"
cat > "$root/release/dist/server/server.js" <<'JS'
export default { fetch() { return new Response('<html><script src="/app.js"></script></html>'); } };
JS
cp serve.ts package.json bun.lock "$root/release/"
# Match publish.sh: the copied launcher discovers its release from import.meta.dir,
# rather than receiving RELEASE_DIR, and runs from an unrelated working directory.
# An immutable release must retain its exact release identity (X-Release-ID) and must
# not let inherited PORT=80 choose the listener: it serves on FF_TEST_PORT instead.
(cd /tmp && env -u RELEASE_DIR PORT=80 FF_TEST_PORT="$port" bun "$root/release/serve.ts") >"$root/server.log" 2>&1 & pid=$!
for _ in $(seq 1 50); do curl -fsS --connect-timeout 1 --max-time 2 "http://127.0.0.1:$port/" -o /dev/null && break; sleep .1; done
./scripts/verify-release.sh launcher-test "http://127.0.0.1:$port" "$root/ok.html"
kill "$pid"; wait "$pid" 2>/dev/null || true; pid=""

# The platform's standard root startup runs from the site root, where no RELEASE_ID
# exists. It must still serve dist/ and must not fabricate release identity, and the
# inherited PORT=80 must again be ignored in favor of the explicit FF_TEST_PORT.
legacy_port=$((port + 3))
mkdir -p "$root/legacy/dist/server" "$root/legacy/dist/client"
cp "$root/release/dist/server/server.js" "$root/legacy/dist/server/server.js"
cp "$root/release/dist/client/app.js" "$root/legacy/dist/client/app.js"
cp serve.ts package.json bun.lock "$root/legacy/"
(cd /tmp && env -u RELEASE_DIR PORT=80 FF_TEST_PORT="$legacy_port" bun "$root/legacy/serve.ts") >"$root/legacy-server.log" 2>&1 & pid=$!
for _ in $(seq 1 50); do curl -fsS --connect-timeout 1 --max-time 2 "http://127.0.0.1:$legacy_port/" -o "$root/legacy.html" && break; sleep .1; done
grep -q '<script src="/app.js"></script>' "$root/legacy.html"
if grep -qi '^X-Release-ID:' <(curl -sS -D - -o /dev/null "http://127.0.0.1:$legacy_port/"); then
  echo 'root startup unexpectedly emitted release identity' >&2
  exit 1
fi
kill "$pid"; wait "$pid" 2>/dev/null || true; pid=""

# Default path (no FF_TEST_PORT): with inherited PORT=80, the listener must still bind
# the canonical platform port 3000. Only run while 3000 is free — the launcher frees
# and takes over 3000, so this disposable check must not disturb a live site or dev
# server. The PORT=80 override cases above already prove generic PORT cannot choose
# the listener; this proves the default resolves to the canonical 3000.
if ! lsof -t -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  (cd /tmp && env -u RELEASE_DIR PORT=80 bun "$root/release/serve.ts") >"$root/canonical-server.log" 2>&1 & pid=$!
  for _ in $(seq 1 50); do curl -fsS --connect-timeout 1 --max-time 2 "http://127.0.0.1:3000/" -o "$root/canonical.html" && break; sleep .1; done
  ./scripts/verify-release.sh launcher-test "http://127.0.0.1:3000" "$root/canonical-ok.html"
  kill "$pid"; wait "$pid" 2>/dev/null || true; pid=""
else
  echo 'port 3000 busy; skipped default-path canonical-port live check' >&2
fi

run_negative_identity_test() {
  local mode="$1" negative_port="$2"
  local output="$root/$mode.html"
  python3 - "$negative_port" "$mode" <<'PY' & pid=$!
import http.server, sys
mode = sys.argv[2]
class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)
    if mode == 'wrong': self.send_header('X-Release-ID', 'not-launcher-test')
    self.end_headers()
    self.wfile.write(b'<script src="/app.js"></script>')
  def log_message(self, *args): pass
http.server.HTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
PY
  for _ in $(seq 1 20); do curl -sS --connect-timeout 1 --max-time 2 "http://127.0.0.1:$negative_port/" >/dev/null && break; sleep .1; done
  if ./scripts/verify-release.sh launcher-test "http://127.0.0.1:$negative_port" "$output"; then
    echo "2xx $mode release verification unexpectedly passed" >&2
    exit 1
  fi
  kill "$pid"; wait "$pid" 2>/dev/null || true; pid=""
}

# A successful status is insufficient without an exact release identity.
run_negative_identity_test missing $((port + 1))
run_negative_identity_test wrong $((port + 2))

# A 500 with the correct identity must still fail.
python3 - "$port" <<'PY' & pid=$!
import http.server, sys
class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(500); self.send_header('X-Release-ID','launcher-test'); self.end_headers(); self.wfile.write(b'<script src="/app.js"></script>')
  def log_message(self, *args): pass
http.server.HTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
PY
for _ in $(seq 1 20); do curl -sS --connect-timeout 1 --max-time 2 "http://127.0.0.1:$port/" >/dev/null && break; sleep .1; done
if ./scripts/verify-release.sh launcher-test "http://127.0.0.1:$port" "$root/bad.html"; then echo '500 verification unexpectedly passed' >&2; exit 1; fi
echo 'copied launcher PORT=80 regression, release identity, missing/wrong 2xx identity, and 500 verification tests passed'
