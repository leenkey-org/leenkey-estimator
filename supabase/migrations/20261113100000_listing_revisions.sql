-- L1-35: the history of a listing changed once online (SPEC-V2 4 and 8.3,
-- DECISIONS.md 2026-10-01 and 2026-10-19). A listing online or paused changes
-- without a new review (decision of the client) ; each change of its price,
-- title or description, each photo added, removed or whose caption changes is
-- written in `listing_revisions` by the database, read by its seller and the
-- team, and the team is told in the bell (`listing.revised`, in the app only,
-- SPEC 10) to check it afterwards.
--
-- Paused counts as online: a paused listing goes back online without review
-- (listing_resume). A listing in review is reviewed anyway; a draft, a
-- rejected, sold or suspended listing is not followed.

create table public.listing_revisions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  changed_by uuid not null references public.profiles(id),
  -- 'photo' (DECISIONS.md 2026-10-19): old and new value {id, caption};
  -- added = no old value, removed = no new value.
  field text not null check (field in ('price', 'description', 'title', 'photo')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now(),
  constraint listing_revisions_some_value check (old_value is not null or new_value is not null)
);
create index listing_revisions_listing_idx on public.listing_revisions (listing_id, created_at desc);
create index listing_revisions_changed_by_idx on public.listing_revisions (changed_by);

alter table public.listing_revisions enable row level security;

-- Read: the seller of the listing, the team. Never written by a client: the
-- triggers below write it (security definer), nothing updates or deletes it.
create policy listing_revisions_select_owner_or_admin on public.listing_revisions
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.listings l
                where l.id = listing_id and public.owns_property(l.property_id))
  );

revoke all on public.listing_revisions from anon;
revoke insert, update, delete, truncate on public.listing_revisions from authenticated;
grant select on public.listing_revisions to authenticated;

-- ---------------------------------------------------------------------------
-- Who changed it: the session. A change made without one (the seed that
-- loads its photos, a script of the team) is not a change of the seller and
-- is not followed.
-- ---------------------------------------------------------------------------
create function public.listing_revision_add(
  p_listing public.listings, p_field text, p_old jsonb, p_new jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.listing_revisions (listing_id, changed_by, field, old_value, new_value)
  values (p_listing.id, auth.uid(), p_field, p_old, p_new);
end;
$$;

-- ---------------------------------------------------------------------------
-- Price, title, description of a listing online or paused.
-- ---------------------------------------------------------------------------
create function public.listings_track_revisions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status not in ('published', 'paused') or new.status not in ('published', 'paused')
     or new.deleted_at is not null then
    return new;
  end if;
  if new.price_cents is distinct from old.price_cents then
    perform public.listing_revision_add(new, 'price', to_jsonb(old.price_cents), to_jsonb(new.price_cents));
  end if;
  if new.title is distinct from old.title then
    perform public.listing_revision_add(new, 'title', to_jsonb(old.title), to_jsonb(new.title));
  end if;
  if new.description is distinct from old.description then
    perform public.listing_revision_add(new, 'description', to_jsonb(old.description), to_jsonb(new.description));
  end if;
  return new;
end;
$$;

create trigger listings_track_revisions
  after update of price_cents, title, description on public.listings
  for each row execute function public.listings_track_revisions();

-- ---------------------------------------------------------------------------
-- A photo added, removed, or its caption changed (not its order nor the
-- cover: what the buyers read does not change).
-- ---------------------------------------------------------------------------
create function public.photos_track_revisions() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
  v_property uuid := coalesce(new.property_id, old.property_id);
begin
  select * into l from public.listings
   where property_id = v_property and status in ('published', 'paused') and deleted_at is null;
  if not found then
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform public.listing_revision_add(l, 'photo', null,
      jsonb_build_object('id', new.id, 'caption', new.caption));
  elsif tg_op = 'DELETE' then
    perform public.listing_revision_add(l, 'photo',
      jsonb_build_object('id', old.id, 'caption', old.caption), null);
  elsif new.caption is distinct from old.caption then
    perform public.listing_revision_add(l, 'photo',
      jsonb_build_object('id', old.id, 'caption', old.caption),
      jsonb_build_object('id', new.id, 'caption', new.caption));
  end if;
  return null;
end;
$$;

create trigger photos_track_revisions
  after insert or delete or update of caption on public.photos
  for each row execute function public.photos_track_revisions();

-- ---------------------------------------------------------------------------
-- The team is told (listing.revised, SPEC 10: in the app, no email): one
-- unread notification per listing and per admin, which gathers the fields
-- changed and comes back to the top at each change. A change made by an
-- admin tells no one.
-- ---------------------------------------------------------------------------
create function public.listing_revisions_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
  p public.properties;
  admin_id uuid;
  existing uuid;
  info jsonb;
begin
  if exists (select 1 from public.profiles where id = new.changed_by and 'admin' = any(roles)) then
    return null;
  end if;
  select * into l from public.listings where id = new.listing_id;
  select * into p from public.properties where id = l.property_id;
  info := jsonb_build_object(
    'entity_id', l.id,
    'listing_id', l.id,
    'property_id', l.property_id,
    'reference', l.reference,
    'title', l.title,
    'city', p.city);
  for admin_id in
    select id from public.profiles
     where 'admin' = any(roles) and deleted_at is null and suspended_at is null
  loop
    select id into existing from public.notifications
     where profile_id = admin_id and type = 'listing.revised' and read_at is null
       and data->>'listing_id' = l.id::text
     limit 1;
    if existing is null then
      perform public.notification_add(
        admin_id, 'listing.revised',
        info || jsonb_build_object('fields', jsonb_build_array(new.field),
                                   'old_price_cents', case when new.field = 'price' then new.old_value end,
                                   'price_cents', l.price_cents),
        '/admin/annonces/' || l.id || '#modifications', 'listings:revised');
    else
      update public.notifications n
         set data = n.data || info || jsonb_build_object(
               'fields', (select jsonb_agg(distinct f) from (
                            select jsonb_array_elements_text(coalesce(n.data->'fields', '[]'::jsonb)) as f
                            union select new.field) fields),
               'old_price_cents', coalesce(n.data->'old_price_cents',
                                           case when new.field = 'price' then new.old_value end),
               'price_cents', l.price_cents),
             created_at = now()
       where n.id = existing;
    end if;
  end loop;
  return null;
end;
$$;

create trigger listing_revisions_notify
  after insert on public.listing_revisions
  for each row execute function public.listing_revisions_notify();

revoke execute on function public.listing_revision_add(public.listings, text, jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.listings_track_revisions() from public, anon, authenticated;
revoke execute on function public.photos_track_revisions() from public, anon, authenticated;
revoke execute on function public.listing_revisions_notify() from public, anon, authenticated;
