-- L1-11: creation of a property in steps (SPEC-V2 section 8.3). The property
-- is saved from the first step, its address, as a draft: the type, the
-- surface and the rooms come with the second step, and the seller may leave
-- before. They stay required to send a listing for review: listing_submit
-- checks them, and a property whose listing has been sent (pending, then
-- published, paused, suspended, sold) cannot lose them again, whoever writes
-- it, so listing_publish and the public pages can rely on them. No new table
-- and no new right: the RLS and the column grants of L1-04 apply.

alter table public.properties
  alter column type drop not null,
  alter column surface_m2 drop not null,
  alter column rooms drop not null;

-- As in L1-04, plus the check of the property. create or replace keeps the
-- rights (revoked from public and anon, granted to authenticated).
create or replace function public.listing_submit(p_listing_id uuid, p_review jsonb default null)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_for_seller(p_listing_id);
begin
  if l.status not in ('draft', 'rejected') then
    perform public.listing_bad_transition(l.status, 'submit');
  end if;
  if exists (select 1 from public.properties p
              where p.id = l.property_id
                and (p.type is null or p.surface_m2 is null or p.rooms is null)) then
    raise exception 'the property is incomplete: type, surface and rooms are required'
      using errcode = '22023';
  end if;
  update public.listings
     set status = 'pending', submitted_at = now(), rejection_reason = null, review = p_review
   where id = l.id;
  return 'pending';
end;
$$;

-- Back to a draft (cancelled submission, rejection), the property may be
-- incomplete again: listing_submit checks it at the next sending. Security
-- definer: the check sees the listing whatever the RLS of the writer.
create function public.properties_keep_complete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.type is null or new.surface_m2 is null or new.rooms is null)
     and exists (select 1 from public.listings l
                  where l.property_id = new.id and l.deleted_at is null
                    and l.status not in ('draft', 'rejected')) then
    raise exception 'the property of a listing sent for review keeps its type, surface and rooms'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger properties_keep_complete before update of type, surface_m2, rooms on public.properties
  for each row execute function public.properties_keep_complete();

revoke execute on function public.properties_keep_complete() from public, anon, authenticated;
