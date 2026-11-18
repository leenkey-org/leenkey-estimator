-- L3-01 with L2-10: the tables of lot 3 in the export, the closing and the
-- anonymisation of an account (SPEC-V2 section 4, DECISIONS 2026-11-16).
-- Closing: visits to come cancelled, alerts stopped, pending access requests
-- declined, sale file removed from the buyers. Anonymisation (30 days later):
-- the sale files and their rows erased, alerts, invitations and requests of
-- the buyer erased, the free texts of the visits erased. Same signatures:
-- create or replace, the grants stay.

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
    'visits', (select coalesce(jsonb_agg(to_jsonb(v) order by v.created_at), '[]')
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

create or replace function public.account_close() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_at timestamptz := now();
  o record;
begin
  if v_me is null or not exists (
    select 1 from public.profiles where id = v_me and deleted_at is null) then
    raise exception 'no open account' using errcode = '42501';
  end if;
  -- The team closes an admin account itself: two accounts read every request.
  if public.is_admin() then
    raise exception 'an admin account is closed by the team' using errcode = '42501';
  end if;
  -- A sale in progress (an offer accepted, the property not sold yet), as
  -- seller or buyer: the other party and the notary count on the account.
  if public.account_sale_in_progress() then
    raise exception 'a sale is in progress' using errcode = '55000';
  end if;
  -- The offers received waiting for an answer: declined, the buyer told why
  -- (offer_events_notify, as for an answer of the seller).
  for o in
    select id from public.offers
     where seller_id = v_me and status in ('submitted', 'viewed')
       and (validity_until is null or validity_until > v_at)
     for update
  loop
    update public.offers
       set status = 'declined', answered_at = v_at, viewed_at = coalesce(viewed_at, v_at)
     where id = o.id;
    perform public.offer_event(o.id, 'declined', jsonb_build_object(
      'message', 'Ce bien n''est plus en vente sur Leenkey : le vendeur a fermé son compte.',
      'reason', 'account_closed'));
  end loop;
  -- Its offers waiting for an answer: withdrawn, the seller told (offer_events_notify).
  for o in
    select id from public.offers
     where buyer_id = v_me and status in ('submitted', 'viewed')
       and (validity_until is null or validity_until > v_at)
     for update
  loop
    update public.offers set status = 'withdrawn', withdrawn_at = v_at where id = o.id;
    perform public.offer_event(o.id, 'withdrawn');
  end loop;
  -- Its visits to come, as buyer or on its properties, are cancelled; its
  -- alerts stop; the access requests to its sale files are declined.
  update public.visits v set status = 'cancelled', cancelled_at = v_at, cancelled_by = v_me
    from public.visit_slots s
   where s.id = v.slot_id and v.status = 'confirmed' and s.starts_at > v_at
     and (v.buyer_id = v_me
          or v.property_id in (select id from public.properties where owner_id = v_me));
  update public.alerts set active = false where buyer_id = v_me and active;
  update public.document_access_requests set status = 'declined', answered_at = v_at
   where status = 'pending'
     and property_id in (select id from public.properties where owner_id = v_me);
  -- As a buyer: its requests waiting are dropped, nothing more is shared with it.
  delete from public.document_access_requests where buyer_id = v_me and status = 'pending';
  delete from public.document_shares where buyer_id = v_me;
  update public.documents set deleted_at = v_at
   where deleted_at is null
     and property_id in (select id from public.properties where owner_id = v_me);
  -- Its properties and their listings leave the site.
  update public.listings l set deleted_at = v_at
    from public.properties p
   where p.id = l.property_id and p.owner_id = v_me and l.deleted_at is null;
  update public.properties set deleted_at = v_at where owner_id = v_me and deleted_at is null;
  -- Its conversations close: nobody writes to an account that is gone.
  update public.conversations set closed_at = v_at
   where (seller_id = v_me or buyer_id = v_me) and closed_at is null;
  update public.profiles set deleted_at = v_at where id = v_me;
  perform public.audit('account.closed', 'profile', v_me, '{}'::jsonb);
  return v_at;
end;
$$;

create or replace function public.account_files(p_profile uuid, p_now timestamptz default now())
returns table (bucket text, path text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles
     where id = p_profile and deleted_at is not null
       and deleted_at <= p_now - interval '30 days') then
    raise exception 'not an account closed 30 days ago' using errcode = '22023';
  end if;
  -- Photos (three widths each), financing documents, sale files.
  return query
    select 'photos'::text, ph.storage_path || '-' || w.width || '.webp'
      from public.photos ph
      join public.properties p on p.id = ph.property_id
      cross join (values (400), (800), (1600)) as w(width)
     where p.owner_id = p_profile
    union all
    select 'documents'::text, fd.storage_path
      from public.financing_documents fd
     where fd.buyer_id = p_profile and fd.storage_path <> ''
    union all
    -- Every file of the folder of its properties, a file never filed included.
    select 'documents'::text, o.name
      from storage.objects o
      join public.properties p on o.name like p.id::text || '/sale/%'
     where o.bucket_id = 'documents' and p.owner_id = p_profile;
end;
$$;

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
  update public.visits set buyer_feedback = null where buyer_id = p_profile;
  update public.visits set seller_feedback = null
   where property_id in (select id from public.properties where owner_id = p_profile);
end;
$$;
