#!/usr/bin/env bash
# Loads the reference data only, in one transaction: the plans and their
# entitlements (supabase/seed/01_plans.sql) and the steps of a sale
# (02_sale_steps.sql). No account, no demo data: what production receives at
# launch (SPEC-V2 P-05b). Idempotent. The knowledge base is loaded apart, with
# its embeddings: scripts/kb-import.sh.
# Usage: scripts/db-seed-reference.sh local|staging|prod
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
    read -r -p "Load the plans and the sale steps into PRODUCTION? Type 'leenkey-prod' to confirm: " answer
    [ "$answer" = "leenkey-prod" ] || { echo "Aborted."; exit 1; }
    ;;
  *) echo "Unknown target: $target (local|staging|prod)"; exit 1 ;;
esac

export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
{
  echo "begin;"
  cat supabase/seed/01_plans.sql supabase/seed/02_sale_steps.sql
  echo "commit;"
} | psql "$url" -v ON_ERROR_STOP=1 -q -At

psql "$url" -At -c "
  select format('Reference data on %s: %s plans, %s entitlements, %s sale steps, %s tasks.',
    '$target',
    (select count(*) from public.plans),
    (select count(*) from public.plan_entitlements),
    (select count(*) from public.sale_steps),
    (select count(*) from public.sale_step_tasks));"
