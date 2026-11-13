-- L2-01: the purchase offer (SPEC-V2 4 « Offres » and 13, model of Cédric of
-- 2026-10-05): the table `offers`, its journal `offer_events`, the reference
-- LK-AAAA-NNNNN and the version, the transitions (send, read by the seller,
-- accept or decline, withdraw, expire, avant-contrat), the freeze of an offer
-- sent (trigger `offers_freeze_after_submit`, never disabled), the view of
-- the seller `offer_for_seller` (personal data hidden before acceptance), RLS.
--
-- Not here: the form, the PDF, the synthesis, the notifications and the
-- message in the conversation (L2-03, L2-04), the financing documents and
-- the foreign key of `financing_document_id` (L2-02).
--
-- Choices (DECISIONS.md 2026-11-13, L2-01):
-- - a draft is saved at each step of the form: price, words of the price,
--   financing mode, validity and visit may be empty in a draft, required to
--   send (check `offers_complete_when_sent` and `offer_submit`);
-- - `buyer_identity` and each co-buyer: { last_name, first_name, birth_date,
--   address: { line, postal_code, city }, email, phone }; the seller reads the
--   names and the town before acceptance, the rest after;
-- - the reference comes from one sequence (LK-2026-00001, LK-2026-00002…),
--   the year being that of the draft;
-- - a new version of an offer (« Faire une nouvelle offre ») is a new draft of
--   the same buyer on the same listing; when it is sent, the offer in progress
--   is superseded and points to it (`superseded_by`);
-- - an offer is expired as soon as `validity_until` is past (DECISIONS
--   2026-10-08): each function checks it, the view of the seller shows it,
--   the cron only writes the status.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create sequence public.offer_reference_seq;

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^LK-[0-9]{4}-[0-9]{5,}$'),
  version int not null default 1 check (version >= 1),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),

  -- 1. The buyer (frozen once sent, never read again from the profile)
  buyer_identity jsonb not null default '{}' check (jsonb_typeof(buyer_identity) = 'object'),
  co_buyers jsonb not null default '[]'
    check (jsonb_typeof(co_buyers) = 'array' and jsonb_array_length(co_buyers) <= 3),
  acquisition_mode public.acquisition_mode not null default 'own_name',
  acquisition_mode_other text check (char_length(acquisition_mode_other) <= 200),
  sci_details jsonb check (sci_details is null or jsonb_typeof(sci_details) = 'object'),

  -- 2. The property (photographed from the listing when sent)
  property_snapshot jsonb not null default '{}' check (jsonb_typeof(property_snapshot) = 'object'),

  -- 3. The price
  price_cents bigint check (price_cents > 0),
  price_in_words text check (char_length(price_in_words) <= 300),

  -- 4. The financing declared
  financing_mode public.financing_mode,
  down_payment_cents bigint not null default 0 check (down_payment_cents >= 0),
  loan_amount_cents bigint not null default 0 check (loan_amount_cents >= 0),
  loan_duration_years int check (loan_duration_years between 1 and 40),
  loan_rate_max_pct numeric(4, 2) check (loan_rate_max_pct >= 0 and loan_rate_max_pct < 100),
  lender_name text check (char_length(lender_name) <= 120),
  financing_progress public.financing_progress,
  financing_progress_other text check (char_length(financing_progress_other) <= 200),
  financing_document_id uuid,                    -- FK to financing_documents(id), added in L2-02
  financing_status_at_submit public.financing_status,

  -- 5. Conditions (boxes and details, no free clause)
  condition_prior_sale boolean not null default false,
  condition_authorization boolean not null default false,
  condition_other boolean not null default false,
  conditions_details text check (char_length(conditions_details) <= 500),

  -- 6. Validity
  validity_until timestamptz,

  -- 7. Declarations
  visited boolean,
  declarations jsonb not null default '{}' check (jsonb_typeof(declarations) = 'object'),

  message text check (char_length(message) <= 1000),
  status public.offer_status not null default 'draft',
  synthesis jsonb,
  pdf_path text,
  superseded_by uuid references public.offers(id),

  submitted_at timestamptz, viewed_at timestamptz, answered_at timestamptz,
  withdrawn_at timestamptz, expired_at timestamptz,
  seller_acceptance jsonb,
  precontract_signed_at date,
  withdrawal_period_start date,
  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint offers_complete_when_sent check (
    status = 'draft'
    or (price_cents is not null and price_in_words is not null and financing_mode is not null
        and validity_until is not null and visited is not null and submitted_at is not null)
  ),
  constraint offers_buyer_not_seller check (buyer_id <> seller_id),
  constraint offers_withdrawal_after_precontract check (
    withdrawal_period_start is null
    or (precontract_signed_at is not null and withdrawal_period_start >= precontract_signed_at)
  )
);
create index offers_listing_idx on public.offers (listing_id, created_at desc);
create index offers_buyer_idx on public.offers (buyer_id, created_at desc);
create index offers_seller_idx on public.offers (seller_id, created_at desc);
create index offers_due_idx on public.offers (validity_until) where status in ('submitted', 'viewed');
create index offers_superseded_by_idx on public.offers (superseded_by) where superseded_by is not null;
-- One draft, and one offer in progress, per buyer and listing.
create unique index offers_one_draft_idx on public.offers (buyer_id, listing_id) where status = 'draft';
create unique index offers_one_in_progress_idx on public.offers (buyer_id, listing_id)
  where status in ('submitted', 'viewed');

create table public.offer_events (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.offers(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event text not null check (event in ('created', 'submitted', 'viewed', 'accepted', 'declined',
                                       'withdrawn', 'expired', 'superseded', 'pdf_generated',
                                       'precontract_recorded')),
  meta jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index offer_events_offer_idx on public.offer_events (offer_id, id);
create index offer_events_actor_idx on public.offer_events (actor_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.offer_event(p_offer uuid, p_event text, p_meta jsonb default null)
returns void
language sql security definer set search_path = '' as $$
  insert into public.offer_events (offer_id, actor_id, event, meta)
  values (p_offer, auth.uid(), p_event, p_meta);
$$;

-- Can the session draft an offer on this listing (SPEC 13, prerequisites)?
-- A buyer account, active, its financing at least declared, a listing online
-- that is not its own. One offer in progress does not prevent a draft: that is
-- « Faire une nouvelle offre », which supersedes it when sent.
create function public.offer_can_draft(p_listing uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user()
     and exists (select 1 from public.profiles where id = auth.uid() and 'buyer' = any(roles))
     and exists (select 1 from public.buyer_profiles
                  where profile_id = auth.uid() and financing_status <> 'not_provided')
     and exists (select 1 from public.listings l join public.properties p on p.id = l.property_id
                  where l.id = p_listing and l.status = 'published' and l.deleted_at is null
                    and p.owner_id <> auth.uid());
$$;

-- A new draft: its reference, its version, its seller (never chosen by the
-- client), its journal.
create function public.offers_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.reference := 'LK-' || to_char(now() at time zone 'Europe/Paris', 'YYYY') || '-'
                   || lpad(nextval('public.offer_reference_seq')::text, 5, '0');
  new.version := 1 + coalesce((select max(version) from public.offers
                                where buyer_id = new.buyer_id and listing_id = new.listing_id), 0);
  new.seller_id := (select p.owner_id from public.listings l
                      join public.properties p on p.id = l.property_id
                     where l.id = new.listing_id);
  new.status := 'draft';
  new.submitted_at := null;
  return new;
end;
$$;

create trigger offers_before_insert before insert on public.offers
  for each row execute function public.offers_before_insert();

create function public.offers_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.offer_event(new.id, 'created', jsonb_build_object('version', new.version));
  return null;
end;
$$;

create trigger offers_after_insert after insert on public.offers
  for each row execute function public.offers_after_insert();

create trigger offers_set_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The freeze (SPEC 4): once sent, the content of an offer never changes, and
-- an offer sent is never deleted. Only the status and its dates change, and
-- the PDF and the synthesis are written once.
-- ---------------------------------------------------------------------------
create function public.offers_freeze_after_submit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.submitted_at is not null then
      raise exception 'an offer sent is never deleted' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.submitted_at is null then
    return new;
  end if;
  if (new.reference, new.version, new.listing_id, new.buyer_id, new.seller_id,
      new.buyer_identity, new.co_buyers, new.acquisition_mode, new.acquisition_mode_other,
      new.sci_details, new.property_snapshot, new.price_cents, new.price_in_words,
      new.financing_mode, new.down_payment_cents, new.loan_amount_cents, new.loan_duration_years,
      new.loan_rate_max_pct, new.lender_name, new.financing_progress, new.financing_progress_other,
      new.financing_document_id, new.financing_status_at_submit, new.condition_prior_sale,
      new.condition_authorization, new.condition_other, new.conditions_details,
      new.validity_until, new.visited, new.declarations, new.message, new.submitted_at,
      new.created_at)
     is distinct from
     (old.reference, old.version, old.listing_id, old.buyer_id, old.seller_id,
      old.buyer_identity, old.co_buyers, old.acquisition_mode, old.acquisition_mode_other,
      old.sci_details, old.property_snapshot, old.price_cents, old.price_in_words,
      old.financing_mode, old.down_payment_cents, old.loan_amount_cents, old.loan_duration_years,
      old.loan_rate_max_pct, old.lender_name, old.financing_progress, old.financing_progress_other,
      old.financing_document_id, old.financing_status_at_submit, old.condition_prior_sale,
      old.condition_authorization, old.condition_other, old.conditions_details,
      old.validity_until, old.visited, old.declarations, old.message, old.submitted_at,
      old.created_at)
     or (old.pdf_path is not null and new.pdf_path is distinct from old.pdf_path)
     or (old.synthesis is not null and new.synthesis is distinct from old.synthesis)
     or new.status = 'draft'
  then
    raise exception 'an offer sent cannot be changed: make a new offer' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger offers_freeze_after_submit before update or delete on public.offers
  for each row execute function public.offers_freeze_after_submit();

-- ---------------------------------------------------------------------------
-- Transitions (security definer, called from the server actions)
-- ---------------------------------------------------------------------------
-- An offer whose validity is past is expired (DECISIONS 2026-10-08): written
-- when a function meets it. Returns the offer as it is now.
create function public.offer_expire_if_due(p_offer public.offers) returns public.offers
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers := p_offer;
begin
  if o.status in ('submitted', 'viewed') and o.validity_until <= now() then
    update public.offers set status = 'expired', expired_at = o.validity_until
     where id = o.id returning * into o;
    perform public.offer_event(o.id, 'expired');
  end if;
  return o;
end;
$$;

create function public.offer_bad_transition(p_status public.offer_status, p_action text)
returns void
language plpgsql set search_path = '' as $$
begin
  raise exception 'cannot % an offer %', p_action, p_status using errcode = '22023';
end;
$$;

-- Send (SPEC 13, step 7): one transaction; the photographs of the property
-- and of the financing status, the declarations dated, the offer in progress
-- of the same buyer on the listing superseded. The PDF, the synthesis and the
-- notices follow in the server action (L2-03, L2-04).
create function public.offer_submit(p_offer_id uuid) returns public.offer_status
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
  l public.listings;
  p public.properties;
  previous uuid;
  identity_ok boolean;
begin
  select * into o from public.offers where id = p_offer_id and buyer_id = auth.uid() for update;
  if not found or not public.is_active_user() then
    raise exception 'offer not found' using errcode = '42501';
  end if;
  if o.status <> 'draft' then
    perform public.offer_bad_transition(o.status, 'send');
  end if;
  if not public.offer_can_draft(o.listing_id) then
    raise exception 'this offer can no longer be sent' using errcode = '42501';
  end if;

  -- What the form must have filled (the server action checks it first).
  identity_ok := coalesce(btrim(o.buyer_identity->>'last_name'), '') <> ''
             and coalesce(btrim(o.buyer_identity->>'first_name'), '') <> ''
             and coalesce(btrim(o.buyer_identity->>'birth_date'), '') <> ''
             and coalesce(btrim(o.buyer_identity#>>'{address,line}'), '') <> ''
             and coalesce(btrim(o.buyer_identity#>>'{address,postal_code}'), '') <> ''
             and coalesce(btrim(o.buyer_identity#>>'{address,city}'), '') <> ''
             and coalesce(btrim(o.buyer_identity->>'email'), '') <> ''
             and coalesce(btrim(o.buyer_identity->>'phone'), '') <> '';
  if not identity_ok
     or o.price_cents is null or coalesce(btrim(o.price_in_words), '') = ''
     or o.financing_mode is null or o.visited is null or o.validity_until is null
     or (o.acquisition_mode = 'other' and coalesce(btrim(o.acquisition_mode_other), '') = '')
     or (o.acquisition_mode = 'sci' and (
           coalesce(btrim(o.sci_details->>'name'), '') = ''
           or coalesce(o.sci_details->>'status', '') not in ('registered', 'in_formation')
           or (o.sci_details->>'status' = 'registered'
               and coalesce(o.sci_details->>'siren', '') !~ '^[0-9]{9}$')))
     or (o.financing_mode = 'loan' and o.loan_amount_cents <= 0)
     or (o.financing_progress = 'other' and coalesce(btrim(o.financing_progress_other), '') = '')
     or not coalesce((o.declarations->>'accuracy')::boolean, false)
     or not coalesce((o.declarations->>'price_and_financing_checked')::boolean, false)
     or not coalesce((o.declarations->>'legal_effects_understood')::boolean, false)
     or not coalesce((o.declarations->>'info_read')::boolean, false)
  then
    raise exception 'the offer is incomplete' using errcode = '22023';
  end if;
  -- From 2 to 10 days (decision of Cédric of 2026-10-01), an hour of margin
  -- for the time between the last step and the sending.
  if o.validity_until < now() + interval '2 days' - interval '1 hour'
     or o.validity_until > now() + interval '10 days' + interval '1 hour' then
    raise exception 'the validity of the offer must be from 2 to 10 days' using errcode = '22023';
  end if;

  select * into l from public.listings where id = o.listing_id;
  select * into p from public.properties where id = l.property_id;

  -- The offer in progress of the same buyer on the listing gives way to this one.
  select id into previous from public.offers
   where buyer_id = o.buyer_id and listing_id = o.listing_id and status in ('submitted', 'viewed')
   for update;
  if previous is not null then
    update public.offers set status = 'superseded', superseded_by = o.id where id = previous;
    perform public.offer_event(previous, 'superseded', jsonb_build_object('by', o.id));
  end if;

  update public.offers
     set status = 'submitted',
         submitted_at = now(),
         property_snapshot = jsonb_build_object(
           'listing_reference', l.reference,
           'title', l.title,
           'address', jsonb_build_object('line', p.address_line, 'postal_code', p.postal_code,
                                         'city', p.city),
           'type', p.type,
           'surface_m2', p.surface_m2,
           'rooms', p.rooms,
           'annexes', to_jsonb(array_remove(array[
             case when p.has_parking then 'parking' end,
             case when p.has_cellar then 'cellar' end,
             case when p.has_garden then 'garden' end,
             case when p.has_balcony then 'balcony' end,
             case when p.has_terrace then 'terrace' end], null)),
           'asking_price_cents', l.price_cents),
         financing_status_at_submit = (select financing_status from public.buyer_profiles
                                        where profile_id = o.buyer_id),
         declarations = o.declarations || jsonb_build_object('accepted_at', now())
   where id = o.id;
  perform public.offer_event(o.id, 'submitted',
                             case when previous is not null then jsonb_build_object('supersedes', previous) end);
  return 'submitted';
end;
$$;

-- The seller opens the offer for the first time (« Consultée »).
create function public.offer_mark_viewed(p_offer_id uuid) returns public.offer_status
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
begin
  select * into o from public.offers where id = p_offer_id and seller_id = auth.uid() for update;
  if not found or o.status = 'draft' or not public.is_active_user() then
    raise exception 'offer not found' using errcode = '42501';
  end if;
  o := public.offer_expire_if_due(o);
  if o.status = 'submitted' then
    update public.offers set status = 'viewed', viewed_at = now() where id = o.id;
    perform public.offer_event(o.id, 'viewed');
    return 'viewed';
  end if;
  return o.status;
end;
$$;

-- Accept (never in one click: the seller confirms having read it all) or
-- decline, with an optional message. Refused when the offer is expired,
-- withdrawn or superseded at the moment of the click.
create function public.offer_answer(
  p_offer_id uuid, p_accept boolean, p_confirmed_read boolean default false,
  p_message text default null
) returns public.offer_status
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
  next_status public.offer_status := case when p_accept then 'accepted' else 'declined' end;
begin
  select * into o from public.offers where id = p_offer_id and seller_id = auth.uid() for update;
  if not found or o.status = 'draft' or not public.is_active_user() then
    raise exception 'offer not found' using errcode = '42501';
  end if;
  o := public.offer_expire_if_due(o);
  if o.status not in ('submitted', 'viewed') then
    perform public.offer_bad_transition(o.status, case when p_accept then 'accept' else 'decline' end);
  end if;
  if p_accept and not coalesce(p_confirmed_read, false) then
    raise exception 'the seller must confirm having read the whole offer' using errcode = '22023';
  end if;
  if char_length(p_message) > 1000 then
    raise exception 'the message is too long' using errcode = '22023';
  end if;
  update public.offers
     set status = next_status,
         answered_at = now(),
         viewed_at = coalesce(viewed_at, now()),
         seller_acceptance = case when p_accept
           then jsonb_build_object('confirmed_read', true, 'confirmed_at', now()) end
   where id = o.id;
  perform public.offer_event(o.id, next_status::text,
    case when nullif(btrim(p_message), '') is not null
         then jsonb_build_object('message', btrim(p_message)) end);
  return next_status;
end;
$$;

-- The buyer withdraws an offer sent and not yet answered.
create function public.offer_withdraw(p_offer_id uuid) returns public.offer_status
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
begin
  select * into o from public.offers where id = p_offer_id and buyer_id = auth.uid() for update;
  if not found or not public.is_active_user() then
    raise exception 'offer not found' using errcode = '42501';
  end if;
  o := public.offer_expire_if_due(o);
  if o.status not in ('submitted', 'viewed') then
    perform public.offer_bad_transition(o.status, 'withdraw');
  end if;
  update public.offers set status = 'withdrawn', withdrawn_at = now() where id = o.id;
  perform public.offer_event(o.id, 'withdrawn');
  return 'withdrawn';
end;
$$;

-- The avant-contrat of an offer accepted (SPEC 13, Q7): its date and, when
-- known, the start of the legal withdrawal period; by the seller or the team.
create function public.offer_record_precontract(
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
  if p_withdrawal_start is not null and p_withdrawal_start < p_signed_at then
    raise exception 'the withdrawal period starts after the avant-contrat' using errcode = '22023';
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

-- The cron (SPEC 19): the offers whose validity is past, expired. Service
-- role only. Returns how many.
create function public.offers_expire_due() returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  with due as (
    update public.offers set status = 'expired', expired_at = validity_until
     where status in ('submitted', 'viewed') and validity_until <= now()
    returning id
  ), logged as (
    insert into public.offer_events (offer_id, event) select id, 'expired' from due returning 1
  )
  select count(*) into n from logged;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: the buyer reads and drafts its offers; the team reads them all; the
-- seller reads only through `offer_for_seller`. Status and dates change only
-- through the functions above.
-- ---------------------------------------------------------------------------
alter table public.offers enable row level security;
alter table public.offer_events enable row level security;

create policy offers_select_buyer_or_admin on public.offers
  for select to authenticated
  using (buyer_id = auth.uid() or public.is_admin());

create policy offers_insert_buyer on public.offers
  for insert to authenticated
  with check (buyer_id = auth.uid() and status = 'draft' and public.offer_can_draft(listing_id));

create policy offers_update_buyer_draft on public.offers
  for update to authenticated
  using (buyer_id = auth.uid() and status = 'draft' and public.is_active_user())
  with check (buyer_id = auth.uid() and status = 'draft');

create policy offers_delete_buyer_draft on public.offers
  for delete to authenticated
  using (buyer_id = auth.uid() and status = 'draft');

-- The journal: the buyer of the offer, its seller once sent, the team. The
-- seller has no read on `offers` itself: the check goes through a function.
create function public.offer_is_party(p_offer uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.offers o
                  where o.id = p_offer
                    and (o.buyer_id = auth.uid() or (o.seller_id = auth.uid() and o.status <> 'draft')));
$$;

create policy offer_events_select on public.offer_events
  for select to authenticated
  using (public.is_admin() or public.offer_is_party(offer_id));

revoke all on public.offers from anon, authenticated;
revoke all on public.offer_events from anon, authenticated;
revoke all on sequence public.offer_reference_seq from anon, authenticated;
grant select, delete on public.offers to authenticated;
grant insert (listing_id, buyer_id, buyer_identity, co_buyers, acquisition_mode, acquisition_mode_other,
              sci_details, price_cents, price_in_words, financing_mode, down_payment_cents,
              loan_amount_cents, loan_duration_years, loan_rate_max_pct, lender_name,
              financing_progress, financing_progress_other, condition_prior_sale,
              condition_authorization, condition_other, conditions_details, validity_until,
              visited, declarations, message)
  on public.offers to authenticated;
grant update (buyer_identity, co_buyers, acquisition_mode, acquisition_mode_other,
              sci_details, price_cents, price_in_words, financing_mode, down_payment_cents,
              loan_amount_cents, loan_duration_years, loan_rate_max_pct, lender_name,
              financing_progress, financing_progress_other, condition_prior_sale,
              condition_authorization, condition_other, conditions_details, validity_until,
              visited, declarations, message)
  on public.offers to authenticated;
grant select on public.offer_events to authenticated;

-- ---------------------------------------------------------------------------
-- The view of the seller (SPEC 7 and 13, validated by Cédric on 2026-10-05):
-- the offers sent on its listings, the status « expired » as soon as the
-- validity is past; before acceptance, the names and the town of the buyers
-- only (no birth date, address, email, phone), no PDF. Owned by the
-- migration role, it filters on the session itself (security barrier).
-- ---------------------------------------------------------------------------
create function public.offer_identity_for_seller(p_identity jsonb, p_full boolean) returns jsonb
language sql immutable set search_path = '' as $$
  select case when p_full or p_identity is null then p_identity
              else jsonb_strip_nulls(jsonb_build_object(
                     'last_name', p_identity->'last_name',
                     'first_name', p_identity->'first_name',
                     'city', p_identity#>'{address,city}'))
         end;
$$;

create view public.offer_for_seller with (security_barrier = true) as
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
  o.seller_acceptance, o.precontract_signed_at, o.withdrawal_period_start, o.created_at
from public.offers o
where o.seller_id = auth.uid() and o.status <> 'draft';

revoke all on public.offer_for_seller from anon, authenticated;
grant select on public.offer_for_seller to authenticated;

-- ---------------------------------------------------------------------------
-- Execute rights
-- ---------------------------------------------------------------------------
revoke execute on function public.offer_event(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.offer_can_draft(uuid) from public, anon;
revoke execute on function public.offer_is_party(uuid) from public, anon;
revoke execute on function public.offers_before_insert() from public, anon, authenticated;
revoke execute on function public.offers_after_insert() from public, anon, authenticated;
revoke execute on function public.offers_freeze_after_submit() from public, anon, authenticated;
revoke execute on function public.offer_expire_if_due(public.offers) from public, anon, authenticated;
revoke execute on function public.offer_bad_transition(public.offer_status, text) from public, anon, authenticated;
revoke execute on function public.offer_submit(uuid) from public, anon;
revoke execute on function public.offer_mark_viewed(uuid) from public, anon;
revoke execute on function public.offer_answer(uuid, boolean, boolean, text) from public, anon;
revoke execute on function public.offer_withdraw(uuid) from public, anon;
revoke execute on function public.offer_record_precontract(uuid, date, date) from public, anon;
revoke execute on function public.offers_expire_due() from public, anon, authenticated;
revoke execute on function public.offer_identity_for_seller(jsonb, boolean) from public, anon;
grant execute on function public.offer_can_draft(uuid) to authenticated;
grant execute on function public.offer_is_party(uuid) to authenticated;
grant execute on function public.offer_submit(uuid) to authenticated;
grant execute on function public.offer_mark_viewed(uuid) to authenticated;
grant execute on function public.offer_answer(uuid, boolean, boolean, text) to authenticated;
grant execute on function public.offer_withdraw(uuid) to authenticated;
grant execute on function public.offer_record_precontract(uuid, date, date) to authenticated;
grant execute on function public.offer_identity_for_seller(jsonb, boolean) to authenticated;
grant execute on function public.offers_expire_due() to service_role;
