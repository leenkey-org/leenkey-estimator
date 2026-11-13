-- L2-04a: an offer received by its seller (SPEC-V2 10 and 13). What the
-- database holds of it: the view of the seller says the type of the proof of
-- financing of the offer and when Leenkey checked it; the seller is told when
-- an offer comes (offer.received, bell and email), the buyer when it is read
-- (offer.viewed, bell only) and answered (offer.answered, bell and email);
-- the listing conversation of the two says it too (a notice, created with
-- the offer when they never wrote to each other); the tasks « Offre reçue »
-- and « Offre acceptée » of the sale are ticked.
--
-- Not here (L2-04b): the withdrawal, the expiry and their notices.
--
-- Choices (DECISIONS.md 2026-11-13, L2-04a):
-- - the events are read from the journal (`offer_events`): it holds the
--   message of the seller, written after the status;
-- - the notices never stop an offer, and the limits of the messaging (20
--   messages an hour, 5 new conversations a day) do not count for them: a
--   seller must always find the conversation of an offer (« Discuter avec
--   l'acquéreur »); an offer is not a way to write without limit, its notice
--   is written by the database, one per event;
-- - no new offer of a buyer on a listing once one of theirs is accepted, even
--   when the acceptance and the sending cross (checked again when the offer
--   is sent, after the lock);
-- - a buyer who sent an offer is a buyer « in relation » with the seller
--   (has_buyer_relation), as one who wrote: the seller reads their
--   financing status (SPEC 5, « contacté ou fait une offre »).

-- ---------------------------------------------------------------------------
-- The view of the seller, with the proof of financing of the offer: its
-- type and the date of its check, never the file (SPEC 13, « Justificatif
-- financement »), and the property of the listing (for the links).
-- ---------------------------------------------------------------------------
create or replace view public.offer_for_seller with (security_barrier = true) as
select
  o.id, o.reference, o.version, o.listing_id, o.buyer_id, o.seller_id,
  public.offer_identity_for_seller(o.buyer_identity, o.status = 'accepted') as buyer_identity,
  case when o.status = 'accepted' then o.co_buyers
       else coalesce((select jsonb_agg(public.offer_identity_for_seller(c, false))
                        from jsonb_array_elements(o.co_buyers) c), '[]'::jsonb)
  end as co_buyers,
  o.acquisition_mode, o.acquisition_mode_other,
  case when o.status = 'accepted' then o.sci_details
       else jsonb_strip_nulls(jsonb_build_object('name', o.sci_details->'name',
                                                 'status', o.sci_details->'status'))
  end as sci_details,
  o.property_snapshot, o.price_cents, o.price_in_words,
  o.financing_mode, o.down_payment_cents, o.loan_amount_cents, o.loan_duration_years,
  o.loan_rate_max_pct, o.lender_name, o.financing_progress, o.financing_progress_other,
  o.financing_status_at_submit,
  o.condition_prior_sale, o.condition_authorization, o.condition_other, o.conditions_details,
  o.validity_until, o.visited, o.declarations, o.message,
  case when o.status in ('submitted', 'viewed') and o.validity_until <= now()
       then 'expired'::public.offer_status else o.status end as status,
  o.synthesis,
  case when o.status = 'accepted' then o.pdf_path end as pdf_path,
  o.superseded_by, o.submitted_at, o.viewed_at, o.answered_at, o.withdrawn_at,
  coalesce(o.expired_at, case when o.status in ('submitted', 'viewed') and o.validity_until <= now()
                              then o.validity_until end) as expired_at,
  o.seller_acceptance, o.precontract_signed_at, o.withdrawal_period_start, o.created_at,
  (select d.type from public.financing_documents d where d.id = o.financing_document_id)
    as financing_document_type,
  (select d.checked_at from public.financing_documents d where d.id = o.financing_document_id)
    as financing_checked_at,
  (select l.property_id from public.listings l where l.id = o.listing_id) as property_id
from public.offers o
where o.seller_id = auth.uid() and o.status <> 'draft';

-- ---------------------------------------------------------------------------
-- In relation: a buyer who wrote about the property, or who sent an offer on
-- it (buyer_summary_for_seller reads this).
-- ---------------------------------------------------------------------------
create or replace function public.has_buyer_relation(p uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c
                 where c.property_id = p and c.kind = 'listing' and c.buyer_id = b)
      or exists (select 1 from public.offers o
                   join public.listings l on l.id = o.listing_id
                  where l.property_id = p and o.buyer_id = b and o.status <> 'draft');
$$;
-- Read by buyer_summary_for_seller only, which checks the owner: no account
-- needs to ask it directly (it would say who wrote or made an offer on any
-- property).
revoke execute on function public.has_buyer_relation(uuid, uuid) from authenticated;

-- ---------------------------------------------------------------------------
-- No new offer of a buyer on a listing once one of theirs is accepted
-- (offer_can_draft), even when the two cross: offer_submit waits for the
-- answer of the seller on the offer in progress, then sends; checked here,
-- at the sending itself.
-- ---------------------------------------------------------------------------
create function public.offers_no_offer_after_acceptance() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'draft' and new.status = 'submitted'
     and exists (select 1 from public.offers
                  where listing_id = new.listing_id and buyer_id = new.buyer_id
                    and status = 'accepted') then
    raise exception 'an offer of this buyer is already accepted on this listing'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger offers_no_offer_after_acceptance before update of status on public.offers
  for each row execute function public.offers_no_offer_after_acceptance();

-- ---------------------------------------------------------------------------
-- The limits of the messaging do not count for the notices of an offer: a
-- notice is written by the database (a client cannot write its kind), one per
-- event of an offer; its conversation is created under a flag only
-- offer_notice sets, for the time of its insert.
-- ---------------------------------------------------------------------------
create or replace function public.messages_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_admin() or new.kind = 'offer_notice' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('messages_rate_limit:' || new.sender_id::text, 0));
  if (select count(*) from public.messages
       where sender_id = new.sender_id and kind <> 'offer_notice'
         and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'messages_per_hour' using errcode = '54000';
  end if;
  return new;
end;
$$;

create or replace function public.conversations_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind <> 'listing' or auth.uid() is null or public.is_admin()
     or coalesce(current_setting('leenkey.offer_notice', true), '') = 'on' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('conversations_rate_limit:' || new.buyer_id::text, 0));
  if (select count(*) from public.conversations
       where kind = 'listing' and buyer_id = new.buyer_id
         and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'conversations_per_day' using errcode = '54000';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- « 338 000 € », for the notices of the conversation.
-- ---------------------------------------------------------------------------
create function public.offer_amount_label(p_cents bigint) returns text
language sql immutable set search_path = '' as $$
  select translate(to_char(p_cents / 100, 'FM999,999,999,999'), ',', chr(160)) || chr(160) || '€';
$$;

-- ---------------------------------------------------------------------------
-- A notice of the offer in the listing conversation of its seller and its
-- buyer, created when they never wrote to each other. Never stops the offer:
-- should the messaging refuse it for any reason, the notice is skipped (and
-- said in the log of the database), the offer goes on.
-- ---------------------------------------------------------------------------
create function public.offer_notice(p_offer public.offers, p_sender uuid, p_body text, p_type text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  conv uuid;
begin
  select id into conv from public.conversations
   where kind = 'listing' and listing_id = p_offer.listing_id and buyer_id = p_offer.buyer_id;
  if conv is null then
    -- Not one of the five conversations a buyer may open in a day.
    perform set_config('leenkey.offer_notice', 'on', true);
    insert into public.conversations (kind, property_id, listing_id, seller_id, buyer_id)
    select 'listing', l.property_id, l.id, p_offer.seller_id, p_offer.buyer_id
      from public.listings l where l.id = p_offer.listing_id
    returning id into conv;
    perform set_config('leenkey.offer_notice', 'off', true);
  end if;
  if conv is null then
    return;
  end if;
  insert into public.messages (conversation_id, sender_id, body, kind, meta)
  values (conv, p_sender, p_body, 'offer_notice',
          jsonb_build_object('type', p_type, 'offer_id', p_offer.id));
exception when others then
  perform set_config('leenkey.offer_notice', 'off', true);
  raise warning 'offer notice skipped for offer %: %', p_offer.id, sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- What follows an event of the journal of an offer.
-- ---------------------------------------------------------------------------
create function public.offer_events_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
  l public.listings;
  p public.properties;
  info jsonb;
  link text;
  thread text;
begin
  if new.event not in ('submitted', 'viewed', 'accepted', 'declined') then
    return null;
  end if;
  select * into o from public.offers where id = new.offer_id;
  select * into l from public.listings where id = o.listing_id;
  select * into p from public.properties where id = l.property_id;
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

create trigger offer_events_notify after insert on public.offer_events
  for each row execute function public.offer_events_notify();

revoke execute on function public.offer_amount_label(bigint) from public, anon, authenticated;
revoke execute on function public.offer_notice(public.offers, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.offer_events_notify() from public, anon, authenticated;
revoke execute on function public.offers_no_offer_after_acceptance() from public, anon, authenticated;
