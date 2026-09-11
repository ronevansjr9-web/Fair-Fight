#!/usr/bin/env bash
# Verify a release endpoint without following redirects or accepting error responses.
set -euo pipefail
expected="$1"
base_url="${2%/}"
html="$3"
headers="${html}.headers"
# Aggregate wall-clock budget. When READY_DEADLINE_EPOCH is set (verify-ready.sh
# always sets it), EVERY request — the root and each same-origin asset — is capped
# at the seconds remaining until that absolute deadline, and verification aborts
# with a failure as soon as the budget is spent (checked before each request). An
# in-flight root/asset verification can therefore never substantially overrun the
# readiness deadline, no matter how many assets the page references or how slowly
# the server responds. Standalone/direct callers leave READY_DEADLINE_EPOCH unset
# and get the fixed defaults (connect-timeout 2 s, max-time 5 s).
request_timeouts() { # echoes "connect-timeout max-time" bounded by the remaining budget
  local now rem
  if [ -n "${READY_DEADLINE_EPOCH:-}" ]; then
    now="$(date +%s)"
    rem=$(( READY_DEADLINE_EPOCH - now ))
    (( rem >= 1 )) || { echo "verify-release: wall-clock budget exhausted (deadline passed)" >&2; exit 1; }
    (( rem > 5 )) && rem=5
  else
    rem=5
  fi
  if (( rem >= 2 )); then echo "2 $rem"; else echo "$rem $rem"; fi
}
t="$(request_timeouts)"; ct="${t% *}"; mt="${t#* }"
status="$(curl --silent --show-error --connect-timeout "$ct" --max-time "$mt" --dump-header "$headers" --output "$html" --write-out '%{http_code}' "$base_url/" || true)"
[[ "$status" =~ ^2[0-9][0-9]$ ]] || exit 1
awk -v expected="$expected" 'BEGIN { found=0 } tolower($1)=="x-release-id:" { gsub(/\r/, "", $2); if ($2==expected) found=1 } END { exit found ? 0 : 1 }' "$headers" || exit 1
assets=()
while IFS= read -r asset; do
  [[ -n "$asset" ]] && assets+=("$asset")
done < <(grep -oE '(src|href)="/[^"]+"' "$html" | sed -E 's/^[^\"]+"(\/[^\"]+)"$/\1/' | sort -u)
((${#assets[@]} > 0)) || exit 1
for asset in "${assets[@]}"; do
  t="$(request_timeouts)"; ct="${t% *}"; mt="${t#* }"
  asset_status="$(curl --silent --show-error --connect-timeout "$ct" --max-time "$mt" --output /dev/null --write-out '%{http_code}' "$base_url$asset" || true)"
  [[ "$asset_status" =~ ^2[0-9][0-9]$ ]] || exit 1
done
rm -f "$headers"
