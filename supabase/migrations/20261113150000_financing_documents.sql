-- L2-02: the proof of financing of a buyer (SPEC-V2 4, 8.9, 13 « Qualification »
-- and 17). A buyer files a document (its type, its date, a PDF or an image):
-- its financing becomes « Justificatif fourni »; the team checks its presence
-- and its apparent consistency: « Justificatif vérifié » (never « validé »).
-- The file is read by its buyer and the team only, never by a seller, who
-- sees the status, the type of the document and the date of the check
-- (buyer_summary_for_seller).
--
-- Choices (DECISIONS.md 2026-11-13, L2-02):
-- - files in the private bucket `documents`, `{buyer_id}/financing/{uuid}.pdf`
--   or `.jpg` (an image is converted by the server), 5 MB at most;
-- - a buyer files several documents over time; the one in force is
--   `buyer_profiles.current_financing_document_id`; filing a new one retires
--   the previous one (kept, marked removed), removing the one in force brings
--   the status back to what is declared; the project is declared first (the
--   team compares the document with it);
-- - an offer takes, when it is sent, the document in force (L2-01 left the
--   column empty).

-- ---------------------------------------------------------------------------
-- The bucket (also for the documents of the sale file, L3: 20 MB)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name) values ('documents', 'documents') on conflict (id) do nothing;
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'storage' and table_name = 'buckets'
                and column_name = 'allowed_mime_types') then
    update storage.buckets
       set public = false, file_size_limit = 20971520,
           allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
     where id = 'documents';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The table
-- ---------------------------------------------------------------------------
create table public.financing_documents (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  type public.financing_document_type not null,
  document_date date not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg')),
  size_bytes int not null check (size_bytes between 1 and 5242880),
  checked_at timestamptz,
  checked_by uuid references public.profiles(id),
  check_note text check (char_length(check_note) <= 1000),   -- the team only
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint financing_documents_path check (
    storage_path ~ ('^' || buyer_id::text
                    || '/financing/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg)$')),
  constraint financing_documents_checked check ((checked_at is null) = (checked_by is null))
);
create index financing_documents_buyer_idx on public.financing_documents (buyer_id, created_at desc);
create index financing_documents_checked_by_idx on public.financing_documents (checked_by)
  where checked_by is not null;

alter table public.buyer_profiles
  add column financing_checked_at timestamptz,
  add constraint buyer_profiles_current_doc_fk
    foreign key (current_financing_document_id) references public.financing_documents(id);
create index buyer_profiles_current_doc_idx on public.buyer_profiles (current_financing_document_id)
  where current_financing_document_id is not null;

alter table public.offers
  add constraint offers_financing_document_fk
    foreign key (financing_document_id) references public.financing_documents(id);
create index offers_financing_document_idx on public.offers (financing_document_id)
  where financing_document_id is not null;

-- ---------------------------------------------------------------------------
-- RLS: the buyer reads its documents, the team reads them all; written only
-- through the functions below. The note of the team and who checked are not
-- granted: the team reads them with admin_financing_documents().
-- ---------------------------------------------------------------------------
alter table public.financing_documents enable row level security;

create policy financing_documents_select_buyer_or_admin on public.financing_documents
  for select to authenticated
  using (buyer_id = auth.uid() or public.is_admin());

revoke all on public.financing_documents from anon, authenticated;
grant select (id, buyer_id, type, document_date, storage_path, mime_type, size_bytes, checked_at,
              created_at, deleted_at)
  on public.financing_documents to authenticated;

-- ---------------------------------------------------------------------------
-- The files: `{buyer_id}/financing/{uuid}.pdf|jpg`. Sent by the buyer (an
-- active account), read by the buyer and the team, never replaced; removed by
-- the buyer when no document in use names the file (an upload not declared,
-- a document removed that no offer sent carries).
-- ---------------------------------------------------------------------------
create function public.financing_file_buyer(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/financing/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg)$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

create function public.financing_file_in_use(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.financing_documents d
     where d.storage_path = p_name
       and (d.deleted_at is null
            or exists (select 1 from public.offers o
                        where o.financing_document_id = d.id and o.submitted_at is not null)));
$$;

-- Twenty files at most in the folder of a buyer (a document kept by an offer
-- sent stays): no account fills the bucket.
create function public.financing_files_room() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from storage.objects
           where bucket_id = 'documents' and name like auth.uid()::text || '/financing/%') < 20;
$$;

create policy documents_financing_select on storage.objects
  for select to authenticated
  using (bucket_id = 'documents'
         and (public.financing_file_buyer(name) = auth.uid()
              or (public.financing_file_buyer(name) is not null and public.is_admin())));

create policy documents_financing_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.financing_file_buyer(name) = auth.uid()
              and public.is_active_user() and public.financing_files_room());

create policy documents_financing_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.financing_file_buyer(name) = auth.uid()
         and public.is_active_user() and not public.financing_file_in_use(name));

-- ---------------------------------------------------------------------------
-- Filing a document: its file is already in the bucket (sent with the session
-- of the buyer). It becomes the one in force: « Justificatif fourni ».
-- ---------------------------------------------------------------------------
create function public.financing_document_add(
  p_type public.financing_document_type, p_document_date date, p_storage_path text,
  p_mime_type text, p_size_bytes int
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_mime text := case when p_storage_path like '%.pdf' then 'application/pdf' else 'image/jpeg' end;
  bp public.buyer_profiles;
  file_meta jsonb;
  v_size int := p_size_bytes;
  new_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not a buyer' using errcode = '42501';
  end if;
  -- The row of the buyer locked: two filings, or a filing and a check, never cross.
  select * into bp from public.buyer_profiles where profile_id = auth.uid() for update;
  if not found then
    raise exception 'not a buyer' using errcode = '42501';
  end if;
  if public.financing_file_buyer(p_storage_path) is distinct from auth.uid() then
    raise exception 'not a file of this buyer' using errcode = '42501';
  end if;
  -- The team compares the document with what is declared: declared first.
  if bp.financing_status = 'not_provided' then
    raise exception 'the project is not declared' using errcode = '22023';
  end if;
  if p_type is null or p_document_date is null or p_document_date > v_today
     or p_document_date < v_today - 3650 then
    raise exception 'the type and the date of the document are required' using errcode = '22023';
  end if;
  select metadata into file_meta from storage.objects
   where bucket_id = 'documents' and name = p_storage_path;
  if not found then
    raise exception 'the file of the document is missing' using errcode = '22023';
  end if;
  -- What the storage service knows of the file wins over what is declared: a
  -- file sent directly, heavier or of another type than its name, is refused.
  if p_mime_type is distinct from v_mime
     or (file_meta ? 'mimetype' and file_meta->>'mimetype' <> v_mime)
     or (file_meta ? 'size' and (file_meta->>'size')::bigint > 5242880) then
    raise exception 'the file of the document is not accepted' using errcode = '22023';
  end if;
  if file_meta ? 'size' then
    v_size := (file_meta->>'size')::int;
  end if;
  -- The document in force gives way: kept (an offer sent may carry it), marked removed.
  update public.financing_documents set deleted_at = now()
   where id = bp.current_financing_document_id and deleted_at is null;
  insert into public.financing_documents (buyer_id, type, document_date, storage_path, mime_type, size_bytes)
  values (auth.uid(), p_type, p_document_date, p_storage_path, v_mime, v_size)
  returning id into new_id;
  update public.buyer_profiles
     set current_financing_document_id = new_id,
         financing_status = 'document_provided',
         financing_checked_at = null
   where profile_id = auth.uid();
  return new_id;
end;
$$;

-- Removing a document (kept, marked removed: an offer sent may carry it). The
-- one in force: the status goes back to what is declared.
create function public.financing_document_remove(p_document_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.financing_documents;
begin
  -- A suspended account no longer writes (Q71): its documents stay as they are.
  if not public.is_active_user() then
    raise exception 'document not found' using errcode = '42501';
  end if;
  perform 1 from public.buyer_profiles where profile_id = auth.uid() for update;
  select * into d from public.financing_documents
   where id = p_document_id and buyer_id = auth.uid() and deleted_at is null for update;
  if not found then
    raise exception 'document not found' using errcode = '42501';
  end if;
  update public.financing_documents set deleted_at = now() where id = d.id;
  -- 'declared': buyer_profiles_compute_status then says declared or not provided.
  update public.buyer_profiles
     set current_financing_document_id = null,
         financing_status = 'declared',
         financing_checked_at = null
   where profile_id = auth.uid() and current_financing_document_id = d.id;
end;
$$;

-- The check of the team (SPEC 13): presence of the document, its type, its
-- date, its apparent consistency with what is declared. « Justificatif
-- vérifié », dated, in the audit log. Only the document in force, once.
create function public.financing_document_check(p_document_id uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.financing_documents;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into d from public.financing_documents where id = p_document_id;
  if not found then
    raise exception 'document not found' using errcode = '42501';
  end if;
  -- The row of the buyer locked first, as in a filing: the document checked is
  -- still the one in force when the status is written.
  perform 1 from public.buyer_profiles where profile_id = d.buyer_id for update;
  select * into d from public.financing_documents where id = p_document_id for update;
  if d.deleted_at is not null or d.checked_at is not null
     or not exists (select 1 from public.buyer_profiles
                     where profile_id = d.buyer_id and current_financing_document_id = d.id) then
    raise exception 'this document is no longer to check' using errcode = '22023';
  end if;
  if char_length(p_note) > 1000 then
    raise exception 'the note is too long' using errcode = '22023';
  end if;
  update public.financing_documents
     set checked_at = now(), checked_by = auth.uid(), check_note = nullif(btrim(p_note), '')
   where id = d.id;
  update public.buyer_profiles
     set financing_status = 'document_checked', financing_checked_at = now()
   where profile_id = d.buyer_id and current_financing_document_id = d.id;
  if not found then
    raise exception 'this document is no longer to check' using errcode = '22023';
  end if;
  perform public.audit('financing.check', 'financing_document', d.id,
                       jsonb_build_object('buyer_id', d.buyer_id, 'type', d.type));
end;
$$;

-- The documents of a buyer as the team reads them: with its note and who checked.
create function public.admin_financing_documents(p_buyer_id uuid)
returns table (
  id uuid, type public.financing_document_type, document_date date, mime_type text,
  size_bytes int, created_at timestamptz, deleted_at timestamptz, checked_at timestamptz,
  checked_by_name text, check_note text, is_current boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select d.id, d.type, d.document_date, d.mime_type, d.size_bytes, d.created_at, d.deleted_at,
           d.checked_at, nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), d.check_note,
           coalesce(bp.current_financing_document_id = d.id, false)
      from public.financing_documents d
      left join public.profiles pr on pr.id = d.checked_by
      left join public.buyer_profiles bp on bp.profile_id = d.buyer_id
     where d.buyer_id = p_buyer_id
     order by d.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- What a seller sees (SPEC 7): now with the type of the document in force and
-- the date of its check. Never the file, never an amount.
-- ---------------------------------------------------------------------------
create or replace function public.buyer_summary_for_seller(p_property_id uuid)
returns table (buyer_id uuid, first_name text, project public.buyer_project,
               financing_status public.financing_status,
               financing_document_type public.financing_document_type,
               financing_checked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select pr.id, pr.first_name, bp.project, coalesce(bp.financing_status, 'not_provided'),
         d.type, bp.financing_checked_at
  from public.profiles pr
  left join public.buyer_profiles bp on bp.profile_id = pr.id
  left join public.financing_documents d
         on d.id = bp.current_financing_document_id and d.deleted_at is null
  where public.owns_property(p_property_id)
    and public.has_buyer_relation(p_property_id, pr.id);
$$;

-- ---------------------------------------------------------------------------
-- An offer sent takes the document in force of its buyer (SPEC 13, step 4).
-- Runs before offers_freeze_after_submit (name order), on the sending only.
-- ---------------------------------------------------------------------------
create function public.offers_attach_financing_document() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'draft' and new.status = 'submitted' then
    new.financing_document_id := (select current_financing_document_id
                                    from public.buyer_profiles where profile_id = new.buyer_id);
  end if;
  return new;
end;
$$;

create trigger offers_attach_financing_document before update of status on public.offers
  for each row execute function public.offers_attach_financing_document();

revoke execute on function public.financing_file_buyer(text) from public, anon;
revoke execute on function public.financing_file_in_use(text) from public, anon;
revoke execute on function public.financing_files_room() from public, anon;
revoke execute on function public.financing_document_add(public.financing_document_type, date, text, text, int) from public, anon;
revoke execute on function public.financing_document_remove(uuid) from public, anon;
revoke execute on function public.financing_document_check(uuid, text) from public, anon;
revoke execute on function public.admin_financing_documents(uuid) from public, anon;
revoke execute on function public.offers_attach_financing_document() from public, anon, authenticated;
grant execute on function public.financing_file_buyer(text) to authenticated;
grant execute on function public.financing_file_in_use(text) to authenticated;
grant execute on function public.financing_files_room() to authenticated;
grant execute on function public.financing_document_add(public.financing_document_type, date, text, text, int) to authenticated;
grant execute on function public.financing_document_remove(uuid) to authenticated;
grant execute on function public.financing_document_check(uuid, text) to authenticated;
grant execute on function public.admin_financing_documents(uuid) to authenticated;
