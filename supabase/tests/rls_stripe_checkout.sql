-- L1-26: the payment of a plan (SPEC-V2 section 11). Only the webhook, with
-- the service role, records a payment or a refund: a visitor, a seller, a
-- buyer and the admin are refused. A payment writes the subscription, the
-- acceptance of the CGU and CGV, the case and the notifications in one go,
-- once per event and per session; an upgrade replaces the plan in force and
-- goes to the open case; a total refund ends the plan and brings back the one
-- an upgrade had replaced; a partial one leaves a note only.
begin;
\ir _helpers.psql
select plan(61);
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
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as prop2 \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '8 place de la Mairie', '91360', 'Épinay-sur-Orge', 45, 2)
returning id as prop3 \gset

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

-- What money alone does not settle, recorded and flagged for the team.
-- A stale upgrade session paid once Accompagné is refunded: Sérénité for 510 €.
select is((select stripe_charge_refunded('evt_r4', 'pi_1', 99000, true) ->> 'status'), 'processed',
          'webhook: Accompagné refunded in full');
select is((select (stripe_checkout_complete('evt_5', 'cs_5', 'pi_5', :'prop', tests.uid('seller_a'), 'serenite',
            true, 51000, 0, false, now(), '2026-06-28', '2026-10-17') - 'subscription_id' - 'case_id')
             = '{"check": ["passage payé sans la formule inférieure en vigueur", "510,00 € reçus au lieu de 1 500,00 €", "paiement gardé, formule non activée"], "status": "held", "reference": "Savigny-sur-Orge", "plan_name": "Sérénité", "replaced_plan": null}'::jsonb),
          true,
          'webhook: an upgrade paid without Accompagné in force is held, with the amount');
select is((select row(
             (select plan::text from sale_progress where property_id = :'prop'),
             (select ends_at <= activated_at from subscriptions where stripe_checkout_session_id = 'cs_5'))::text),
          '(autonomie,t)', 'webhook: the held payment gives no plan');
select ok((select bool_or(body like '%À vérifier : passage payé sans la formule inférieure en vigueur%')
             from case_notes where author_id is null
              and case_id = (select id from cases where property_id = :'prop' and source = 'plan_purchase')),
          'webhook: the case says it');

-- A refund recorded before its payment (the payment came back later).
select is((select stripe_charge_refunded('evt_r9', 'pi_9', 99000, true) ->> 'status'), 'unknown',
          'webhook: a refund of a payment not recorded yet is kept');
select is((select stripe_checkout_complete('evt_9', 'cs_9', 'pi_9', :'prop2', tests.uid('seller_a'), 'accompagne',
            false, 99000, 0, false, now(), '2026-06-28', '2026-10-17') ->> 'status'),
          'refunded', 'webhook: the payment that comes later is recorded as refunded');
select is((select row(
             (select refunded_at is not null from subscriptions where stripe_checkout_session_id = 'cs_9'),
             (select plan::text from sale_progress where property_id = :'prop2'))::text),
          '(t,autonomie)', 'webhook: and no plan is in force for it');

-- Two tabs: the same plan paid twice, then a dearer one, then a cheaper one.
select is((select stripe_checkout_complete('evt_12', 'cs_12', 'pi_12', :'prop2', tests.uid('seller_a'), 'accompagne',
            false, 99000, 0, false, now(), '2026-06-28', '2026-10-17') ->> 'status'), 'processed',
          'webhook: Accompagné paid');
select is((select stripe_checkout_complete('evt_13', 'cs_13', 'pi_13', :'prop2', tests.uid('seller_a'), 'accompagne',
            false, 99000, 0, false, now(), '2026-06-28', '2026-10-17') ->> 'status'), 'held',
          'webhook: the same plan paid a second time is held');
select is((select row(
             (select plan::text from sale_progress where property_id = :'prop2'),
             (select replaced_by is null from subscriptions where stripe_checkout_session_id = 'cs_12'))::text),
          '(accompagne,t)', 'webhook: the first one stays in force');
select is((select stripe_checkout_complete('evt_14', 'cs_14', 'pi_14', :'prop2', tests.uid('seller_a'), 'serenite',
            false, 150000, 0, false, now(), '2026-06-28', '2026-10-17') ->> 'check'),
          '["une formule payante était déjà active : la différence est à rembourser"]',
          'webhook: Sérénité at full price over Accompagné activates, the difference to refund');
select is((select plan::text from sale_progress where property_id = :'prop2'), 'serenite',
          'webhook: Sérénité in force');
select is((select stripe_checkout_complete('evt_15', 'cs_15', 'pi_15', :'prop2', tests.uid('seller_a'), 'accompagne',
            false, 99000, 0, false, now(), '2026-06-28', '2026-10-17') ->> 'status'), 'held',
          'webhook: a cheaper plan paid after a dearer one is held');
select is((select plan::text from sale_progress where property_id = :'prop2'), 'serenite',
          'webhook: and never replaces it');

-- Accompagné refunded while the upgrade that replaced it is in force.
select is((select stripe_checkout_complete('evt_10', 'cs_10', 'pi_10', :'prop3', tests.uid('seller_a'), 'accompagne',
            false, 99000, 0, false, now(), '2026-06-28', '2026-10-17') ->> 'status'), 'processed',
          'webhook: Accompagné on a third property');
select is((select stripe_checkout_complete('evt_11', 'cs_11', 'pi_11', :'prop3', tests.uid('seller_a'), 'serenite',
            true, 51000, 0, false, now(), '2026-06-28', '2026-10-17') -> 'check')::text, '[]',
          'webhook: its upgrade, nothing to check');
select is((select row(stripe_charge_refunded('evt_r10', 'pi_10', 99000, true) ->> 'check',
                      (select plan::text from sale_progress where property_id = :'prop3'))::text),
          '(true,serenite)', 'webhook: Accompagné refunded under Sérénité is flagged, Sérénité stays');

-- A note without an author is Leenkey's only.
\set who admin
\ir _as.psql
select throws_ok(format($$insert into case_notes (case_id, author_id, body) values (%L, null, 'x')$$,
                        (select id from cases where property_id = :'prop' and source = 'plan_purchase')),
                 '42501', null, 'admin: never writes a note without an author');

-- What the seller reads: their plan, never another's.
\set who seller_a
\ir _as.psql
select is((select count(*)::int from subscriptions where property_id = :'prop'), 3,
          'seller_a: reads the plans of their property');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from subscriptions where property_id = :'prop'), 0,
          'seller_b: never the plans of another seller');
select is((select count(*)::int from legal_acceptances where profile_id = tests.uid('seller_a')), 0,
          'seller_b: never the acceptances of another seller');
select throws_ok(format($$select stripe_checkout_complete('evt_b', 'cs_b', 'pi_b', %L, %L, 'accompagne',
                  false, 99000, 0, false, now(), '2026-06-28', '2026-10-17')$$, :'prop', tests.uid('seller_b')),
                 '42501', null, 'seller_b: never records a payment');
select throws_ok($$select stripe_charge_refunded('evt_rb', 'pi_1', 99000, true)$$, '42501', null,
                 'seller_b: never records a refund');
select throws_ok('select count(*) from stripe_events', '42501', null, 'seller_b: never the events of Stripe');

\set who buyer_c
\ir _as.psql
select is((select count(*)::int from subscriptions), 0, 'buyer_c: no plan to read');
select is((select count(*)::int from legal_acceptances where context = 'checkout'), 0,
          'buyer_c: never the acceptances of an order');

\set who buyer_d
\ir _as.psql
select throws_ok(format($$select stripe_checkout_complete('evt_d', 'cs_d', 'pi_d', %L, %L, 'accompagne',
                  false, 99000, 0, false, now(), '2026-06-28', '2026-10-17')$$, :'prop', tests.uid('seller_a')),
                 '42501', null, 'buyer_d: never records a payment');
select is((select count(*)::int from subscriptions where property_id = :'prop'), 0,
          'buyer_d: never the plans of a seller');

\set who anon
\ir _as.psql
select throws_ok('select count(*) from subscriptions', '42501', null, 'anon: no plan to read');
select throws_ok('select count(*) from legal_acceptances', '42501', null, 'anon: no acceptance to read');

select * from finish();
rollback;
