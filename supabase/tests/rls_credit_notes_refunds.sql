-- Credit notes and refunds (DECISIONS.md 2026-11-25). A credit note is read
-- by the owner of its plan and by the team, written by nobody from a client:
-- only credit_notes_record, open to the service role (the webhook, or the
-- admin action after its own check). admin_refunds() is the team's alone.
begin;
\ir _helpers.psql
select plan(23);
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
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as propb \gset

-- Written by the webhook (L1-26): seller_a renounced 3 days ago and was
-- refunded; seller_b renounced 20 days ago, not refunded yet.
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at,
                           stripe_checkout_session_id, stripe_payment_intent_id,
                           withdrawal_requested_at)
values (:'prop', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '4 days',
        'cs_rls_cn_a', 'pi_rls_cn_a', now() - interval '3 days')
returning id as sa \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at,
                           stripe_checkout_session_id, stripe_payment_intent_id,
                           withdrawal_requested_at)
values (:'propb', tests.uid('seller_b'), 'serenite', 150000, now() - interval '22 days',
        'cs_rls_cn_b', 'pi_rls_cn_b', now() - interval '20 days')
returning id as sb \gset
select stripe_charge_refunded('evt_rls_cn_1', 'pi_rls_cn_a', 99000, true) is not null as refunded \gset

-- The service role records the credit note, twice (a second delivery): one row.
set local role service_role;
select is(credit_notes_record('pi_rls_cn_a',
            '[{"id":"cn_rls_1","number":"LK-0001-CN-01","amount_cents":99000,"pdf_url":"https://pay.stripe.com/credit_notes/x","issued_at":"2026-11-25T10:00:00Z"}]'::jsonb)->>'status',
          'recorded', 'service role: records a credit note');
select is(credit_notes_record('pi_rls_cn_a',
            '[{"id":"cn_rls_1","number":"LK-0001-CN-01","amount_cents":99000,"pdf_url":"https://pay.stripe.com/credit_notes/x","issued_at":"2026-11-25T10:00:00Z"}]'::jsonb)->>'count',
          '1', 'service role: a second delivery keeps one credit note');
select is(credit_notes_record('pi_unknown', '[]'::jsonb)->>'status', 'unknown',
          'service role: a payment of no plan records nothing');
reset role;
select is((select count(*)::int from credit_notes where stripe_credit_note_id = 'cn_rls_1'), 1,
          'one credit note per Stripe credit note');
select credit_notes_record('pi_rls_cn_a', '[]'::jsonb, tests.uid('admin')) is not null as retried \gset
select is((select count(*)::int from audit_log
            where action = 'credit_note.retry' and actor_id = tests.uid('admin')
              and entity_id = :'sa'), 1,
          'asked again by an admin: written in audit_log');

-- Reads ---------------------------------------------------------------------------
\set who anon
\ir _as.psql
select throws_ok('select count(*) from credit_notes', '42501', null, 'anon: never reads a credit note');
select throws_ok('select * from admin_refunds()', '42501', null, 'anon: never reads the refunds');

\set who seller_a
\ir _as.psql
select is((select count(*)::int from credit_notes), 1, 'seller_a: reads the credit note of their plan');
select is((select number from credit_notes), 'LK-0001-CN-01', 'seller_a: its number');
select throws_ok('select * from admin_refunds()', '42501', null, 'seller_a: never reads the refunds of the team');
select throws_ok(format(
  'insert into credit_notes (subscription_id, stripe_credit_note_id, number, amount_cents, issued_at) values (%L, %L, %L, 1, now())',
  :'sa', 'cn_forged', 'X'), '42501', null, 'seller_a: never writes a credit note');
select throws_ok(format('update credit_notes set amount_cents = 0 where subscription_id = %L', :'sa'),
                 '42501', null, 'seller_a: never changes a credit note');
select throws_ok('select credit_notes_record(''pi_rls_cn_a'', ''[]''::jsonb)', '42501', null,
                 'seller_a: never calls credit_notes_record');

\set who seller_b
\ir _as.psql
select is((select count(*)::int from credit_notes), 0, 'seller_b: never reads the credit note of another seller');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from credit_notes), 0, 'buyer_c: reads no credit note');
\set who buyer_d
\ir _as.psql
select is((select count(*)::int from credit_notes), 0, 'buyer_d: reads no credit note');
select throws_ok('select * from admin_refunds()', '42501', null, 'buyer_d: never reads the refunds');

\set who admin
\ir _as.psql
select is((select count(*)::int from credit_notes where stripe_credit_note_id = 'cn_rls_1'), 1,
          'admin: reads every credit note');
select throws_ok(format('delete from credit_notes where subscription_id = %L', :'sa'),
                 '42501', null, 'admin: never writes a credit note from a client');
select throws_ok('select credit_notes_record(''pi_rls_cn_a'', ''[]''::jsonb)', '42501', null,
                 'admin: credit_notes_record is the service role''s');
select is((select refunded_cents from admin_refunds() where subscription_id = :'sa'), 99000,
          'admin: the amount refunded, as Stripe said it');
select is((select credited_cents from admin_refunds() where subscription_id = :'sa'), 99000,
          'admin: the credit notes of the refund');
select ok((select refunded_at is null and refunded_cents = 0 and requested_at is not null
             from admin_refunds() where subscription_id = :'sb'),
          'admin: a withdrawal still to refund, with its request');

select * from finish();
rollback;
