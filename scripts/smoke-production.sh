#!/bin/sh
set -eu

BASE_URL="${1:-https://drama.clipku.com}"

check() {
  path="$1"
  expected="$2"
  status="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 20 "$BASE_URL$path")"
  if [ "$status" != "$expected" ]; then
    echo "FAIL $path: HTTP $status (expected $expected)" >&2
    exit 1
  fi
  echo "OK   $path: HTTP $status"
}

check "/" "200"
check "/login" "200"
check "/plans" "200"
check "/api/health" "200"
