-- L1-40: the withdrawal of a plan and its end (SPEC-V2 section 11). Only the
-- owner of the property withdraws, within the period, once; the case gets a
-- note (reopened when closed) and the admins a notification. The daily job,
-- open to nobody, brings an ended plan's sale back to Autonomie and tells the
-- owner of a plan ending within 30 days, once.
begin;
\ir _helpers.psql
select plan(24);
\ir _plan.psql

insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils pour vendre vous-même.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Vous vendez. Nous vous accompagnons.', 99000, 'Accompagné', '{Conseiller}', 2),
  ('serenite', 'Sérénité', 'Nous pilotons avec vous.', 150000, 'Sérénité', '{Conseiller,Visites}', 3)
on conflict (code) do nothing;

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '12 rue de la Gare', '91600', 'Savigny-sur-Orge', 68, 3)
returning id as prop \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as prop2 \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '8 place de la Mairie', '91360', 'Épinay-sur-Orge', 45, 2)
returning id as prop3 \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '5 rue des Lilas', '91170', 'Viry-Châtillon', 90, 4)
returning id as prop4 \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
select tests.uid('seller_a'), 'appartement', n || ' rue du Test', '91600', 'Savigny-sur-Orge', 50, 2
  from generate_series(5, 9) n;
select (array_agg(id order by address_line))[1] as prop5, (array_agg(id order by address_line))[2] as prop6,
       (array_agg(id order by address_line))[3] as prop7, (array_agg(id order by address_line))[4] as prop8,
       (array_agg(id order by address_line))[5] as prop9
  from properties where owner_id = tests.uid('seller_a') and address_line like '% rue du Test' \gset

-- Plans written by the webhook (L1-26): one paid 3 days ago, one 25 days
-- ago, one ending in about 20 days, one ended a month ago.
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '3 days')
returning id as s1 \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop2', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '25 days')
returning id as s2 \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop3', tests.uid('seller_a'), 'serenite', 150000, now() - interval '12 months' + interval '20 days')
returning id as s3 \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop4', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '13 months')
returning id as s4 \gset
-- prop5: Accompagné 5 days ago, then the passage to Sérénité yesterday.
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop5', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '5 days')
returning id as s5a \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop5', tests.uid('seller_a'), 'serenite', 51000, now() - interval '1 day')
returning id as s5b \gset
update subscriptions set replaced_by = :'s5b' where id = :'s5a';
-- prop6: refunded. prop7, prop8, prop9: ending in about 20 days, but
-- withdrawn, refunded, or on a property sold.
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, refunded_at)
values (:'prop6', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '2 days', now())
returning id as s6 \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, withdrawal_requested_at)
values (:'prop7', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '12 months' + interval '20 days', now())
returning id as s7 \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, refunded_at)
values (:'prop8', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '12 months' + interval '20 days', now())
returning id as s8 \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop9', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '12 months' + interval '20 days')
returning id as s9 \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop9', 'Appartement 2 pièces', 'Vendu.', 20000000);
update listings set status = 'sold' where property_id = :'prop9';
-- The sale of prop4 still on the ended plan, as before the daily job.
update sale_progress set plan = 'accompagne' where property_id = :'prop4';
insert into cases (property_id, profile_id, source, status, subject)
values (:'prop', tests.uid('seller_a'), 'plan_purchase', 'closed', 'Formule Accompagné souscrite')
returning id as case1 \gset

-- Nobody but the owner withdraws ------------------------------------------------
\set who anon
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L)', :'s1'), '42501', null,
                 'anon: never withdraws');
\set who seller_b
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L)', :'s1'), '42501', null,
                 'seller_b: never withdraws the plan of another seller');
\set who buyer_c
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L)', :'s1'), '42501', null,
                 'buyer_c: never withdraws a plan');
\set who buyer_d
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L, true)', :'s5b'), '42501', null,
                 'buyer_d: never withdraws a plan');
\set who admin
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L)', :'s1'), '42501', null,
                 'admin: never withdraws in the name of a seller');

-- The owner -----------------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is(subscription_withdraw(:'s1')->>'status', 'recorded', 'seller_a: withdraws within the period');
select is(subscription_withdraw(:'s1')->>'status', 'already', 'seller_a: a second request keeps the first');
select throws_ok(format('select subscription_withdraw(%L)', :'s2'), '22023', null,
                 'seller_a: refused long after the period');
select throws_ok(format('select subscription_withdraw(%L)', :'s6'), '55000', null,
                 'seller_a: a refunded plan is not in force');
select is(subscription_withdraw(:'s5b', true)->>'replaced_plan_name', 'Accompagné',
          'seller_a: after a passage, the plan replaced, still in its period, goes with it');
select throws_ok(format('update subscriptions set withdrawal_requested_at = now() where id = %L', :'s2'),
                 '42501', null, 'seller_a: never writes a subscription straight');
select throws_ok('select subscriptions_daily()', '42501', null, 'seller_a: never runs the daily job');
\set who admin
\ir _as.psql
select throws_ok('select subscriptions_daily()', '42501', null, 'admin: never runs the daily job');

reset role;
select ok((select withdrawal_requested_at is not null from subscriptions where id = :'s1'),
          'withdrawal: the date of the request is kept');
select ok((select bool_and(withdrawal_requested_at is not null) from subscriptions
            where id in (:'s5a', :'s5b')),
          'withdrawal: both contracts of a passage are renounced');
select is((select status::text from cases where id = :'case1'), 'new',
          'withdrawal: the closed case of the plan is reopened');
select ok(exists (select 1 from case_notes where case_id = :'case1' and author_id is null
                    and body like 'Rétractation demandée par le vendeur le %'),
          'withdrawal: a note tells the team what to refund');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('admin') and type = 'plan.withdrawn'
              and data->>'entity_id' = :'s1' and email_after is not null), 1,
          'withdrawal: the admin is told once, by email too; a second request tells no one');

-- The daily job ---------------------------------------------------------------------
select subscriptions_daily();
select is((select plan::text from sale_progress where property_id = :'prop4'), 'autonomie',
          'daily: an ended plan brings the sale back to Autonomie');
select is((select plan::text from sale_progress where property_id = :'prop3'), 'serenite',
          'daily: a plan in force keeps its sale as it is');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_a') and type = 'plan.ending'
              and data->>'entity_id' = :'s3' and email_after is not null), 1,
          'daily: the owner of a plan ending within 30 days is told, by email too');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_a') and type = 'plan.ending'
              and data->>'entity_id' in (:'s7', :'s8', :'s9')), 0,
          'daily: no reminder for a plan ending soon but withdrawn, refunded or on a property sold');
select subscriptions_daily();
select is((select count(*)::int from notifications
            where type = 'plan.ending' and data->>'entity_id' = :'s3'), 1,
          'daily: told once only');
\set who seller_a
\ir _as.psql
select is((select count(*)::int from notifications where type = 'plan.ending'), 1,
          'seller_a: reads the reminder of their plan');

select * from finish();
rollback;
