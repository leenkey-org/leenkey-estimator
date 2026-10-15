#!/usr/bin/env bash
# Generates types/database.ts from the LOCAL database (after db:migrate:local),
# with Supabase's own generator (docker image supabase/postgres-meta).
# Local and staging share the same migrations, hence the same types.
set -euo pipefail
cd "$(dirname "$0")/.."

host="${PG_META_DB_HOST:-172.17.0.1}"   # docker host seen from the container
port="${PG_META_DB_PORT:-54322}"
name="leenkey-pg-meta"

docker rm -f "$name" >/dev/null 2>&1 || true
docker run -d --name "$name" -p 8085:8080 -e PG_META_PORT=8080 \
  -e PG_META_DB_HOST="$host" -e PG_META_DB_PORT="$port" \
  -e PG_META_DB_USER=postgres -e PG_META_DB_PASSWORD="${PG_META_DB_PASSWORD:-postgres}" \
  -e PG_META_DB_NAME=postgres supabase/postgres-meta:v0.91.0 >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 30); do
  curl -sf --noproxy '*' http://127.0.0.1:8085/health >/dev/null && break
  sleep 1
done

mkdir -p types
curl -sf --noproxy '*' "http://127.0.0.1:8085/generators/typescript?included_schemas=public" > types/database.ts
echo "types/database.ts generated."
