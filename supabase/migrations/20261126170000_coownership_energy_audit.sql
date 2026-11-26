-- A house outside a co-ownership, and the energy audit (DECISIONS.md
-- 2026-11-26, asked by Cédric, relayed by Younes).
--
-- 1. properties.is_coownership: whether the property is in a co-ownership,
--    said by its seller at step 2 for a house or another property (« Ce bien
--    est-il en copropriété ? », « Non » at first). A flat always is, land
--    never: a trigger keeps the column true to the type, whoever writes.
--    Outside a co-ownership, step 2 neither asks for nor stores the charges,
--    the lots or the Carrez surface (lib/validations/property.ts), and the
--    sale file does not ask for the documents of a co-ownership
--    (lib/config/documents.ts). Never public: public_listings does not give
--    it (a listing shows the charges and the lots when they are given).
--    Rows already there: a flat, and a house or another property that holds
--    lots, charges or a Carrez surface, are in a co-ownership, so that
--    nothing typed is lost at the next save (the form shows « Oui »).
-- 2. document_type gains 'audit_energetique' (« Audit énergétique »). Only
--    the value: when it is asked for is configuration
--    (lib/config/documents.ts). Nothing here uses the value: Postgres
--    refuses a new value of an enum in the transaction that adds it.
--
-- The file only adds (applied to staging without a confirmation).

-- 1. ---------------------------------------------------------------------------
alter table public.properties
  add column is_coownership boolean not null default false;

comment on column public.properties.is_coownership is
  'In a co-ownership: always for a flat, never for land (properties_coownership), said by the seller for a house or another property. Not public.';

create function public.properties_coownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.type = 'appartement' then
    new.is_coownership := true;
  elsif new.type = 'terrain' then
    new.is_coownership := false;
  end if;
  return new;
end;
$$;

revoke execute on function public.properties_coownership() from public, anon, authenticated;

create trigger properties_coownership before insert or update of type, is_coownership
  on public.properties for each row execute function public.properties_coownership();

-- Written by the seller with step 2, as the other characteristics (column
-- grants of L1-04); read as the rest of the row (properties_select_*).
grant insert (is_coownership) on public.properties to authenticated;
grant update (is_coownership) on public.properties to authenticated;

update public.properties
   set is_coownership = true
 where type = 'appartement'
    or (type is distinct from 'terrain'
        and (coalesce(copro_lots, 0) > 0 or charges_monthly_cents is not null
             or carrez_m2 is not null));

-- 2. ---------------------------------------------------------------------------
alter type public.document_type add value if not exists 'audit_energetique';
