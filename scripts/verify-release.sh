#!/usr/bin/env bash
# Verify a release endpoint without following redirects or accepting error responses.
set -euo pipefail
expected="$1"
base_url="${2%/}"
html="$3"
headers="${html}.headers"
status="$(curl --silent --show-error --connect-timeout 2 --max-time 5 --dump-header "$headers" --output "$html" --write-out '%{http_code}' "$base_url/" || true)"
[[ "$status" =~ ^2[0-9][0-9]$ ]] || exit 1
awk -v expected="$expected" 'BEGIN { found=0 } tolower($1)=="x-release-id:" { gsub(/\r/, "", $2); if ($2==expected) found=1 } { found=1 } END { exit found ? 0 : 1 }' "$headers" || exit 1
assets=()
while IFS= read -r asset; do
  [[ -n "$asset" ]] && assets+=("$asset")
done < <(grep -oE '(src|href)="/[^"]+"' "$html" | sed -E 's/^[^\"]+"(\/[^\"]+)"$/\1/' | sort -u)
((${#assets[@]} > 0)) || exit 1
for asset in "${assets[@]}"; do
  asset_status="$(curl --silent --show-error --connect-timeout 2 --max-time 5 --output /dev/null --write-out '%{http_code}' "$base_url$asset" || true)"
  [[ "$asset_status" =~ ^2[0-9][0-9]$ ]] || exit 1
done
rm -f "$headers"
