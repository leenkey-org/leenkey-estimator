#!/usr/bin/env bash
# Restores a backup of scripts/backup.sh into an EMPTY database (P-03).
# Usage: scripts/restore.sh <backups/leenkey-….sql.gz[.gpg]>
#   target: $RESTORE_DATABASE_URL, a new Supabase project (never the database
#   it was taken from).
# Steps, all on the target:
#   1. the migrations of supabase/migrations (scripts/db-migrate.sh);
#   2. the rows of the backup, in one transaction, triggers off, after the
#      rows the migrations wrote (DPE rules, buckets) are emptied
#      (session_replication_role = replica: no email, no notification, no
#      frozen-offer check replayed);
#   3. the counts of the main tables, to compare with the source.
# Afterwards, by hand (docs/RECETTE.md, P-03): the secret cron_secret in the
# vault, the variables of Vercel pointed at the new project, the files of
# Storage if the old project is lost.
set -euo pipefail
cd "$(dirname "$0")/.."

file="${1:?usage: scripts/restore.sh <backup file>}"
url="${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is not set}"
for forbidden in "${PROD_DATABASE_URL:-}" "${BACKUP_DATABASE_URL:-}"; do
  [ -n "$forbidden" ] && [ "$url" = "$forbidden" ] && { echo "Refused: the target is the source." >&2; exit 1; }
done

if [ -n "$(psql "$url" -At -c "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles'" 2>/dev/null)" ] \
   && [ "$(psql "$url" -At -c "select count(*) from public.profiles")" != "0" ]; then
  echo "Refused: the target already has accounts." >&2; exit 1
fi

DATABASE_URL="$url" scripts/db-migrate.sh local

case "$file" in
  *.gpg) read_backup() { gpg --batch --quiet --decrypt "$file" | gunzip -c; } ;;
  *)     read_backup() { gunzip -c "$file"; } ;;
esac
# The rows the migrations wrote (DPE rules, buckets) make way for those of the
# backup, in the same transaction as the load.
read_backup | psql "$url" -v ON_ERROR_STOP=1 -q --single-transaction \
  -c "set session_replication_role = replica" \
  -c "do \$\$ declare t record; begin
        for t in select format('%I.%I', schemaname, tablename) as name
                   from pg_tables where schemaname = 'public' loop
          execute 'truncate table ' || t.name || ' cascade';
        end loop;
        delete from storage.buckets;
      end \$\$;" \
  -f - > /dev/null

psql "$url" -At -F ' ' -c "
  select 'auth.users', count(*) from auth.users
  union all select 'profiles', count(*) from public.profiles
  union all select 'properties', count(*) from public.properties
  union all select 'listings', count(*) from public.listings
  union all select 'photos', count(*) from public.photos
  union all select 'messages', count(*) from public.messages
  union all select 'offers', count(*) from public.offers
  union all select 'subscriptions', count(*) from public.subscriptions
  union all select 'storage.objects', count(*) from storage.objects"
