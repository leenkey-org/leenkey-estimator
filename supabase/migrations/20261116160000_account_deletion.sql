-- L2-10: closing an account from /compte, then its anonymisation 30 days
-- later (SPEC-V2 sections 19 and 21, « export JSON et suppression depuis
-- /compte ; anonymisation à 30 jours »), and the export of its data.
--
-- 0. account_export(): what the account holds, as one JSON document, read
--    with the session of the person (security invoker: the policies of each
--    table apply; an offer received through offer_for_seller, which hides the
--    buyer until the offer is accepted).
-- 1. account_close(): the person closes their own account, unless a sale is
--    in progress (an offer accepted, the property not sold) or the account
--    is an admin one. At once: the offers they sent waiting for an answer
--    are withdrawn (the seller is told, as when they withdraw one), those
--    they received are declined (the buyer is told why), their properties
--    and listings leave the site (soft deletion), their conversations
--    close, the account is marked deleted:
--    the session functions treat it as signed out (core/auth/session.ts),
--    the page closes every session. Nothing is erased yet.
-- 2. accounts_due(p_now): the accounts closed 30 days ago or more, not yet
--    anonymised (the date is a parameter: the tests simulate it).
-- 3. account_anonymize(p_profile, p_now): what can name the person is
--    erased: names, phone, avatar, buyer project, assistant conversations,
--    notifications, favorites, valuations, drafts of offers, the street
--    address and the location of their properties, their photos and their
--    financing documents (their files: account_files lists them, the cron
--    route removes them from Storage first). Kept, as the law or the other
--    party requires (privacy policy, « sauf celles que la loi impose de
--    garder »): orders and invoices (10 years), the offers sent and their
--    journal (the document of both parties), the messages received by the
--    other party, the legal acceptances, the reports and cases, the audit
--    log; all now tied to an account without a name.
-- 4. account_mark_anonymized(p_profile): once the route has erased the
--    sign-in (Supabase Auth: email, password, sign-in barred) and the files.
--    Until then the account stays due: a failed run is resumed next time.
-- 5. pg_cron: every Sunday at 2:00 (SPEC 19), /api/cron/anonymize-deleted.
--
-- No new table; one column, profiles.anonymized_at.

alter table public.profiles add column anonymized_at timestamptz;

-- 0. ---------------------------------------------------------------------------
create function public.account_export() returns jsonb
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
    'requests_to_the_team', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]')
                               from public.cases c, me where c.profile_id = me.id),
    'reports', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]')
                  from public.reports r, me where r.reporter_id = me.id))
  from me where me.id is not null;
$$;
revoke execute on function public.account_export() from public, anon;
grant execute on function public.account_export() to authenticated;

-- 1. ---------------------------------------------------------------------------
create function public.account_close() returns timestamptz
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
  if exists (
    select 1 from public.offers ao
      join public.listings al on al.id = ao.listing_id
     where (ao.buyer_id = v_me or ao.seller_id = v_me)
       and ao.status = 'accepted' and al.status <> 'sold') then
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

-- 2. ---------------------------------------------------------------------------
create function public.accounts_due(p_now timestamptz default now())
returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.profiles
   where deleted_at is not null and deleted_at <= p_now - interval '30 days'
     and anonymized_at is null
   order by deleted_at
   limit 50;
$$;

-- 3. ---------------------------------------------------------------------------
-- The files of the account, read first: the route removes them from Storage
-- before account_anonymize erases their rows (a run cut short is resumed
-- with them still listed).
create function public.account_files(p_profile uuid, p_now timestamptz default now())
returns table (bucket text, path text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles
     where id = p_profile and deleted_at is not null
       and deleted_at <= p_now - interval '30 days') then
    raise exception 'not an account closed 30 days ago' using errcode = '22023';
  end if;
  -- Photos (three widths each), financing documents.
  return query
    select 'photos'::text, ph.storage_path || '-' || w.width || '.webp'
      from public.photos ph
      join public.properties p on p.id = ph.property_id
      cross join (values (400), (800), (1600)) as w(width)
     where p.owner_id = p_profile
    union all
    select 'documents'::text, fd.storage_path
      from public.financing_documents fd
     where fd.buyer_id = p_profile and fd.storage_path <> '';
end;
$$;

create function public.account_anonymize(p_profile uuid, p_now timestamptz default now())
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
  -- A document an offer refers to keeps its row (type, date), never its file.
  update public.financing_documents set storage_path = ''
   where buyer_id = p_profile
     and id in (select financing_document_id from public.offers where financing_document_id is not null);
  delete from public.financing_documents
   where buyer_id = p_profile
     and id not in (select financing_document_id from public.offers where financing_document_id is not null);
  delete from public.photos
   where property_id in (select id from public.properties where owner_id = p_profile);
  update public.properties
     set address_line = 'Adresse effacée', location = null, public_location = null
   where owner_id = p_profile;
  delete from public.offers where buyer_id = p_profile and status = 'draft';
  delete from public.ai_conversations where profile_id = p_profile;
  delete from public.notifications where profile_id = p_profile;
  delete from public.favorites where buyer_id = p_profile;
  delete from public.estimations where profile_id = p_profile;
end;
$$;

-- 4. ---------------------------------------------------------------------------
create function public.account_mark_anonymized(p_profile uuid, p_now timestamptz default now())
returns void
language sql security definer set search_path = '' as $$
  update public.profiles set anonymized_at = p_now
   where id = p_profile and deleted_at is not null and anonymized_at is null;
$$;

revoke execute on function public.account_close() from public, anon;
grant execute on function public.account_close() to authenticated;
revoke execute on function public.accounts_due(timestamptz) from public, anon, authenticated;
revoke execute on function public.account_files(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.account_anonymize(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.account_mark_anonymized(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.accounts_due(timestamptz) to service_role;
grant execute on function public.account_files(uuid, timestamptz) to service_role;
grant execute on function public.account_anonymize(uuid, timestamptz) to service_role;
grant execute on function public.account_mark_anonymized(uuid, timestamptz) to service_role;

-- 5. ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'anonymize-deleted';
    perform cron.schedule('anonymize-deleted', '0 2 * * 0',
                          $job$select public.cron_call('/api/cron/anonymize-deleted')$job$);
  end if;
end;
$$;
