#!/bin/sh
set -eu

cd /home/ubuntu/clipku-streaming
if [ -n "$(git status --porcelain)" ]; then
  echo "Release dibatalkan: commit perubahan Git terlebih dahulu." >&2
  exit 1
fi
exec sh scripts/deploy-safe.sh
