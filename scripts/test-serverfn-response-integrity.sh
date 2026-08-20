#!/usr/bin/env bash
# Focused regression check: a TanStack Start server-function response is a binary
# "TSS-framed" stream (9-byte header [type|streamId|length] + payload wrapping
# seroval-serialized JSON). serve.ts's `secure()` must apply security headers
# WITHOUT altering those bytes; any read/re-encode/buffer would corrupt framing and
# surface as a client-side "Seroval Error (step: 3)".
#
# This runnable the REAL serve.ts against a fake release whose server handler
# returns a deterministic framed body, and asserts the bytes arrive byte-for-byte
# identical out of the launcher while the security/release headers are added.
set -euo pipefail
root="$(mktemp -d)"; port=$((18100 + RANDOM % 400)); pid=""
trap '[[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true; rm -rf "$root"' EXIT

mkdir -p "$root/release/dist/server" "$root/release/dist/client"
printf 'serverfn-test\n' > "$root/release/RELEASE_ID"

# Expected framed body. Two frames:
#   JSON frame: type=1, streamId=0, len=18, payload {"data":{"ok":1}}
#   END  frame: type=3, streamId=1, len=0
# => 01 00000000 00000012 <18 payload bytes> 03 00000001 00000000
BODY_HEX="0100000000000000127b2264617461223a7b226f6b223a317d7d030000000100000000"

cat > "$root/release/dist/server/server.js" <<'JS'
const HEX = "0100000000000000127b2264617461223a7b226f6b223a317d7d030000000100000000";
export default {
  fetch() {
    const bytes = new Uint8Array(HEX.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(HEX.slice(i * 2, i * 2 + 2), 16);
    return new Response(bytes, { headers: { "content-type": "application/x-tss-framed; v=1" } });
  },
};
JS

cp serve.ts package.json bun.lock "$root/release/"

(cd /tmp && env -u RELEASE_DIR FF_TEST_PORT="$port" bun "$root/release/serve.ts") >"$root/server.log" 2>&1 & pid=$!
for _ in $(seq 1 60); do
  curl -fsS --connect-timeout 1 --max-time 2 "http://127.0.0.1:$port/_serverFn/test" -o "$root/body.bin" -D "$root/headers.txt" 2>/dev/null && break
  sleep .2
done

ACTUAL="$(od -An -tx1 "$root/body.bin" | tr -d ' \n')"
if [ "$ACTUAL" != "$BODY_HEX" ]; then
  echo "server-function response body corrupted by serve.ts: got=$ACTUAL want=$BODY_HEX" >&2
  exit 1
fi

grep -qi '^Content-Security-Policy:' "$root/headers.txt" || { echo 'missing Content-Security-Policy' >&2; exit 1; }
grep -qi '^X-Frame-Options: DENY' "$root/headers.txt" || { echo 'missing X-Frame-Options' >&2; exit 1; }
grep -qi '^X-Release-ID: serverfn-test' "$root/headers.txt" || { echo 'missing X-Release-ID' >&2; exit 1; }
grep -qi '^Content-Type: application/x-tss-framed' "$root/headers.txt" || { echo 'content-type not preserved' >&2; exit 1; }

kill "$pid"; wait "$pid" 2>/dev/null || true; pid=""
echo 'server-function response integrity: byte-identical body through serve.ts, security + release headers applied'
