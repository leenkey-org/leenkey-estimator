-- L3-06 (SPEC-V2 sections 16, 18 and 19): the daily digest of the buyer
-- alerts and the similar listings after a sale. The route
-- /api/cron/buyer-alerts reads what is due with the two functions below
-- (service role only), runs each alert through search_listings as the search
-- page does, sends one email per buyer and writes alerts.last_sent_at.
-- `alert.match` has no notification in the application (SPEC 10): nothing is
-- written in `notifications`, the email leaves from the route.

-- ---------------------------------------------------------------------------
-- The alerts due: every active alert of an account neither closed nor
-- suspended, whose emails of alerts are on, with the date its listings are
-- read from (the last digest, or its creation) and the address of the buyer.
-- ---------------------------------------------------------------------------
create function public.alert_digest_queue()
returns table (alert_id uuid, buyer_id uuid, name text, criteria jsonb,
               last_sent_at timestamptz, since timestamptz, email text, first_name text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.buyer_id, a.name, a.criteria, a.last_sent_at,
         coalesce(a.last_sent_at, a.created_at), u.email::text, p.first_name
    from public.alerts a
    join public.profiles p on p.id = a.buyer_id
    join auth.users u on u.id = a.buyer_id
   where a.active
     and p.deleted_at is null and p.suspended_at is null
     and coalesce(p.notification_prefs ->> 'email_alerts', 'true') <> 'false'
     and u.email is not null
   order by coalesce(a.last_sent_at, a.created_at), a.buyer_id, a.id;
$$;
revoke execute on function public.alert_digest_queue() from public, anon, authenticated;
grant execute on function public.alert_digest_queue() to service_role;

-- ---------------------------------------------------------------------------
-- Similar listings after a sale (SPEC 16): told once per buyer and listing
-- sold. A technical table: written by the route (service role), read by the
-- admin; listings_count is 0 when nothing similar was online (no email).
-- ---------------------------------------------------------------------------
create table public.alert_similar_sent (
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  listings_count integer not null check (listings_count >= 0),
  created_at timestamptz not null default now(),
  primary key (buyer_id, listing_id)
);
alter table public.alert_similar_sent enable row level security;
create policy alert_similar_sent_select on public.alert_similar_sent for select to authenticated
  using (public.is_admin());
revoke all on public.alert_similar_sent from anon, authenticated;
grant select on public.alert_similar_sent to authenticated;

-- The buyers to tell of a listing sold within the last 7 days (a run missed
-- is caught up; alert_similar_sent keeps it to once): those who had a
-- conversation about the property or sent an offer on it, but the one whose
-- offer was accepted and the owner; only with an active alert (RGPD: no
-- alert, no email), an account neither closed nor suspended, emails of
-- alerts on.
create function public.alert_similar_queue()
returns table (listing_id uuid, title text, city text, price_cents bigint, rooms integer,
               buyer_id uuid, email text, first_name text)
language sql stable security definer set search_path = '' as $$
  select l.id, l.title, pr.city, l.price_cents, pr.rooms, b.buyer_id, u.email::text, p.first_name
    from public.listings l
    join public.properties pr on pr.id = l.property_id
    join lateral (
      select c.buyer_id
        from public.conversations c
       where c.property_id = l.property_id and c.kind = 'listing' and c.buyer_id is not null
      union
      select o.buyer_id
        from public.offers o
        join public.listings ol on ol.id = o.listing_id
       where ol.property_id = l.property_id and o.status <> 'draft'
    ) b on true
    join public.profiles p on p.id = b.buyer_id
    join auth.users u on u.id = b.buyer_id
   where l.status = 'sold' and l.sold_at > now() - interval '7 days'
     and b.buyer_id <> pr.owner_id
     and p.deleted_at is null and p.suspended_at is null
     and coalesce(p.notification_prefs ->> 'email_alerts', 'true') <> 'false'
     and u.email is not null
     and exists (select 1 from public.alerts a where a.buyer_id = b.buyer_id and a.active)
     and not exists (select 1 from public.offers o
                       join public.listings ol on ol.id = o.listing_id
                      where ol.property_id = l.property_id and o.buyer_id = b.buyer_id
                        and o.status = 'accepted')
     and not exists (select 1 from public.alert_similar_sent s
                      where s.buyer_id = b.buyer_id and s.listing_id = l.id)
   order by l.sold_at, l.id, b.buyer_id;
$$;
revoke execute on function public.alert_similar_queue() from public, anon, authenticated;
grant execute on function public.alert_similar_queue() to service_role;

-- ---------------------------------------------------------------------------
-- Every day at 5:00 UTC (7 h in Paris in summer, 6 h in winter; SPEC 19),
-- with pg_cron and pg_net as the other routes.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'buyer-alerts';
    perform cron.schedule('buyer-alerts', '0 5 * * *',
                          $job$select public.cron_call('/api/cron/buyer-alerts')$job$);
  end if;
end;
$$;
