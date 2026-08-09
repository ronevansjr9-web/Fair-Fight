#!/usr/bin/env bash
# Isolated copied-launcher and verifier regression tests; never uses production port.
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
(cd /tmp && env -u RELEASE_DIR PORT="$port" bun "$root/release/serve.ts") >"$root/server.log" 2>&1 & pid=$!
for _ in $(seq 1 50); do curl -fsS --connect-timeout 1 --max-time 2 "http://127.0.0.1:$port/" -o /dev/null && break; sleep .1; done
./scripts/verify-release.sh launcher-test "http://127.0.0.1:$port" "$root/ok.html"
kill "$pid"; wait "$pid" 2>/dev/null || true; pid=""

# The platform's standard root startup runs from the site root, where no RELEASE_ID
# exists. It must still serve dist/ and must not fabricate release identity.
legacy_port=$((port + 3))
mkdir -p "$root/legacy/dist/server" "$root/legacy/dist/client"
cp "$root/release/dist/server/server.js" "$root/legacy/dist/server/server.js"
cp "$root/release/dist/client/app.js" "$root/legacy/dist/client/app.js"
cp serve.ts package.json bun.lock "$root/legacy/"
(cd /tmp && env -u RELEASE_DIR PORT="$legacy_port" bun "$root/legacy/serve.ts") >"$root/legacy-server.log" 2>&1 & pid=$!
for _ in $(seq 1 50); do curl -fsS --connect-timeout 1 --max-time 2 "http://127.0.0.1:$legacy_port/" -o "$root/legacy.html" && break; sleep .1; done
grep -q '<script src="/app.js"></script>' "$root/legacy.html"
if grep -qi '^X-Release-ID:' <(curl -sS -D - -o /dev/null "http://127.0.0.1:$legacy_port/"); then
  echo 'root startup unexpectedly emitted release identity' >&2
  exit 1
fi
kill "$pid"; wait "$pid" 2>/dev/null || true; pid=""

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
echo 'copied launcher release identity, missing/wrong 2xx identity, and 500 verification tests passed'
