-- L3-04 (SPEC-V2 sections 10, 15 and 18): the sale file on the tables of
-- L3-01. « Non concerné » for a document that does not apply, with its
-- reason; a file sent but never filed can be taken back; a share and an
-- access request tell the other party (document.shared, one notification per
-- buyer and property; document.access_requested); the seller's server
-- declares the notary file complete (the list of the mandatory documents is
-- in lib/config/documents.ts); the documents shared with a buyer, with what
-- they are about.

-- ---------------------------------------------------------------------------
-- « Non concerné »: counts as present in the checklist (SPEC 15); a reason
-- is asked (Cédric, 2026-11-10). Leenkey never says a diagnostic is not due.
-- ---------------------------------------------------------------------------
create table public.document_exemptions (
  property_id uuid not null references public.properties(id) on delete cascade,
  type public.document_type not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  primary key (property_id, type)
);
create trigger document_exemptions_set_updated_at before update on public.document_exemptions
  for each row execute function public.set_updated_at();
alter table public.document_exemptions enable row level security;
create policy document_exemptions_select on public.document_exemptions for select to authenticated
  using (public.owns_property(property_id) or public.is_admin());
create policy document_exemptions_insert on public.document_exemptions for insert to authenticated
  with check (public.is_active_user() and public.property_is_editable(property_id));
create policy document_exemptions_update on public.document_exemptions for update to authenticated
  using (public.is_active_user() and public.property_is_editable(property_id))
  with check (public.property_is_editable(property_id));
create policy document_exemptions_delete on public.document_exemptions for delete to authenticated
  using (public.is_active_user() and public.property_is_editable(property_id));
revoke all on public.document_exemptions from anon, authenticated;
grant select, delete on public.document_exemptions to authenticated;
grant insert (property_id, type, reason) on public.document_exemptions to authenticated;
grant update (reason) on public.document_exemptions to authenticated;

-- ---------------------------------------------------------------------------
-- A file sent but not filed (its content refused, the filing failed): its
-- owner takes it back. A filed document keeps its file (removed documents
-- too: erased with the account).
-- ---------------------------------------------------------------------------
create function public.sale_file_filed(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.documents d where d.storage_path = p_name);
$$;
revoke execute on function public.sale_file_filed(text) from public, anon;
grant execute on function public.sale_file_filed(text) to authenticated;

create policy documents_sale_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.sale_file_property(name) is not null
         and public.is_active_user()
         and public.owns_property(public.sale_file_property(name))
         and not public.sale_file_filed(name));

-- ---------------------------------------------------------------------------
-- The notary file complete: declared by the server of the seller once every
-- mandatory document is filed or « non concerné » (lib/config/documents.ts).
-- ---------------------------------------------------------------------------
create or replace function public.sale_declare_event(p_property_id uuid, p_event text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_event not in ('documents.checklist_viewed', 'documents.diagnostics_listed',
                     'documents.notary_ready') then
    raise exception 'event % is not declared by a seller', p_event using errcode = '22023';
  end if;
  if not public.is_active_user() or not public.property_is_editable(p_property_id) then
    raise exception 'property % is not one the account may change', p_property_id
      using errcode = '42501';
  end if;
  -- True when a task was not done yet.
  return public.sale_emit_event(p_property_id, p_event) > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Documents shared: one notification per buyer and property for the shares
-- of a statement (« Partager les diagnostics » shares several at once); its
-- email at most once a day per property (the policy of the type).
-- ---------------------------------------------------------------------------
create function public.document_shares_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in
    select n.buyer_id, d.property_id, count(*)::int as shared,
           (select l.title from public.listings l
             where l.property_id = d.property_id order by l.created_at desc limit 1) as title,
           (select p.city from public.properties p where p.id = d.property_id) as city
      from new_shares n join public.documents d on d.id = n.document_id
     group by n.buyer_id, d.property_id
  loop
    perform public.notification_add(
      r.buyer_id, 'document.shared',
      jsonb_build_object('entity_id', r.property_id, 'property_id', r.property_id,
                         'title', r.title, 'city', r.city, 'count', r.shared),
      '/acquereur/documents', 'documents:' || r.property_id || ':' || r.buyer_id, now());
  end loop;
  return null;
end;
$$;
create trigger document_shares_notify after insert on public.document_shares
  referencing new table as new_shares
  for each statement execute function public.document_shares_notify();

-- ---------------------------------------------------------------------------
-- An access request (new, or asked again): the seller is told, with the
-- first name and the financing status of the buyer, never an amount.
-- ---------------------------------------------------------------------------
create function public.document_access_requests_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_seller uuid;
begin
  if new.status <> 'pending' or (tg_op = 'UPDATE' and old.status = 'pending') then
    return null;
  end if;
  select owner_id into v_seller from public.properties where id = new.property_id;
  perform public.notification_add(
    v_seller, 'document.access_requested',
    jsonb_build_object(
      'entity_id', new.id, 'property_id', new.property_id,
      'title', (select l.title from public.listings l
                 where l.property_id = new.property_id order by l.created_at desc limit 1),
      'buyer_first_name', (select first_name from public.profiles where id = new.buyer_id),
      'financing_status', coalesce((select financing_status::text from public.buyer_profiles
                                     where profile_id = new.buyer_id), 'not_provided')),
    '/vendeur/biens/' || new.property_id || '/documents', 'document-request:' || new.id, now());
  return null;
end;
$$;
create trigger document_access_requests_notify
  after insert or update of status on public.document_access_requests
  for each row execute function public.document_access_requests_notify();

revoke execute on function public.document_shares_notify() from public, anon, authenticated;
revoke execute on function public.document_access_requests_notify() from public, anon, authenticated;

-- document_access_request of L3-01, with a rule more (its review): declined,
-- a request is asked again after 7 days at the earliest.
create or replace function public.document_access_request(p_property uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_active_user() or public.owns_property(p_property) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not public.property_visitable(p_property)
     or not public.has_buyer_relation(p_property, auth.uid()) then
    raise exception 'contact the seller first' using errcode = '22023';
  end if;
  insert into public.document_access_requests as r (property_id, buyer_id)
  values (p_property, auth.uid())
  on conflict (property_id, buyer_id)
    do update set status = 'pending', answered_at = null, created_at = now()
    -- Declined: asked again after 7 days at the earliest (the seller is told once).
    where r.status = 'granted' or (r.status = 'declined' and r.answered_at < now() - interval '7 days')
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.document_access_requests
     where property_id = p_property and buyer_id = auth.uid();
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- The documents shared with the caller, with what they are about.
-- ---------------------------------------------------------------------------
create function public.shared_documents()
returns table (document_id uuid, property_id uuid, type public.document_type, title text,
               mime_type text, size_bytes int, shared_at timestamptz,
               listing_title text, listing_slug text, city text)
language sql stable security definer set search_path = '' as $$
  select d.id, d.property_id, d.type, d.title, d.mime_type, d.size_bytes, s.shared_at,
         l.title, case when l.status = 'published' then l.slug end, p.city
    from public.document_shares s
    join public.documents d on d.id = s.document_id and d.deleted_at is null
    join public.properties p on p.id = d.property_id and p.deleted_at is null
    left join lateral (select li.title, li.slug, li.status from public.listings li
                        where li.property_id = p.id order by li.created_at desc limit 1) l on true
   where s.buyer_id = auth.uid()
   order by s.shared_at desc;
$$;
revoke execute on function public.shared_documents() from public, anon;
grant execute on function public.shared_documents() to authenticated;

-- account_anonymize of L3-01, with the reasons of « Non concerné ».
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
  update public.visits set buyer_feedback = null where buyer_id = p_profile;
  update public.visits set seller_feedback = null
   where property_id in (select id from public.properties where owner_id = p_profile);
end;
$$;
