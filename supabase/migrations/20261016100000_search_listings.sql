-- L1-15: search of the published listings (SPEC-V2 8.4): search_listings()
-- and its indexes.
-- L1-17: public listing page (SPEC-V2 8.5): more public characteristics in
-- public_listings, view counter that ignores the seller and the admins.
-- Reference: docs/SPEC-V2.md sections 4 (Vue publique), 8.4, 8.5;
-- DECISIONS Q20 (public reads through security definer functions).

-- ---------------------------------------------------------------------------
-- public_listings: + floors_total, carrez_m2, heating, copro_lots,
-- is_new_build, shown in « Ce que vous savez avant de visiter » (SPEC 8.5).
-- Public facts of any listing, never the address, the exact location or the
-- owner. The rows now come from public_listings_details() (new return type,
-- new columns at the end); the view is replaced in place, which keeps its
-- grants, and public_listings_rows() keeps its L1-05 signature on top of it.
-- No drop: on the preprod, destructive statements wait for a manual
-- confirmation (DECISIONS 2026-10-16).
-- ---------------------------------------------------------------------------
create function public.public_listings_details()
returns table (
  id uuid, slug text, reference text, title text, description text,
  price_cents bigint, published_at timestamptz,
  type public.property_type, city text, postal_code text, district text,
  public_location extensions.geography, public_lat double precision, public_lng double precision,
  surface_m2 numeric, rooms int, bedrooms int, floor int,
  has_elevator boolean, has_balcony boolean, has_terrace boolean, has_garden boolean,
  has_parking boolean, has_cellar boolean, orientation text, build_year int,
  dpe_class char(1), ges_class char(1), charges_monthly_cents int,
  property_tax_yearly_cents int, seller_first_name text, plan public.plan_code,
  floors_total int, carrez_m2 numeric, heating text, copro_lots int, is_new_build boolean
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
         coalesce(s.plan, 'autonomie'),
         p.floors_total, p.carrez_m2, p.heating, p.copro_lots, p.is_new_build
  from public.listings l
  join public.properties p on p.id = l.property_id
  join public.profiles pr on pr.id = p.owner_id
  left join public.sale_progress s on s.property_id = p.id
  where l.status = 'published' and l.deleted_at is null and p.deleted_at is null;
$$;

create or replace view public.public_listings with (security_invoker = true) as
  select * from public.public_listings_details();

create or replace function public.public_listings_rows()
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
  select d.id, d.slug, d.reference, d.title, d.description, d.price_cents, d.published_at,
         d.type, d.city, d.postal_code, d.district, d.public_location, d.public_lat, d.public_lng,
         d.surface_m2, d.rooms, d.bedrooms, d.floor, d.has_elevator, d.has_balcony,
         d.has_terrace, d.has_garden, d.has_parking, d.has_cellar, d.orientation,
         d.build_year, d.dpe_class, d.ges_class, d.charges_monthly_cents,
         d.property_tax_yearly_cents, d.seller_first_name, d.plan
  from public.public_listings_details() d;
$$;

revoke execute on function public.public_listings_details() from public;
grant execute on function public.public_listings_details() to anon, authenticated;
revoke all on public.public_listings from anon, authenticated;
grant select on public.public_listings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Search indexes (SPEC 8.4). properties.public_location already has its GiST
-- index (L1-04), used by the radius filter.
-- ---------------------------------------------------------------------------
create index listings_published_recent_idx on public.listings (published_at desc)
  where status = 'published' and deleted_at is null;
create index listings_published_price_idx on public.listings (price_cents)
  where status = 'published' and deleted_at is null;
create index properties_surface_idx on public.properties (surface_m2);
create index properties_rooms_idx on public.properties (rooms);
create index properties_city_slug_idx on public.properties (public.slugify(city));
create index properties_postal_code_idx on public.properties (postal_code);

-- ---------------------------------------------------------------------------
-- search_listings(filters, bbox, sort, page): published listings only, public
-- columns only (those of the search cards and of the map), 20 per page, with
-- the total number of matches on every row. Reads the tables directly, with
-- the same condition as public_listings_details(), so that the indexes apply.
--
-- p_filters (JSON object, every key optional, unknown keys refused):
--   type             'appartement' | 'maison' | 'terrain' | 'autre'
--   price_min_cents, price_max_cents      price in cents
--   surface_min, surface_max              m²
--   rooms_min, bedrooms_min
--   outdoor          ['balcony' | 'terrace' | 'garden']: at least one of them
--   parking, elevator                     true: required
--   dpe_max          'A'..'G': this class or a better one (unknown DPE excluded)
--   city             slug of the commune (public.slugify(city))
--   postal_code      5 digits
--   radius_km, center_lat, center_lng     within radius_km of the centre; with
--                    city or postal_code: that commune OR within the radius
-- p_bbox: [west, south, east, north] in degrees (map area), or null.
-- p_sort: 'recent' (default), 'price_asc', 'price_desc', 'surface_desc',
--         'price_m2_asc'. Ties: most recent first, then id (stable pages).
-- p_page: 1 to 500.
-- ---------------------------------------------------------------------------
create function public.search_listings(
  p_filters jsonb default '{}'::jsonb,
  p_bbox double precision[] default null,
  p_sort text default 'recent',
  p_page int default 1
)
returns table (
  id uuid, slug text, reference text, title text, price_cents bigint, published_at timestamptz,
  type public.property_type, city text, postal_code text, district text,
  public_lat double precision, public_lng double precision,
  surface_m2 numeric, rooms int, bedrooms int, floor int,
  has_elevator boolean, has_balcony boolean, has_terrace boolean, has_garden boolean,
  has_parking boolean, has_cellar boolean, dpe_class char(1),
  total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  page_size constant int := 20;
  f jsonb := coalesce(p_filters, '{}'::jsonb);
  unknown_key text;
  v_type public.property_type;
  v_price_min bigint;
  v_price_max bigint;
  v_surface_min numeric;
  v_surface_max numeric;
  v_rooms_min int;
  v_bedrooms_min int;
  v_outdoor text[];
  v_parking boolean;
  v_elevator boolean;
  v_dpe_max text;
  v_city text;
  v_postal text;
  v_radius_km double precision;
  v_lat double precision;
  v_lng double precision;
  v_centre extensions.geography;
  v_envelope extensions.geometry;
begin
  if jsonb_typeof(f) <> 'object' then
    raise exception 'filters must be a JSON object' using errcode = '22023';
  end if;
  select k into unknown_key from jsonb_object_keys(f) k
   where k not in ('type', 'price_min_cents', 'price_max_cents', 'surface_min', 'surface_max',
                   'rooms_min', 'bedrooms_min', 'outdoor', 'parking', 'elevator', 'dpe_max',
                   'city', 'postal_code', 'radius_km', 'center_lat', 'center_lng')
   limit 1;
  if unknown_key is not null then
    raise exception 'unknown filter: %', unknown_key using errcode = '22023';
  end if;
  if p_sort is null or p_sort not in ('recent', 'price_asc', 'price_desc', 'surface_desc', 'price_m2_asc') then
    raise exception 'unknown sort: %', p_sort using errcode = '22023';
  end if;
  if p_page is null or p_page < 1 or p_page > 500 then
    raise exception 'page must be between 1 and 500' using errcode = '22023';
  end if;

  -- Invalid values raise (22P02 for a bad number or type).
  v_type := (f ->> 'type')::public.property_type;
  v_price_min := (f ->> 'price_min_cents')::bigint;
  v_price_max := (f ->> 'price_max_cents')::bigint;
  v_surface_min := (f ->> 'surface_min')::numeric;
  v_surface_max := (f ->> 'surface_max')::numeric;
  v_rooms_min := (f ->> 'rooms_min')::int;
  v_bedrooms_min := (f ->> 'bedrooms_min')::int;
  v_parking := (f ->> 'parking')::boolean;
  v_elevator := (f ->> 'elevator')::boolean;
  v_dpe_max := f ->> 'dpe_max';
  v_city := nullif(f ->> 'city', '');
  v_postal := nullif(f ->> 'postal_code', '');

  if least(v_price_min, v_price_max, v_surface_min, v_surface_max, v_rooms_min, v_bedrooms_min) < 0 then
    raise exception 'filter values cannot be negative' using errcode = '22023';
  end if;
  if v_dpe_max is not null and v_dpe_max not in ('A', 'B', 'C', 'D', 'E', 'F', 'G') then
    raise exception 'dpe_max must be a class from A to G' using errcode = '22023';
  end if;
  if v_postal is not null and v_postal !~ '^[0-9]{5}$' then
    raise exception 'postal_code must have 5 digits' using errcode = '22023';
  end if;

  if f ? 'outdoor' then
    if jsonb_typeof(f -> 'outdoor') <> 'array' then
      raise exception 'outdoor must be an array' using errcode = '22023';
    end if;
    select array_agg(value) into v_outdoor from jsonb_array_elements_text(f -> 'outdoor');
    if not coalesce(v_outdoor, '{}') <@ array['balcony', 'terrace', 'garden'] then
      raise exception 'outdoor accepts balcony, terrace and garden' using errcode = '22023';
    end if;
  end if;

  if f ? 'radius_km' or f ? 'center_lat' or f ? 'center_lng' then
    v_radius_km := (f ->> 'radius_km')::double precision;
    v_lat := (f ->> 'center_lat')::double precision;
    v_lng := (f ->> 'center_lng')::double precision;
    if v_radius_km is null or v_lat is null or v_lng is null then
      raise exception 'radius_km, center_lat and center_lng go together' using errcode = '22023';
    end if;
    if v_radius_km <= 0 or v_radius_km > 100 or v_lat not between -90 and 90 or v_lng not between -180 and 180 then
      raise exception 'invalid radius or centre' using errcode = '22023';
    end if;
    v_centre := extensions.st_setsrid(extensions.st_makepoint(v_lng, v_lat), 4326)::extensions.geography;
  end if;

  if p_bbox is not null then
    if cardinality(p_bbox) <> 4 or array_position(p_bbox, null) is not null
       or p_bbox[1] not between -180 and 180 or p_bbox[3] not between -180 and 180
       or p_bbox[2] not between -90 and 90 or p_bbox[4] not between -90 and 90
       or p_bbox[1] >= p_bbox[3] or p_bbox[2] >= p_bbox[4] then
      raise exception 'bbox must be [west, south, east, north]' using errcode = '22023';
    end if;
    v_envelope := extensions.st_makeenvelope(p_bbox[1], p_bbox[2], p_bbox[3], p_bbox[4], 4326);
  end if;

  return query
  select l.id, l.slug, l.reference, l.title, l.price_cents, l.published_at,
         p.type, p.city, p.postal_code, p.district,
         extensions.st_y(p.public_location::extensions.geometry),
         extensions.st_x(p.public_location::extensions.geometry),
         p.surface_m2, p.rooms, p.bedrooms, p.floor,
         p.has_elevator, p.has_balcony, p.has_terrace, p.has_garden, p.has_parking, p.has_cellar,
         p.dpe_class,
         count(*) over ()
  from public.listings l
  join public.properties p on p.id = l.property_id
  where l.status = 'published' and l.deleted_at is null and p.deleted_at is null
    and (v_type is null or p.type = v_type)
    and (v_price_min is null or l.price_cents >= v_price_min)
    and (v_price_max is null or l.price_cents <= v_price_max)
    and (v_surface_min is null or p.surface_m2 >= v_surface_min)
    and (v_surface_max is null or p.surface_m2 <= v_surface_max)
    and (v_rooms_min is null or p.rooms >= v_rooms_min)
    and (v_bedrooms_min is null or p.bedrooms >= v_bedrooms_min)
    and (v_outdoor is null
         or ('balcony' = any (v_outdoor) and p.has_balcony)
         or ('terrace' = any (v_outdoor) and p.has_terrace)
         or ('garden' = any (v_outdoor) and p.has_garden))
    and (v_parking is not true or p.has_parking)
    and (v_elevator is not true or p.has_elevator)
    and (v_dpe_max is null or p.dpe_class <= v_dpe_max)
    and (case
           when v_centre is null then
             (v_city is null or public.slugify(p.city) = v_city)
             and (v_postal is null or p.postal_code = v_postal)
           else
             ((v_city is not null or v_postal is not null)
              and (v_city is null or public.slugify(p.city) = v_city)
              and (v_postal is null or p.postal_code = v_postal))
             or coalesce(extensions.st_dwithin(p.public_location, v_centre, v_radius_km * 1000), false)
         end)
    and (v_envelope is null
         or coalesce(extensions.st_intersects(p.public_location::extensions.geometry, v_envelope), false))
  order by
    case when p_sort = 'price_asc' then l.price_cents end asc,
    case when p_sort = 'price_desc' then l.price_cents end desc,
    case when p_sort = 'surface_desc' then p.surface_m2 end desc,
    case when p_sort = 'price_m2_asc' then l.price_cents / nullif(p.surface_m2, 0) end asc,
    l.published_at desc nulls last, l.id
  limit page_size offset (p_page - 1) * page_size;
end;
$$;

revoke execute on function public.search_listings(jsonb, double precision[], text, int) from public;
grant execute on function public.search_listings(jsonb, double precision[], text, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- View counter (SPEC 8.5): the seller and the admins never count, even when
-- they call the function themselves. The page also dedupes per visitor and
-- per day with a cookie (leenkey/listings/view-cookie.ts).
-- ---------------------------------------------------------------------------
create or replace function public.listing_view_increment(p_listing_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.listing_is_public(p_listing_id) then
    return;
  end if;
  if auth.uid() is not null and (
       public.is_admin()
       or exists (select 1 from public.listings l join public.properties p on p.id = l.property_id
                  where l.id = p_listing_id and p.owner_id = auth.uid())) then
    return;
  end if;
  insert into public.listing_views (listing_id, day, count)
  values (p_listing_id, (now() at time zone 'Europe/Paris')::date, 1)
  on conflict (listing_id, day) do update set count = public.listing_views.count + 1;
  update public.listings set views_count = views_count + 1 where id = p_listing_id;
end;
$$;
