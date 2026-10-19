-- L1-14b: a listing sent for review, online or paused changes from the page
-- of its property and stays as it is (SPEC-V2 8.3, decision of the client):
-- its characteristics, its photos, its price, title and description. Not its
-- address once sent (DECISIONS, 2026-10-19), nothing once sold, nothing once
-- suspended by Leenkey (property_is_editable, L1-04). The type, the surface
-- and the rooms stay filled (properties_keep_complete, L1-11). Replayable
-- (or replace): the connector that applies it on staging records its own
-- version (DECISIONS, outillage des migrations).

-- Who uploads a file: the owner of an editable property (not suspended),
-- with an active account, during the creation and once the listing is sent
-- (in review, online, paused), never for a sold one. The server converts
-- every photo it sends (L1-12).
create or replace function public.photo_file_writable(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.photo_file_removable(p_name)
     and not exists (select 1 from public.listings l
                      where l.property_id = public.photo_file_property(p_name)
                        and l.deleted_at is null and l.status = 'sold');
$$;

-- A photo is added at the end, 15 at most; the first one is the cover. The
-- property is locked: two photos added at the same moment never take the
-- same place, nor a 16th one. The place given on insert is ignored.
create or replace function public.photos_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  taken int;
begin
  -- Someone else's property, or a suspended one: refused here, with the
  -- error of the RLS, whatever changes before the RLS checks it.
  if auth.uid() is not null and not public.property_is_editable(new.property_id) then
    raise exception 'property not found' using errcode = '42501';
  end if;
  perform 1 from public.properties where id = new.property_id for update;
  -- Added during the creation and once the listing is sent (L1-14b), as
  -- their files; never to a sold listing.
  if auth.uid() is not null and exists (
       select 1 from public.listings l
        where l.property_id = new.property_id and l.deleted_at is null
          and l.status = 'sold') then
    raise exception 'photos are not added to a sold listing' using errcode = '42501';
  end if;
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

-- The address of a listing sent for review, online, paused or sold no longer
-- changes: it gives the commune and the zone shown to buyers, reviewed by
-- Leenkey. Only the admin changes it; a draft or a rejected listing changes
-- it at step 1. Without a session (seed, scripts): as it is. A suspended one
-- is already read only for the seller (RLS).
create or replace function public.properties_keep_address() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and exists (select 1 from public.listings l
                  where l.property_id = new.id and l.deleted_at is null
                    and l.status not in ('draft', 'rejected')) then
    raise exception 'the address of a listing sent for review does not change'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Compared as text: the same in any search_path (location is a geography).
create or replace trigger properties_keep_address
  before update of address_line, postal_code, city, district, location on public.properties
  for each row
  when (old.address_line is distinct from new.address_line
        or old.postal_code is distinct from new.postal_code
        or old.city is distinct from new.city
        or old.district is distinct from new.district
        or old.location::text is distinct from new.location::text)
  execute function public.properties_keep_address();

revoke execute on function public.photos_before_insert() from public, anon, authenticated;
revoke execute on function public.properties_keep_address() from public, anon, authenticated;
revoke execute on function public.photo_file_writable(text) from public, anon;
grant execute on function public.photo_file_writable(text) to authenticated;
