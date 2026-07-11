#!/bin/sh
set -eu

ROOT="/home/ubuntu/clipku-streaming"
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

MYSQL_PWD="$password" mysql -h "$host" -P "$port" -u "$user" "$database" <<SQL
DELETE FROM ApiCache WHERE expiresAt < NOW();
DELETE FROM ApiLog WHERE createdAt < DATE_SUB(NOW(), INTERVAL 2 DAY);
SQL

# Reclaim table space weekly; daily OPTIMIZE can be unnecessarily heavy.
if [ "$(date +%u)" = "7" ]; then
  MYSQL_PWD="$password" mysql -h "$host" -P "$port" -u "$user" "$database" <<SQL
OPTIMIZE TABLE ApiCache, ApiLog;
SQL
fi
