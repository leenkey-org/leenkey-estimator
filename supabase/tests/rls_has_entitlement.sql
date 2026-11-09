-- L1-33: has_entitlement(property, feature) reads the rights of the plan in
-- force of a property in plan_entitlements, for its owner and the admins
-- only: false for another seller, a buyer, and closed to a visitor.
begin;
\ir _helpers.psql
select plan(14);
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

reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'paid', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '3 days');
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'ended', tests.uid('seller_a'), 'serenite', 150000, now() - interval '13 months');

-- The owner -----------------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is(has_entitlement(:'free', 'advisor'), false, 'seller_a: Autonomie has no adviser');
select is(has_entitlement(:'paid', 'advisor'), true, 'seller_a: Accompagné has the adviser');
select is(has_entitlement(:'paid', 'sale_file_building'), false,
          'seller_a: Accompagné does not build the sale file');
select is(has_entitlement(:'ended', 'advisor'), false,
          'seller_a: a plan ended 12 months after is back to Autonomie');
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
\set who anon
\ir _as.psql
select throws_ok(format('select has_entitlement(%L, %L)', :'paid', 'advisor'), '42501', null,
                 'anon: closed to visitors');

-- A plan withdrawn from the table of rights by an admin takes the right away.
reset role;
delete from plan_entitlements where plan = 'accompagne' and feature = 'advisor';
\set who seller_a
\ir _as.psql
select is(has_entitlement(:'paid', 'advisor'), false,
          'seller_a: the right follows plan_entitlements, not the name of the plan');

-- A deleted property has no right.
reset role;
update properties set deleted_at = now() where id = :'ended';
\set who admin
\ir _as.psql
select is(has_entitlement(:'ended', 'advisor'), false, 'admin: a deleted property has no right');
select is(has_entitlement(:'paid', 'sale_file_building'), false,
          'admin: Accompagné does not build the sale file');

select * from finish();
rollback;
