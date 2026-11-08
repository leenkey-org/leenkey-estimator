-- Limits of requests per address (L1-38, CLAUDE.md section 11): sign-up,
-- sign-in, password reset and the contact form of the site. Messages and the
-- assistant have theirs already (messages_rate_limit, ai_quota_consume,
-- ai_visitor_ask). Counted in a fixed window per bucket and per address: the
-- address is known by a keyed hash only (lib/rate-limit.ts), the counts are
-- deleted after a day.
--
-- The table is open to nobody; one function counts a request and says
-- whether it passes. It is called by the server of the site without a
-- session (a visitor signing up has none): it first checks the key of the
-- server, derived from CRON_SECRET as the Vault holds it (cron_secret), so
-- that nobody calls it straight with the public anon key to use up the
-- limits of others. The limits are written here, never given by the caller.

create table public.rate_limits (
  bucket text not null check (bucket in ('signup', 'signin', 'reset', 'contact')),
  key text not null check (key ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits int not null default 0 check (hits >= 0),
  created_at timestamptz not null default now(),
  primary key (bucket, key, window_start)
);

alter table public.rate_limits enable row level security;
-- No policy: read and written by rate_limit_hit only.

-- The caller is the server of the site (lib/rate-limit.ts, serverKey).
create function public.rate_limit_server(p_key text) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_expected text;
begin
  select encode(extensions.hmac('leenkey:rate-limit:server', s.decrypted_secret, 'sha256'), 'hex')
    into v_expected
    from vault.decrypted_secrets s
   where s.name = 'cron_secret';
  if v_expected is null or p_key is null
     or extensions.digest(p_key, 'sha256') <> extensions.digest(v_expected, 'sha256') then
    raise exception 'rate_limit: only the site calls this' using errcode = '42501';
  end if;
end;
$$;

-- One request of an address in a bucket: counted, then whether it passes.
-- Limits, also in lib/rate-limit.ts (tests/unit/security/rate-limit.test.ts
-- checks that both say the same): sign-up 5 per hour, sign-in 20 per 15
-- minutes, password reset 5 per hour, contact form 5 per hour.
create function public.rate_limit_hit(p_server text, p_bucket text, p_key text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_limit int;
  v_seconds int;
  v_start timestamptz;
  v_hits int;
begin
  perform public.rate_limit_server(p_server);
  case p_bucket
    when 'signup' then v_limit := 5; v_seconds := 3600;
    when 'signin' then v_limit := 20; v_seconds := 900;
    when 'reset' then v_limit := 5; v_seconds := 3600;
    when 'contact' then v_limit := 5; v_seconds := 3600;
    else raise exception 'rate_limit_hit: unknown bucket' using errcode = '22023';
  end case;
  if p_key is null or p_key !~ '^[0-9a-f]{64}$' then
    raise exception 'rate_limit_hit: invalid key' using errcode = '22023';
  end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);
  insert into public.rate_limits (bucket, key, window_start, hits)
  values (p_bucket, p_key, v_start, 1)
  on conflict (bucket, key, window_start)
    do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= v_limit;
end;
$$;

-- The counts of the past windows: deleted after a day, every night.
create function public.rate_limits_purge() returns void
language sql security definer set search_path = '' as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-rate-limits';
    perform cron.schedule('purge-rate-limits', '41 3 * * *', $job$select public.rate_limits_purge()$job$);
  end if;
end;
$$;

revoke all on table public.rate_limits from public, anon, authenticated;
revoke execute on function public.rate_limit_server(text) from public, anon, authenticated;
revoke execute on function public.rate_limits_purge() from public, anon, authenticated;
revoke execute on function public.rate_limit_hit(text, text, text) from public;
grant execute on function public.rate_limit_hit(text, text, text) to anon, authenticated;
