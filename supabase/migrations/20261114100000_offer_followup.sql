-- L2-04b: what follows an offer for its buyer (SPEC-V2 10, 13 and 19). The
-- transitions exist since L2-01 (offer_withdraw, offer_record_precontract,
-- offers_expire_due); here, what they tell:
-- - a withdrawal: the seller is told (offer.withdrawn, bell and email), the
--   listing conversation says it;
-- - an expiry: the buyer and the seller are told (offer.expired, bell and
--   email), whoever writes it (the cron, or the first act on an offer past
--   its validity);
-- - the avant-contrat recorded: the task « Avant-contrat signé » of the sale
--   is ticked (SPEC 9: « vendeur ou Leenkey, saisie de la date »). The task
--   stays one a seller ticks by hand: a sale whose offer was not made on
--   Leenkey has it too;
-- - the cron: offers past their validity are expired every hour, a few
--   minutes after it (a validity ends on a full hour). SPEC 19 said once a
--   day at 5:00 UTC: an offer would read « expired » on the screens (computed
--   at read) up to a day before its buyer and its seller are told
--   (DECISIONS.md 2026-11-13, L2-04b);
-- - the day an avant-contrat was notified or handed to the buyer is never
--   after today: an indicative end of the withdrawal period is read from it.
--
-- A withdrawal and an expiry have their own group of emails: in the group of
-- « offer received », an offer withdrawn within minutes would leave as one
-- email « offer received » (the emails of a group leave together, under the
-- type of the first one).
--
-- No table, no policy: the journal of an offer is the only source.

create or replace function public.offer_events_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
  l public.listings;
  p public.properties;
  info jsonb;
  link text;
  thread text;
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

revoke execute on function public.offer_events_notify() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The avant-contrat of an offer accepted (L2-01), with one more check: the
-- day it was notified or handed to the buyer is not in the future (a typing
-- slip on the year would show the buyer a withdrawal period a year long).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- The cron (SPEC 19, DECISIONS.md 2026-10-08: pg_cron, not Vercel Cron): in
-- the database itself, no route, no secret. Where pg_cron is not installed
-- (the local stack, the CI), nothing is scheduled: the screens compute the
-- expiry at read, and the first act on an offer past its validity writes it.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'expire-offers';
    perform cron.schedule('expire-offers', '4 * * * *', $job$select public.offers_expire_due()$job$);
  end if;
end;
$$;
