-- L1-26: the payment of a plan (SPEC-V2 section 11). Only the webhook, with
-- the service role, records a payment or a refund: a visitor, a seller, a
-- buyer and the admin are refused. A payment writes the subscription, the
-- acceptance of the CGU and CGV, the case and the notifications in one go,
-- once per event and per session; an upgrade replaces the plan in force and
-- goes to the open case; a total refund ends the plan and brings back the one
-- an upgrade had replaced; a partial one leaves a note only.
begin;
\ir _helpers.psql
select plan(34);
\ir _plan.psql

-- The plans of the seed (reference data, absent from a bare database).
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

-- Nobody but the webhook --------------------------------------------------------
\set who anon
\ir _as.psql
select throws_ok(format($$select stripe_checkout_complete('evt_x', 'cs_x', 'pi_x', %L, %L, 'accompagne',
                  false, 99000, 0, false, now(), '2026-06-28', '2026-10-17')$$, :'prop', tests.uid('seller_a')),
                 '42501', null, 'anon: never records a payment');
\set who seller_a
\ir _as.psql
select throws_ok(format($$select stripe_checkout_complete('evt_x', 'cs_x', 'pi_x', %L, %L, 'accompagne',
                  false, 99000, 0, false, now(), '2026-06-28', '2026-10-17')$$, :'prop', tests.uid('seller_a')),
                 '42501', null, 'seller_a: never activates their own plan');
select throws_ok($$select stripe_charge_refunded('evt_r', 'pi_x', 99000, true)$$, '42501', null,
                 'seller_a: never records a refund');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select stripe_checkout_complete('evt_x', 'cs_x', 'pi_x', %L, %L, 'serenite',
                  false, 150000, 0, false, now(), '2026-06-28', '2026-10-17')$$, :'prop', tests.uid('seller_a')),
                 '42501', null, 'buyer_c: never records a payment');
\set who admin
\ir _as.psql
select throws_ok(format($$select stripe_checkout_complete('evt_x', 'cs_x', 'pi_x', %L, %L, 'serenite',
                  false, 150000, 0, false, now(), '2026-06-28', '2026-10-17')$$, :'prop', tests.uid('seller_a')),
                 '42501', null, 'admin: never records a payment (Stripe does)');
select throws_ok($$select stripe_charge_refunded('evt_r', 'pi_x', 99000, true)$$, '42501', null,
                 'admin: refunds in Stripe, never here');

-- The webhook ---------------------------------------------------------------------
reset role;
grant usage on schema tests to service_role;
grant execute on function tests.uid(text) to service_role;
set local role service_role;
select is((select stripe_checkout_complete('evt_1', 'cs_1', 'pi_1', :'prop', tests.uid('seller_a'), 'accompagne',
            false, 99000, 0, true, now() - interval '1 minute', '2026-06-28', '2026-10-17') ->> 'status'),
          'processed', 'webhook: a plan paid');
select is((select row(plan, amount_paid_cents, plan_snapshot ->> 'name', early_start_requested_at is not null)::text
             from subscriptions where stripe_checkout_session_id = 'cs_1'),
          '(accompagne,99000,Accompagné,t)', 'webhook: the subscription, its plan sheet and the immediate start');
select is((select array_agg(document || ':' || version order by document) from legal_acceptances
            where context = 'checkout' and profile_id = tests.uid('seller_a')),
          '{cgu:2026-06-28,cgv:2026-10-17}'::text[], 'webhook: the CGU and CGV accepted, with their versions');
select is((select plan::text from sale_progress where property_id = :'prop'), 'accompagne',
          'webhook: the sale follows the plan paid');
select ok((select subject like 'Formule Accompagné souscrite · Savigny-sur-Orge' from cases
            where property_id = :'prop' and source = 'plan_purchase'), 'webhook: a case for the team');
select is((select count(*)::int from notifications where profile_id = tests.uid('seller_a') and type = 'plan.activated'),
          1, 'webhook: the seller is told');
select ok((select count(*) >= 1 from notifications where profile_id = tests.uid('admin') and type = 'case.created'),
          'webhook: the team is told');

select is((select stripe_checkout_complete('evt_1', 'cs_1', 'pi_1', :'prop', tests.uid('seller_a'), 'accompagne',
            false, 99000, 0, false, now(), '2026-06-28', '2026-10-17') ->> 'status'),
          'duplicate', 'webhook: the same event again changes nothing');
select is((select stripe_checkout_complete('evt_1b', 'cs_1', 'pi_1', :'prop', tests.uid('seller_a'), 'accompagne',
            false, 99000, 0, false, now(), '2026-06-28', '2026-10-17') ->> 'status'),
          'duplicate', 'webhook: another event for the same session changes nothing');
select is((select count(*)::int from subscriptions where property_id = :'prop'), 1,
          'webhook: one subscription for the session');

select throws_ok(format($$select stripe_checkout_complete('evt_2', 'cs_2', 'pi_2', %L, %L, 'accompagne',
                  false, 99000, 0, false, now(), '2026-06-28', '2026-10-17')$$, :'prop', tests.uid('seller_b')),
                 '22023', null, 'webhook: refuses a property that is not this owner''s');
select throws_ok(format($$select stripe_checkout_complete('evt_3', 'cs_3', 'pi_3', %L, %L, 'autonomie',
                  false, 0, 0, false, now(), '2026-06-28', '2026-10-17')$$, :'prop', tests.uid('seller_a')),
                 '22023', null, 'webhook: refuses a free plan');

-- An upgrade: Sérénité replaces Accompagné, the open case gets a note.
select is((select stripe_checkout_complete('evt_4', 'cs_4', 'pi_4', :'prop', tests.uid('seller_a'), 'serenite',
            true, 51000, 0, false, now(), '2026-06-28', '2026-10-17') ->> 'status'),
          'processed', 'webhook: an upgrade paid');
select is((select replaced_by = (select id from subscriptions where stripe_checkout_session_id = 'cs_4')
             from subscriptions where stripe_checkout_session_id = 'cs_1'), true,
          'webhook: the upgrade replaces Accompagné');
select is((select plan::text from sale_progress where property_id = :'prop'), 'serenite',
          'webhook: the sale goes to Sérénité');
select is((select row(count(*), max(plan::text))::text from cases
            where property_id = :'prop' and source = 'plan_purchase'), '(1,serenite)',
          'webhook: the upgrade goes to the open case');
select is((select body from case_notes where author_id is null
            and case_id = (select id from cases where property_id = :'prop' and source = 'plan_purchase')),
          'Passage à Sérénité payé (510,00 €).', 'webhook: a note by Leenkey on the case');

-- Refunds.
select is((select stripe_charge_refunded('evt_r1', 'pi_4', 51000, true) ->> 'status'), 'processed',
          'webhook: the upgrade refunded');
select is((select row(
             (select refunded_at is not null from subscriptions where stripe_checkout_session_id = 'cs_4'),
             (select replaced_by is null from subscriptions where stripe_checkout_session_id = 'cs_1'),
             (select plan::text from sale_progress where property_id = :'prop'))::text),
          '(t,t,accompagne)', 'webhook: Accompagné is in force again');
select is((select plan::text from cases where property_id = :'prop' and source = 'plan_purchase'), 'accompagne',
          'webhook: the case follows the plan in force again');
select is((select stripe_charge_refunded('evt_r1', 'pi_4', 51000, true) ->> 'status'), 'duplicate',
          'webhook: the same refund again changes nothing');
select is((select stripe_charge_refunded('evt_r2', 'pi_1', 10000, false) ->> 'status'), 'processed',
          'webhook: a partial refund');
select is((select row(
             (select refunded_at is null from subscriptions where stripe_checkout_session_id = 'cs_1'),
             (select count(*) from case_notes where author_id is null and body like 'Remboursement partiel de 100,00 €%'))::text),
          '(t,1)', 'webhook: a partial refund leaves the plan, with a note');
select is((select stripe_charge_refunded('evt_r3', 'pi_unknown', 1000, true) ->> 'status'), 'unknown',
          'webhook: a refund of something else is only recorded');
select ok((select count(*) >= 2 from notifications where profile_id = tests.uid('admin') and type = 'plan.refunded'),
          'webhook: the team is told of each refund');

-- A note without an author is Leenkey's only.
\set who admin
\ir _as.psql
select throws_ok(format($$insert into case_notes (case_id, author_id, body) values (%L, null, 'x')$$,
                        (select id from cases where property_id = :'prop' and source = 'plan_purchase')),
                 '42501', null, 'admin: never writes a note without an author');

-- What the seller reads: their plan, never another's.
\set who seller_a
\ir _as.psql
select is((select count(*)::int from subscriptions where property_id = :'prop'), 2,
          'seller_a: reads the plans of their property');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from subscriptions where property_id = :'prop'), 0,
          'seller_b: never the plans of another seller');

select * from finish();
rollback;
