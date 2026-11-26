-- A house outside a co-ownership and the energy audit (DECISIONS.md
-- 2026-11-26): properties.is_coownership is written by the seller of the
-- property and read as the rest of its row, kept true to the type (a flat
-- always, land never), never public; « audit_energetique » is filed as any
-- document of the sale file, and is not a diagnostic a DDT covers.
-- Fixtures in 99986.
begin;
\ir _helpers.psql
select plan(19);
\ir _plan.psql

select has_column('public', 'properties', 'is_coownership', 'properties has is_coownership');
select hasnt_column('public', 'public_listings', 'is_coownership', 'public_listings does not give it');
select ok('audit_energetique' = any(enum_range(null::document_type)::text[]),
          'document_type has audit_energetique');

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '3 rue du Lotissement', '99986', 'Coproville', 110, 5,
        extensions.st_setsrid(extensions.st_makepoint(2.43, 48.77), 4326)::extensions.geography)
returning id as house \gset
select is((select is_coownership from properties where id = :'house'), false,
          'seller_a: a house is outside a co-ownership at first');
update properties set is_coownership = true, copro_lots = 12, charges_monthly_cents = 4500 where id = :'house';
select is((select is_coownership from properties where id = :'house'), true,
          'seller_a: says their house is in a co-ownership');
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '4 rue du Lotissement', '99986', 'Coproville', 60, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.43, 48.77), 4326)::extensions.geography)
returning id as flat \gset
select is((select is_coownership from properties where id = :'flat'), true,
          'a flat is in a co-ownership without being told');
update properties set is_coownership = false where id = :'flat';
select is((select is_coownership from properties where id = :'flat'), true,
          'a flat stays in a co-ownership whatever is written');
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location, is_coownership)
values (tests.uid('seller_a'), 'terrain', '5 rue du Lotissement', '99986', 'Coproville', 600, 0,
        extensions.st_setsrid(extensions.st_makepoint(2.43, 48.77), 4326)::extensions.geography, true)
returning id as land \gset
select is((select is_coownership from properties where id = :'land'), false,
          'land is never in a co-ownership');
update properties set type = 'appartement' where id = :'land';
select is((select is_coownership from properties where id = :'land'), true,
          'a property that becomes a flat is in a co-ownership');
update properties set type = 'maison', is_coownership = false where id = :'land';
select is((select is_coownership from properties where id = :'land'), false,
          'a house says it itself');

-- The energy audit: a document of the sale file as another.
select :'house' || '/sale/' || gen_random_uuid() || '.pdf' as path_audit,
       :'house' || '/sale/' || gen_random_uuid() || '.pdf' as path_ddt \gset
insert into storage.objects (bucket_id, name, owner, metadata) values
  ('documents', :'path_audit', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}'),
  ('documents', :'path_ddt', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}');
select document_add(:'house', 'audit_energetique', 'Audit énergétique', :'path_audit') as audit \gset
select is((select type::text from documents where id = :'audit'), 'audit_energetique',
          'seller_a: files the energy audit of their house');
select throws_ok(format($$select document_add(%L, 'ddt', 'DDT', %L, array['audit_energetique']::document_type[])$$, :'house', :'path_ddt'),
                 '22023', null, 'the energy audit is not a diagnostic a DDT covers');

-- Others
\set who seller_b
\ir _as.psql
select is((select count(*)::int from properties where id = :'house'), 0,
          'seller_b: does not read the property of seller_a');
update properties set is_coownership = false where id = :'house';
select is((select count(*)::int from documents where id = :'audit'), 0,
          'seller_b: does not read the energy audit of seller_a');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from properties where id = :'house'), 0,
          'buyer_c: does not read whether the house is in a co-ownership');
select is((select count(*)::int from documents where id = :'audit'), 0,
          'buyer_c: does not read an energy audit not shared with them');
\set who anon
\ir _as.psql
select throws_ok('select is_coownership from properties', '42501', null,
                 'anon: no access to is_coownership');
\set who admin
\ir _as.psql
select is((select is_coownership from properties where id = :'house'), true,
          'admin: reads it, unchanged by seller_b');
select is((select count(*)::int from documents where id = :'audit'), 1,
          'admin: reads the energy audit');

select * from finish();
rollback;
