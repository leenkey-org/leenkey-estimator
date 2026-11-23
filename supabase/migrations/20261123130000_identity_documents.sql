-- The identity check of a buyer before a visit (asked by Cédric, order
-- validated by Younes on 2026-11-20; DECISIONS.md 2026-11-23 « Vérification
-- d'identité avant visite », question Q101).
--
-- A buyer deposits ONE identity document (identity card, passport, residence
-- permit; a PDF or an image, 5 MB at most, as a proof of financing). The team
-- looks at it in the back office: « Marquer comme vérifiée », or « Refuser »
-- with a reason the buyer reads. Its file is deleted once the document is
-- checked or refused (and when its buyer withdraws or replaces it): only the
-- status, the type and the dates stay. Nothing is read from the document: no
-- number, no birth date, no name.
--
-- 1. Two enums (identity_document_type, identity_status) and one table
--    (identity_documents), with its RLS and column grants: the note of the
--    team (team_note) and who decided (decided_by) are not readable by a
--    client; the team reads them with admin_identity_documents().
-- 2. The files: `{buyer_id}/identity/{uuid}.pdf|jpg` in the private bucket
--    `documents`, four storage policies added (none changed).
-- 3. The functions of the buyer (identity_document_add, _remove) and of the
--    team (identity_document_check, _refuse, each in audit_log), the buyer
--    told in the bell and by email (identity.checked, identity.refused).
-- 4. visit_book of 20261117120000_visits.sql: booking a slot asks for a
--    document DEPOSITED (provided or checked, never the check of the team:
--    its delay must not block a visit). The only change of the function. A
--    visit already booked is never cancelled.
-- 5. buyer_identity_for_seller(): the seller of a property reads the status
--    (never the file, never the type) of the buyers who hold an invitation
--    still valid or a visit not cancelled of it.
-- 6. The account: account_export, account_anonymize and account_close of
--    20261123110000_advisor_interventions.sql and account_files of
--    20261117120300_account_deletion_lot3.sql, copied line by line, with
--    only: the metadata of the identity documents in the export; their rows
--    deleted by the anonymisation and their files listed for it; a document
--    still waiting for its check withdrawn when the account is closed (the
--    closing action then removes its file at once).
-- 7. No file stays behind: identity_files_to_sweep() and
--    identity_files_mark_swept(), for the scheduled task only (service
--    role), list the files of the documents that reached their end and the
--    files no document names, then mark the documents whose file is gone.
--    The opening of a file by the team is written in audit_log
--    (identity_document_opened).
--
-- NEVER sent to the AI: identity_documents is a table of its own, not
-- `documents`. The analysis of the documents (L3-05) reads `documents` and
-- the files `{property_id}/sale/…` only; no tool of the assistant reads this
-- table, its functions or the folder `…/identity/…`
-- (tests/unit/buyers/identity.test.ts keeps it so).

-- 1. ---------------------------------------------------------------------------
create type public.identity_document_type as enum ('carte_identite', 'passeport', 'titre_sejour');
-- Never « validé »: « Pièce d'identité déposée », « Identité vérifiée par Leenkey ».
create type public.identity_status as enum ('not_provided', 'provided', 'checked');

create table public.identity_documents (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  type public.identity_document_type not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg')),
  size_bytes int not null check (size_bytes between 1 and 5242880),
  checked_at timestamptz,
  refused_at timestamptz,
  refusal_reason text check (char_length(refusal_reason) between 3 and 1000),  -- the buyer reads it
  withdrawn_at timestamptz,                                    -- by its buyer (removed, replaced)
  decided_by uuid references public.profiles(id),              -- the team only
  team_note text check (char_length(team_note) <= 1000),       -- the team only
  file_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint identity_documents_path check (
    storage_path ~ ('^' || buyer_id::text
                    || '/identity/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg)$')),
  -- Checked, refused or withdrawn: one end at most.
  constraint identity_documents_one_end check (num_nonnulls(checked_at, refused_at, withdrawn_at) <= 1),
  constraint identity_documents_decided check (
    (checked_at is not null or refused_at is not null) = (decided_by is not null)),
  constraint identity_documents_refusal check ((refused_at is null) = (refusal_reason is null)),
  -- The file of a document that waits for its check is never said deleted.
  constraint identity_documents_file_deleted check (
    file_deleted_at is null or num_nonnulls(checked_at, refused_at, withdrawn_at) = 1)
);
-- ONE document per buyer: the one that waits for its check or is checked.
create unique index identity_documents_current_idx on public.identity_documents (buyer_id)
  where refused_at is null and withdrawn_at is null;
create index identity_documents_buyer_idx on public.identity_documents (buyer_id, created_at desc);
create index identity_documents_decided_by_idx on public.identity_documents (decided_by)
  where decided_by is not null;
create trigger identity_documents_set_updated_at before update on public.identity_documents
  for each row execute function public.set_updated_at();

-- RLS: the buyer reads its documents, the team reads them all; written only
-- through the functions below. A seller never reads the table.
alter table public.identity_documents enable row level security;

create policy identity_documents_select_buyer_or_admin on public.identity_documents
  for select to authenticated
  using (buyer_id = auth.uid() or public.is_admin());

revoke all on public.identity_documents from anon, authenticated;
grant select (id, buyer_id, type, storage_path, mime_type, size_bytes, checked_at, refused_at,
              refusal_reason, withdrawn_at, file_deleted_at, created_at, updated_at)
  on public.identity_documents to authenticated;

-- Where the identity of a buyer stands. For the functions of this file only
-- (never granted: it would tell anyone the status of anyone).
create function public.identity_status_of(p_buyer uuid) returns public.identity_status
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case when d.checked_at is not null then 'checked' else 'provided' end::public.identity_status
       from public.identity_documents d
      where d.buyer_id = p_buyer and d.refused_at is null and d.withdrawn_at is null),
    'not_provided');
$$;

-- 2. ---------------------------------------------------------------------------
-- The files: `{buyer_id}/identity/{uuid}.pdf|jpg`. Sent by the buyer (an
-- active account), read by the buyer and the team, never replaced; removed by
-- the buyer unless the file is the one of the document that waits for its
-- check (an account suspended or just closed may still remove its own files:
-- removing never adds anything, and the closing action removes the file of
-- the document it has just withdrawn); removed by the team once the document
-- is checked, refused or withdrawn.
create function public.identity_file_buyer(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/identity/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg)$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

-- The file of the document that waits for the check of the team.
create function public.identity_file_waiting(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.identity_documents d
     where d.storage_path = p_name
       and d.checked_at is null and d.refused_at is null and d.withdrawn_at is null);
$$;

-- The file of a document that reached its end: the team may delete it (the
-- function says no to anyone who is not of the team).
create function public.identity_file_ended(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
     and exists (select 1 from public.identity_documents d
                  where d.storage_path = p_name
                    and num_nonnulls(d.checked_at, d.refused_at, d.withdrawn_at) = 1);
$$;

-- Five files at most in the folder of a buyer: no account fills the bucket.
create function public.identity_files_room() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from storage.objects
           where bucket_id = 'documents' and name like auth.uid()::text || '/identity/%') < 5;
$$;

create policy documents_identity_select on storage.objects
  for select to authenticated
  using (bucket_id = 'documents'
         and (public.identity_file_buyer(name) = auth.uid()
              or (public.identity_file_buyer(name) is not null and public.is_admin())));

create policy documents_identity_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.identity_file_buyer(name) = auth.uid()
              and public.is_active_user() and public.identity_files_room());

create policy documents_identity_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.identity_file_buyer(name) = auth.uid()
         and not public.identity_file_waiting(name));

create policy documents_identity_delete_ended on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.identity_file_buyer(name) is not null
         and public.is_admin() and public.identity_file_ended(name));

-- 3. ---------------------------------------------------------------------------
-- Depositing a document: its file is already in the bucket (sent with the
-- session of the buyer). It becomes THE document of the buyer: « Pièce
-- d'identité déposée ». A document that waits for its check gives way
-- (withdrawn: its file is then removed by the server action); a checked
-- identity is not deposited again.
create function public.identity_document_add(
  p_type public.identity_document_type, p_storage_path text, p_mime_type text, p_size_bytes int
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_mime text := case when p_storage_path like '%.pdf' then 'application/pdf' else 'image/jpeg' end;
  file_meta jsonb;
  v_size int;
  new_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not an active account' using errcode = '42501';
  end if;
  -- The row of the account locked: two deposits, or a deposit and a check, never cross.
  perform 1 from public.profiles where id = auth.uid() for update;
  if public.identity_file_buyer(p_storage_path) is distinct from auth.uid() then
    raise exception 'not a file of this buyer' using errcode = '42501';
  end if;
  if p_type is null then
    raise exception 'the type of the document is required' using errcode = '22023';
  end if;
  if public.identity_status_of(auth.uid()) = 'checked' then
    raise exception 'the identity is already checked' using errcode = '22023';
  end if;
  select metadata into file_meta from storage.objects
   where bucket_id = 'documents' and name = p_storage_path;
  if not found then
    raise exception 'the file of the document is missing' using errcode = '22023';
  end if;
  -- What the storage service knows of the file decides, never what is
  -- declared: a file whose type or size it does not know, a file heavier or
  -- of another type than its name, is refused.
  if p_mime_type is distinct from v_mime
     or file_meta is null or not (file_meta ? 'mimetype') or not (file_meta ? 'size')
     or file_meta->>'mimetype' <> v_mime
     or (file_meta->>'size')::bigint not between 1 and 5242880 then
    raise exception 'the file of the document is not accepted' using errcode = '22023';
  end if;
  v_size := (file_meta->>'size')::int;
  update public.identity_documents set withdrawn_at = now()
   where buyer_id = auth.uid() and refused_at is null and withdrawn_at is null;
  insert into public.identity_documents (buyer_id, type, storage_path, mime_type, size_bytes)
  values (auth.uid(), p_type, p_storage_path, v_mime, v_size)
  returning id into new_id;
  return new_id;
end;
$$;

-- The buyer withdraws the document that waits for its check: « non déposée »
-- again. A visit already booked stays; the next booking asks for a document.
create function public.identity_document_remove(p_document_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- A suspended account no longer writes (Q71): its document stays as it is.
  if not public.is_active_user() then
    raise exception 'document not found' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = auth.uid() for update;
  update public.identity_documents set withdrawn_at = now()
   where id = p_document_id and buyer_id = auth.uid()
     and checked_at is null and refused_at is null and withdrawn_at is null;
  if not found then
    raise exception 'document not found' using errcode = '42501';
  end if;
end;
$$;

-- The check of the team: it has looked at the document (a document of the
-- type said, readable, in the name of the account). « Identité vérifiée par
-- Leenkey », dated, in the audit log. Only the document that waits, once.
create function public.identity_document_check(p_document_id uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.identity_documents;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into d from public.identity_documents where id = p_document_id;
  if not found then
    raise exception 'document not found' using errcode = '42501';
  end if;
  -- The row of the account locked first, as in a deposit.
  perform 1 from public.profiles where id = d.buyer_id for update;
  select * into d from public.identity_documents where id = p_document_id for update;
  if num_nonnulls(d.checked_at, d.refused_at, d.withdrawn_at) > 0 then
    raise exception 'this document is no longer to check' using errcode = '22023';
  end if;
  if char_length(p_note) > 1000 then
    raise exception 'the note is too long' using errcode = '22023';
  end if;
  update public.identity_documents
     set checked_at = now(), decided_by = auth.uid(), team_note = nullif(btrim(p_note), '')
   where id = d.id;
  -- Never the type nor anything of the document in the log.
  perform public.audit('identity.check', 'identity_document', d.id,
                       jsonb_build_object('buyer_id', d.buyer_id));
end;
$$;

-- The refusal of the team, with a reason its buyer reads (an unreadable
-- image, a document that has expired, not an identity document): « non
-- déposée » again, the buyer deposits another one.
create function public.identity_document_refuse(
  p_document_id uuid, p_reason text, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.identity_documents;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into d from public.identity_documents where id = p_document_id;
  if not found then
    raise exception 'document not found' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = d.buyer_id for update;
  select * into d from public.identity_documents where id = p_document_id for update;
  if num_nonnulls(d.checked_at, d.refused_at, d.withdrawn_at) > 0 then
    raise exception 'this document is no longer to check' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 3 and 1000 or char_length(p_note) > 1000 then
    raise exception 'a reason of 3 to 1000 characters is required' using errcode = '22023';
  end if;
  update public.identity_documents
     set refused_at = now(), refusal_reason = v_reason, decided_by = auth.uid(),
         team_note = nullif(btrim(p_note), '')
   where id = d.id;
  -- The document only: its reason is free text, and the log never expires.
  perform public.audit('identity.refuse', 'identity_document', d.id);
end;
$$;

-- Once the object is gone, the document says so (its buyer and the team no
-- longer see a link to it). Said by the team (in the audit log) or by its
-- buyer (a document withdrawn or replaced, an account just closed). Refused
-- while the document waits for its check, and while the file is still in the
-- bucket.
create function public.identity_document_file_removed(p_document_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.identity_documents;
  v_admin boolean := public.is_admin();
begin
  select * into d from public.identity_documents where id = p_document_id for update;
  if not found or not (v_admin or d.buyer_id = auth.uid()) then
    raise exception 'document not found' using errcode = '42501';
  end if;
  if num_nonnulls(d.checked_at, d.refused_at, d.withdrawn_at) = 0 then
    raise exception 'this document waits for its check' using errcode = '22023';
  end if;
  if exists (select 1 from storage.objects
              where bucket_id = 'documents' and name = d.storage_path) then
    raise exception 'the file of this document is still stored' using errcode = '22023';
  end if;
  if d.file_deleted_at is null then
    update public.identity_documents set file_deleted_at = now() where id = d.id;
    if v_admin then
      perform public.audit('identity.file_deleted', 'identity_document', d.id,
                           jsonb_build_object('buyer_id', d.buyer_id));
    end if;
  end if;
end;
$$;

-- The buyer is told, in the app and by email, when the team has checked or
-- refused the document. Never stops the decision.
create function public.identity_documents_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_type text := case when new.checked_at is not null then 'identity.checked' else 'identity.refused' end;
begin
  begin
    perform public.notification_add(
      new.buyer_id, v_type,
      jsonb_build_object('entity_id', new.id, 'document_id', new.id)
        || case when new.refused_at is not null
                then jsonb_build_object('reason', new.refusal_reason) else '{}'::jsonb end,
      '/acquereur/profil#identite', 'identity:' || new.id, now());
  exception when others then
    raise warning '% not sent for document %: %', v_type, new.id, sqlerrm;
  end;
  return null;
end;
$$;

create trigger identity_documents_notify
  after update of checked_at, refused_at on public.identity_documents
  for each row
  when ((old.checked_at is null and new.checked_at is not null)
        or (old.refused_at is null and new.refused_at is not null))
  execute function public.identity_documents_notify();

-- The documents of a buyer as the team reads them: with its note and who decided.
create function public.admin_identity_documents(p_buyer_id uuid)
returns table (
  id uuid, type public.identity_document_type, mime_type text, size_bytes int,
  created_at timestamptz, checked_at timestamptz, refused_at timestamptz, refusal_reason text,
  withdrawn_at timestamptz, decided_by_name text, team_note text, file_deleted_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select d.id, d.type, d.mime_type, d.size_bytes, d.created_at, d.checked_at, d.refused_at,
           d.refusal_reason, d.withdrawn_at,
           nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), d.team_note,
           d.file_deleted_at
      from public.identity_documents d
      left join public.profiles pr on pr.id = d.decided_by
     where d.buyer_id = p_buyer_id
     order by d.created_at desc;
end;
$$;

-- 5. ---------------------------------------------------------------------------
-- What a seller sees: the status of the identity of the buyers who hold an
-- invitation still valid to visit this property, or a visit of it that is
-- not cancelled. Never the file, never the type, never a date. An invitation
-- that has expired or a visit cancelled no longer tells them anything.
create function public.buyer_identity_for_seller(p_property_id uuid)
returns table (buyer_id uuid, identity_status public.identity_status)
language sql stable security definer set search_path = '' as $$
  select b.buyer_id, public.identity_status_of(b.buyer_id)
    from (select i.buyer_id from public.visit_invitations i
           where i.property_id = p_property_id and i.expires_at > now()
          union
          select v.buyer_id from public.visits v
           where v.property_id = p_property_id and v.status <> 'cancelled') b
   where public.owns_property(p_property_id);
$$;

-- 7. ---------------------------------------------------------------------------
-- The team opens the file of a document: written in the audit log before the
-- signed URL is issued (app/documents/identite/[id]/route.ts). The buyer who
-- opens their own file does not call it.
create function public.identity_document_opened(p_document_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_buyer uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select buyer_id into v_buyer from public.identity_documents where id = p_document_id;
  if not found then
    raise exception 'document not found' using errcode = '42501';
  end if;
  perform public.audit('identity.opened', 'identity_document', p_document_id,
                       jsonb_build_object('buyer_id', v_buyer));
end;
$$;

-- The files the scheduled task removes (/api/cron/anonymize-deleted, with the
-- service role): those of the documents that reached their end (a deletion
-- that failed after a decision, a withdrawal, a closure), and those no
-- document names for more than an hour (an upload never declared).
create function public.identity_files_to_sweep() returns table (path text)
language sql stable security definer set search_path = '' as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'documents' and o.name like '%/identity/%'
     and public.identity_file_buyer(o.name) is not null
     and (exists (select 1 from public.identity_documents d
                   where d.storage_path = o.name
                     and num_nonnulls(d.checked_at, d.refused_at, d.withdrawn_at) = 1)
          or (o.created_at < now() - interval '1 hour'
              and not exists (select 1 from public.identity_documents d
                               where d.storage_path = o.name)));
$$;

-- Then the documents that reached their end and whose file is no longer in
-- the bucket say so, each once, in the audit log (no actor: the task).
create function public.identity_files_mark_swept() returns int
language plpgsql security definer set search_path = '' as $$
declare
  d record;
  v_count int := 0;
begin
  for d in
    select x.id, x.buyer_id from public.identity_documents x
     where x.file_deleted_at is null
       and num_nonnulls(x.checked_at, x.refused_at, x.withdrawn_at) = 1
       and not exists (select 1 from storage.objects o
                        where o.bucket_id = 'documents' and o.name = x.storage_path)
       for update
  loop
    update public.identity_documents set file_deleted_at = now() where id = d.id;
    perform public.audit('identity.file_deleted', 'identity_document', d.id,
                         jsonb_build_object('buyer_id', d.buyer_id, 'by', 'sweep'));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.identity_status_of(uuid) from public, anon, authenticated;
revoke execute on function public.identity_documents_notify() from public, anon, authenticated;
revoke execute on function public.identity_file_buyer(text) from public, anon;
revoke execute on function public.identity_file_waiting(text) from public, anon;
revoke execute on function public.identity_file_ended(text) from public, anon;
revoke execute on function public.identity_files_room() from public, anon;
revoke execute on function public.identity_document_add(public.identity_document_type, text, text, int) from public, anon;
revoke execute on function public.identity_document_remove(uuid) from public, anon;
revoke execute on function public.identity_document_check(uuid, text) from public, anon;
revoke execute on function public.identity_document_refuse(uuid, text, text) from public, anon;
revoke execute on function public.identity_document_file_removed(uuid) from public, anon;
revoke execute on function public.admin_identity_documents(uuid) from public, anon;
revoke execute on function public.buyer_identity_for_seller(uuid) from public, anon;
grant execute on function public.identity_file_buyer(text) to authenticated;
grant execute on function public.identity_file_waiting(text) to authenticated;
grant execute on function public.identity_file_ended(text) to authenticated;
grant execute on function public.identity_files_room() to authenticated;
grant execute on function public.identity_document_add(public.identity_document_type, text, text, int) to authenticated;
grant execute on function public.identity_document_remove(uuid) to authenticated;
grant execute on function public.identity_document_check(uuid, text) to authenticated;
grant execute on function public.identity_document_refuse(uuid, text, text) to authenticated;
grant execute on function public.identity_document_file_removed(uuid) to authenticated;
grant execute on function public.admin_identity_documents(uuid) to authenticated;
grant execute on function public.buyer_identity_for_seller(uuid) to authenticated;
revoke execute on function public.identity_document_opened(uuid) from public, anon;
grant execute on function public.identity_document_opened(uuid) to authenticated;
revoke execute on function public.identity_files_to_sweep() from public, anon, authenticated;
revoke execute on function public.identity_files_mark_swept() from public, anon, authenticated;
grant execute on function public.identity_files_to_sweep() to service_role;
grant execute on function public.identity_files_mark_swept() to service_role;

-- 4. ---------------------------------------------------------------------------
-- visit_book of 20261117120000_visits.sql, with the identity document of the
-- buyer deposited (provided or checked): the only change.
create or replace function public.visit_book(p_token text, p_slot uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  i public.visit_invitations := public.visit_invitation_of(p_token);
  s public.visit_slots;
  v_id uuid;
begin
  if i.id is null or not public.is_active_user() then
    raise exception 'invitation not found or expired' using errcode = '42501';
  end if;
  -- An identity document deposited, checked or not: the delay of the team
  -- never blocks a visit.
  if public.identity_status_of(i.buyer_id) = 'not_provided' then
    raise exception 'the identity document is missing' using errcode = '55000';
  end if;
  -- One booking at a time per invitation: one visit to come per property.
  perform 1 from public.visit_invitations where id = i.id for update;
  select * into s from public.visit_slots
   where id = p_slot and property_id = i.property_id and removed_at is null for update;
  if not found then
    raise exception 'not a slot of this property' using errcode = '22023';
  end if;
  if s.starts_at <= now() + interval '2 hours' then
    raise exception 'too late to book this slot' using errcode = '22023';
  end if;
  if not public.property_visitable(i.property_id) then
    raise exception 'the listing is not online' using errcode = '22023';
  end if;
  if (select count(*) from public.visits v where v.slot_id = s.id and v.status = 'confirmed') >= s.capacity then
    raise exception 'this slot is full' using errcode = '23P01';
  end if;
  if exists (select 1 from public.visits v join public.visit_slots vs on vs.id = v.slot_id
              where v.property_id = i.property_id and v.buyer_id = i.buyer_id
                and v.status = 'confirmed' and vs.starts_at > now()) then
    raise exception 'a visit of this property is already booked' using errcode = '23505';
  end if;
  insert into public.visits (slot_id, property_id, buyer_id)
  values (s.id, i.property_id, i.buyer_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- 6. ---------------------------------------------------------------------------
-- account_export of 20261123110000_advisor_interventions.sql, with the
-- metadata of the identity documents of the account: the only change.
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
                      'deleted_at', d.deleted_at) order by d.created_at), '[]')
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

-- account_anonymize of 20261123110000_advisor_interventions.sql, with the
-- identity documents of the account deleted: the only change.
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
  -- The identity documents: their rows (their files go first, account_files).
  delete from public.identity_documents where buyer_id = p_profile;
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
  -- The interventions of the adviser: what the seller wrote, what the team noted.
  update public.advisor_interventions set message = null, team_note = null
   where property_id in (select id from public.properties where owner_id = p_profile);
end;
$$;

-- account_close of 20261123110000_advisor_interventions.sql, with the
-- identity document that waits for its check withdrawn: the only change.
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
  -- The interventions asked of the adviser on its properties that still wait: cancelled.
  perform public.advisor_interventions_cancel_open(p.id)
     from public.properties p where p.owner_id = v_me;
  -- Its identity document that still waits for its check: withdrawn, the team
  -- no longer has it to check; the closing action then removes its file at
  -- once (the scheduled task takes it otherwise).
  update public.identity_documents set withdrawn_at = v_at
   where buyer_id = v_me and checked_at is null and refused_at is null and withdrawn_at is null;
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

-- account_files of 20261117120300_account_deletion_lot3.sql, with the files
-- of the identity folder of the account: the only change.
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
  -- Photos (three widths each), financing documents, identity documents, sale files.
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
    -- Every file of its identity folder, a file never declared included.
    select 'documents'::text, o.name
      from storage.objects o
     where o.bucket_id = 'documents' and o.name like p_profile::text || '/identity/%'
    union all
    -- Every file of the folder of its properties, a file never filed included.
    select 'documents'::text, o.name
      from storage.objects o
      join public.properties p on o.name like p.id::text || '/sale/%'
     where o.bucket_id = 'documents' and p.owner_id = p_profile;
end;
$$;
