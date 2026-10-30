#!/usr/bin/env bash
# npm run kb:import (L1-27, SPEC-V2 section 12): loads the cards of
# supabase/seed/knowledge/*.md into knowledge_base (scripts/seed-knowledge.mjs:
# one upsert per question, the embedding reset when the answer changed), then
# computes the missing embeddings with the Edge Function `embed`, as an admin
# (scripts/kb-embed.mjs).
# Usage: scripts/kb-import.sh local|staging|prod
#   local   -> $DATABASE_URL, SEED_SUPABASE_URL, SEED_SUPABASE_ANON_KEY
#   staging -> $STAGING_DATABASE_URL, STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY
#   prod    -> $PROD_DATABASE_URL, PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY,
#              after typing the project name to confirm
# The admin: KB_ADMIN_EMAIL and KB_ADMIN_PASSWORD, or the seed admin with
# SEED_PASSWORD (local and staging).
set -euo pipefail
cd "$(dirname "$0")/.."

target="${1:-local}"
case "$target" in
  local)
    db="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
    supabase_url="${SEED_SUPABASE_URL:-}" anon_key="${SEED_SUPABASE_ANON_KEY:-}" ;;
  staging)
    db="${STAGING_DATABASE_URL:?STAGING_DATABASE_URL is not set}"
    supabase_url="${STAGING_SUPABASE_URL:-}" anon_key="${STAGING_SUPABASE_ANON_KEY:-}" ;;
  prod)
    db="${PROD_DATABASE_URL:?PROD_DATABASE_URL is not set}"
    supabase_url="${PROD_SUPABASE_URL:-}" anon_key="${PROD_SUPABASE_ANON_KEY:-}"
    [ -n "${KB_ADMIN_EMAIL:-}" ] && [ -n "${KB_ADMIN_PASSWORD:-}" ] \
      || { echo "KB_ADMIN_EMAIL and KB_ADMIN_PASSWORD are required in production."; exit 1; }
    read -r -p "Import the knowledge base into PRODUCTION? Type 'leenkey-prod' to confirm: " answer
    [ "$answer" = "leenkey-prod" ] || { echo "Aborted."; exit 1; } ;;
  *) echo "Unknown target: $target (local|staging|prod)"; exit 1 ;;
esac

export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
{ echo "begin;"; node scripts/seed-knowledge.mjs; echo "commit;"; } | psql "$db" -v ON_ERROR_STOP=1 -q -At

if [ -z "$supabase_url" ] || [ -z "$anon_key" ]; then
  echo "Cards loaded; embeddings not computed: the project of $target or its public key is not set."
  exit 1
fi
KB_SUPABASE_URL="$supabase_url" KB_SUPABASE_ANON_KEY="$anon_key" node scripts/kb-embed.mjs
read -r cards embedded < <(psql "$db" -At -F ' ' -c "select count(*), count(embedding) from public.knowledge_base;")
echo "Knowledge base on $target: $cards cards, $embedded with an embedding."
# A card without an embedding is never found: the import is not done.
[ "$cards" = "$embedded" ] || { echo "Some cards have no embedding."; exit 1; }
