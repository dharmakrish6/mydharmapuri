#!/bin/bash
# Build the website + admin and deploy them to Hostinger through its public API:
#   mydharmapuri.com        ← app/dist   (static-site deploy: replaces the site root, keeps subdomain folders)
#   admin.mydharmapuri.com  ← admin/dist (its own root, public_html/admin)
#
# Needs a Hostinger API token (hPanel → profile → API) saved privately, outside the repo:
#   pbpaste > ~/.hostinger-token && chmod 600 ~/.hostinger-token
#
# Usage:  scripts/deploy-hostinger.sh [website|admin|all]   (default: all)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOKEN_FILE="${HOSTINGER_TOKEN_FILE:-$HOME/.hostinger-token}"
ACCOUNT="${HOSTINGER_ACCOUNT:-u838237461}"
API=https://developers.hostinger.com/api/hosting/v1
WHAT="${1:-all}"

[ -f "$TOKEN_FILE" ] || { echo "Missing $TOKEN_FILE — see the notes at the top of this script." >&2; exit 1; }
TOKEN="$(tr -d ' \n\r' < "$TOKEN_FILE")"
json() { python3 -c "import json,sys; print(json.load(sys.stdin)[sys.argv[1]])" "$1"; }
api() { curl -sS --fail-with-body -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' -H 'Content-Type: application/json' "$@"; }

deploy() { # deploy <domain> <dist dir> <zip name>
  local domain="$1" dist="$2" zip="$3" tmp size cred url ak rk
  tmp="$(mktemp -d)/$zip"
  (cd "$dist" && zip -qr "$tmp" . -x '.DS_Store' '*/.DS_Store')
  size=$(wc -c < "$tmp" | tr -d ' ')
  echo "[$domain] uploading $zip ($size bytes)"
  cred=$(api -X POST -d "{\"username\":\"$ACCOUNT\",\"domain\":\"$domain\"}" "$API/files/upload-urls")
  url=$(echo "$cred" | json url); ak=$(echo "$cred" | json auth_key); rk=$(echo "$cred" | json rest_auth_key)
  curl -sS --fail -o /dev/null -X POST "$url/$zip?override=true" -H "X-Auth: $ak" -H "X-Auth-Rest: $rk" \
    -H "Tus-Resumable: 1.0.0" -H "Upload-Length: $size" -H "Upload-Offset: 0"
  curl -sS --fail -o /dev/null -X PATCH "$url/$zip?override=true" -H "X-Auth: $ak" -H "X-Auth-Rest: $rk" \
    -H "Tus-Resumable: 1.0.0" -H "Content-Type: application/offset+octet-stream" -H "Upload-Offset: 0" --data-binary "@$tmp"
  api -X POST -d "{\"archive_path\":\"$zip\"}" "$API/accounts/$ACCOUNT/websites/$domain/deploy" >/dev/null
  api -X DELETE "$API/accounts/$ACCOUNT/websites/$domain/cache/clear" >/dev/null || true
  rm -f "$tmp"
  echo "[$domain] deployed"
}

if [ "$WHAT" = all ] || [ "$WHAT" = website ]; then
  (cd "$ROOT/app" && npm run build:web)
  deploy mydharmapuri.com "$ROOT/app/dist" mydharmapuri-website.zip
fi
if [ "$WHAT" = all ] || [ "$WHAT" = admin ]; then
  (cd "$ROOT/admin" && npm run build)
  deploy admin.mydharmapuri.com "$ROOT/admin/dist" mydharmapuri-admin.zip
fi
echo "Done: https://mydharmapuri.com  https://admin.mydharmapuri.com"
