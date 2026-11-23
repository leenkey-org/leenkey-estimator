-- Deleting a listing, by its seller or, after a request to bring it into line
-- left unanswered, by the team (requests of Cédric, DECISIONS.md 2026-11-22
-- « Suppression d'une annonce et mise en conformité »).
--
-- 1. listings: the request to bring a listing into line (« mise en
--    conformité »): when it was made, its deadline, its reason (written by
--    the team, read by the seller as the motive of a refusal or a
--    suspension) and when its reminder left. Read by the owner and the team
--    (RLS of listings and its table-wide SELECT grant, unchanged); written
--    only by the functions below (no UPDATE grant on them).
-- 2. listing_delete(listing): the seller deletes their listing and its
--    property, softly (deleted_at): a draft, a listing sent for review,
--    rejected, online or paused. Refused while an offer is accepted (the
--    sale is under way), while offers wait for an answer (the seller answers
--    them first, or they expire), for a suspended listing (only the team acts
--    on it) and for a sold one. The visits to come are cancelled (their
--    buyers told, as a cancellation by the seller); the documents shared
--    with buyers are no longer shared, the requests to read them still
--    waiting are dropped; the conversations stay.
-- 3. listing_compliance_request(listing, reason): the team asks the seller to
--    bring an online, paused or rejected listing into line within
--    listing_compliance_delay() (7 days, the one place of this delay); bell
--    and email to the seller. listing_compliance_clear(listing) lifts it.
-- 4. listings_compliance_remind(): every hour (pg_cron), 2 days before the
--    deadline, a reminder to the seller whose listing has not changed since
--    the request (once: compliance_reminded_at).
-- 5. listing_admin_delete(listing): after the deadline, a listing unchanged
--    since the request is deleted by the team, by hand (never automatically),
--    whatever its status but sold (a suspended one too), with the same
--    refusals for the offers as the seller's deletion; the seller gets a
--    final notice. listing_compliance_changed(listing) says whether the
--    listing changed since the request (the team, and its seller).
--
-- The withdrawal period of a paid plan (L1-40) is checked by the server
-- actions before a deletion (its exact last day is computed in code,
-- leenkey/billing/withdrawal.ts): a deletion waits until the seller has
-- renounced it or the period is over, so that « Renoncer au contrat » stays
-- reachable (DECISIONS.md 2026-11-22).
-- 6. account_anonymize: the reason of the request, written about the closed
--    seller's listing, goes with the other free texts of their listings.
--
-- Every action of the team is written in audit_log (and the seller's
-- deletion too). No enum value, no table, no policy changed.

-- 1. ---------------------------------------------------------------------------
alter table public.listings
  add column compliance_requested_at timestamptz,
  add column compliance_due_at timestamptz,
  add column compliance_reason text check (char_length(compliance_reason) <= 2000),
  add column compliance_reminded_at timestamptz,
  add constraint listings_compliance_whole check (
    (compliance_requested_at is null) = (compliance_due_at is null)
    and (compliance_requested_at is null) = (compliance_reason is null));

comment on column public.listings.compliance_reason is
  'Request of the team to bring the listing into line: the reason, read by the seller (DECISIONS.md 2026-11-22).';

-- No grant: authenticated reads listings with a table-wide SELECT (rows
-- filtered by its RLS: the owner and the team) and updates only title,
-- description and price.

create index listings_compliance_due_idx on public.listings (compliance_due_at)
  where compliance_due_at is not null and deleted_at is null;

-- The delay given to the seller: its one place (the deadline is stored with
-- the request, the pages read it from there).
create function public.listing_compliance_delay() returns interval
language sql immutable set search_path = '' as $$ select interval '7 days' $$;

-- 2. ---------------------------------------------------------------------------
-- Whether the listing changed since a moment, by its seller (or the team):
-- a change recorded on the listing online (price, title, description,
-- photos: listing_revisions, L1-35), a new sending for review (a rejected
-- listing corrected), or a change of its property (characteristics, DPE;
-- nothing else writes a property: its updated_at moves with them only).
-- Internal.
create function public.listing_changed_since(p_listing public.listings, p_since timestamptz)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(p_listing.submitted_at > p_since, false)
      or exists (select 1 from public.listing_revisions r
                  where r.listing_id = p_listing.id and r.created_at > p_since)
      or exists (select 1 from public.properties p
                  where p.id = p_listing.property_id and p.updated_at > p_since);
$$;

-- The deletion itself, after the checks of who deletes: internal.
create function public.listing_delete_apply(p_listing public.listings, p_meta jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
begin
  -- Locked again here, whoever calls, and read as it is now: deleted
  -- meanwhile, nothing more to do.
  select * into l from public.listings where id = p_listing.id and deleted_at is null for update;
  if l.id is null then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;
  if l.status = 'sold' then
    perform public.listing_bad_transition(l.status, 'delete');
  end if;
  -- Its offers locked: an offer sent or answered at the same moment
  -- (offer_submit, offer_answer lock their offer first) is either seen
  -- below, or waits for this deletion and then finds the listing gone
  -- (offer_can_draft).
  perform 1 from public.offers o where o.listing_id = l.id for update;
  -- An accepted offer: the sale is under way, the team handles it.
  if exists (select 1 from public.offers o
              where o.listing_id = l.id and o.status = 'accepted') then
    raise exception 'an offer is accepted on this listing' using errcode = '55000';
  end if;
  -- Offers waiting for an answer: answered first, or left to expire (their
  -- validity is short); never closed behind the back of their buyers.
  if exists (select 1 from public.offers o
              where o.listing_id = l.id and o.status in ('submitted', 'viewed')
                and o.validity_until > now()) then
    raise exception 'offers wait for an answer on this listing' using errcode = '55000';
  end if;

  -- The visits to come: cancelled as by the seller (visits_notify tells
  -- their buyer, in the bell, by email and in the conversation). The rows of
  -- the visits that took place stay.
  update public.visits v
     set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid()
    from public.visit_slots s
   where s.id = v.slot_id and v.property_id = l.property_id
     and v.status = 'confirmed' and s.starts_at > now();

  -- The sale file: the buyers no longer read its documents (nor their
  -- files: the storage policies read document_shares), the requests still
  -- waiting go; those answered stay as history.
  delete from public.document_shares ds
   using public.documents d
   where d.id = ds.document_id and d.property_id = l.property_id;
  delete from public.document_access_requests
   where property_id = l.property_id and status = 'pending';

  -- The team has nothing left to review (as listings_notify does).
  update public.notifications
     set read_at = now()
   where type = 'listing.pending' and read_at is null
     and data->>'listing_id' = l.id::text;

  update public.listings
     set deleted_at = now(), summary_requested_at = null
   where id = l.id;
  update public.properties
     set deleted_at = now()
   where id = l.property_id and deleted_at is null;

  perform public.audit('listing.delete', 'listing', l.id,
    p_meta || jsonb_build_object('from', l.status));
end;
$$;

-- The seller: their listing, their account active, not suspended by the team.
create function public.listing_delete(p_listing_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  -- Refuses another's listing, an inactive account and a suspended listing (42501).
  l public.listings := public.listing_for_seller(p_listing_id);
begin
  perform public.listing_delete_apply(l, jsonb_build_object('by', 'seller'));
end;
$$;

-- 3. ---------------------------------------------------------------------------
-- The facts of a notification about the request, for the bell and the email.
create function public.listing_compliance_facts(p_listing public.listings)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entity_id', p_listing.id,
    'listing_id', p_listing.id,
    'property_id', p_listing.property_id,
    'reference', p_listing.reference,
    'title', p_listing.title,
    'city', p.city,
    'reason', p_listing.compliance_reason,
    'due_at', p_listing.compliance_due_at)
  from public.properties p where p.id = p_listing.property_id;
$$;

create function public.listing_compliance_request(p_listing_id uuid, p_reason text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_require_admin(p_listing_id);
  v_owner uuid;
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  -- What the seller can still change: online, paused, or to correct.
  if l.status not in ('published', 'paused', 'rejected') then
    perform public.listing_bad_transition(l.status, 'ask to bring into line');
  end if;
  update public.listings
     set compliance_requested_at = now(),
         compliance_due_at = now() + public.listing_compliance_delay(),
         compliance_reason = btrim(p_reason),
         compliance_reminded_at = null
   where id = l.id
  returning * into l;
  perform public.audit('listing.compliance_request', 'listing', l.id,
    jsonb_build_object('reason', l.compliance_reason, 'due_at', l.compliance_due_at));
  select owner_id into v_owner from public.properties where id = l.property_id;
  perform public.notification_add(
    v_owner, 'listing.compliance_requested', public.listing_compliance_facts(l),
    '/vendeur/biens/' || l.property_id, 'listing-compliance:' || l.id, now());
  return l.compliance_due_at;
end;
$$;

create function public.listing_compliance_clear(p_listing_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_require_admin(p_listing_id);
begin
  if l.compliance_requested_at is null then
    raise exception 'no request to bring this listing into line' using errcode = '55000';
  end if;
  update public.listings
     set compliance_requested_at = null, compliance_due_at = null,
         compliance_reason = null, compliance_reminded_at = null
   where id = l.id;
  perform public.audit('listing.compliance_clear', 'listing', l.id);
end;
$$;

-- Changed since the request? For the team and the seller of the listing
-- (whose notice goes once it changed); null without a request.
create function public.listing_compliance_changed(p_listing_id uuid)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  l public.listings;
begin
  select * into l from public.listings where id = p_listing_id and deleted_at is null;
  if not public.is_admin() and (l.id is null or not public.owns_property(l.property_id)) then
    raise exception 'listing not found' using errcode = '42501';
  end if;
  if l.id is null or l.compliance_requested_at is null then
    return null;
  end if;
  return public.listing_changed_since(l, l.compliance_requested_at);
end;
$$;

-- 4. ---------------------------------------------------------------------------
-- The reminder, 2 days before the deadline, to a seller whose listing has not
-- changed since the request; once (compliance_reminded_at); from 8 h in
-- Paris, as the reminders of the visits.
create function public.listings_compliance_remind(p_now timestamptz default now())
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
  v_owner uuid;
  n int := 0;
begin
  if extract(hour from p_now at time zone 'Europe/Paris') < 8 then
    return 0;
  end if;
  for l in
    select * from public.listings
     where deleted_at is null and compliance_requested_at is not null
       and compliance_reminded_at is null
       and compliance_due_at > p_now and compliance_due_at <= p_now + interval '2 days'
     for update skip locked
  loop
    continue when public.listing_changed_since(l, l.compliance_requested_at);
    select owner_id into v_owner from public.properties where id = l.property_id and deleted_at is null;
    continue when v_owner is null;
    perform public.notification_add(
      v_owner, 'listing.compliance_reminder', public.listing_compliance_facts(l),
      '/vendeur/biens/' || l.property_id, 'listing-compliance-reminder:' || l.id, p_now);
    update public.listings set compliance_reminded_at = p_now where id = l.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- 5. ---------------------------------------------------------------------------
create function public.listing_admin_delete(p_listing_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_require_admin(p_listing_id);
  v_owner uuid;
  v_facts jsonb;
begin
  if l.compliance_requested_at is null then
    raise exception 'no request to bring this listing into line' using errcode = '55000';
  end if;
  if l.compliance_due_at > now() then
    raise exception 'the deadline of the request has not passed' using errcode = '55000';
  end if;
  if public.listing_changed_since(l, l.compliance_requested_at) then
    raise exception 'the listing changed since the request' using errcode = '55000';
  end if;
  v_facts := public.listing_compliance_facts(l);
  select owner_id into v_owner from public.properties where id = l.property_id;
  perform public.listing_delete_apply(l, jsonb_build_object(
    'by', 'admin', 'reason', l.compliance_reason, 'due_at', l.compliance_due_at));
  -- The final notice: bell and email; its page is gone, « Ma vente » instead.
  perform public.notification_add(v_owner, 'listing.deleted', v_facts, '/vendeur', null, now());
end;
$$;

-- Grants ----------------------------------------------------------------------
revoke execute on function public.listing_compliance_delay() from public, anon;
revoke execute on function public.listing_changed_since(public.listings, timestamptz) from public, anon, authenticated;
revoke execute on function public.listing_delete_apply(public.listings, jsonb) from public, anon, authenticated;
revoke execute on function public.listing_compliance_facts(public.listings) from public, anon, authenticated;
revoke execute on function public.listings_compliance_remind(timestamptz) from public, anon, authenticated;
revoke execute on function public.listing_delete(uuid) from public, anon;
revoke execute on function public.listing_compliance_request(uuid, text) from public, anon;
revoke execute on function public.listing_compliance_clear(uuid) from public, anon;
revoke execute on function public.listing_compliance_changed(uuid) from public, anon;
revoke execute on function public.listing_admin_delete(uuid) from public, anon;
grant execute on function public.listing_compliance_delay() to authenticated;
grant execute on function public.listing_delete(uuid) to authenticated;
grant execute on function public.listing_compliance_request(uuid, text) to authenticated;
grant execute on function public.listing_compliance_clear(uuid) to authenticated;
grant execute on function public.listing_compliance_changed(uuid) to authenticated;
grant execute on function public.listing_admin_delete(uuid) to authenticated;

-- pg_cron, in the database itself (SPEC 19, DECISIONS.md 2026-10-08): every
-- hour, the function waits for 8 h in Paris whatever the season.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'listing-compliance-reminders';
    perform cron.schedule('listing-compliance-reminders', '19 * * * *',
                          $job$select public.listings_compliance_remind()$job$);
  end if;
end;
$$;

-- 6. ---------------------------------------------------------------------------
-- account_anonymize of 20261121160000_offer_adjustments.sql, with the reason
-- of a request to bring a listing into line erased with the other free
-- texts of the listings of the closed seller: the only change.
create or replace function public.account_anonymize(p_profile uuid, p_now timestamptz default now())
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles
     where id = p_profile and deleted_at is not null
       and deleted_at <= p_now - interval '30 days') then
    raise exception 'not an account closed 30 days ago' using errcode = '22023';
  end if;

  update public.profiles
     set first_name = null, last_name = null, phone = null, avatar_path = null,
         suspension_reason = null,
         notification_prefs = '{"email_alerts": false, "email_offers": false, "email_messages": false}'::jsonb
   where id = p_profile;
  delete from public.buyer_profiles where profile_id = p_profile;
  delete from public.offers where buyer_id = p_profile and status = 'draft';
  -- A document an offer sent refers to keeps its row (type, date), never its file.
  update public.financing_documents set storage_path = ''
   where buyer_id = p_profile
     and id in (select financing_document_id from public.offers where financing_document_id is not null);
  delete from public.financing_documents
   where buyer_id = p_profile
     and id not in (select financing_document_id from public.offers where financing_document_id is not null);
  delete from public.photos
   where property_id in (select id from public.properties where owner_id = p_profile);
  -- The address, what finds it (the DPE number gives it, through the
  -- register of the ADEME), the free texts of the seller and their history;
  -- the characteristics and the prices stay (city, surface, rooms).
  update public.properties
     set address_line = 'Adresse effacée', location = null, public_location = null,
         district = null, dpe_number = null, dpe_date = null, dpe_exemption_reason = null,
         estimation_id = null
   where owner_id = p_profile;
  -- The same address, frozen with the offers received on these properties.
  delete from public.offer_property_addresses a
   using public.offers o
   where o.id = a.offer_id and o.seller_id = p_profile;
  update public.listings l
     set title = 'Annonce supprimée', description = '', summary = null,
         rejection_reason = null, suspension_reason = null,
         compliance_requested_at = null, compliance_due_at = null,
         compliance_reason = null, compliance_reminded_at = null
    from public.properties p
   where p.id = l.property_id and p.owner_id = p_profile;
  delete from public.listing_revisions r
   using public.listings l, public.properties p
   where l.id = r.listing_id and p.id = l.property_id and p.owner_id = p_profile;
  delete from public.ai_conversations where profile_id = p_profile;
  delete from public.notifications where profile_id = p_profile;
  delete from public.favorites where buyer_id = p_profile;
  delete from public.estimations where profile_id = p_profile;
  -- Lot 3: the sale file (its shares go with it), the alerts, the
  -- invitations and requests of the buyer, the free texts of the visits.
  delete from public.documents
   where property_id in (select id from public.properties where owner_id = p_profile);
  delete from public.alerts where buyer_id = p_profile;
  delete from public.visit_invitations where buyer_id = p_profile;
  delete from public.document_access_requests where buyer_id = p_profile;
  delete from public.document_shares where buyer_id = p_profile;
  -- L3-04: the reasons written for « Non concerné » (free text of the seller).
  delete from public.document_exemptions
   where property_id in (select id from public.properties where owner_id = p_profile);
  update public.visits set buyer_feedback = null, buyer_interest = null where buyer_id = p_profile;
  update public.visits set seller_feedback = null
   where property_id in (select id from public.properties where owner_id = p_profile);
end;
$$;
