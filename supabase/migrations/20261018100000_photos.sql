-- L1-12: photos of a property (SPEC-V2 section 4 « Storage », 8.3). The
-- seller adds them at step 2 of the creation: each one is converted on the
-- server into WebP files of 400, 800 and 1600 px wide,
-- `{property_id}/{uuid}-{size}.webp` in the private bucket `photos`, and
-- declared in public.photos (L1-04) by its base `{property_id}/{uuid}`. 15 at
-- most, in the order chosen by the seller; the first one is the main photo
-- (cover). Files are read through the route /img, which signs a URL of one
-- hour: the storage policies below decide who may, without the service role
-- (DECISIONS Q24): the owner, the admin, and anyone for the photos of a
-- published listing. Replayable (if not exists, or replace).

-- Private bucket. On the platform (columns of the storage service), WebP
-- files of 2 MB at most only.
insert into storage.buckets (id, name) values ('photos', 'photos') on conflict (id) do nothing;
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'storage' and table_name = 'buckets'
                and column_name = 'allowed_mime_types') then
    update storage.buckets
       set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/webp']
     where id = 'photos';
  end if;
end;
$$;

-- The property of a file `{property_id}/{uuid}-{400|800|1600}.webp`; null
-- for any other name.
create or replace function public.photo_file_property(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(400|800|1600)\.webp$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

-- Who reads a file: the owner of the property, the admin, and anyone when it
-- is a size of a declared photo of a published listing (a file uploaded
-- without its photo stays private).
create or replace function public.photo_file_readable(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  p uuid := public.photo_file_property(p_name);
begin
  if p is null then
    return false;
  end if;
  if public.owns_property(p) or public.is_admin() then
    return true;
  end if;
  return exists (
    select 1
      from public.photos ph
      join public.properties pr on pr.id = ph.property_id
      join public.listings l on l.property_id = pr.id
     where ph.property_id = p
       and ph.storage_path = regexp_replace(p_name, '-(400|800|1600)\.webp$', '')
       and l.status = 'published' and l.deleted_at is null and pr.deleted_at is null);
end;
$$;

-- Who uploads or deletes a file: the owner, while the property is editable
-- (not suspended), with an active account.
create or replace function public.photo_file_writable(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.photo_file_property(p_name) is not null
     and public.property_is_editable(public.photo_file_property(p_name))
     and public.is_active_user();
$$;

drop policy if exists photos_files_select on storage.objects;
create policy photos_files_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'photos' and public.photo_file_readable(name));

drop policy if exists photos_files_insert on storage.objects;
create policy photos_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and public.photo_file_writable(name));

drop policy if exists photos_files_delete on storage.objects;
create policy photos_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.photo_file_writable(name));
-- No update policy: a file is never replaced, a new photo has a new name.

-- A photo is `{property_id}/{uuid}`, the base of its files (L1-04 only asked
-- for the folder). A constraint, not the trigger: checked after the RLS,
-- someone else's property stays « refused », not « malformed ».
alter table public.photos drop constraint if exists photos_path_in_property;
alter table public.photos add constraint photos_path_in_property check (
  storage_path ~ ('^' || property_id::text
                  || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'));

-- A photo is added at the end, 15 at most; the first one is the cover. The
-- property is locked: two photos added at the same moment never take the
-- same place, nor a 16th one. The place given on insert is ignored.
alter table public.photos alter column position set default 0;

create or replace function public.photos_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  taken int;
begin
  perform 1 from public.properties where id = new.property_id for update;
  select count(*) into taken from public.photos where property_id = new.property_id;
  if taken >= 15 then
    raise exception 'a property has 15 photos at most' using errcode = '23514';
  end if;
  new.position := coalesce(
    (select max(position) + 1 from public.photos where property_id = new.property_id), 0);
  new.is_cover := taken = 0;
  return new;
end;
$$;

drop trigger if exists photos_before_insert on public.photos;
create trigger photos_before_insert before insert on public.photos
  for each row execute function public.photos_before_insert();

-- The cover deleted, the next photo takes its place.
create or replace function public.photos_after_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_cover then
    update public.photos set is_cover = true
     where id = (select id from public.photos
                  where property_id = old.property_id order by position limit 1);
  end if;
  return null;
end;
$$;

drop trigger if exists photos_after_delete on public.photos;
create trigger photos_after_delete after delete on public.photos
  for each row execute function public.photos_after_delete();

-- The order chosen by the seller: every photo of the property, once; the
-- first one becomes the cover.
create or replace function public.photos_reorder(p_property_id uuid, p_photo_ids uuid[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  given int := coalesce(array_length(p_photo_ids, 1), 0);
begin
  if not public.property_is_editable(p_property_id) or not public.is_active_user() then
    raise exception 'property not found' using errcode = '42501';
  end if;
  perform 1 from public.properties where id = p_property_id for update;
  if given <> (select count(*) from public.photos where property_id = p_property_id)
     or given <> (select count(distinct id) from unnest(p_photo_ids) as id)
     or exists (select 1 from public.photos
                 where property_id = p_property_id and not (id = any (p_photo_ids))) then
    raise exception 'the order lists every photo of the property once' using errcode = '22023';
  end if;
  update public.photos ph set position = array_position(p_photo_ids, ph.id) - 1
   where ph.property_id = p_property_id;
  update public.photos set is_cover = false
   where property_id = p_property_id and is_cover and id <> p_photo_ids[1];
  update public.photos set is_cover = true where id = p_photo_ids[1] and not is_cover;
end;
$$;

-- Photos of published listings, in order (the cover only for the search
-- results), with the number of photos of each.
create or replace function public.public_listing_photos(p_listing_ids uuid[], p_cover_only boolean default false)
returns table (listing_id uuid, path text, width int, height int, "position" int, caption text, total int)
language sql stable security definer set search_path = '' as $$
  select l.id, ph.storage_path, ph.width, ph.height, ph.position, ph.caption,
         (select count(*)::int from public.photos c where c.property_id = p.id)
    from public.listings l
    join public.properties p on p.id = l.property_id
    join public.photos ph on ph.property_id = p.id
   where l.id = any (p_listing_ids[1:100])
     and l.status = 'published' and l.deleted_at is null and p.deleted_at is null
     and (not p_cover_only or ph.is_cover)
   order by l.id, ph.position;
$$;

revoke execute on function public.photos_before_insert() from public, anon, authenticated;
revoke execute on function public.photos_after_delete() from public, anon, authenticated;
revoke execute on function public.photos_reorder(uuid, uuid[]) from public, anon;
grant execute on function public.photos_reorder(uuid, uuid[]) to authenticated;
-- Called by the storage policies, for visitors too.
grant execute on function public.photo_file_property(text) to anon, authenticated;
grant execute on function public.photo_file_readable(text) to anon, authenticated;
revoke execute on function public.photo_file_writable(text) from public, anon;
grant execute on function public.photo_file_writable(text) to authenticated;
grant execute on function public.public_listing_photos(uuid[], boolean) to anon, authenticated;
