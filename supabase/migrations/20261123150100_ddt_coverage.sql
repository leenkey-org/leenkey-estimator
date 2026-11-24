-- DDT filed at once, level A (SPEC-V2 sections 4 and 15, DECISIONS.md
-- 2026-11-23): the seller files the one PDF their diagnostician gave them
-- (type 'ddt') and says which diagnostics it holds. Each of those lines of
-- the checklist then counts as provided (lib/config/documents.ts,
-- leenkey/sale-file/checklist.ts).
--
-- `documents.covers`: the diagnostics a DDT holds. Only a DDT has some, at
-- least one, among the diagnostics (the same list as DIAGNOSTIC_TYPES). No
-- client writes the column: document_add sets it at the filing, with the
-- checks of every filing, and document_coverage_set changes it afterwards
-- (the seller of the property, while it is editable). A type is still
-- changed by an update of the seller (grant of L3-01): the constraint keeps a
-- document from becoming a DDT, or a DDT from becoming something else, that
-- way. Reading: the policy of L3-01, unchanged (the seller, the team, a
-- buyer for a document shared with them and not removed).
--
-- Nothing of a DDT is ever shown on a listing: the public facts are closed
-- lists per type of diagnostic, read from a document of that one type; a DDT
-- is read as a whole (generic prompt), so it gives none
-- (lib/validations/document-analysis.ts), and the two functions of the public
-- facts leave it out whatever its analysis holds.
--
-- The export of an account (account_export) gives `covers` with the other
-- metadata of the documents of the sale file: the function is the one of
-- 20261123130000_identity_documents.sql, copied line by line, with that one
-- key more.

alter table public.documents
  add column covers public.document_type[] not null default '{}';
alter table public.documents
  add constraint documents_covers check (
    covers <@ array['dpe', 'amiante', 'plomb', 'electricite', 'gaz', 'termites', 'erp',
                    'assainissement', 'carrez']::public.document_type[]
    and (type = 'ddt') = (cardinality(covers) > 0));
grant select (covers) on public.documents to authenticated;
-- One DDT per property at a time: to replace it, its seller removes it and
-- files the new one.
create unique index documents_one_ddt on public.documents (property_id)
  where type = 'ddt' and deleted_at is null;

-- The diagnostics given, once each, in the order of the enum; refused when
-- there is none or when one is not a diagnostic.
create function public.ddt_coverage(p_covers public.document_type[]) returns public.document_type[]
language plpgsql immutable set search_path = '' as $$
declare
  v_covers public.document_type[];
begin
  v_covers := array(select distinct c from unnest(p_covers) c where c is not null order by c);
  if cardinality(v_covers) = 0
     or not v_covers <@ array['dpe', 'amiante', 'plomb', 'electricite', 'gaz', 'termites', 'erp',
                              'assainissement', 'carrez']::public.document_type[] then
    raise exception 'a DDT covers at least one diagnostic, and only diagnostics'
      using errcode = '22023';
  end if;
  return v_covers;
end;
$$;

-- document_add of L3-01, with the diagnostics a DDT covers (none for any
-- other type). The same checks; the calls with four arguments still work.
drop function public.document_add(uuid, public.document_type, text, text);
create function public.document_add(p_property uuid, p_type public.document_type, p_title text,
                                    p_storage_path text,
                                    p_covers public.document_type[] default '{}')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_mime text;
  v_size bigint;
  v_covers public.document_type[] := '{}';
begin
  if not public.is_active_user() or not public.property_is_editable(p_property) then
    raise exception 'not a property of yours' using errcode = '42501';
  end if;
  if p_type = 'ddt' then
    v_covers := public.ddt_coverage(p_covers);
  elsif cardinality(coalesce(p_covers, '{}')) > 0 then
    raise exception 'only a DDT covers diagnostics' using errcode = '22023';
  end if;
  select o.metadata->>'mimetype', (o.metadata->>'size')::bigint into v_mime, v_size
    from storage.objects o
   where o.bucket_id = 'documents' and o.name = p_storage_path;
  if not found or public.sale_file_property(p_storage_path) is distinct from p_property then
    raise exception 'file not found' using errcode = '22023';
  end if;
  if v_mime is distinct from (case right(p_storage_path, 4)
                                when '.pdf' then 'application/pdf'
                                when '.jpg' then 'image/jpeg'
                                when '.png' then 'image/png' end) then
    raise exception 'a PDF, a JPEG or a PNG named after its type' using errcode = '23514';
  end if;
  insert into public.documents (property_id, owner_id, type, title, storage_path, mime_type,
                                size_bytes, covers)
  values (p_property, auth.uid(), p_type, btrim(p_title), p_storage_path, v_mime, v_size, v_covers)
  returning id into v_id;
  return v_id;
end;
$$;

-- « Modifier les diagnostics couverts »: the seller of the property says
-- again which diagnostics their DDT holds.
create function public.document_coverage_set(p_document uuid, p_covers public.document_type[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
begin
  select * into d from public.documents where id = p_document and deleted_at is null for update;
  if not found or not public.is_active_user() or not public.property_is_editable(d.property_id) then
    raise exception 'not a document of yours' using errcode = '42501';
  end if;
  if d.type <> 'ddt' then
    raise exception 'only a DDT covers diagnostics' using errcode = '22023';
  end if;
  update public.documents set covers = public.ddt_coverage(p_covers) where id = p_document;
end;
$$;

-- shared_documents of L3-04, with the diagnostics a shared DDT covers.
drop function public.shared_documents();
create function public.shared_documents()
returns table (document_id uuid, property_id uuid, type public.document_type, title text,
               mime_type text, size_bytes int, shared_at timestamptz,
               listing_title text, listing_slug text, city text,
               covers public.document_type[])
language sql stable security definer set search_path = '' as $$
  select d.id, d.property_id, d.type, d.title, d.mime_type, d.size_bytes, s.shared_at,
         l.title, case when l.status = 'published' then l.slug end, p.city, d.covers
    from public.document_shares s
    join public.documents d on d.id = s.document_id and d.deleted_at is null
    join public.properties p on p.id = d.property_id and p.deleted_at is null
    left join lateral (select li.title, li.slug, li.status from public.listings li
                        where li.property_id = p.id order by li.created_at desc limit 1) l on true
   where s.buyer_id = auth.uid()
   order by s.shared_at desc;
$$;

-- The public facts of L3-05: never those of a DDT.
create or replace function public.document_public_facts_set(p_document uuid, p_show boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
begin
  select * into d from public.documents where id = p_document and deleted_at is null for update;
  if not found or not public.is_active_user() or not public.property_is_editable(d.property_id) then
    raise exception 'not a document of yours' using errcode = '42501';
  end if;
  if p_show and (d.type = 'ddt'
                 or d.analysis is null
                 or d.analysis->>'quality' is distinct from 'ok'
                 or jsonb_typeof(d.analysis->'public_facts') is distinct from 'object'
                 or d.analysis->'public_facts' = '{}'::jsonb) then
    raise exception 'nothing to show' using errcode = '22023';
  end if;
  update public.documents
     set public_facts_approved_at = case when p_show then now() end
   where id = p_document;
end;
$$;

create or replace function public.public_document_facts(p_listing_id uuid)
returns table (type public.document_type, facts jsonb)
language sql stable security definer set search_path = '' as $$
  select d.type, d.analysis->'public_facts'
    from public.listings l
    join public.properties p on p.id = l.property_id and p.deleted_at is null
    join public.documents d on d.property_id = p.id and d.deleted_at is null
   where l.id = p_listing_id and l.status = 'published' and l.deleted_at is null
     and d.type <> 'ddt'
     and d.public_facts_approved_at is not null and d.analysis is not null
     and d.analysis->>'quality' = 'ok'
     and jsonb_typeof(d.analysis->'public_facts') = 'object'
   order by d.type, d.created_at;
$$;

-- account_export of 20261123130000_identity_documents.sql, with the
-- diagnostics a DDT covers among the metadata of the documents: the only
-- change (`'covers', d.covers`).
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
    -- The identity documents: what the person reads of them (never a file,
    -- never the note of the team nor who decided).
    'identity_documents', (select coalesce(jsonb_agg(jsonb_build_object(
                               'id', i.id, 'type', i.type, 'mime_type', i.mime_type,
                               'size_bytes', i.size_bytes, 'created_at', i.created_at,
                               'checked_at', i.checked_at, 'refused_at', i.refused_at,
                               'refusal_reason', i.refusal_reason, 'withdrawn_at', i.withdrawn_at,
                               'file_deleted_at', i.file_deleted_at) order by i.created_at), '[]')
                             from public.identity_documents i, me where i.buyer_id = me.id),
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
                      'deleted_at', d.deleted_at, 'covers', d.covers) order by d.created_at), '[]')
                    from public.documents d where d.property_id in (select id from my_properties)),
    'documents_shared_with_me', (select coalesce(jsonb_agg(to_jsonb(s) order by s.shared_at), '[]')
                                   from public.document_shares s, me where s.buyer_id = me.id),
    'document_access_requests', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]')
                                   from public.document_access_requests r, me where r.buyer_id = me.id),
    'alerts', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]')
                 from public.alerts a, me where a.buyer_id = me.id),
    'requests_to_the_team', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]')
                               from public.cases c, me where c.profile_id = me.id),
    -- The interventions asked of the adviser, the columns the seller reads
    -- (not the note of the team).
    'advisor_interventions', (select coalesce(jsonb_agg(jsonb_build_object(
                                  'id', a.id, 'property_id', a.property_id, 'reason', a.reason,
                                  'message', a.message, 'status', a.status,
                                  'requested_at', a.requested_at, 'done_at', a.done_at)
                                order by a.requested_at), '[]')
                                from public.advisor_interventions a
                               where a.property_id in (select id from my_properties)))
  from me where me.id is not null;
$$;

revoke execute on function public.ddt_coverage(public.document_type[]) from public, anon, authenticated;
revoke execute on function public.document_add(uuid, public.document_type, text, text, public.document_type[]) from public, anon;
revoke execute on function public.document_coverage_set(uuid, public.document_type[]) from public, anon;
revoke execute on function public.shared_documents() from public, anon;
grant execute on function public.document_add(uuid, public.document_type, text, text, public.document_type[]) to authenticated;
grant execute on function public.document_coverage_set(uuid, public.document_type[]) to authenticated;
grant execute on function public.shared_documents() to authenticated;
