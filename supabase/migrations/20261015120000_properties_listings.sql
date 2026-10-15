-- L1-04: estimations, properties, listings, photos, listing_views, favorites,
-- public_listings, listing reference sequence, status transition functions, RLS.
-- Reference: docs/SPEC-V2.md sections 4 (Biens et annonces, Vue publique) and 5.
-- audit_log is created here (planned in L1-05) because the admin transitions
-- below must write to it.

create extension if not exists postgis with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Active account: not suspended, not deleted. Blocks writes of suspended users.
create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and suspended_at is null and deleted_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- audit_log (SPEC section 4, "Accompagnement, assistant, notifications, audit")
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,                 -- ex: 'listing.publish', 'user.suspend'
  entity text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);

alter table public.audit_log enable row level security;
create policy audit_log_select_admin on public.audit_log
  for select to authenticated using (public.is_admin());
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- Internal: called by security definer functions only.
create function public.audit(p_action text, p_entity text, p_entity_id uuid, p_meta jsonb default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_meta);
$$;

-- ---------------------------------------------------------------------------
-- estimations: value analyses made on the estimator (V1 engine)
-- ---------------------------------------------------------------------------
create table public.estimations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  input jsonb not null check (pg_column_size(input) <= 65536),
  result jsonb not null check (pg_column_size(result) <= 262144),
  value_cents bigint check (value_cents >= 0),
  low_cents bigint check (low_cents >= 0),
  high_cents bigint check (high_cents >= 0),
  email text check (char_length(email) <= 254),
  claim_token text unique,
  created_at timestamptz not null default now()
);
create index estimations_profile_idx on public.estimations (profile_id);

alter table public.estimations enable row level security;
create policy estimations_select_own_or_admin on public.estimations
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
revoke all on public.estimations from anon, authenticated;
grant select (id, profile_id, input, result, value_cents, low_cents, high_cents, email, created_at)
  on public.estimations to authenticated;

-- Written by /api/estimate with the caller's session (anonymous or signed in).
-- Returns the id and a single-use token the browser keeps to attach the
-- estimation to the account created afterwards (estimation_claim).
create function public.estimation_record(
  p_input jsonb, p_result jsonb,
  p_value_cents bigint default null, p_low_cents bigint default null,
  p_high_cents bigint default null, p_email text default null
) returns table (id uuid, claim_token text)
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
  token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if p_input is null or p_result is null then
    raise exception 'input and result are required' using errcode = '22023';
  end if;
  insert into public.estimations (profile_id, input, result, value_cents, low_cents, high_cents, email, claim_token)
  values (auth.uid(), p_input, p_result, p_value_cents, p_low_cents, p_high_cents,
          nullif(btrim(p_email), ''),
          case when auth.uid() is null then token else null end)
  returning estimations.id into new_id;
  return query select new_id, case when auth.uid() is null then token else null end;
end;
$$;

create function public.estimation_claim(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  claimed uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  update public.estimations
     set profile_id = auth.uid(), claim_token = null
   where claim_token = p_token and profile_id is null
  returning estimations.id into claimed;
  if claimed is null then
    raise exception 'invalid or used token' using errcode = '22023';
  end if;
  return claimed;
end;
$$;

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  type public.property_type not null,
  address_line text not null check (char_length(address_line) between 3 and 200),
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  city text not null check (char_length(city) between 1 and 100),
  district text check (char_length(district) <= 100),
  location extensions.geography(point, 4326),
  public_location extensions.geography(point, 4326),
  surface_m2 numeric(7,2) not null check (surface_m2 > 0),
  carrez_m2 numeric(7,2) check (carrez_m2 > 0),
  rooms int not null check (rooms between 0 and 100),
  bedrooms int check (bedrooms between 0 and 100),
  floor int check (floor between -5 and 200),
  floors_total int check (floors_total between 0 and 200),
  has_elevator boolean, has_balcony boolean, has_terrace boolean,
  has_garden boolean, has_parking boolean, has_cellar boolean,
  orientation text check (char_length(orientation) <= 40),
  build_year int check (build_year between 1000 and 2100),
  is_new_build boolean not null default false,
  dpe_class char(1) check (dpe_class in ('A','B','C','D','E','F','G')),
  ges_class char(1) check (ges_class in ('A','B','C','D','E','F','G')),
  heating text check (char_length(heating) <= 80),
  charges_monthly_cents int check (charges_monthly_cents >= 0),
  property_tax_yearly_cents int check (property_tax_yearly_cents >= 0),
  copro_lots int check (copro_lots >= 0),
  estimation_id uuid references public.estimations(id),
  estimation_value_cents bigint check (estimation_value_cents >= 0),
  estimation_low_cents bigint check (estimation_low_cents >= 0),
  estimation_high_cents bigint check (estimation_high_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
create index properties_owner_idx on public.properties (owner_id);
create index properties_public_location_idx on public.properties using gist (public_location);

create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

-- public_location: the exact point snapped to a ~200 m grid. Always computed
-- here, never taken from the client; the exact location is never public.
create function public.properties_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lat double precision;
  lon double precision;
  step_lat constant double precision := 0.0018;
  step_lon double precision;
begin
  if new.location is null then
    new.public_location := null;
  else
    lat := extensions.st_y(new.location::extensions.geometry);
    lon := extensions.st_x(new.location::extensions.geometry);
    step_lon := step_lat / greatest(cos(radians(lat)), 0.01);
    new.public_location := extensions.st_setsrid(
      extensions.st_makepoint(round(lon / step_lon) * step_lon, round(lat / step_lat) * step_lat),
      4326)::extensions.geography;
  end if;

  if new.estimation_id is not null
     and (tg_op = 'INSERT' or new.estimation_id is distinct from old.estimation_id)
     and not exists (select 1 from public.estimations e
                     where e.id = new.estimation_id and e.profile_id = new.owner_id) then
    raise exception 'estimation does not belong to the owner' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger properties_before_write before insert or update on public.properties
  for each row execute function public.properties_before_write();

-- SPEC section 5
create function public.owns_property(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.properties where id = p and owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------
create sequence public.listing_reference_seq;

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  reference text not null unique check (reference ~ '^LK-[0-9]{4,}$'),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) <= 6000),
  price_cents bigint not null check (price_cents > 0),
  status public.listing_status not null default 'draft',
  rejection_reason text check (char_length(rejection_reason) <= 2000),
  submitted_at timestamptz, published_at timestamptz, sold_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text check (char_length(suspension_reason) <= 2000),
  sold_price_cents bigint check (sold_price_cents > 0),
  review jsonb,
  summary text,
  views_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
create index listings_status_idx on public.listings (status) where deleted_at is null;

create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

create function public.slugify(p text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p, ''))),
                              '[^a-z0-9]+', '-', 'g'), '-');
$$;

-- Reference LK-0001 (4 digits, more beyond 9999) and slug
-- "appartement-3-pieces-savigny-sur-orge-lk0001", set once at creation.
create function public.listings_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n bigint := nextval('public.listing_reference_seq');
  num text := case when n < 10000 then lpad(n::text, 4, '0') else n::text end;
  prop record;
  label text;
begin
  select type, rooms, city into prop from public.properties where id = new.property_id;
  label := case prop.type
             when 'appartement' then 'appartement'
             when 'maison' then 'maison'
             when 'terrain' then 'terrain'
             else 'bien'
           end;
  if prop.type in ('appartement', 'maison') and prop.rooms > 0 then
    label := label || ' ' || prop.rooms || ' pieces';
  end if;
  new.reference := 'LK-' || num;
  new.slug := public.slugify(label || ' ' || prop.city) || '-lk' || num;
  new.status := 'draft';
  return new;
end;
$$;

create trigger listings_before_insert before insert on public.listings
  for each row execute function public.listings_before_insert();

-- Suspended listings are read-only for the seller (SPEC section 5).
create function public.property_is_editable(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.properties where id = p and owner_id = auth.uid() and deleted_at is null)
     and not exists (select 1 from public.listings where property_id = p and status = 'suspended');
$$;

create function public.listing_is_public(p_listing_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l join public.properties p on p.id = l.property_id
    where l.id = p_listing_id and l.status = 'published'
      and l.deleted_at is null and p.deleted_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: properties
-- ---------------------------------------------------------------------------
alter table public.properties enable row level security;

create policy properties_select_owner_or_admin on public.properties
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy properties_insert_owner on public.properties
  for insert to authenticated
  with check (owner_id = auth.uid() and public.is_active_user());

create policy properties_update_owner on public.properties
  for update to authenticated
  using (public.property_is_editable(id) and public.is_active_user())
  with check (owner_id = auth.uid());

create policy properties_update_admin on public.properties
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.properties from anon, authenticated;
grant select on public.properties to authenticated;
grant insert (owner_id, type, address_line, postal_code, city, district, location,
              surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total,
              has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar,
              orientation, build_year, is_new_build, dpe_class, ges_class, heating,
              charges_monthly_cents, property_tax_yearly_cents, copro_lots,
              estimation_id, estimation_value_cents, estimation_low_cents, estimation_high_cents)
  on public.properties to authenticated;
grant update (type, address_line, postal_code, city, district, location,
              surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total,
              has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar,
              orientation, build_year, is_new_build, dpe_class, ges_class, heating,
              charges_monthly_cents, property_tax_yearly_cents, copro_lots,
              estimation_id, estimation_value_cents, estimation_low_cents, estimation_high_cents)
  on public.properties to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: listings. Public reads go through public_listings, never this table.
-- ---------------------------------------------------------------------------
alter table public.listings enable row level security;

create policy listings_select_owner_or_admin on public.listings
  for select to authenticated
  using (public.owns_property(property_id) or public.is_admin());

create policy listings_insert_owner on public.listings
  for insert to authenticated
  with check (public.property_is_editable(property_id) and public.is_active_user());

create policy listings_update_owner on public.listings
  for update to authenticated
  using (public.property_is_editable(property_id) and public.is_active_user() and deleted_at is null)
  with check (public.owns_property(property_id) and status <> 'suspended');

create policy listings_update_admin on public.listings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- status and every workflow column change only through the functions below.
revoke all on public.listings from anon, authenticated;
grant select on public.listings to authenticated;
grant insert (property_id, title, description, price_cents) on public.listings to authenticated;
grant update (title, description, price_cents) on public.listings to authenticated;
revoke all on sequence public.listing_reference_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null unique,
  width int check (width > 0),
  height int check (height > 0),
  position int not null check (position >= 0),
  is_cover boolean not null default false,
  caption text check (char_length(caption) <= 200),
  created_at timestamptz not null default now(),
  constraint photos_path_in_property check (storage_path like property_id::text || '/%'),
  constraint photos_position_unique unique (property_id, position) deferrable initially deferred
);
create unique index photos_one_cover_idx on public.photos (property_id) where is_cover;

alter table public.photos enable row level security;

create policy photos_select_owner_or_admin on public.photos
  for select to authenticated
  using (public.owns_property(property_id) or public.is_admin());

create policy photos_insert_owner on public.photos
  for insert to authenticated
  with check (public.property_is_editable(property_id) and public.is_active_user());

create policy photos_update_owner on public.photos
  for update to authenticated
  using (public.property_is_editable(property_id) and public.is_active_user())
  with check (public.property_is_editable(property_id));

create policy photos_delete_owner on public.photos
  for delete to authenticated
  using (public.property_is_editable(property_id) and public.is_active_user());

revoke all on public.photos from anon, authenticated;
grant select, delete on public.photos to authenticated;
grant insert (property_id, storage_path, width, height, position, is_cover, caption)
  on public.photos to authenticated;
grant update (position, is_cover, caption) on public.photos to authenticated;

-- ---------------------------------------------------------------------------
-- listing_views: daily aggregates, no individual tracking
-- ---------------------------------------------------------------------------
create table public.listing_views (
  listing_id uuid references public.listings(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (listing_id, day)
);

alter table public.listing_views enable row level security;
create policy listing_views_select_owner_or_admin on public.listing_views
  for select to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id and public.owns_property(l.property_id))
         or public.is_admin());
revoke all on public.listing_views from anon, authenticated;
grant select on public.listing_views to authenticated;

create function public.listing_view_increment(p_listing_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.listing_is_public(p_listing_id) then
    return;
  end if;
  insert into public.listing_views (listing_id, day, count)
  values (p_listing_id, (now() at time zone 'Europe/Paris')::date, 1)
  on conflict (listing_id, day) do update set count = public.listing_views.count + 1;
  update public.listings set views_count = views_count + 1 where id = p_listing_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
create table public.favorites (
  buyer_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, listing_id)
);
create index favorites_listing_idx on public.favorites (listing_id);

alter table public.favorites enable row level security;

create policy favorites_select_own_or_admin on public.favorites
  for select to authenticated
  using (buyer_id = auth.uid() or public.is_admin());

create policy favorites_insert_own on public.favorites
  for insert to authenticated
  with check (buyer_id = auth.uid() and public.is_active_user() and public.listing_is_public(listing_id));

create policy favorites_delete_own on public.favorites
  for delete to authenticated
  using (buyer_id = auth.uid());

revoke all on public.favorites from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (buyer_id, listing_id) on public.favorites to authenticated;

-- ---------------------------------------------------------------------------
-- public_listings (SPEC section 4, DECISIONS Q20)
-- A security_invoker view over properties/profiles would return nothing to
-- visitors (no rights on those tables). The rows come from a security definer
-- function that only returns published listings and only public columns; the
-- view keeps the documented name and shape. "plan" is filled in L1-05 when
-- sale_progress exists (create or replace).
-- ---------------------------------------------------------------------------
create function public.public_listings_rows()
returns table (
  id uuid, slug text, reference text, title text, description text,
  price_cents bigint, published_at timestamptz,
  type public.property_type, city text, postal_code text, district text,
  public_location extensions.geography, public_lat double precision, public_lng double precision,
  surface_m2 numeric, rooms int, bedrooms int, floor int,
  has_elevator boolean, has_balcony boolean, has_terrace boolean, has_garden boolean,
  has_parking boolean, has_cellar boolean, orientation text, build_year int,
  dpe_class char(1), ges_class char(1), charges_monthly_cents int,
  property_tax_yearly_cents int, seller_first_name text, plan public.plan_code
)
language sql stable security definer set search_path = '' as $$
  select l.id, l.slug, l.reference, l.title, l.description, l.price_cents, l.published_at,
         p.type, p.city, p.postal_code, p.district, p.public_location,
         extensions.st_y(p.public_location::extensions.geometry),
         extensions.st_x(p.public_location::extensions.geometry),
         p.surface_m2, p.rooms, p.bedrooms, p.floor, p.has_elevator, p.has_balcony,
         p.has_terrace, p.has_garden, p.has_parking, p.has_cellar, p.orientation,
         p.build_year, p.dpe_class, p.ges_class, p.charges_monthly_cents,
         p.property_tax_yearly_cents,
         pr.first_name,
         null::public.plan_code
  from public.listings l
  join public.properties p on p.id = l.property_id
  join public.profiles pr on pr.id = p.owner_id
  where l.status = 'published' and l.deleted_at is null and p.deleted_at is null;
$$;

create view public.public_listings with (security_invoker = true) as
  select * from public.public_listings_rows();

grant select on public.public_listings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Status transitions (SPEC section 5): seller functions refuse a suspended
-- listing; admin functions check is_admin(), require a reason when the SPEC
-- does, and write audit_log.
-- ---------------------------------------------------------------------------
create function public.listing_for_seller(p_listing_id uuid) returns public.listings
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
begin
  select * into l from public.listings where id = p_listing_id and deleted_at is null for update;
  if l.id is null or not public.owns_property(l.property_id) or not public.is_active_user() then
    raise exception 'listing not found' using errcode = '42501';
  end if;
  if l.status = 'suspended' then
    raise exception 'listing suspended by Leenkey' using errcode = '42501';
  end if;
  return l;
end;
$$;

create function public.listing_require_admin(p_listing_id uuid) returns public.listings
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into l from public.listings where id = p_listing_id and deleted_at is null for update;
  if l.id is null then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;
  return l;
end;
$$;

create function public.listing_bad_transition(p_from public.listing_status, p_action text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception 'cannot % a listing in status %', p_action, p_from using errcode = '22023';
end;
$$;

-- Seller -------------------------------------------------------------------
create function public.listing_submit(p_listing_id uuid, p_review jsonb default null)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_for_seller(p_listing_id);
begin
  if l.status not in ('draft', 'rejected') then
    perform public.listing_bad_transition(l.status, 'submit');
  end if;
  update public.listings
     set status = 'pending', submitted_at = now(), rejection_reason = null, review = p_review
   where id = l.id;
  return 'pending';
end;
$$;

create function public.listing_cancel_submission(p_listing_id uuid)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_for_seller(p_listing_id);
begin
  if l.status <> 'pending' then
    perform public.listing_bad_transition(l.status, 'cancel the submission of');
  end if;
  update public.listings set status = 'draft' where id = l.id;
  return 'draft';
end;
$$;

create function public.listing_pause(p_listing_id uuid)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_for_seller(p_listing_id);
begin
  if l.status <> 'published' then
    perform public.listing_bad_transition(l.status, 'pause');
  end if;
  update public.listings set status = 'paused' where id = l.id;
  return 'paused';
end;
$$;

create function public.listing_resume(p_listing_id uuid)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_for_seller(p_listing_id);
begin
  if l.status <> 'paused' then
    perform public.listing_bad_transition(l.status, 'resume');
  end if;
  update public.listings set status = 'published' where id = l.id;
  return 'published';
end;
$$;

create function public.listing_mark_sold(p_listing_id uuid, p_sold_price_cents bigint default null)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_for_seller(p_listing_id);
begin
  if l.status not in ('published', 'paused') then
    perform public.listing_bad_transition(l.status, 'mark as sold');
  end if;
  update public.listings
     set status = 'sold', sold_at = now(), sold_price_cents = p_sold_price_cents
   where id = l.id;
  return 'sold';
end;
$$;

-- "Supprimer (brouillon uniquement)", SPEC 8.3: soft delete.
create function public.property_soft_delete(p_property_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  st public.listing_status;
begin
  if not public.owns_property(p_property_id) or not public.is_active_user() then
    raise exception 'property not found' using errcode = '42501';
  end if;
  select status into st from public.listings where property_id = p_property_id;
  if st is not null and st <> 'draft' then
    raise exception 'only a draft can be deleted' using errcode = '22023';
  end if;
  update public.listings set deleted_at = now() where property_id = p_property_id;
  update public.properties set deleted_at = now() where id = p_property_id and deleted_at is null;
end;
$$;

-- Admin --------------------------------------------------------------------
create function public.listing_publish(p_listing_id uuid)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_require_admin(p_listing_id);
begin
  if l.status <> 'pending' then
    perform public.listing_bad_transition(l.status, 'publish');
  end if;
  update public.listings
     set status = 'published', published_at = coalesce(published_at, now()), rejection_reason = null
   where id = l.id;
  perform public.audit('listing.publish', 'listing', l.id);
  return 'published';
end;
$$;

create function public.listing_reject(p_listing_id uuid, p_reason text)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_require_admin(p_listing_id);
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  if l.status <> 'pending' then
    perform public.listing_bad_transition(l.status, 'reject');
  end if;
  update public.listings set status = 'rejected', rejection_reason = btrim(p_reason) where id = l.id;
  perform public.audit('listing.reject', 'listing', l.id, jsonb_build_object('reason', btrim(p_reason)));
  return 'rejected';
end;
$$;

create function public.listing_suspend(p_listing_id uuid, p_reason text)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_require_admin(p_listing_id);
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  if l.status not in ('pending', 'published', 'paused') then
    perform public.listing_bad_transition(l.status, 'suspend');
  end if;
  update public.listings
     set status = 'suspended', suspended_at = now(), suspension_reason = btrim(p_reason)
   where id = l.id;
  perform public.audit('listing.suspend', 'listing', l.id,
                       jsonb_build_object('reason', btrim(p_reason), 'from', l.status));
  return 'suspended';
end;
$$;

create function public.listing_unsuspend(p_listing_id uuid, p_to public.listing_status default 'published')
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_require_admin(p_listing_id);
begin
  if l.status <> 'suspended' then
    perform public.listing_bad_transition(l.status, 'unsuspend');
  end if;
  if p_to not in ('published', 'paused') then
    raise exception 'a suspended listing goes back to published or paused' using errcode = '22023';
  end if;
  update public.listings
     set status = p_to, suspended_at = null, suspension_reason = null,
         published_at = coalesce(published_at, now())
   where id = l.id;
  perform public.audit('listing.unsuspend', 'listing', l.id, jsonb_build_object('to', p_to));
  return p_to;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.audit(text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.properties_before_write() from public, anon, authenticated;
revoke execute on function public.listings_before_insert() from public, anon, authenticated;
revoke execute on function public.listing_for_seller(uuid) from public, anon, authenticated;
revoke execute on function public.listing_require_admin(uuid) from public, anon, authenticated;
revoke execute on function public.listing_bad_transition(public.listing_status, text) from public, anon, authenticated;

revoke execute on function public.estimation_claim(text) from public, anon;
revoke execute on function public.listing_submit(uuid, jsonb) from public, anon;
revoke execute on function public.listing_cancel_submission(uuid) from public, anon;
revoke execute on function public.listing_pause(uuid) from public, anon;
revoke execute on function public.listing_resume(uuid) from public, anon;
revoke execute on function public.listing_mark_sold(uuid, bigint) from public, anon;
revoke execute on function public.property_soft_delete(uuid) from public, anon;
revoke execute on function public.listing_publish(uuid) from public, anon;
revoke execute on function public.listing_reject(uuid, text) from public, anon;
revoke execute on function public.listing_suspend(uuid, text) from public, anon;
revoke execute on function public.listing_unsuspend(uuid, public.listing_status) from public, anon;
grant execute on function public.estimation_claim(text) to authenticated;
grant execute on function public.listing_submit(uuid, jsonb) to authenticated;
grant execute on function public.listing_cancel_submission(uuid) to authenticated;
grant execute on function public.listing_pause(uuid) to authenticated;
grant execute on function public.listing_resume(uuid) to authenticated;
grant execute on function public.listing_mark_sold(uuid, bigint) to authenticated;
grant execute on function public.property_soft_delete(uuid) to authenticated;
grant execute on function public.listing_publish(uuid) to authenticated;
grant execute on function public.listing_reject(uuid, text) to authenticated;
grant execute on function public.listing_suspend(uuid, text) to authenticated;
grant execute on function public.listing_unsuspend(uuid, public.listing_status) to authenticated;

-- Callable by visitors: estimator writes, published-listing reads and view counts.
grant execute on function public.estimation_record(jsonb, jsonb, bigint, bigint, bigint, text) to anon, authenticated;
grant execute on function public.public_listings_rows() to anon, authenticated;
grant execute on function public.listing_view_increment(uuid) to anon, authenticated;
grant execute on function public.listing_is_public(uuid) to anon, authenticated;
