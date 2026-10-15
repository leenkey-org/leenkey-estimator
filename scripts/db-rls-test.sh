#!/usr/bin/env bash
# Runs the permission tests (supabase/tests/rls_*.sql, pgTAP) against a LOCAL
# Supabase Postgres (docker image supabase/postgres). Each test file runs in a
# transaction that is rolled back. Refuses any non-local database.
set -euo pipefail
cd "$(dirname "$0")/.."

url="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
case "$url" in
  *@127.0.0.1*|*@localhost*|*@postgres:*) ;;
  *) echo "db:rls-test only runs against a local database."; exit 1 ;;
esac

# Wait for the image's init scripts (auth schema) to finish.
for _ in $(seq 1 60); do
  [ "$(psql "$url" -At -c "select to_regprocedure('auth.uid()') is not null" 2>/dev/null)" = "t" ] && break
  sleep 2
done

DATABASE_URL="$url" scripts/db-migrate.sh local

failed=0
for file in supabase/tests/rls_*.sql; do
  echo "== $file"
  if ! out="$(psql "$url" -v ON_ERROR_STOP=1 -q -At -f "$file" 2>&1)"; then
    echo "$out"; failed=1; continue
  fi
  echo "$out" | grep -E '^(not ok|# )' || true
  planned="$(echo "$out" | sed -n 's/^1\.\.\([0-9]*\)$/\1/p' | head -1)"
  passed="$(echo "$out" | grep -c '^ok ' || true)"
  echo "   $passed/$planned"
  if echo "$out" | grep -q '^not ok' || [ "$passed" != "$planned" ]; then failed=1; fi
done
[ "$failed" = 0 ] && echo "All permission tests passed." || { echo "Permission tests FAILED."; exit 1; }
