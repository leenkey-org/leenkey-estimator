-- L1-19: back office v0 of the listings (SPEC-V2 section 17). The admin
-- already reads every listing through the RLS of L1-04 (is_admin()) and
-- moderates them with listing_publish / reject / suspend / unsuspend, which
-- write audit_log. Added here, for the admin only (each function checks
-- is_admin() itself): the list with its search, the counters by status, and
-- the contact of a seller, to tell them about a decision by email (the
-- address lives in auth.users, out of reach of PostgREST). No table. The list
-- and the counters run with the caller's rights (security invoker): the RLS
-- of the tables they read is a second barrier. Only the contact needs the
-- rights of the owner, for auth.users.

-- List of /admin/annonces: pending first, the oldest first (24 h target),
-- then the others, the most recent first. Search on the reference, the slug,
-- the title, the town, the postal code and the name of the seller.
create function public.admin_listings(
  p_status public.listing_status default null,
  p_query text default null,
  p_limit int default 200
)
returns table (
  id uuid, reference text, slug text, title text, status public.listing_status,
  price_cents bigint, created_at timestamptz, submitted_at timestamptz,
  published_at timestamptz, suspended_at timestamptz,
  type public.property_type, city text, postal_code text, rooms int, surface_m2 numeric,
  owner_id uuid, seller_first_name text, seller_last_name text, plan public.plan_code
)
language plpgsql stable security invoker set search_path = '' as $$
declare
  q text := nullif(btrim(coalesce(p_query, '')), '');
  pattern text;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if q is not null then
    pattern := '%' || replace(replace(replace(left(q, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return query
    select l.id, l.reference, l.slug, l.title, l.status, l.price_cents, l.created_at,
           l.submitted_at, l.published_at, l.suspended_at,
           p.type, p.city, p.postal_code, p.rooms, p.surface_m2,
           p.owner_id, pr.first_name, pr.last_name, coalesce(s.plan, 'autonomie')
      from public.listings l
      join public.properties p on p.id = l.property_id
      join public.profiles pr on pr.id = p.owner_id
      left join public.sale_progress s on s.property_id = p.id
     where l.deleted_at is null and p.deleted_at is null
       and (p_status is null or l.status = p_status)
       and (pattern is null
            or l.reference ilike pattern or l.slug ilike pattern or l.title ilike pattern
            or p.city ilike pattern or p.postal_code ilike pattern
            or concat_ws(' ', pr.first_name, pr.last_name) ilike pattern)
     order by (l.status = 'pending') desc,
              case when l.status = 'pending' then l.submitted_at end asc nulls last,
              coalesce(l.published_at, l.submitted_at, l.created_at) desc,
              l.reference
     limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

-- Counters of the status filters.
create function public.admin_listing_counts()
returns table (status public.listing_status, total bigint)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select l.status, count(*)
      from public.listings l
      join public.properties p on p.id = l.property_id
     where l.deleted_at is null and p.deleted_at is null
     group by l.status;
end;
$$;

-- First name and email of the seller of a listing, for the moderation emails.
create function public.admin_listing_seller_contact(p_listing_id uuid)
returns table (first_name text, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select pr.first_name, u.email::text
      from public.listings l
      join public.properties p on p.id = l.property_id
      join public.profiles pr on pr.id = p.owner_id
      join auth.users u on u.id = pr.id
     where l.id = p_listing_id and pr.deleted_at is null;
end;
$$;

revoke execute on function public.admin_listings(public.listing_status, text, int) from public, anon;
revoke execute on function public.admin_listing_counts() from public, anon;
revoke execute on function public.admin_listing_seller_contact(uuid) from public, anon;
grant execute on function public.admin_listings(public.listing_status, text, int) to authenticated;
grant execute on function public.admin_listing_counts() to authenticated;
grant execute on function public.admin_listing_seller_contact(uuid) to authenticated;
