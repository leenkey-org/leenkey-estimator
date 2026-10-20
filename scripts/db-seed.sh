#!/usr/bin/env bash
# Loads supabase/seed/ in one transaction: plans, sale steps, knowledge base
# (supabase/seed/knowledge/*.md), seed accounts, demo data. Idempotent.
# Usage: scripts/db-seed.sh local|staging
#   local   -> $DATABASE_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres)
#   staging -> $STAGING_DATABASE_URL
# Production is refused: it only receives the reference data, at launch (P-05b).
# SEED_PASSWORD (optional): password of the seed accounts, see 04_accounts.sql.
# SEED_STORAGE_URL and SEED_STORAGE_KEY (optional): the Storage API and its
# service role key, to load the photos of the demo properties (L1-46,
# scripts/seed-photos.mjs); without them, the demo properties have no photo.
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

# Photos of the demo properties: their files in the bucket photos, then their rows.
if [ -n "${SEED_STORAGE_URL:-}" ] && [ -n "${SEED_STORAGE_KEY:-}" ]; then
  node scripts/seed-photos.mjs | psql "$url" -v ON_ERROR_STOP=1 -q -At
else
  echo "Photos of the demo properties not loaded: SEED_STORAGE_URL and SEED_STORAGE_KEY are not set."
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
