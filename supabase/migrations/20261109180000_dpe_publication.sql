-- L1-65: the DPE asked to send a listing for review (Cédric, 2026-11-09;
-- DECISIONS Q47, Q67, Q77). A listing for sale shows its energy and climate
-- classes, the estimated range of its yearly energy costs with the reference
-- year of the prices (code de la construction, L126-33), or says that the
-- property is not subject to the DPE. A draft is never held back: the
-- columns stay empty until the sending.
--
-- 1. The columns of the DPE on properties: the exemption and its motive, the
--    date of the DPE, the range of the costs, the year of the prices.
-- 2. property_dpe_issue(property): what still stops a listing for review
--    (null: nothing). Land is not concerned.
-- 3. listing_submit: refused while the DPE is missing, outdated (before
--    1 July 2021, or more than 10 years old) or an exemption has no motive;
--    listing_publish too (a listing sent before L1-65 without one).
-- 4. properties_keep_dpe: the property of a listing sent (in review, online,
--    paused) keeps a DPE that was complete; only the team turns it into an
--    exemption (or land), which it reads before it shows.
-- 5. public_listing_energy(slug): what the page of a published listing shows
--    of it, beside public_listings (whose columns stay as they are).
-- Nothing is dropped: the file only adds and replaces.

-- 1. ---------------------------------------------------------------------------
alter table public.properties
  add column dpe_exempt boolean not null default false,
  add column dpe_exemption_reason text,
  add column dpe_date date,
  add column energy_cost_min_cents integer,
  add column energy_cost_max_cents integer,
  add column energy_price_year smallint,
  add constraint properties_dpe_exemption_reason_length
    check (dpe_exemption_reason is null or char_length(dpe_exemption_reason) between 3 and 300),
  add constraint properties_dpe_exemption_reason_exempt
    check (dpe_exempt or dpe_exemption_reason is null),
  add constraint properties_energy_cost_range
    check (energy_cost_min_cents >= 0 and energy_cost_max_cents >= 0
           and energy_cost_min_cents <= energy_cost_max_cents),
  add constraint properties_energy_price_year
    check (energy_price_year between 2015 and 2100),
  -- Exempt: no class nor mention of a DPE beside « Bien non soumis au DPE ».
  add constraint properties_dpe_exempt_without_dpe
    check (not dpe_exempt or (dpe_class is null and ges_class is null and dpe_date is null
                              and energy_cost_min_cents is null and energy_cost_max_cents is null
                              and energy_price_year is null));

-- Written by the seller with step 2, as the other characteristics (column
-- grants of L1-04).
grant insert (dpe_exempt, dpe_exemption_reason, dpe_date, energy_cost_min_cents,
              energy_cost_max_cents, energy_price_year)
  on public.properties to authenticated;
grant update (dpe_exempt, dpe_exemption_reason, dpe_date, energy_cost_min_cents,
              energy_cost_max_cents, energy_price_year)
  on public.properties to authenticated;

comment on column public.properties.dpe_exempt is
  'Not subject to the DPE (L1-65); its motive in dpe_exemption_reason, read by the team at the review.';
comment on column public.properties.dpe_date is
  'Date of the DPE: valid from 1 July 2021, for 10 years (L1-65).';
comment on column public.properties.energy_price_year is
  'Reference year of the energy prices of the cost range (« indexés au 1er janvier »).';

-- 2. ---------------------------------------------------------------------------
-- dpe_missing: a class, the date, the range or the year is missing;
-- dpe_outdated: the DPE is dated before 1 July 2021, more than 10 years ago,
-- or later than today; exemption_reason: exempt without a motive. Today in
-- Paris, as the form says it (parisToday), not in UTC.
create function public.property_dpe_issue(p public.properties) returns text
language sql stable set search_path = '' as $$
  with today as (select (now() at time zone 'Europe/Paris')::date as d)
  select case
    when p.type is null or p.type = 'terrain' then null
    when p.dpe_exempt then
      case when p.dpe_exemption_reason is null then 'exemption_reason' end
    when p.dpe_class is null or p.ges_class is null or p.dpe_date is null
         or p.energy_cost_min_cents is null or p.energy_cost_max_cents is null
         or p.energy_price_year is null then 'dpe_missing'
    when p.dpe_date < date '2021-07-01'
         or p.dpe_date <= (today.d - interval '10 years')::date
         or p.dpe_date > today.d then 'dpe_outdated'
  end
  from today;
$$;

-- 3. ---------------------------------------------------------------------------
-- As in L1-11 (20261017150000_property_drafts.sql), plus the DPE.
create or replace function public.listing_submit(p_listing_id uuid, p_review jsonb default null)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_for_seller(p_listing_id);
  prop public.properties;
  v_issue text;
begin
  if l.status not in ('draft', 'rejected') then
    perform public.listing_bad_transition(l.status, 'submit');
  end if;
  -- Locked against a change of the property at the same moment: it waits for
  -- this sending, then properties_keep_complete sees the listing pending.
  select * into prop from public.properties where id = l.property_id for share;
  if prop.type is null or prop.surface_m2 is null or prop.rooms is null then
    raise exception 'the property is incomplete: type, surface and rooms are required'
      using errcode = '22023';
  end if;
  v_issue := public.property_dpe_issue(prop);
  if v_issue is not null then
    raise exception 'dpe: %', v_issue using errcode = '22023';
  end if;
  update public.listings
     set status = 'pending', submitted_at = now(), rejection_reason = null, review = p_review
   where id = l.id;
  return 'pending';
end;
$$;

-- The team publishes a listing for sale with its DPE only: one sent before
-- L1-65 without it is refused, with « Une information obligatoire manque ».
-- As in L1-04 (20261015120000_properties_listings.sql), plus the DPE.
create or replace function public.listing_publish(p_listing_id uuid)
returns public.listing_status
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings := public.listing_require_admin(p_listing_id);
  prop public.properties;
  v_issue text;
begin
  if l.status <> 'pending' then
    perform public.listing_bad_transition(l.status, 'publish');
  end if;
  select * into prop from public.properties where id = l.property_id for share;
  v_issue := public.property_dpe_issue(prop);
  if v_issue is not null then
    raise exception 'dpe: %', v_issue using errcode = '22023';
  end if;
  update public.listings
     set status = 'published', published_at = coalesce(published_at, now()), rejection_reason = null
   where id = l.id;
  perform public.audit('listing.publish', 'listing', l.id);
  return 'published';
end;
$$;

-- 4. ---------------------------------------------------------------------------
-- A listing sent stays as it is (L1-14b): its DPE, once complete, is not
-- emptied (« dpe: keep »). A listing sent before L1-65 without one keeps it
-- so until the seller completes it. An exemption, its motive, or land drop
-- the mentions of the DPE: once sent, only the team declares them, having
-- read them (« dpe: exemption »).
create function public.properties_keep_dpe() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.listings l
                  where l.property_id = new.id and l.deleted_at is null
                    and l.status not in ('draft', 'rejected')) then
    return new;
  end if;
  if not public.is_admin()
     and ((new.dpe_exempt and (not old.dpe_exempt
                               or new.dpe_exemption_reason is distinct from old.dpe_exemption_reason))
          or (new.type = 'terrain' and old.type is distinct from 'terrain')) then
    raise exception 'dpe: exemption' using errcode = '22023';
  end if;
  if public.property_dpe_issue(new) is not null and public.property_dpe_issue(old) is null then
    raise exception 'dpe: keep' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger properties_keep_dpe
  before update of type, dpe_class, ges_class, dpe_exempt, dpe_exemption_reason, dpe_date,
                   energy_cost_min_cents, energy_cost_max_cents, energy_price_year
  on public.properties
  for each row execute function public.properties_keep_dpe();

-- 5. ---------------------------------------------------------------------------
-- The mentions of the DPE of a published listing (its classes are in
-- public_listings); the motive of an exemption stays with the team.
create function public.public_listing_energy(p_slug text)
returns table (
  dpe_exempt boolean,
  dpe_date date,
  energy_cost_min_cents integer,
  energy_cost_max_cents integer,
  energy_price_year smallint
)
language sql stable security definer set search_path = '' as $$
  select p.dpe_exempt, p.dpe_date, p.energy_cost_min_cents, p.energy_cost_max_cents,
         p.energy_price_year
    from public.listings l
    join public.properties p on p.id = l.property_id
   where l.slug = p_slug
     and l.status = 'published' and l.deleted_at is null and p.deleted_at is null;
$$;

revoke execute on function public.property_dpe_issue(public.properties) from public, anon, authenticated;
revoke execute on function public.properties_keep_dpe() from public, anon, authenticated;
revoke execute on function public.public_listing_energy(text) from public;
grant execute on function public.public_listing_energy(text) to anon, authenticated;
