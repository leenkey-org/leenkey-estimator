-- L2-07: the offers in the back office (SPEC-V2 sections 13 and 17).
--
-- 1. admin_offers, admin_offer_counts: every offer sent (never a draft: an
--    offer exists once its buyer sent it), read by the team only, with the
--    property, the plan of its sale and the two parties; an offer past its
--    validity reads expired before the cron writes it, as its seller reads
--    it. Reads only, with the rights of the admin (security invoker).
-- 2. admin_offer_mark_analysed: « Marquer comme analysée ». The task
--    « Offre analysée avec le conseiller » of the sale is ticked by the
--    team, for a property whose plan includes the analysis of its offers
--    (plan_entitlements, never a plan name), once; written in the audit log.
-- 3. An offer accepted on a property whose plan includes an adviser: the
--    team is told (bell and email, grouped), SPEC 13 « notification au
--    conseiller si formule payante ». The rest of offer_events_notify is the
--    one of L2-04b, unchanged.
--
-- 4. offer_record_precontract (L2-01, L2-04b) already took an admin and
--    wrote the audit log: the team now records the avant-contrat in the
--    place of the seller only when the plan of the sale follows it to its
--    signature (plan_entitlements, « notary_coordination »), as the sheet of
--    the back office shows it. The seller records theirs as before.
--
-- No table, no policy.

-- 1. ---------------------------------------------------------------------------
create function public.admin_offers(
  p_status text default null,
  p_query text default null,
  p_account uuid default null,
  p_limit int default 200
)
returns table (
  id uuid,
  reference text,
  version int,
  status public.offer_status,
  price_cents bigint,
  asking_price_cents bigint,
  submitted_at timestamptz,
  validity_until timestamptz,
  answered_at timestamptz,
  listing_id uuid,
  listing_reference text,
  city text,
  property_id uuid,
  plan public.plan_code,
  buyer_id uuid,
  buyer_first_name text,
  buyer_last_name text,
  seller_id uuid,
  seller_first_name text,
  seller_last_name text
)
language plpgsql stable security invoker set search_path = '' as $$
declare
  q text := nullif(btrim(coalesce(p_query, '')), '');
  pattern text;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('waiting', 'accepted', 'declined', 'ended') then
    raise exception 'admin_offers: unknown status' using errcode = '22023';
  end if;
  if q is not null then
    pattern := '%' || replace(replace(replace(left(q, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return query
    with sent as (
      select o.*,
             case when o.status in ('submitted', 'viewed') and o.validity_until <= now()
                  then 'expired'::public.offer_status else o.status end as shown_status
        from public.offers o
       where o.status <> 'draft'
    )
    select s.id, s.reference, s.version, s.shown_status, s.price_cents,
           nullif(s.property_snapshot->>'asking_price_cents', '')::bigint,
           s.submitted_at, s.validity_until, s.answered_at,
           s.listing_id, l.reference, p.city, p.id,
           public.property_current_plan(p.id),
           s.buyer_id, b.first_name, b.last_name,
           s.seller_id, v.first_name, v.last_name
      from sent s
      join public.listings l on l.id = s.listing_id
      join public.properties p on p.id = l.property_id
      left join public.profiles b on b.id = s.buyer_id
      left join public.profiles v on v.id = s.seller_id
     where (p_status is null
            or (p_status = 'waiting' and s.shown_status in ('submitted', 'viewed'))
            or (p_status = 'accepted' and s.shown_status = 'accepted')
            or (p_status = 'declined' and s.shown_status = 'declined')
            or (p_status = 'ended' and s.shown_status in ('expired', 'withdrawn', 'superseded')))
       and (p_account is null or s.buyer_id = p_account or s.seller_id = p_account)
       and (pattern is null
            or concat_ws(' ', s.reference, l.reference, p.city, b.first_name, b.last_name,
                         v.first_name, v.last_name)
               ilike pattern escape '\')
     order by s.submitted_at desc nulls last, s.id
     limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

create function public.admin_offer_counts()
returns table (total int, waiting int, accepted int, declined int, ended int)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    with sent as (
      select case when o.status in ('submitted', 'viewed') and o.validity_until <= now()
                  then 'expired'::public.offer_status else o.status end as shown_status
        from public.offers o
       where o.status <> 'draft'
    )
    select count(*)::int,
           count(*) filter (where s.shown_status in ('submitted', 'viewed'))::int,
           count(*) filter (where s.shown_status = 'accepted')::int,
           count(*) filter (where s.shown_status = 'declined')::int,
           count(*) filter (where s.shown_status in ('expired', 'withdrawn', 'superseded'))::int
      from sent s;
end;
$$;

-- 2. ---------------------------------------------------------------------------
create function public.admin_offer_mark_analysed(p_offer uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_property uuid;
  v_task uuid;
  v_done_at timestamptz;
begin
  if not public.is_admin() or not public.is_active_user() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select l.property_id into v_property
    from public.offers o
    join public.listings l on l.id = o.listing_id
    join public.properties p on p.id = l.property_id and p.deleted_at is null
   where o.id = p_offer and o.status <> 'draft';
  if v_property is null then
    raise exception 'offer not found' using errcode = '42501';
  end if;
  -- A right of the plan in force, never a plan name.
  if not exists (
    select 1 from public.plan_entitlements e
     where e.plan = public.property_current_plan(v_property)
       and e.feature = 'human_offer_analysis') then
    raise exception 'the plan of this property has no analysis of its offers'
      using errcode = 'P0002';
  end if;
  select t.id into v_task
    from public.sale_progress sp
    join public.sale_steps s on s.plan = sp.plan
    join public.sale_step_tasks t on t.step_id = s.id and t.code = 'offer_analysed'
   where sp.property_id = v_property;
  if v_task is null then
    raise exception 'the sale of this property has no such task' using errcode = 'P0002';
  end if;
  select st.done_at into v_done_at
    from public.sale_task_status st
   where st.property_id = v_property and st.task_id = v_task
     for update;
  if v_done_at is not null then
    raise exception 'already analysed' using errcode = '22023';
  end if;
  insert into public.sale_task_status (property_id, task_id, done_at, done_by)
  values (v_property, v_task, now(), auth.uid())
  on conflict (property_id, task_id) do update
    set done_at = excluded.done_at, done_by = excluded.done_by
    where public.sale_task_status.done_at is null
  returning done_at into v_done_at;
  -- Ticked by another call in between (no row was there to lock): once only.
  if v_done_at is null then
    raise exception 'already analysed' using errcode = '22023';
  end if;
  perform public.audit('offer.analysed', 'offer', p_offer,
    jsonb_build_object('property_id', v_property));
  return v_done_at;
end;
$$;

-- 3. ---------------------------------------------------------------------------
create or replace function public.offer_events_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
  l public.listings;
  p public.properties;
  info jsonb;
  link text;
  thread text;
  v_admin uuid;
begin
  if new.event not in ('submitted', 'viewed', 'accepted', 'declined',
                       'withdrawn', 'expired', 'precontract_recorded') then
    return null;
  end if;
  select * into o from public.offers where id = new.offer_id;
  select * into l from public.listings where id = o.listing_id;
  select * into p from public.properties where id = l.property_id;

  if new.event = 'precontract_recorded' then
    -- The task of the sale, ticked once (a task done stays done); the step
    -- follows (sale_task_status_refresh).
    insert into public.sale_task_status (property_id, task_id, done_at)
    select sp.property_id, t.id, now()
      from public.sale_progress sp
      join public.sale_steps s on s.plan = sp.plan
      join public.sale_step_tasks t on t.step_id = s.id and t.code = 'precontract_signed'
     where sp.property_id = p.id
    on conflict (property_id, task_id) do update
      set done_at = excluded.done_at
      where public.sale_task_status.done_at is null;
    return null;
  end if;

  link := '/offres/' || o.id;
  thread := 'offer:' || o.id;
  info := jsonb_build_object(
    'entity_id', o.id,
    'offer_id', o.id,
    'reference', o.reference,
    'listing_id', l.id,
    'property_id', p.id,
    'title', l.title,
    'city', p.city,
    'price_cents', o.price_cents);

  if new.event = 'submitted' then
    -- The seller: bell and email (SPEC 18: amount, gap, financing status, no PDF).
    perform public.notification_add(
      o.seller_id, 'offer.received',
      info || jsonb_build_object(
        'asking_price_cents', (o.property_snapshot->>'asking_price_cents')::bigint,
        'financing_status', o.financing_status_at_submit,
        'buyer_first_name', o.buyer_identity->>'first_name',
        'validity_until', o.validity_until),
      link, thread, now());
    perform public.sale_emit_event(p.id, 'offer.submitted');
    perform public.offer_notice(
      o, o.buyer_id,
      format('Offre d''achat %s envoyée au vendeur : %s.', o.reference,
             public.offer_amount_label(o.price_cents)),
      'offer_submitted');
  elsif new.event = 'viewed' then
    -- The buyer, in the bell only.
    perform public.notification_add(o.buyer_id, 'offer.viewed', info, link, thread);
  elsif new.event = 'withdrawn' then
    -- The seller: bell and email, with the date and the time of the withdrawal.
    perform public.notification_add(
      o.seller_id, 'offer.withdrawn',
      info || jsonb_build_object(
        'buyer_first_name', o.buyer_identity->>'first_name',
        'withdrawn_at', o.withdrawn_at),
      link, thread || ':withdrawn', now());
    perform public.offer_notice(
      o, o.buyer_id,
      format('Offre d''achat %s retirée par l''acquéreur.', o.reference),
      'offer_withdrawn');
  elsif new.event = 'expired' then
    -- Its buyer and its seller: bell and email.
    perform public.notification_add(
      o.buyer_id, 'offer.expired',
      info || jsonb_build_object('role', 'buyer', 'expired_at', o.expired_at),
      link, thread || ':expired', now());
    perform public.notification_add(
      o.seller_id, 'offer.expired',
      info || jsonb_build_object('role', 'seller', 'expired_at', o.expired_at,
                                 'buyer_first_name', o.buyer_identity->>'first_name'),
      link, thread || ':expired', now());
  else
    -- Accepted or declined: the buyer, bell and email, with the message of the seller.
    perform public.notification_add(
      o.buyer_id, 'offer.answered',
      jsonb_strip_nulls(info || jsonb_build_object(
        'accepted', new.event = 'accepted',
        'message', new.meta->>'message')),
      link, thread, now());
    if new.event = 'accepted' then
      perform public.sale_emit_event(p.id, 'offer.accepted');
      -- The team, when the plan of the sale includes an adviser (L2-07): the
      -- sheet of the offer in the back office. One group for the team: its
      -- emails leave together.
      if exists (select 1 from public.plan_entitlements e
                  where e.plan = public.property_current_plan(p.id)
                    and e.feature = 'advisor') then
        -- Telling the team never undoes the answer of the seller.
        begin
          for v_admin in
            select a.id from public.profiles a
             where 'admin' = any(a.roles) and a.deleted_at is null and a.suspended_at is null
               and a.id not in (o.seller_id, o.buyer_id)
          loop
            perform public.notification_add(
              v_admin, 'offer.accepted_team',
              info || jsonb_build_object(
                'listing_reference', l.reference,
                'plan', public.property_current_plan(p.id),
                'asking_price_cents', (o.property_snapshot->>'asking_price_cents')::bigint),
              '/admin/offres/' || o.id, 'offers:accepted', now());
          end loop;
        exception when others then
          raise warning 'offer.accepted_team not sent for offer %: %', o.id, sqlerrm;
        end;
      end if;
    end if;
    perform public.offer_notice(
      o, o.seller_id,
      format(case when new.event = 'accepted' then 'Offre d''achat %s acceptée par le vendeur.'
                  else 'Offre d''achat %s refusée par le vendeur.' end, o.reference),
      'offer_' || new.event);
  end if;
  return null;
end;
$$;

-- 4. ---------------------------------------------------------------------------
-- As in L2-04b, plus the right of the plan when the team types the dates.
create or replace function public.offer_record_precontract(
  p_offer_id uuid, p_signed_at date, p_withdrawal_start date default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
begin
  select * into o from public.offers where id = p_offer_id
     and (seller_id = auth.uid() or public.is_admin()) for update;
  if not found or not public.is_active_user() then
    raise exception 'offer not found' using errcode = '42501';
  end if;
  -- The team, in the place of the seller: a right of the plan in force,
  -- never a plan name.
  if o.seller_id <> auth.uid() and not exists (
    select 1 from public.listings l
      join public.plan_entitlements e
        on e.plan = public.property_current_plan(l.property_id)
     where l.id = o.listing_id and e.feature = 'notary_coordination') then
    raise exception 'the plan of this sale has no avant-contrat recorded by the team'
      using errcode = '42501';
  end if;
  if o.status <> 'accepted' then
    perform public.offer_bad_transition(o.status, 'record the avant-contrat of');
  end if;
  if p_signed_at is null or p_signed_at > (now() at time zone 'Europe/Paris')::date
     or p_signed_at < (o.answered_at at time zone 'Europe/Paris')::date then
    raise exception 'the date of the avant-contrat is not valid' using errcode = '22023';
  end if;
  if p_withdrawal_start is not null
     and (p_withdrawal_start < p_signed_at
          or p_withdrawal_start > (now() at time zone 'Europe/Paris')::date) then
    raise exception 'the withdrawal period starts from the avant-contrat to today'
      using errcode = '22023';
  end if;
  update public.offers
     set precontract_signed_at = p_signed_at, withdrawal_period_start = p_withdrawal_start
   where id = o.id;
  perform public.offer_event(o.id, 'precontract_recorded',
    jsonb_build_object('signed_at', p_signed_at, 'withdrawal_start', p_withdrawal_start));
  if public.is_admin() and o.seller_id <> auth.uid() then
    perform public.audit('offer.precontract', 'offer', o.id,
      jsonb_build_object('signed_at', p_signed_at, 'withdrawal_start', p_withdrawal_start));
  end if;
end;
$$;

revoke execute on function public.admin_offers(text, text, uuid, int) from public, anon;
grant execute on function public.admin_offers(text, text, uuid, int) to authenticated;
revoke execute on function public.admin_offer_counts() from public, anon;
grant execute on function public.admin_offer_counts() to authenticated;
revoke execute on function public.admin_offer_mark_analysed(uuid) from public, anon;
grant execute on function public.admin_offer_mark_analysed(uuid) to authenticated;
revoke execute on function public.offer_events_notify() from public, anon, authenticated;
