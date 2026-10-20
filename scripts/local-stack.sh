#!/usr/bin/env bash
# Local Supabase-like stack to test signed-in features end to end when no
# hosted project is reachable (docker images only, nothing to install):
#   Postgres (supabase/postgres), Supabase Auth (supabase/gotrue) with the
#   templates of supabase/templates/, PostgREST, Supabase Storage (files on
#   the container's disk), Supabase Realtime, Mailpit (catches the emails)
#   and a gateway serving /auth/v1, /rest/v1, /storage/v1 and /realtime/v1
#   (WebSocket) on one origin.
# Usage: scripts/local-stack.sh up | env | down
#   up    starts the stack, applies the migrations and the seed (keys and seed
#         password generated in .local-stack/, never committed)
#   env   prints the variables to export before building the app for port 3200
#   down  removes the containers
# Ports: gateway 54331, Mailpit 54328 (UI and API), Postgres 54326, on 127.0.0.1
# (and on the docker host address for the containers), never on the network.
set -euo pipefail
cd "$(dirname "$0")/.."

DIR=.local-stack
DB_PORT=54326 GATEWAY=54331 REST=54332 AUTH=54333 STORAGE=54334 REALTIME=54335 SMTP=54327 MAIL_UI=54328
APP_URL=http://localhost:3200
HOST_IP=172.17.0.1 # docker host seen from the containers
DB_URL="postgresql://postgres:postgres@127.0.0.1:$DB_PORT/postgres"
CONTAINERS="lk-stack-db lk-stack-auth lk-stack-rest lk-stack-storage lk-stack-realtime lk-stack-mail"

jwt() { # role -> HS256 token signed with the stack secret
  node -e '
    const crypto = require("crypto");
    const [secret, role] = process.argv.slice(1);
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const body = enc({ alg: "HS256", typ: "JWT" }) + "." + enc({ role, iss: "supabase", iat: now, exp: now + 31536000 });
    process.stdout.write(body + "." + crypto.createHmac("sha256", secret).update(body).digest("base64url"));
  ' "$(cat $DIR/jwt_secret)" "$1"
}

case "${1:-}" in
  up)
    mkdir -p $DIR
    [ -f $DIR/jwt_secret ] || openssl rand -hex 32 > $DIR/jwt_secret
    [ -f $DIR/seed_password ] || openssl rand -hex 12 > $DIR/seed_password
    [ -f $DIR/realtime_secret ] || openssl rand -hex 32 > $DIR/realtime_secret
    jwt anon > $DIR/anon_key
    docker rm -f $CONTAINERS >/dev/null 2>&1 || true

    docker run -d --name lk-stack-db -e POSTGRES_PASSWORD=postgres \
      -p 127.0.0.1:$DB_PORT:5432 -p $HOST_IP:$DB_PORT:5432 supabase/postgres:17.4.1.054 >/dev/null
    for _ in $(seq 1 60); do
      [ "$(psql "$DB_URL" -At -c "select to_regprocedure('auth.uid()') is not null" 2>/dev/null)" = "t" ] && break
      sleep 2
    done
    # supabase_admin is the image's superuser: it alone can set these passwords.
    psql "postgresql://supabase_admin:postgres@127.0.0.1:$DB_PORT/postgres" -q \
      -c "alter role supabase_auth_admin with password 'postgres'; alter role authenticator with password 'postgres'; alter role supabase_storage_admin with password 'postgres';"

    docker run -d --name lk-stack-mail -p $HOST_IP:$SMTP:1025 -p 127.0.0.1:$MAIL_UI:8025 axllent/mailpit:v1.27 >/dev/null
    node scripts/local-stack-gateway.mjs $GATEWAY $AUTH $REST "$PWD/supabase/templates" $HOST_IP $STORAGE $REALTIME > $DIR/gateway.log 2>&1 &
    echo $! > $DIR/gateway.pid
    sleep 1
    kill -0 "$(cat $DIR/gateway.pid)" 2>/dev/null || { echo "Gateway not started (port $GATEWAY taken?): $DIR/gateway.log"; exit 1; }

    docker run -d --name lk-stack-auth -p 127.0.0.1:$AUTH:9999 \
      -e GOTRUE_API_HOST=0.0.0.0 -e GOTRUE_API_PORT=9999 -e API_EXTERNAL_URL="http://localhost:$GATEWAY/auth/v1" \
      -e GOTRUE_DB_DRIVER=postgres \
      -e "GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:postgres@$HOST_IP:$DB_PORT/postgres" \
      -e GOTRUE_SITE_URL=$APP_URL -e "GOTRUE_URI_ALLOW_LIST=$APP_URL/**" \
      -e GOTRUE_JWT_SECRET="$(cat $DIR/jwt_secret)" -e GOTRUE_JWT_EXP=3600 -e GOTRUE_JWT_AUD=authenticated \
      -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated \
      -e GOTRUE_JWT_ADMIN_ROLES=service_role -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=false \
      -e GOTRUE_SMTP_HOST=$HOST_IP -e GOTRUE_SMTP_PORT=$SMTP -e GOTRUE_SMTP_USER=local -e GOTRUE_SMTP_PASS=local \
      -e GOTRUE_SMTP_ADMIN_EMAIL=noreply@leenkey.test -e GOTRUE_SMTP_SENDER_NAME=Leenkey \
      -e GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify -e GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify \
      -e GOTRUE_MAILER_TEMPLATES_CONFIRMATION="http://$HOST_IP:$GATEWAY/templates/confirmation.html" \
      -e GOTRUE_MAILER_TEMPLATES_RECOVERY="http://$HOST_IP:$GATEWAY/templates/recovery.html" \
      -e "GOTRUE_MAILER_SUBJECTS_CONFIRMATION=Confirmez votre adresse email" \
      -e "GOTRUE_MAILER_SUBJECTS_RECOVERY=Choisissez un nouveau mot de passe" \
      -e GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 -e GOTRUE_SMTP_MAX_FREQUENCY=1s \
      supabase/gotrue:v2.177.0 >/dev/null
    # As on the platform, the storage service brings its schema up to date
    # (bucket limits, L1-12) before our migrations.
    docker run -d --name lk-stack-storage -p 127.0.0.1:$STORAGE:5000 \
      -e ANON_KEY="$(cat $DIR/anon_key)" -e SERVICE_KEY="$(jwt service_role)" \
      -e AUTH_JWT_SECRET="$(cat $DIR/jwt_secret)" -e PGRST_JWT_SECRET="$(cat $DIR/jwt_secret)" \
      -e "DATABASE_URL=postgres://supabase_storage_admin:postgres@$HOST_IP:$DB_PORT/postgres" \
      -e POSTGREST_URL="http://$HOST_IP:$REST" -e FILE_SIZE_LIMIT=52428800 \
      -e STORAGE_BACKEND=file -e FILE_STORAGE_BACKEND_PATH=/var/lib/storage \
      -e TENANT_ID=stub -e REGION=local -e GLOBAL_S3_BUCKET=stub -e ENABLE_IMAGE_TRANSFORMATION=false \
      supabase/storage-api:v1.79.31 >/dev/null
    # Supabase Auth migrates the auth schema first, then our migrations and seed.
    for _ in $(seq 1 60); do
      curl -sf --noproxy '*' "http://127.0.0.1:$AUTH/health" >/dev/null \
        && curl -sf --noproxy '*' "http://127.0.0.1:$STORAGE/status" >/dev/null && break
      sleep 1
    done
    DATABASE_URL="$DB_URL" scripts/db-migrate.sh local
    # The photos of the demo properties go straight to the storage service.
    SEED_PASSWORD="$(cat $DIR/seed_password)" DATABASE_URL="$DB_URL" \
      SEED_STORAGE_URL="http://127.0.0.1:$STORAGE" SEED_STORAGE_KEY="$(jwt service_role)" \
      scripts/db-seed.sh local

    docker run -d --name lk-stack-rest -p 127.0.0.1:$REST:3000 \
      -e "PGRST_DB_URI=postgres://authenticator:postgres@$HOST_IP:$DB_PORT/postgres" -e PGRST_DB_SCHEMAS=public \
      -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$(cat $DIR/jwt_secret)" -e PGRST_DB_USE_LEGACY_GUCS=false \
      postgrest/postgrest:v12.2.12 >/dev/null
    # Realtime (L1-21) once the publication holds the tables of our migrations:
    # its self-hosted tenant « realtime-dev », reached by the gateway; its own
    # schema first, as the self-hosted setup of Supabase does.
    psql "postgresql://supabase_admin:postgres@127.0.0.1:$DB_PORT/postgres" -q \
      -c "create schema if not exists _realtime; alter schema _realtime owner to supabase_admin;"
    # Its endpoint listens in IPv6 only: in IPv4 here, for a machine without IPv6.
    docker run --rm --entrypoint cat supabase/realtime:v2.34.47 /app/releases/2.34.47/runtime.exs \
      | sed 's/socket_opts: \[:inet6\]/socket_opts: [:inet]/' > $DIR/realtime-runtime.exs
    docker run -d --name lk-stack-realtime -p 127.0.0.1:$REALTIME:4000 \
      -v "$PWD/$DIR/realtime-runtime.exs:/app/releases/2.34.47/runtime.exs:ro" -e DB_IP_VERSION=ipv4 \
      -e PORT=4000 -e DB_HOST=$HOST_IP -e DB_PORT=$DB_PORT -e DB_USER=supabase_admin -e DB_PASSWORD=postgres \
      -e DB_NAME=postgres -e "DB_AFTER_CONNECT_QUERY=SET search_path TO _realtime" -e DB_ENC_KEY=supabaserealtime \
      -e API_JWT_SECRET="$(cat $DIR/jwt_secret)" -e SECRET_KEY_BASE="$(cat $DIR/realtime_secret)$(cat $DIR/realtime_secret)" \
      -e "ERL_AFLAGS=-proto_dist inet_tcp" -e "DNS_NODES=''" -e RLIMIT_NOFILE=10000 -e APP_NAME=realtime \
      -e SEED_SELF_HOST=true -e RUN_JANITOR=true \
      supabase/realtime:v2.34.47 >/dev/null
    for _ in $(seq 1 60); do
      (echo > /dev/tcp/127.0.0.1/$REALTIME) 2>/dev/null && break
      sleep 1
    done
    echo "Stack up. Emails: http://localhost:$MAIL_UI. Seed password: $DIR/seed_password. Then: eval \"\$(scripts/local-stack.sh env)\""
    ;;
  env)
    echo "export NEXT_PUBLIC_SUPABASE_URL=http://localhost:$GATEWAY"
    echo "export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(cat $DIR/anon_key)"
    echo "export NEXT_PUBLIC_SITE_URL=$APP_URL NEXT_PUBLIC_ENV=local"
    # Addresses from core/geo/address-fixtures.ts: the tests know them.
    echo "export GEOCODER=fixtures"
    echo "export SEED_PASSWORD=$(cat $DIR/seed_password) MAILPIT_URL=http://127.0.0.1:$MAIL_UI BASE_URL=$APP_URL"
    ;;
  down)
    docker rm -f $CONTAINERS >/dev/null 2>&1 || true
    [ -f $DIR/gateway.pid ] && kill "$(cat $DIR/gateway.pid)" 2>/dev/null || true
    rm -f $DIR/gateway.pid
    echo "Stack down."
    ;;
  *)
    echo "Usage: scripts/local-stack.sh up | env | down"; exit 1 ;;
esac
