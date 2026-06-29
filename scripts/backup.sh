#!/bin/sh
set -eu

ROOT="/home/ubuntu/clipku-streaming"
DEST="/home/ubuntu/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"

cd "$ROOT"
set -a
. ./.env
set +a

db_url="${DATABASE_URL#mysql://}"
credentials="${db_url%%@*}"
location="${db_url#*@}"
user="${credentials%%:*}"
password="${credentials#*:}"
host_port="${location%%/*}"
database="${location#*/}"
database="${database%%\?*}"
host="${host_port%%:*}"
port="${host_port#*:}"
[ "$port" = "$host_port" ] && port=3306

MYSQL_PWD="$password" mysqldump -h "$host" -P "$port" -u "$user" \
  --single-transaction --quick --no-tablespaces "$database" | gzip > "$DEST/clipku-db-$STAMP.sql.gz"
tar --exclude=node_modules --exclude='.next*' --exclude='.git' \
  -czf "$DEST/clipku-source-$STAMP.tar.gz" .

find "$DEST" -type f -name 'clipku-*' -mtime +14 -delete
