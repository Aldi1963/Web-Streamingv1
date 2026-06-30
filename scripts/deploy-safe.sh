#!/bin/sh
set -eu

cd /home/ubuntu/clipku-streaming
sudo systemctl stop clipku-streaming.service

rm -rf .next.previous .next.previous-*
if [ -d .next ]; then mv .next .next.previous; fi

rollback() {
  if [ ! -f .next/BUILD_ID ] && [ -d .next.previous ]; then
    rm -rf .next
    mv .next.previous .next
  fi
  sudo systemctl start clipku-streaming.service
}

trap rollback EXIT
NEXT_TELEMETRY_DISABLED=1 npm run build
test -f .next/BUILD_ID
sudo mkdir -p /var/www/clipku-next-static
sudo rm -rf /var/www/clipku-next-static/*
sudo cp -a .next/static/. /var/www/clipku-next-static/
sudo chmod -R a+rX /var/www/clipku-next-static
rm -rf .next.previous .next.previous-*
sudo systemctl start clipku-streaming.service
trap - EXIT
sudo systemctl is-active --quiet clipku-streaming.service
