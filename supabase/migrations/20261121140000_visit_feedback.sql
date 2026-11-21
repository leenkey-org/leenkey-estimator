-- L3-03 (SPEC-V2 sections 14, 18 and 19): the feedback after a visit. The
-- day after a visit that took place, its buyer and the seller of the property
-- are asked once for their feedback (visit.feedback_requested, bell and
-- email). The buyer gives an interest from 1 to 5 and a comment, read by the
-- seller as given: no average, no ranking (DECISIONS.md 2026-11-20). The
-- seller writes a note for themselves: the buyer never reads it. Each party
-- writes until 7 days after the end of the visit.
--
-- A visit took place when it is not cancelled and its slot has ended: no job
-- moves a visit to `done` (L3-02), so `confirmed` with a slot in the past is
-- a past visit. As for L3-01, no direct write on visits: two functions.

alter table public.visits add column feedback_requested_at timestamptz;

-- ---------------------------------------------------------------------------
-- The note of the seller is private: column grants (the buyer of the visit
-- reads its row, never this column), and a function for the seller and the
-- team. A `select *` of visits is refused from now on.
-- ---------------------------------------------------------------------------
revoke select on public.visits from authenticated;
grant select (id, slot_id, property_id, buyer_id, status, buyer_feedback, buyer_interest,
              cancelled_at, cancelled_by, reminder_sent_at, feedback_requested_at,
              created_at, updated_at)
  on public.visits to authenticated;

create function public.visit_seller_note(p_visit uuid) returns text
language sql stable security definer set search_path = '' as $$
  select v.seller_feedback from public.visits v
   where v.id = p_visit and (public.owns_property(v.property_id) or public.is_admin());
$$;

-- ---------------------------------------------------------------------------
-- Giving feedback: after the end of the visit, for 7 days
-- ---------------------------------------------------------------------------
create function public.visit_feedback_buyer(p_visit uuid, p_interest int, p_comment text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.visits;
  v_end timestamptz;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into v from public.visits where id = p_visit for update;
  if not found or auth.uid() is null or v.buyer_id <> auth.uid() or not public.is_active_user() then
    raise exception 'visit not found' using errcode = '42501';
  end if;
  select ends_at into v_end from public.visit_slots where id = v.slot_id;
  if v.status not in ('confirmed', 'done') or v_end > now() then
    raise exception 'this visit did not take place' using errcode = '22023';
  end if;
  if v_end <= now() - interval '7 days' then
    raise exception 'too late to give feedback' using errcode = '22023';
  end if;
  if p_interest is null or p_interest not between 1 and 5 or char_length(v_comment) > 2000 then
    raise exception 'invalid feedback' using errcode = '22023';
  end if;
  update public.visits set buyer_interest = p_interest, buyer_feedback = v_comment where id = p_visit;
  -- The request is answered: read, its email does not leave.
  update public.notifications set read_at = now()
   where profile_id = auth.uid() and type = 'visit.feedback_requested'
     and group_key = 'visit-feedback:' || p_visit and read_at is null;
end;
$$;

-- The note of the seller: a text (an empty one erases the note).
create function public.visit_feedback_seller(p_visit uuid, p_comment text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.visits;
  v_end timestamptz;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into v from public.visits where id = p_visit for update;
  if not found or auth.uid() is null or not public.owns_property(v.property_id)
     or not public.is_active_user() then
    raise exception 'visit not found' using errcode = '42501';
  end if;
  select ends_at into v_end from public.visit_slots where id = v.slot_id;
  if v.status not in ('confirmed', 'done') or v_end > now() then
    raise exception 'this visit did not take place' using errcode = '22023';
  end if;
  if v_end <= now() - interval '7 days' then
    raise exception 'too late to give feedback' using errcode = '22023';
  end if;
  if char_length(v_comment) > 2000 or (v_comment is null and v.seller_feedback is null) then
    raise exception 'invalid feedback' using errcode = '22023';
  end if;
  update public.visits set seller_feedback = v_comment where id = p_visit;
  update public.notifications set read_at = now()
   where profile_id = auth.uid() and type = 'visit.feedback_requested'
     and group_key = 'visit-feedback:' || p_visit and read_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- The request, the day after: once per visit, to each party who has not
-- given their feedback yet (and whose account is open). Run every day at
-- 8 h UTC: a visit ended between 12 and 60 hours ago is asked about once.
-- It is also where the database learns that a visit took place: the event
-- visit.done of the sale (supabase/seed/02_sale_steps.sql).
-- ---------------------------------------------------------------------------
create function public.visits_ask_feedback(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v record;
  n int := 0;
  info jsonb;
begin
  for v in
    select vi.id, vi.property_id, vi.buyer_id, vi.buyer_interest, vi.seller_feedback,
           s.starts_at, s.ends_at, p.owner_id,
           (b.deleted_at is null and b.suspended_at is null) as buyer_open,
           (o.deleted_at is null and o.suspended_at is null and p.deleted_at is null) as seller_open
      from public.visits vi
      join public.visit_slots s on s.id = vi.slot_id
      join public.properties p on p.id = vi.property_id
      join public.profiles b on b.id = vi.buyer_id
      join public.profiles o on o.id = p.owner_id
     where vi.status in ('confirmed', 'done') and vi.feedback_requested_at is null
       and s.ends_at <= p_now - interval '12 hours'
       and s.ends_at > p_now - interval '60 hours'
     for update of vi
  loop
    info := public.visit_facts(v.property_id, v.buyer_id)
      || jsonb_build_object('entity_id', v.id, 'visit_id', v.id,
                            'starts_at', v.starts_at, 'ends_at', v.ends_at);
    if v.buyer_interest is null and v.buyer_open then
      perform public.notification_add(
        v.buyer_id, 'visit.feedback_requested', info || jsonb_build_object('role', 'buyer'),
        '/visites/' || v.id, 'visit-feedback:' || v.id, p_now);
    end if;
    if v.seller_feedback is null and v.seller_open then
      perform public.notification_add(
        v.owner_id, 'visit.feedback_requested', info || jsonb_build_object('role', 'seller'),
        '/visites/' || v.id, 'visit-feedback:' || v.id, p_now);
    end if;
    update public.visits set feedback_requested_at = p_now where id = v.id;
    -- The sale: « Première visite effectuée » is ticked by the first visit
    -- that took place (once per visit here; a task done stays done).
    perform public.sale_emit_event(v.property_id, 'visit.done');
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.visit_seller_note(uuid) from public, anon;
revoke execute on function public.visit_feedback_buyer(uuid, int, text) from public, anon;
revoke execute on function public.visit_feedback_seller(uuid, text) from public, anon;
revoke execute on function public.visits_ask_feedback(timestamptz) from public, anon, authenticated;
grant execute on function public.visit_seller_note(uuid) to authenticated;
grant execute on function public.visit_feedback_buyer(uuid, int, text) to authenticated;
grant execute on function public.visit_feedback_seller(uuid, text) to authenticated;

-- pg_cron, in the database itself, as the reminder of L3-02 (SPEC 19 named a
-- route, /api/cron/visit-feedback: DECISIONS.md 2026-11-21).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'visit-feedback';
    perform cron.schedule('visit-feedback', '0 8 * * *', $job$select public.visits_ask_feedback()$job$);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The account (L2-10). account_export of L3-01, the visits by column: the
-- note of the seller only in the export of the seller (visit_seller_note).
-- ---------------------------------------------------------------------------
create or replace function public.account_export() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with me as (select auth.uid() as id),
  my_properties as (select p.* from public.properties p, me where p.owner_id = me.id),
  my_conversations as (
    select c.* from public.conversations c, me where me.id in (c.buyer_id, c.seller_id)),
  my_offers as (select o.* from public.offers o, me where o.buyer_id = me.id),
  received as (select o.* from public.offer_for_seller o, me where o.seller_id = me.id),
  my_ai as (select a.* from public.ai_conversations a, me where a.profile_id = me.id)
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p, me where p.id = me.id),
    'buyer_profile', (select to_jsonb(b) from public.buyer_profiles b, me where b.profile_id = me.id),
    'legal_acceptances', (select coalesce(jsonb_agg(to_jsonb(a) order by a.accepted_at), '[]')
                            from public.legal_acceptances a, me where a.profile_id = me.id),
    'properties', (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at), '[]') from my_properties p),
    'listings', (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at), '[]')
                   from public.listings l where l.property_id in (select id from my_properties)),
    'photos', (select coalesce(jsonb_agg(to_jsonb(ph) order by ph.property_id, ph.position), '[]')
                 from public.photos ph where ph.property_id in (select id from my_properties)),
    'subscriptions', (select coalesce(jsonb_agg(to_jsonb(s) order by s.activated_at), '[]')
                        from public.subscriptions s, me where s.owner_id = me.id),
    'conversations', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]') from my_conversations c),
    'messages', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]')
                   from public.messages m where m.conversation_id in (select id from my_conversations)),
    'offers_sent', (select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at), '[]') from my_offers o),
    'offers_received', (select coalesce(jsonb_agg(to_jsonb(o) order by o.submitted_at), '[]') from received o),
    'offer_events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at), '[]')
                       from public.offer_events e
                      where e.offer_id in (select id from my_offers union select id from received)),
    -- The columns the person reads (not the note nor the author of the check).
    'financing_documents', (select coalesce(jsonb_agg(jsonb_build_object(
                                'id', f.id, 'type', f.type, 'document_date', f.document_date,
                                'mime_type', f.mime_type, 'size_bytes', f.size_bytes,
                                'created_at', f.created_at, 'checked_at', f.checked_at,
                                'deleted_at', f.deleted_at) order by f.created_at), '[]')
                              from public.financing_documents f, me where f.buyer_id = me.id),
    'favorites', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at), '[]')
                    from public.favorites f, me where f.buyer_id = me.id),
    'assistant_conversations', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]') from my_ai a),
    'assistant_messages', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]')
                             from public.ai_messages m where m.conversation_id in (select id from my_ai)),
    -- Without the claim token of an anonymous valuation.
    'valuations', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at), '[]')
                     from (select v.id, v.created_at, v.input, v.result, v.low_cents, v.value_cents,
                                  v.high_cents, v.email
                             from public.estimations v, me where v.profile_id = me.id) e),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]')
                        from public.notifications n, me where n.profile_id = me.id),
    -- Lot 3: visits, the sale file (the columns the person reads), alerts.
    -- L3-03: the note of the seller of a visit, for the seller only (not
    -- for an admin who was the buyer of the visit).
    'visits', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', v.id, 'slot_id', v.slot_id, 'property_id', v.property_id,
                   'buyer_id', v.buyer_id, 'status', v.status,
                   'buyer_interest', v.buyer_interest, 'buyer_feedback', v.buyer_feedback,
                   'seller_feedback', case when public.owns_property(v.property_id)
                                           then public.visit_seller_note(v.id) end,
                   'cancelled_at', v.cancelled_at, 'cancelled_by', v.cancelled_by,
                   'reminder_sent_at', v.reminder_sent_at,
                   'feedback_requested_at', v.feedback_requested_at,
                   'created_at', v.created_at, 'updated_at', v.updated_at) order by v.created_at), '[]')
                 from public.visits v, me
                where v.buyer_id = me.id or v.property_id in (select id from my_properties)),
    'visit_slots', (select coalesce(jsonb_agg(to_jsonb(s) order by s.starts_at), '[]')
                      from public.visit_slots s where s.property_id in (select id from my_properties)),
    'visit_invitations', (select coalesce(jsonb_agg(jsonb_build_object(
                              'property_id', i.property_id, 'buyer_id', i.buyer_id,
                              'expires_at', i.expires_at, 'created_at', i.created_at) order by i.created_at), '[]')
                            from public.visit_invitations i, me
                           where i.buyer_id = me.id or i.property_id in (select id from my_properties)),
    'documents', (select coalesce(jsonb_agg(jsonb_build_object(
                      'id', d.id, 'property_id', d.property_id, 'type', d.type, 'title', d.title,
                      'mime_type', d.mime_type, 'size_bytes', d.size_bytes, 'created_at', d.created_at,
                      'deleted_at', d.deleted_at) order by d.created_at), '[]')
                    from public.documents d where d.property_id in (select id from my_properties)),
    'documents_shared_with_me', (select coalesce(jsonb_agg(to_jsonb(s) order by s.shared_at), '[]')
                                   from public.document_shares s, me where s.buyer_id = me.id),
    'document_access_requests', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]')
                                   from public.document_access_requests r, me where r.buyer_id = me.id),
    'alerts', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]')
                 from public.alerts a, me where a.buyer_id = me.id),
    'requests_to_the_team', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]')
                               from public.cases c, me where c.profile_id = me.id))
  from me where me.id is not null;
$$;

-- account_anonymize of L3-04 (20261118150100), with the interest of the buyer
-- of a visit (L3-03), erased with their comment: the only change.
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
  update public.listings l
     set title = 'Annonce supprimée', description = '', summary = null,
         rejection_reason = null, suspension_reason = null
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

-- ---------------------------------------------------------------------------
-- The sale (L1-23): « Créneaux de visite ouverts » is ticked by the first
-- slot. visit_slot_add of L3-01 (20261117120000), with its event: the only
-- line added. Nothing emitted visit_slot.created nor visit.done since L3-02.
-- ---------------------------------------------------------------------------
create or replace function public.visit_slot_add(p_property uuid, p_starts_at timestamptz, p_minutes int)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_end timestamptz := p_starts_at + make_interval(mins => p_minutes);
begin
  if not public.is_active_user() or not public.property_is_editable(p_property) then
    raise exception 'not a property of yours' using errcode = '42501';
  end if;
  if not public.property_visitable(p_property) then
    raise exception 'the listing is not online' using errcode = '22023';
  end if;
  if p_minutes not in (30, 45, 60) then
    raise exception 'a slot lasts 30, 45 or 60 minutes' using errcode = '22023';
  end if;
  if p_starts_at < now() + interval '1 hour' or p_starts_at > now() + interval '90 days' then
    raise exception 'a slot starts between in one hour and in 90 days' using errcode = '22023';
  end if;
  -- One check at a time per property: two slots added together never overlap.
  perform 1 from public.properties where id = p_property for update;
  if exists (select 1 from public.visit_slots s
              where s.property_id = p_property and s.removed_at is null
                and tstzrange(s.starts_at, s.ends_at) && tstzrange(p_starts_at, v_end)) then
    raise exception 'the slot overlaps another one' using errcode = '23P01';
  end if;
  insert into public.visit_slots (property_id, starts_at, ends_at)
  values (p_property, p_starts_at, v_end)
  returning id into v_id;
  perform public.sale_emit_event(p_property, 'visit_slot.created');
  return v_id;
end;
$$;

-- The slots opened and the visits that took place before this migration.
do $$
begin
  perform public.sale_emit_event(s.property_id, 'visit_slot.created')
     from (select distinct property_id from public.visit_slots) s;
  perform public.sale_emit_event(v.property_id, 'visit.done')
     from (select distinct vi.property_id
             from public.visits vi join public.visit_slots vs on vs.id = vi.slot_id
            where vi.status in ('confirmed', 'done') and vs.ends_at <= now()) v;
end;
$$;
