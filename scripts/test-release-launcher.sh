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
PORT="$port" RELEASE_DIR="$root/release" bun "$root/release/serve.ts" >"$root/server.log" 2>&1 & pid=$!
for _ in $(seq 1 50); do curl -fsS --connect-timeout 1 "http://127.0.0.1:$port/" -o /dev/null && break; sleep .1; done
./scripts/verify-release.sh launcher-test "http://127.0.0.1:$port" "$root/ok.html"
kill "$pid"; wait "$pid" 2>/dev/null || true; pid=""
# A 500 with the correct identity must still fail.
python3 - "$port" <<'PY' & pid=$!
import http.server, sys
class H(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(500); self.send_header('X-Release-ID','launcher-test'); self.end_headers(); self.wfile.write(b'<script src="/app.js"></script>')
  def log_message(self, *args): pass
http.server.HTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
PY
for _ in $(seq 1 20); do curl -s "http://127.0.0.1:$port/" >/dev/null && break; sleep .1; done
if ./scripts/verify-release.sh launcher-test "http://127.0.0.1:$port" "$root/bad.html"; then echo '500 verification unexpectedly passed' >&2; exit 1; fi
echo 'copied launcher release identity and 500 verification tests passed'
