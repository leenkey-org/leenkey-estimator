-- L1-33: has_entitlement(property, feature) reads the rights of the plan in
-- force of a property in plan_entitlements, for its owner and the admins
-- only: false for another seller, a buyer, and closed to a visitor. The plan
-- in force (property_current_plan): neither ended, refunded nor replaced; a
-- withdrawal asked keeps the plan until its refund (L1-40).
begin;
\ir _helpers.psql
select plan(19);
\ir _plan.psql

insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Un conseiller.', 99000, 'Accompagné', '{Conseiller}', 2),
  ('serenite', 'Sérénité', 'Jusqu''à la signature.', 150000, 'Sérénité', '{Conseiller,Dossier}', 3)
on conflict (code) do nothing;
insert into plan_entitlements (plan, feature) values
  ('accompagne', 'advisor'), ('serenite', 'advisor'), ('serenite', 'sale_file_building')
on conflict do nothing;

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '12 rue de la Gare', '91600', 'Savigny-sur-Orge', 68, 3)
returning id as free \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as paid \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '5 rue des Lilas', '91170', 'Viry-Châtillon', 90, 4)
returning id as ended \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '8 place de la Mairie', '91360', 'Épinay-sur-Orge', 45, 2)
returning id as refunded \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '14 rue Victor Hugo', '91260', 'Juvisy-sur-Orge', 95, 4)
returning id as upgraded \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '2 avenue de la Gare', '91390', 'Morsang-sur-Orge', 52, 2)
returning id as gone \gset

reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, withdrawal_requested_at)
values (:'paid', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '3 days', now() - interval '1 day');
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'ended', tests.uid('seller_a'), 'serenite', 150000, now() - interval '13 months');
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, refunded_at)
values (:'refunded', tests.uid('seller_a'), 'serenite', 150000, now() - interval '5 days', now() - interval '2 days');
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'upgraded', tests.uid('seller_a'), 'serenite', 51000, now() - interval '2 days')
returning id as upgrade \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, replaced_by)
values (:'upgraded', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '10 days', :'upgrade');
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'gone', tests.uid('seller_a'), 'serenite', 150000, now() - interval '4 days');

-- The owner -----------------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is(has_entitlement(:'free', 'advisor'), false, 'seller_a: Autonomie has no adviser');
select is(has_entitlement(:'paid', 'advisor'), true,
          'seller_a: Accompagné has the adviser, a withdrawal asked keeps it until the refund');
select is(has_entitlement(:'paid', 'sale_file_building'), false,
          'seller_a: Accompagné does not build the sale file');
select is(has_entitlement(:'ended', 'advisor'), false,
          'seller_a: a plan ended 12 months after is back to Autonomie');
select is(has_entitlement(:'refunded', 'advisor'), false, 'seller_a: a refunded plan has no right');
select is(has_entitlement(:'upgraded', 'sale_file_building'), true,
          'seller_a: Sérénité, after Accompagné, builds the sale file');
select is(has_entitlement(:'gone', 'sale_file_building'), true,
          'seller_a: Sérénité in force builds the sale file');
select is(has_entitlement('00000000-0000-4000-8000-000000000000', 'advisor'), false,
          'seller_a: an unknown property has no right');

-- The others -----------------------------------------------------------------------
\set who seller_b
\ir _as.psql
select is(has_entitlement(:'paid', 'advisor'), false, 'seller_b: never reads the rights of another seller');
\set who buyer_c
\ir _as.psql
select is(has_entitlement(:'paid', 'advisor'), false, 'buyer_c: never reads the rights of a seller');
\set who buyer_d
\ir _as.psql
select is(has_entitlement(:'paid', 'advisor'), false, 'buyer_d: never reads the rights of a seller');
\set who admin
\ir _as.psql
select is(has_entitlement(:'paid', 'advisor'), true, 'admin: reads the rights of any property');
select is(has_entitlement(:'free', 'advisor'), false, 'admin: Autonomie has no adviser');
select is(has_entitlement(:'gone', 'sale_file_building'), true,
          'admin: Sérénité in force builds the sale file');
\set who anon
\ir _as.psql
select throws_ok(format('select has_entitlement(%L, %L)', :'paid', 'advisor'), '42501', null,
                 'anon: closed to visitors');

-- A deleted property has no right, its plan still in force.
reset role;
update properties set deleted_at = now() where id = :'gone';
\set who seller_a
\ir _as.psql
select is(has_entitlement(:'gone', 'sale_file_building'), false,
          'seller_a: a deleted property has no right');
\set who admin
\ir _as.psql
select is(has_entitlement(:'gone', 'sale_file_building'), false,
          'admin: a deleted property has no right');

-- A right withdrawn from the table by an admin is gone for the plan.
reset role;
delete from plan_entitlements where plan = 'accompagne' and feature = 'advisor';
\set who seller_a
\ir _as.psql
select is(has_entitlement(:'paid', 'advisor'), false,
          'seller_a: the right follows plan_entitlements, not the name of the plan');
select is(has_entitlement(:'upgraded', 'advisor'), true,
          'seller_a: Sérénité keeps the adviser it has in the table');

select * from finish();
rollback;
