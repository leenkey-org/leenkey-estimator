-- L1-65: the DPE asked to send a listing for review. A draft is saved
-- without it; the sending is refused while the DPE is missing, outdated or
-- an exemption has no motive; land is not concerned; once sent, a complete
-- DPE stays complete; the page of a published listing reads its mentions,
-- never the motive of an exemption. Fixtures in postal code 99994.
begin;
\ir _helpers.psql
select plan(25);
\ir _plan.psql

-- ===========================================================================
-- seller_a: a flat, a house exempt, a plot of land
-- ===========================================================================
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '1 rue du DPE', '99994', 'Dpeville', 52, 2)
returning id as flat \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '2 rue du DPE', '99994', 'Dpeville', 40, 2)
returning id as cabin \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'terrain', '3 rue du DPE', '99994', 'Dpeville', 600, 0)
returning id as land \gset
insert into listings (property_id, title, description, price_cents)
values (:'flat', 'Appartement', 'Description.', 20000000) returning id as flat_listing, slug as flat_slug \gset
insert into listings (property_id, title, description, price_cents)
values (:'cabin', 'Maison', 'Description.', 9000000) returning id as cabin_listing \gset
insert into listings (property_id, title, description, price_cents)
values (:'land', 'Terrain', 'Description.', 5000000) returning id as land_listing \gset

select ok((select dpe_class is null and not dpe_exempt from properties where id = :'flat'),
          'seller_a: a draft is saved without its DPE');
select throws_ok(format($$select listing_submit(%L)$$, :'flat_listing'), '22023', 'dpe: dpe_missing',
                 'seller_a: no sending without the DPE');
update properties set dpe_class = 'D', ges_class = 'C' where id = :'flat';
select throws_ok(format($$select listing_submit(%L)$$, :'flat_listing'), '22023', 'dpe: dpe_missing',
                 'seller_a: the classes alone are not enough (date, costs, year of the prices)');
update properties set dpe_date = date '2021-06-30', energy_cost_min_cents = 90000,
                      energy_cost_max_cents = 130000, energy_price_year = 2021
 where id = :'flat';
select throws_ok(format($$select listing_submit(%L)$$, :'flat_listing'), '22023', 'dpe: dpe_outdated',
                 'seller_a: a DPE made before 1 July 2021 is no longer valid');
update properties set dpe_date = current_date + 1 where id = :'flat';
select throws_ok(format($$select listing_submit(%L)$$, :'flat_listing'), '22023', 'dpe: dpe_outdated',
                 'seller_a: nor a DPE dated after today');
select throws_ok(format($$update properties set energy_cost_min_cents = 200000 where id = %L$$, :'flat'),
                 '23514', null, 'the lowest cost never above the highest');
update properties set dpe_date = current_date - 10 where id = :'flat';
select is(listing_submit(:'flat_listing'), 'pending'::listing_status,
          'seller_a: with a complete DPE, the listing goes for review');

-- Sent: the DPE stays complete.
select throws_ok(format($$update properties set dpe_date = null where id = %L$$, :'flat'), '22023', null,
                 'seller_a: a listing sent keeps its DPE');
select throws_ok(format($$update properties set dpe_exempt = true, dpe_exemption_reason = null, dpe_class = null where id = %L$$, :'flat'),
                 '22023', null, 'seller_a: nor turns into an exemption without a motive');
update properties set dpe_class = 'C' where id = :'flat';
select is((select dpe_class from properties where id = :'flat'), 'C',
          'seller_a: its classes still change while it stays complete');

-- An exemption, with its motive.
select throws_ok(format($$update properties set dpe_exemption_reason = 'Sans DPE' where id = %L$$, :'cabin'),
                 '23514', null, 'a motive only with an exemption');
update properties set dpe_exempt = true where id = :'cabin';
select throws_ok(format($$select listing_submit(%L)$$, :'cabin_listing'), '22023', 'dpe: exemption_reason',
                 'seller_a: an exemption needs its motive');
update properties set dpe_exemption_reason = 'Bâtiment indépendant de moins de 50 m²' where id = :'cabin';
select is(listing_submit(:'cabin_listing'), 'pending'::listing_status,
          'seller_a: exempt with a motive, the listing goes for review');

-- Land.
select is(listing_submit(:'land_listing'), 'pending'::listing_status,
          'seller_a: land goes for review without a DPE');

select throws_ok(format($$select property_dpe_issue(p) from properties p where id = %L$$, :'flat'),
                 '42501', null, 'seller_a: the check of the DPE is not called directly');

-- ===========================================================================
-- The admin publishes; the page of the listing reads its mentions
-- ===========================================================================
\set who admin
\ir _as.psql
select is(listing_publish(:'flat_listing'), 'published'::listing_status, 'admin: publishes the flat');
select is(listing_publish(:'cabin_listing'), 'published'::listing_status, 'admin: publishes the house');
select is((select dpe_exemption_reason from properties where id = :'cabin'),
          'Bâtiment indépendant de moins de 50 m²', 'admin: reads the motive of the exemption');

-- A listing sent before L1-65 without its DPE (written as it was then).
reset role;
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '4 rue du DPE', '99994', 'Dpeville', 30, 1)
returning id as legacy \gset
insert into listings (property_id, title, description, price_cents)
values (:'legacy', 'Studio', 'Description.', 9000000) returning id as legacy_listing \gset
update listings set status = 'pending', submitted_at = now() where id = :'legacy_listing';
\set who seller_a
\ir _as.psql
update properties set rooms = 2 where id = :'legacy';
select is((select rooms from properties where id = :'legacy'), 2,
          'seller_a: the property of a listing sent without its DPE still changes');
\set who admin
\ir _as.psql
select throws_ok(format($$select listing_publish(%L)$$, :'legacy_listing'), '22023', 'dpe: dpe_missing',
                 'admin: never publishes a listing without its DPE');
select is(listing_reject(:'legacy_listing', 'Une information obligatoire manque : classe énergie (DPE).'),
          'rejected'::listing_status, 'admin: rejects it, for the seller to complete it');

\set who anon
\ir _as.psql
select is((select row(dpe_exempt, energy_cost_min_cents, energy_cost_max_cents, energy_price_year)::text
             from public_listing_energy(:'flat_slug')),
          '(f,90000,130000,2021)', 'anon: the mentions of a published listing');
select is((select dpe_date from public_listing_energy(:'flat_slug')), current_date - 10,
          'anon: with the date of its DPE');
select is((select count(*)::int from public_listing_energy('appartement-inconnu-lk9999')), 0,
          'anon: nothing for a listing that is not online');

\set who seller_b
\ir _as.psql
select is((select count(*)::int from properties where id = :'cabin'), 0,
          'seller_b: never reads the property of seller_a, nor its motive');

select * from finish();
rollback;
