#!/usr/bin/env bash
# Loads supabase/seed/ in one transaction: plans, sale steps, knowledge base
# (supabase/seed/knowledge/*.md), seed accounts, demo data. Idempotent.
# Usage: scripts/db-seed.sh local|staging
#   local   -> $DATABASE_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres)
#   staging -> $STAGING_DATABASE_URL
# Production is refused: it only receives the reference data, at launch (P-05b).
# SEED_PASSWORD (optional): password of the seed accounts, see 04_accounts.sql.
# Photos of the demo properties (L1-46, scripts/seed-photos.mjs), sent as
# their owners with SEED_PASSWORD, never with the service key: the project of
# the target and its public key, SEED_SUPABASE_URL and SEED_SUPABASE_ANON_KEY
# (local) or STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY (staging).
# Without them, the demo properties have no photo.
set -euo pipefail
cd "$(dirname "$0")/.."

target="${1:-local}"
case "$target" in
  local)   url="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" ;;
  staging) url="${STAGING_DATABASE_URL:?STAGING_DATABASE_URL is not set}" ;;
  *) echo "db:seed runs on local or staging only, never on production (got: $target)."; exit 1 ;;
esac
if [ -n "${PROD_DATABASE_URL:-}" ] && [ "$url" = "$PROD_DATABASE_URL" ]; then
  echo "Refusing to seed the production database."; exit 1
fi

export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
{
  echo "begin;"
  if [ -n "${SEED_PASSWORD:-}" ]; then
    # Read from the environment by psql itself: never on a command line.
    echo '\getenv seed_password SEED_PASSWORD'
    echo '\o /dev/null'
    echo "select set_config('seed.password', :'seed_password', true);"
    echo '\o'
  fi
  cat supabase/seed/01_plans.sql supabase/seed/02_sale_steps.sql
  node scripts/seed-knowledge.mjs
  cat supabase/seed/04_accounts.sql supabase/seed/05_demo_data.sql
  echo "commit;"
} | psql "$url" -v ON_ERROR_STOP=1 -q -At

# Photos of the demo properties: their files in the bucket photos, then their
# rows, for the demo properties without any photo (the others are left as the
# recette made them) whose owner may still add one (photo_file_writable: not
# deleted, sold or suspended, the owner active).
case "$target" in
  local)   supabase_url="${SEED_SUPABASE_URL:-}" anon_key="${SEED_SUPABASE_ANON_KEY:-}" ;;
  staging) supabase_url="${STAGING_SUPABASE_URL:-}" anon_key="${STAGING_SUPABASE_ANON_KEY:-}" ;;
esac
if [ -n "$supabase_url" ] && [ -n "$anon_key" ] && [ -n "${SEED_PASSWORD:-}" ]; then
  skip="$(psql "$url" -At -c "select coalesce(string_agg(p.id::text, ','), '') from public.properties p
    where p.id::text like '5eed1000-%' and (p.deleted_at is not null
      or exists (select 1 from public.photos ph where ph.property_id = p.id)
      or exists (select 1 from public.listings l where l.property_id = p.id
                 and (l.status = 'suspended' or (l.status = 'sold' and l.deleted_at is null)))
      or exists (select 1 from public.profiles pr where pr.id = p.owner_id
                 and (pr.suspended_at is not null or pr.deleted_at is not null)))")"
  SEED_SUPABASE_URL="$supabase_url" SEED_SUPABASE_ANON_KEY="$anon_key" SEED_DATABASE_URL="$url" \
    SEED_PHOTOS_SKIP="$skip" node scripts/seed-photos.mjs "$target" | psql "$url" -v ON_ERROR_STOP=1 -q -At
else
  echo "Photos of the demo properties not loaded: the project of $target, its public key or SEED_PASSWORD is not set."
fi

psql "$url" -At -c "
  select format('Seed loaded on %s: %s plans, %s sale steps, %s tasks, %s knowledge cards, %s seed accounts, %s demo properties (%s published), %s demo photos.',
    '$target',
    (select count(*) from public.plans),
    (select count(*) from public.sale_steps),
    (select count(*) from public.sale_step_tasks),
    (select count(*) from public.knowledge_base),
    (select count(*) from auth.users where email like '%@test.leenkey.fr'),
    (select count(*) from public.properties where id::text like '5eed1000-%'),
    (select count(*) from public.listings l where l.property_id::text like '5eed1000-%' and l.status = 'published'),
    (select count(*) from public.photos where storage_path like '5eed1000-%/5eed7000-%'));"
echo "Seed accounts password: SEED_PASSWORD, or the Vault secret \"seed_password\" (Supabase dashboard)."
