#!/usr/bin/env bash
# Applies supabase/migrations/*.sql not yet recorded in
# supabase_migrations.schema_migrations (same table as the Supabase CLI).
# Usage: scripts/db-migrate.sh local|staging|prod
#   local   -> $DATABASE_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres)
#   staging -> $STAGING_DATABASE_URL
#   prod    -> $PROD_DATABASE_URL, after typing the project name to confirm
set -euo pipefail
cd "$(dirname "$0")/.."

target="${1:-local}"
case "$target" in
  local)   url="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" ;;
  staging) url="${STAGING_DATABASE_URL:?STAGING_DATABASE_URL is not set}" ;;
  prod)
    url="${PROD_DATABASE_URL:?PROD_DATABASE_URL is not set}"
    read -r -p "Apply migrations to PRODUCTION? Type 'leenkey-prod' to confirm: " answer
    [ "$answer" = "leenkey-prod" ] || { echo "Aborted."; exit 1; }
    ;;
  *) echo "Unknown target: $target (local|staging|prod)"; exit 1 ;;
esac

export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
psql_q() { psql "$url" -v ON_ERROR_STOP=1 -q -At "$@"; }

psql_q -c "create schema if not exists supabase_migrations;
           create table if not exists supabase_migrations.schema_migrations
             (version text primary key, statements text[], name text);"

applied=0
for file in supabase/migrations/*.sql; do
  base="$(basename "$file" .sql)"
  version="${base%%_*}"
  name="${base#*_}"
  if [ "$(psql_q -c "select 1 from supabase_migrations.schema_migrations where version = '$version'")" = "1" ]; then
    continue
  fi
  echo "-> $base"
  {
    echo "begin;"
    cat "$file"
    echo
    echo "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name');"
    echo "commit;"
  } | psql_q
  applied=$((applied + 1))
done
echo "Migrations applied on $target: $applied"
