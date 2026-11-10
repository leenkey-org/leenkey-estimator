-- L1-66: the DPE taken from the register of ADEME by its number, the DPE of
-- business premises, rules kept in tables (answers of Cédric to Q77,
-- 2026-11-10; DECISIONS).
--
-- 1. dpe_rules, dpe_exemption_reasons: what a DPE needs, by kind (a home, or
--    business premises), and the motives of exemption; changed in the base,
--    not in the code (the rules of the DPE change again on 1 January 2027).
--    Their first rows come with this file: property_dpe_issue reads them on
--    every base.
-- 2. properties: the number of the DPE (ADEME, 13 characters), its kind, the
--    energy used (kWh/m²/year) and the emissions (kg CO₂/m²/year).
-- 3. property_dpe_issue: reads the rules; the number is asked, the costs and
--    the figures as the rule of the kind says.
-- 4. listing_publish: the motive of an exemption published is kept in the
--    history (the team reads it before every publication).
-- 5. properties_keep_dpe: once sent, the kind of the DPE is declared by the
--    team too (business premises carry fewer mentions).
-- 6. public_listing_dpe(slug): the mentions of a published listing, with the
--    motive of an exemption (« Non soumis au DPE (motif : …) »), without the
--    date nor the number of the DPE: with them, the open data of ADEME gives
--    the address. Its figures (kWh, kg CO₂) nearly do too: they are public
--    only when the rule says so (figures_public, off: Q78).
--    public_listing_energy (L1-65) no longer gives the date.
-- The file only adds and replaces (applied to staging without a confirmation).

-- 1. ---------------------------------------------------------------------------
create table public.dpe_rules (
  kind text primary key check (kind in ('logement', 'tertiaire')),
  -- A DPE made before this day is refused (null: no such day).
  valid_from date,
  validity_years smallint not null check (validity_years between 1 and 50),
  -- The range of the yearly energy costs and the year of their prices.
  costs_required boolean not null,
  -- The energy used and the emissions, per m² and year.
  figures_required boolean not null,
  -- Classes shown with « Logement à consommation énergétique excessive ».
  excessive_classes text[] not null default '{}',
  -- The figures on the page of a listing. With the postal code, they point
  -- at one DPE or a few in the open data of ADEME, so at the address: off
  -- until the client decides (Q78).
  figures_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create trigger dpe_rules_set_updated_at before update on public.dpe_rules
  for each row execute function public.set_updated_at();

create table public.dpe_exemption_reasons (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (char_length(label) between 3 and 300),
  position int not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create trigger dpe_exemption_reasons_set_updated_at before update on public.dpe_exemption_reasons
  for each row execute function public.set_updated_at();

alter table public.dpe_rules enable row level security;
alter table public.dpe_exemption_reasons enable row level security;

-- Read by everyone (the form, the page of a listing); written by the team.
create policy dpe_rules_select_all on public.dpe_rules for select to anon, authenticated using (true);
create policy dpe_rules_write_admin on public.dpe_rules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy dpe_exemption_reasons_select_all on public.dpe_exemption_reasons
  for select to anon, authenticated using (true);
create policy dpe_exemption_reasons_write_admin on public.dpe_exemption_reasons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- A rule or a motive is changed or switched off (active), never removed.
revoke all on public.dpe_rules, public.dpe_exemption_reasons from anon, authenticated;
grant select on public.dpe_rules, public.dpe_exemption_reasons to anon, authenticated;
grant insert, update on public.dpe_rules, public.dpe_exemption_reasons to authenticated;

-- The rules in force on 2026-11-10 (Q77). Homes: a DPE made from 1 July 2021,
-- valid 10 years, with its costs and figures; F and G are « excessive ».
-- Business premises: 10 years, no cost range nor « excessive » mention, the
-- figures recommended only (provisional for a DPE made before July 2021: Q78).
insert into public.dpe_rules (kind, valid_from, validity_years, costs_required, figures_required, excessive_classes)
values ('logement', date '2021-07-01', 10, true, true, '{F,G}'),
       ('tertiaire', null, 10, false, false, '{}')
on conflict (kind) do nothing;

insert into public.dpe_exemption_reasons (label, position)
values ('Construction provisoire prévue pour 2 ans au plus', 1),
       ('Bâtiment indépendant de moins de 50 m², et non un appartement ou un local dans un immeuble', 2),
       ('Bâtiment ou partie de bâtiment non chauffé et non climatisé, ou chauffé seulement par une cheminée à foyer ouvert, sans système de refroidissement', 3),
       ('Bâtiment résidentiel destiné à être utilisé moins de 4 mois par an', 4),
       ('Lieu de culte', 5),
       ('Bâtiment agricole, artisanal ou industriel peu consommateur d''énergie', 6),
       ('Monument historique', 7)
on conflict (label) do nothing;

-- 2. ---------------------------------------------------------------------------
alter table public.properties
  add column dpe_number text,
  add column dpe_kind text not null default 'logement',
  add column energy_kwh_m2_year integer,
  add column ges_kg_m2_year integer,
  add constraint properties_dpe_number_format
    check (dpe_number ~ '^[0-9]{4}[A-Z][0-9]{7}[A-Z]$'),
  add constraint properties_dpe_kind
    check (dpe_kind in ('logement', 'tertiaire')),
  -- A flat or a house has the DPE of a home; another property may be business premises.
  add constraint properties_dpe_kind_of_type
    check (dpe_kind = 'logement' or type = 'autre'),
  -- The fifth character of a number says its kind: T, business premises.
  add constraint properties_dpe_number_of_kind
    check (dpe_number is null or (substr(dpe_number, 5, 1) = 'T') = (dpe_kind = 'tertiaire')),
  add constraint properties_dpe_figures
    check (energy_kwh_m2_year between 0 and 9999 and ges_kg_m2_year between 0 and 9999),
  add constraint properties_dpe_exempt_without_figures
    check (not dpe_exempt or (dpe_number is null and energy_kwh_m2_year is null
                              and ges_kg_m2_year is null));

grant insert (dpe_number, dpe_kind, energy_kwh_m2_year, ges_kg_m2_year)
  on public.properties to authenticated;
grant update (dpe_number, dpe_kind, energy_kwh_m2_year, ges_kg_m2_year)
  on public.properties to authenticated;

comment on column public.properties.dpe_number is
  'Number of the DPE in the register of ADEME (13 characters, L1-66). Never public: the open data of ADEME gives the address of a number.';
comment on column public.properties.dpe_kind is
  'logement: the DPE of a home; tertiaire: of business premises (type autre only), ruled by dpe_rules.';
comment on column public.properties.energy_kwh_m2_year is
  'Primary energy used, kWh per m² and year, as on the DPE.';
comment on column public.properties.ges_kg_m2_year is
  'Greenhouse gas emissions, kg of CO₂ per m² and year, as on the DPE.';

-- 3. ---------------------------------------------------------------------------
-- As in L1-65, with the rule of the kind: dpe_missing also without the number,
-- the costs or the figures the rule asks for; a kind without a rule is not
-- sent (dpe_missing).
create or replace function public.property_dpe_issue(p public.properties) returns text
language sql stable set search_path = '' as $$
  with today as (select (now() at time zone 'Europe/Paris')::date as d)
  select case
    when p.type is null or p.type = 'terrain' then null
    when p.dpe_exempt then
      case when p.dpe_exemption_reason is null then 'exemption_reason' end
    when r.kind is null then 'dpe_missing'
    when p.dpe_class is null or p.ges_class is null or p.dpe_date is null or p.dpe_number is null
         or (r.costs_required
             and (p.energy_cost_min_cents is null or p.energy_cost_max_cents is null
                  or p.energy_price_year is null))
         or (r.figures_required
             and (p.energy_kwh_m2_year is null or p.ges_kg_m2_year is null)) then 'dpe_missing'
    when (r.valid_from is not null and p.dpe_date < r.valid_from)
         or p.dpe_date <= (today.d - make_interval(years => r.validity_years))::date
         or p.dpe_date > today.d then 'dpe_outdated'
  end
  from today left join public.dpe_rules r on r.kind = p.dpe_kind;
$$;

-- 4. ---------------------------------------------------------------------------
-- As in L1-65; the motive of an exemption the team has read goes to the
-- history of the listing with its publication.
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
  perform public.audit(
    'listing.publish', 'listing', l.id,
    case when prop.dpe_exempt
         then jsonb_build_object('dpe_exemption', prop.dpe_exemption_reason) end);
  return 'published';
end;
$$;

-- 5. ---------------------------------------------------------------------------
-- As in L1-65; the kind of the DPE changes the mentions of the listing as an
-- exemption does: once sent, the team declares it.
create or replace function public.properties_keep_dpe() returns trigger
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
          or (new.type = 'terrain' and old.type is distinct from 'terrain')
          or new.dpe_kind is distinct from old.dpe_kind) then
    raise exception 'dpe: exemption' using errcode = '22023';
  end if;
  if public.property_dpe_issue(new) is not null and public.property_dpe_issue(old) is null then
    raise exception 'dpe: keep' using errcode = '22023';
  end if;
  return new;
end;
$$;
create or replace trigger properties_keep_dpe
  before update of type, dpe_class, ges_class, dpe_exempt, dpe_exemption_reason, dpe_date,
                   energy_cost_min_cents, energy_cost_max_cents, energy_price_year,
                   dpe_number, dpe_kind, energy_kwh_m2_year, ges_kg_m2_year
  on public.properties
  for each row execute function public.properties_keep_dpe();

-- 6. ---------------------------------------------------------------------------
create function public.public_listing_dpe(p_slug text)
returns table (
  dpe_kind text,
  dpe_exempt boolean,
  dpe_exemption_reason text,
  energy_cost_min_cents integer,
  energy_cost_max_cents integer,
  energy_price_year smallint,
  energy_kwh_m2_year integer,
  ges_kg_m2_year integer,
  excessive boolean
)
language sql stable security definer set search_path = '' as $$
  select p.dpe_kind, p.dpe_exempt, p.dpe_exemption_reason, p.energy_cost_min_cents,
         p.energy_cost_max_cents, p.energy_price_year,
         case when r.figures_public then p.energy_kwh_m2_year end,
         case when r.figures_public then p.ges_kg_m2_year end,
         coalesce(p.dpe_class = any (r.excessive_classes), false)
    from public.listings l
    join public.properties p on p.id = l.property_id
    left join public.dpe_rules r on r.kind = p.dpe_kind
   where l.slug = p_slug
     and l.status = 'published' and l.deleted_at is null and p.deleted_at is null;
$$;

revoke execute on function public.public_listing_dpe(text) from public;
grant execute on function public.public_listing_dpe(text) to anon, authenticated;

-- The function of L1-65, still called by the pages deployed until this
-- change is online: as before, without the date of the DPE.
create or replace function public.public_listing_energy(p_slug text)
returns table (
  dpe_exempt boolean,
  dpe_date date,
  energy_cost_min_cents integer,
  energy_cost_max_cents integer,
  energy_price_year smallint
)
language sql stable security definer set search_path = '' as $$
  select p.dpe_exempt, null::date, p.energy_cost_min_cents, p.energy_cost_max_cents,
         p.energy_price_year
    from public.listings l
    join public.properties p on p.id = l.property_id
   where l.slug = p_slug
     and l.status = 'published' and l.deleted_at is null and p.deleted_at is null;
$$;
