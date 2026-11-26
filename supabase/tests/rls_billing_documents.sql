-- Documents of the paid plans (DECISIONS.md 2026-11-26): the email of a
-- refund goes once per credit note. credit_notes.refund_emailed_at is
-- written only by credit_note_email_claim / _release, open to the service
-- role (the webhook, or the admin action after its own check); the owner of
-- the plan and the team read it with the credit note, nobody else.
begin;
\ir _helpers.psql
select plan(21);
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

reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at,
                           stripe_checkout_session_id, stripe_payment_intent_id,
                           withdrawal_requested_at)
values (:'prop', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '4 days',
        'cs_rls_bd_a', 'pi_rls_bd_a', now() - interval '3 days')
returning id as sa \gset

set local role service_role;
select credit_notes_record('pi_rls_bd_a',
  '[{"id":"cn_rls_bd_1","number":"LK-0001-CN-01","amount_cents":99000,"pdf_url":"https://pay.stripe.com/credit_notes/x","issued_at":"2026-11-26T10:00:00Z"}]'::jsonb)
  is not null as recorded \gset
reset role;
select id as cn from credit_notes where stripe_credit_note_id = 'cn_rls_bd_1' \gset

select ok((select refund_emailed_at is null from credit_notes where id = :'cn'),
          'a credit note just recorded: its email is still to send');

-- The service role takes the email once.
set local role service_role;
select is(credit_note_email_claim(:'cn'), true, 'service role: takes the email of a credit note');
select is(credit_note_email_claim(:'cn'), false, 'service role: a second delivery does not take it again');
select is(credit_note_email_claim(gen_random_uuid()), false, 'service role: an unknown credit note is not taken');
-- A second delivery of the credit note (credit_notes_record) keeps the mark.
select credit_notes_record('pi_rls_bd_a',
  '[{"id":"cn_rls_bd_1","number":"LK-0001-CN-01","amount_cents":99000,"pdf_url":"https://pay.stripe.com/credit_notes/y","issued_at":"2026-11-26T10:00:00Z"}]'::jsonb)
  is not null as recorded_again \gset
reset role;
select ok((select refund_emailed_at is not null and pdf_url like '%/y' from credit_notes where id = :'cn'),
          'recorded again (a new address of the PDF): the email stays taken');
set local role service_role;
select lives_ok(format('select credit_note_email_release(%L)', :'cn'),
                'service role: gives the email back when it could not leave');
select is(credit_note_email_claim(:'cn'), true, 'service role: takes it again after a release');
reset role;

-- Nobody else calls them, nor writes the column.
\set who anon
\ir _as.psql
select throws_ok(format('select credit_note_email_claim(%L)', :'cn'), '42501', null,
                 'anon: never takes the email of a credit note');
select throws_ok(format('select credit_note_email_release(%L)', :'cn'), '42501', null,
                 'anon: never releases it');
select throws_ok('select refund_emailed_at from credit_notes', '42501', null,
                 'anon: never reads a credit note');

\set who seller_a
\ir _as.psql
select ok((select refund_emailed_at is not null from credit_notes where id = :'cn'),
          'seller_a: reads when the email of their credit note was sent');
select throws_ok(format('select credit_note_email_claim(%L)', :'cn'), '42501', null,
                 'seller_a: never takes the email of a credit note');
select throws_ok(format('select credit_note_email_release(%L)', :'cn'), '42501', null,
                 'seller_a: never releases it');
select throws_ok(format('update credit_notes set refund_emailed_at = null where id = %L', :'cn'),
                 '42501', null, 'seller_a: never writes the mark');

\set who seller_b
\ir _as.psql
select is((select count(*)::int from credit_notes where id = :'cn'), 0,
          'seller_b: never reads the credit note of another seller');
select throws_ok(format('select credit_note_email_release(%L)', :'cn'), '42501', null,
                 'seller_b: never releases the email of another seller');

\set who buyer_c
\ir _as.psql
select is((select count(*)::int from credit_notes), 0, 'buyer_c: reads no credit note');
select throws_ok(format('select credit_note_email_claim(%L)', :'cn'), '42501', null,
                 'buyer_c: never takes the email of a credit note');

\set who buyer_d
\ir _as.psql
select throws_ok(format('select credit_note_email_release(%L)', :'cn'), '42501', null,
                 'buyer_d: never releases the email of a credit note');

\set who admin
\ir _as.psql
select ok((select refund_emailed_at is not null from credit_notes where id = :'cn'),
          'admin: reads when the email of a credit note was sent');
select throws_ok(format('select credit_note_email_claim(%L)', :'cn'), '42501', null,
                 'admin: the email of a credit note is the service role''s, never a client''s');

select * from finish();
rollback;
