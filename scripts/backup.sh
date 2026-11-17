#!/usr/bin/env bash
# npm run backup (P-03, CLAUDE.md section 13): the data of the database into
# backups/leenkey-<UTC date>.sql.gz. Run each night by
# .github/workflows/backup.yml on the production database, which encrypts the
# file and keeps it 14 days as a private artifact of the repository.
#
# What it holds: the rows of the schemas public, auth (accounts and their
# identities, not their sessions) and storage (the list of the files, not the
# files themselves: Supabase Storage keeps them). Not the schema: a restore
# replays supabase/migrations first (scripts/restore.sh). Plain SQL inserts
# with their columns: they load across versions of the auth and storage
# services. The rows a migration writes (DPE rules, buckets) are emptied by the
# restore before the load.
#
# Database: $BACKUP_DATABASE_URL, otherwise $PROD_DATABASE_URL. pg_dump runs in
# the image of the CI (Postgres 17, the version of Supabase): a pg_dump older
# than the server refuses to dump it.
set -euo pipefail
cd "$(dirname "$0")/.."

url="${BACKUP_DATABASE_URL:-${PROD_DATABASE_URL:-}}"
[ -n "$url" ] || { echo "BACKUP_DATABASE_URL or PROD_DATABASE_URL is not set" >&2; exit 1; }
image="${BACKUP_PG_IMAGE:-supabase/postgres:17.4.1.054}"

mkdir -p backups
file="backups/leenkey-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

docker run --rm --network host --entrypoint pg_dump "$image" "$url" \
  --data-only --column-inserts --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage \
  --exclude-table-data='auth.schema_migrations' \
  --exclude-table-data='auth.sessions' \
  --exclude-table-data='auth.refresh_tokens' \
  --exclude-table-data='auth.flow_state' \
  --exclude-table-data='auth.one_time_tokens' \
  --exclude-table-data='auth.mfa_challenges' \
  --exclude-table-data='auth.mfa_amr_claims' \
  --exclude-table-data='auth.audit_log_entries' \
  --exclude-table-data='storage.migrations' \
  --exclude-table-data='public.rate_limits' \
  | gzip -9 > "$file"

# A dump that stops early still leaves a file: check it ends as pg_dump ends.
gunzip -c "$file" | tail -n 5 | grep -q "PostgreSQL database dump complete" \
  || { echo "backup incomplete: $file" >&2; exit 1; }
echo "$file ($(du -h "$file" | cut -f1))"
