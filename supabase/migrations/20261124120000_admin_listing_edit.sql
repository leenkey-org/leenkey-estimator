-- L1-30e: « Modifier » a listing from the back office (SPEC-V2 17,
-- DECISIONS.md 2026-11-24). The team changes the title, the description and
-- the price of a listing in review, online, paused or suspended (never a
-- draft, nor a listing to correct or sold: the seller has it in hand, or it is
-- over), with a reason the seller reads.
--
-- 1. listing_revisions.reason: the reason of a change made by the team, read
--    by the seller in the history of their listing (L1-35). Null for a
--    change of the seller. Read with the table-wide SELECT grant and the RLS
--    of the table (the seller of the listing, the team), unchanged; written
--    only by listing_admin_edit (no client writes the table).
-- 2. listing_admin_edit(listing, title, description, price, reason): checks
--    is_admin() (listing_require_admin, which locks the listing), the status
--    and the reason; writes the fields that changed. Each change goes in
--    listing_revisions exactly as a change of the seller (the trigger of
--    L1-35 for a listing online or paused; written here for a listing in
--    review or suspended, which the trigger does not follow), by the admin,
--    with the reason; then audit_log; then the seller is told
--    (listing.team_edited: bell and email, always sent: it is about their
--    listing). listing.revised tells no one of a change made by an admin
--    (L1-35, unchanged). Returns the fields changed, none when nothing
--    changed (nothing written then).
--
-- No enum value, no table, no policy changed. The existing policy
-- listings_update_admin (L1-04) is left as it is.

-- 1. ---------------------------------------------------------------------------
alter table public.listing_revisions
  add column reason text check (reason is null or char_length(reason) between 3 and 1000);

comment on column public.listing_revisions.reason is
  'Change made by the team from the back office: its reason, read by the seller (L1-30e, DECISIONS.md 2026-11-24).';

-- 2. ---------------------------------------------------------------------------
create function public.listing_admin_edit(
  p_listing_id uuid,
  p_title text,
  p_description text,
  p_price_cents bigint,
  p_reason text
) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  -- Refuses a user who is not of the team (42501), a listing gone (P0002).
  l public.listings := public.listing_require_admin(p_listing_id);
  n public.listings;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_title text := btrim(coalesce(p_title, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_fields text[] := '{}';
  v_start timestamptz;
  v_owner uuid;
  v_city text;
begin
  if l.status not in ('pending', 'published', 'paused', 'suspended') then
    perform public.listing_bad_transition(l.status, 'edit');
  end if;
  if char_length(v_reason) not between 3 and 1000 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  if char_length(v_title) not between 3 and 120 or v_description = ''
     or p_price_cents is null or p_price_cents <= 0 then
    raise exception 'a title, a description and a price are required' using errcode = '22023';
  end if;

  -- In the order of the trigger of L1-35: price, title, description.
  if p_price_cents is distinct from l.price_cents then
    v_fields := v_fields || 'price'::text;
  end if;
  if v_title is distinct from l.title then
    v_fields := v_fields || 'title'::text;
  end if;
  if v_description is distinct from l.description then
    v_fields := v_fields || 'description'::text;
  end if;
  if cardinality(v_fields) = 0 then
    return v_fields;
  end if;

  v_start := clock_timestamp();
  update public.listings
     set title = v_title, description = v_description, price_cents = p_price_cents
   where id = l.id
  returning * into n;

  -- Online or paused: listings_track_revisions wrote the lines. In review or
  -- suspended: not followed for the seller, written here for the team.
  if l.status in ('pending', 'suspended') then
    if 'price' = any(v_fields) then
      perform public.listing_revision_add(n, 'price', to_jsonb(l.price_cents), to_jsonb(n.price_cents));
    end if;
    if 'title' = any(v_fields) then
      perform public.listing_revision_add(n, 'title', to_jsonb(l.title), to_jsonb(n.title));
    end if;
    if 'description' = any(v_fields) then
      perform public.listing_revision_add(n, 'description', to_jsonb(l.description), to_jsonb(n.description));
    end if;
  end if;
  -- The lines of this change (this admin, this listing, from now on): its reason.
  update public.listing_revisions
     set reason = v_reason
   where listing_id = l.id and changed_by = auth.uid()
     and created_at >= v_start and reason is null;

  perform public.audit('listing.admin_edit', 'listing', l.id,
    jsonb_build_object('reason', v_reason, 'fields', to_jsonb(v_fields), 'status', l.status));

  select owner_id, city into v_owner, v_city from public.properties where id = l.property_id;
  perform public.notification_add(
    v_owner, 'listing.team_edited',
    -- No key for a price not changed (a JSON null would stay for good).
    jsonb_strip_nulls(jsonb_build_object(
      'entity_id', l.id,
      'listing_id', l.id,
      'property_id', l.property_id,
      'reference', l.reference,
      'title', n.title,
      'city', v_city,
      'fields', to_jsonb(v_fields),
      'reason', v_reason,
      'old_price_cents', case when 'price' = any(v_fields) then l.price_cents end,
      'price_cents', n.price_cents)),
    '/vendeur/biens/' || l.property_id || '/annonce#historique',
    'listing-team-edit:' || l.id, now());
  return v_fields;
end;
$$;

revoke execute on function public.listing_admin_edit(uuid, text, text, bigint, text) from public, anon;
grant execute on function public.listing_admin_edit(uuid, text, text, bigint, text) to authenticated;
