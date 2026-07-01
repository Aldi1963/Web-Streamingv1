#!/bin/sh
set -eu

url="${APP_URL:-https://drama.clipku.com}/api/health"
body="$(mktemp)"
trap 'rm -f "$body"' EXIT

status="$(curl -sS --max-time 20 -o "$body" -w '%{http_code}' "$url" || true)"
if [ "$status" != "200" ]; then
  logger -t clipku-health "health check failed: HTTP $status $(tr '\n' ' ' < "$body" | cut -c1-500)"
  exit 1
fi
