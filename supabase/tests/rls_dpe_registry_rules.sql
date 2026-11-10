-- L1-66: the rules of the DPE kept in tables (read by everyone, written by
-- the team), the DPE of business premises, the kind of a DPE declared by the
-- team once the listing is sent, the motive of an exemption kept with its
-- publication. Fixtures in postal code 99993.
begin;
\ir _helpers.psql
select plan(27);
\ir _plan.psql

-- ===========================================================================
-- The rules: read by everyone, written by the team
-- ===========================================================================
\set who anon
\ir _as.psql
select is((select row(valid_from, validity_years, costs_required, figures_required, excessive_classes)::text
             from dpe_rules where kind = 'logement'),
          '(2021-07-01,10,t,t,"{F,G}")', 'anon: reads the rule of the DPE of a home');
select is((select row(valid_from, validity_years, costs_required, figures_required, excessive_classes)::text
             from dpe_rules where kind = 'tertiaire'),
          '(,10,f,f,{})', 'anon: and the rule of business premises');
select is((select count(*)::int from dpe_exemption_reasons where active), 7,
          'anon: reads the motives of exemption');
select throws_ok($$insert into dpe_exemption_reasons (label, position) values ('Motif inventé', 9)$$,
                 '42501', null, 'anon: adds no motive');

\set who seller_a
\ir _as.psql
update dpe_rules set validity_years = 50 where kind = 'logement';
update dpe_exemption_reasons set active = false;
select throws_ok($$insert into dpe_exemption_reasons (label, position) values ('Motif inventé', 9)$$,
                 '42501', null, 'seller_a: adds no motive');
\set who seller_b
\ir _as.psql
delete from dpe_rules;
\set who buyer_c
\ir _as.psql
update dpe_rules set valid_from = null;
\set who buyer_d
\ir _as.psql
select throws_ok($$insert into dpe_rules (kind, validity_years, costs_required, figures_required)
                   values ('tertiaire', 1, false, false)$$,
                 '42501', null, 'buyer_d: writes no rule');
select is((select row(count(*), min(validity_years), max(validity_years),
                      count(*) filter (where valid_from is not null))::text from dpe_rules),
          '(2,10,10,1)', 'the rules are unchanged by sellers and buyers');
select is((select count(*)::int from dpe_exemption_reasons where active), 7,
          'the motives are unchanged by sellers and buyers');

-- ===========================================================================
-- seller_a: business premises, a home
-- ===========================================================================
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'autre', '1 rue du Registre', '99993', 'Registreville', 120, 0)
returning id as shop \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '2 rue du Registre', '99993', 'Registreville', 60, 3)
returning id as home \gset
insert into listings (property_id, title, description, price_cents)
values (:'shop', 'Local', 'Description.', 15000000) returning id as shop_listing, slug as shop_slug \gset
insert into listings (property_id, title, description, price_cents)
values (:'home', 'Appartement', 'Description.', 21000000) returning id as home_listing \gset

select throws_ok(format($$update properties set dpe_kind = 'tertiaire' where id = %L$$, :'home'),
                 '23514', null, 'a flat never has the DPE of business premises');
select throws_ok(format($$update properties set dpe_number = '2491E12345' where id = %L$$, :'home'),
                 '23514', null, 'the number of a DPE has 13 characters');
select throws_ok(format($$update properties set dpe_exempt = true, dpe_exemption_reason = 'Lieu de culte',
                            dpe_number = '2491E0000002B' where id = %L$$, :'home'),
                 '23514', null, 'an exempt property has no number of DPE');

-- Business premises: an older DPE, no cost range, the figures recommended only.
update properties set dpe_kind = 'tertiaire', dpe_class = 'F', ges_class = 'E',
                      dpe_date = date '2020-03-02' where id = :'shop';
select throws_ok(format($$select listing_submit(%L)$$, :'shop_listing'), '22023', 'dpe: dpe_missing',
                 'seller_a: business premises need the number of their DPE too');
update properties set dpe_number = '2075T0000003C' where id = :'shop';
select is(listing_submit(:'shop_listing'), 'pending'::listing_status,
          'seller_a: business premises go for review without a cost range, with a DPE of 2020');

-- Sent: the kind of the DPE is declared by the team.
select throws_ok(format($$update properties set dpe_kind = 'logement' where id = %L$$, :'shop'),
                 '22023', 'dpe: exemption', 'seller_a: the kind of a DPE sent is changed by the team');
update properties set energy_kwh_m2_year = 310, ges_kg_m2_year = 46 where id = :'shop';
select is((select energy_kwh_m2_year from properties where id = :'shop'), 310,
          'seller_a: its figures are still completed');

-- A home: the rule of homes, as the team sets it.
select tests.dpe(:'home_listing');
\set who admin
\ir _as.psql
update dpe_rules set valid_from = current_date + 1 where kind = 'logement';
\set who seller_a
\ir _as.psql
select throws_ok(format($$select listing_submit(%L)$$, :'home_listing'), '22023', 'dpe: dpe_outdated',
                 'seller_a: a rule changed by the team applies at once, without a deployment');
\set who admin
\ir _as.psql
update dpe_rules set valid_from = date '2021-07-01', figures_required = false where kind = 'logement';
\set who seller_a
\ir _as.psql
update properties set energy_kwh_m2_year = null, ges_kg_m2_year = null where id = :'home';
select is(listing_submit(:'home_listing'), 'pending'::listing_status,
          'seller_a: and what it no longer asks for is no longer required');
\set who admin
\ir _as.psql
update dpe_rules set figures_required = true where kind = 'logement';

-- ===========================================================================
-- The admin: publishes, the motive of an exemption kept in the history
-- ===========================================================================
select is(listing_publish(:'shop_listing'), 'published'::listing_status, 'admin: publishes the premises');
select throws_ok(format($$select listing_publish(%L)$$, :'home_listing'), '22023', 'dpe: dpe_missing',
                 'admin: a listing is checked against the rule in force at its publication');
update properties set dpe_class = null, ges_class = null, dpe_date = null, energy_cost_min_cents = null,
                      energy_cost_max_cents = null, energy_price_year = null, dpe_number = null,
                      dpe_exempt = true, dpe_exemption_reason = 'Lieu de culte'
 where id = :'home';
select is((select dpe_exempt from properties where id = :'home'), true,
          'admin: declares the exemption of a listing sent, having read it');
select is(listing_publish(:'home_listing'), 'published'::listing_status, 'admin: publishes it');
select is((select meta ->> 'dpe_exemption' from audit_log
            where entity = 'listing' and entity_id = :'home_listing' and action = 'listing.publish'),
          'Lieu de culte', 'admin: the motive read is kept in the history of the listing');
select is((select meta from audit_log
            where entity = 'listing' and entity_id = :'shop_listing' and action = 'listing.publish'),
          null, 'admin: nothing more in the history without an exemption');

-- ===========================================================================
-- The page of the listing
-- ===========================================================================
\set who anon
\ir _as.psql
select is((select d::text from public_listing_dpe(:'shop_slug') d),
          '(tertiaire,f,,,,,310,46,f)',
          'anon: business premises, class F without « excessive » nor a cost range');
select throws_ok(format($$select dpe_number from properties where id = %L$$, :'shop'), '42501', null,
                 'anon: never reads a property, nor the number of its DPE');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from properties where id in (:'shop', :'home')), 0,
          'buyer_c: never reads the properties of seller_a');
\set who seller_b
\ir _as.psql
update properties set dpe_number = '2491E0000009Z' where id = :'shop';
\set who admin
\ir _as.psql
select is((select dpe_number from properties where id = :'shop'), '2075T0000003C',
          'seller_b: never writes the DPE of seller_a');

select * from finish();
rollback;
