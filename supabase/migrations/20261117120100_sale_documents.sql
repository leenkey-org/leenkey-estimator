-- L3-01 (SPEC-V2 sections 4 and 15, CLAUDE.md section 7): the sale file.
-- The seller files the documents of a property (PDF, JPEG, PNG, 20 MB) in the
-- private bucket 'documents' under {property_id}/sale/{uuid}.{pdf|jpg|png},
-- shares them, one by one or several at once, with a buyer who has a relation
-- with the property, and answers the access requests of buyers. A buyer reads
-- a document only through a row of document_shares.
--
-- The extracted text, the full analysis and the note of the Leenkey review are
-- never readable by a client (column grants): the seller gets the analysis and
-- the buyer the summary meant for them through functions (L3-05). The
-- checklist, the screens and the notary indicator: L3-04.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  type public.document_type not null,
  title text not null check (char_length(title) between 1 and 120),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes int not null check (size_bytes between 1 and 20 * 1024 * 1024),
  page_count int check (page_count > 0),
  extracted_text text,
  analysis jsonb,
  analyzed_at timestamptz,
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 2000),
  public_facts_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  constraint documents_path check (
    storage_path = property_id::text || '/sale/' || split_part(storage_path, '/', 3)
    and split_part(storage_path, '/', 3) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png)$')
);
create index documents_property_idx on public.documents (property_id) where deleted_at is null;
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_shares (
  document_id uuid not null references public.documents(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  shared_at timestamptz not null default now(),
  primary key (document_id, buyer_id)
);
create index document_shares_buyer_idx on public.document_shares (buyer_id);

create table public.document_access_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'granted', 'declined')),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (property_id, buyer_id),
  constraint document_access_requests_answered check ((status = 'pending') = (answered_at is null))
);

-- ---------------------------------------------------------------------------
-- Who reads what
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;
alter table public.document_access_requests enable row level security;

-- Helpers without RLS, so that the two policies do not call each other.
create function public.document_shared_with_me(p_document uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.document_shares s
                  where s.document_id = p_document and s.buyer_id = auth.uid());
$$;
create function public.document_of_mine(p_document uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.documents d
                  where d.id = p_document and public.owns_property(d.property_id));
$$;

create policy documents_select on public.documents for select to authenticated
  using (public.owns_property(property_id) or public.is_admin()
         or (deleted_at is null and public.document_shared_with_me(id)));
-- The seller renames, changes the type, shows the facts on the listing, removes
-- (soft delete). The analysis is written by the server (L3-05), the review by
-- the team (L3-09).
create policy documents_update on public.documents for update to authenticated
  using (public.is_active_user() and public.property_is_editable(property_id) and deleted_at is null)
  with check (public.property_is_editable(property_id));

create policy document_shares_select on public.document_shares for select to authenticated
  using (buyer_id = auth.uid() or public.is_admin() or public.document_of_mine(document_id));

create policy document_access_requests_select on public.document_access_requests for select to authenticated
  using (buyer_id = auth.uid() or public.owns_property(property_id) or public.is_admin());

revoke all on public.documents, public.document_shares, public.document_access_requests from anon, authenticated;
grant select (id, property_id, owner_id, type, title, storage_path, mime_type, size_bytes, page_count,
              analyzed_at, reviewed_at, public_facts_approved_at, created_at, updated_at, deleted_at)
  on public.documents to authenticated;
grant update (type, title, public_facts_approved_at, deleted_at) on public.documents to authenticated;
grant select on public.document_shares, public.document_access_requests to authenticated;

-- ---------------------------------------------------------------------------
-- The files: {property_id}/sale/{uuid}.{pdf|jpg|png} in the bucket 'documents'
-- ---------------------------------------------------------------------------
create function public.sale_file_property(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/sale/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png)$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

-- A buyer reads the file of a document shared with them and not removed.
create function public.sale_file_shared(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.documents d
                   join public.document_shares s on s.document_id = d.id
                  where d.storage_path = p_name and d.deleted_at is null and s.buyer_id = auth.uid());
$$;

-- 200 files at most per property (removed documents included: their files stay).
create function public.sale_files_room(p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from storage.objects
           where bucket_id = 'documents' and name like p_property::text || '/sale/%') < 200;
$$;

create policy documents_sale_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.sale_file_property(name) is not null
         and (public.owns_property(public.sale_file_property(name)) or public.is_admin()
              or public.sale_file_shared(name)));
create policy documents_sale_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.sale_file_property(name) is not null
              and public.is_active_user()
              and public.property_is_editable(public.sale_file_property(name))
              and public.sale_files_room(public.sale_file_property(name)));

-- ---------------------------------------------------------------------------
-- Filing a document: its file is already in the bucket (sent with the
-- session of the seller)
-- ---------------------------------------------------------------------------
create function public.document_add(p_property uuid, p_type public.document_type, p_title text,
                                    p_storage_path text, p_mime_type text, p_size_bytes int)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_active_user() or not public.property_is_editable(p_property) then
    raise exception 'not a property of yours' using errcode = '42501';
  end if;
  if public.sale_file_property(p_storage_path) is distinct from p_property
     or not exists (select 1 from storage.objects
                     where bucket_id = 'documents' and name = p_storage_path) then
    raise exception 'file not found' using errcode = '22023';
  end if;
  insert into public.documents (property_id, owner_id, type, title, storage_path, mime_type, size_bytes)
  values (p_property, auth.uid(), p_type, btrim(p_title), p_storage_path, p_mime_type, p_size_bytes)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sharing: with a buyer who has a relation with the property
-- ---------------------------------------------------------------------------
create function public.document_share(p_documents uuid[], p_buyer uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_property uuid;
  v_count int;
begin
  select min(d.property_id::text)::uuid into v_property
    from public.documents d where d.id = any(p_documents);
  if v_property is null or not public.is_active_user() or not public.property_is_editable(v_property)
     or (select count(distinct d.property_id) from public.documents d where d.id = any(p_documents)) <> 1
     or (select count(*) from public.documents d
          where d.id = any(p_documents) and d.deleted_at is null) <> cardinality(array(select distinct unnest(p_documents))) then
    raise exception 'not documents of yours' using errcode = '42501';
  end if;
  if not public.buyer_relates_to_property(v_property, p_buyer)
     and not exists (select 1 from public.document_access_requests r
                      where r.property_id = v_property and r.buyer_id = p_buyer) then
    raise exception 'this buyer has no relation with the property' using errcode = '22023';
  end if;
  insert into public.document_shares (document_id, buyer_id)
  select distinct unnest(p_documents), p_buyer
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function public.document_unshare(p_document uuid, p_buyer uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_user()
     or not exists (select 1 from public.documents d
                     where d.id = p_document and public.property_is_editable(d.property_id)) then
    raise exception 'not a document of yours' using errcode = '42501';
  end if;
  delete from public.document_shares where document_id = p_document and buyer_id = p_buyer;
end;
$$;

-- ---------------------------------------------------------------------------
-- Access requests: a buyer with a relation with the property asks, the
-- seller grants (shares the documents chosen, all of them by default) or
-- declines. Asked again after an answer: pending again.
-- ---------------------------------------------------------------------------
create function public.document_access_request(p_property uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_active_user() or public.owns_property(p_property) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not public.property_visitable(p_property)
     or not public.buyer_relates_to_property(p_property, auth.uid()) then
    raise exception 'contact the seller first' using errcode = '22023';
  end if;
  insert into public.document_access_requests as r (property_id, buyer_id)
  values (p_property, auth.uid())
  on conflict (property_id, buyer_id)
    do update set status = 'pending', answered_at = null, created_at = now()
    where r.status <> 'pending'
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.document_access_requests
     where property_id = p_property and buyer_id = auth.uid();
  end if;
  return v_id;
end;
$$;

create function public.document_access_answer(p_request uuid, p_grant boolean, p_documents uuid[] default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  r public.document_access_requests;
  v_documents uuid[];
  v_count int := 0;
begin
  select * into r from public.document_access_requests where id = p_request for update;
  if not found or not public.is_active_user() or not public.property_is_editable(r.property_id) then
    raise exception 'request not found' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'this request is answered' using errcode = '22023';
  end if;
  update public.document_access_requests
     set status = case when p_grant then 'granted' else 'declined' end, answered_at = now()
   where id = p_request;
  if p_grant then
    v_documents := coalesce(p_documents,
      array(select d.id from public.documents d where d.property_id = r.property_id and d.deleted_at is null));
    if cardinality(v_documents) > 0 then
      v_count := public.document_share(v_documents, r.buyer_id);
    end if;
  end if;
  return v_count;
end;
$$;

revoke execute on function public.document_shared_with_me(uuid) from public, anon;
revoke execute on function public.document_of_mine(uuid) from public, anon;
grant execute on function public.document_shared_with_me(uuid) to authenticated;
grant execute on function public.document_of_mine(uuid) to authenticated;
revoke execute on function public.sale_file_property(text) from public, anon;
revoke execute on function public.sale_file_shared(text) from public, anon;
revoke execute on function public.sale_files_room(uuid) from public, anon;
revoke execute on function public.document_add(uuid, public.document_type, text, text, text, int) from public, anon;
revoke execute on function public.document_share(uuid[], uuid) from public, anon;
revoke execute on function public.document_unshare(uuid, uuid) from public, anon;
revoke execute on function public.document_access_request(uuid) from public, anon;
revoke execute on function public.document_access_answer(uuid, boolean, uuid[]) from public, anon;
grant execute on function public.sale_file_property(text) to authenticated;
grant execute on function public.sale_file_shared(text) to authenticated;
grant execute on function public.sale_files_room(uuid) to authenticated;
grant execute on function public.document_add(uuid, public.document_type, text, text, text, int) to authenticated;
grant execute on function public.document_share(uuid[], uuid) to authenticated;
grant execute on function public.document_unshare(uuid, uuid) to authenticated;
grant execute on function public.document_access_request(uuid) to authenticated;
grant execute on function public.document_access_answer(uuid, boolean, uuid[]) to authenticated;
