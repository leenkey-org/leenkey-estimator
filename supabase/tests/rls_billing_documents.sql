-- Documents of the paid plans (DECISIONS.md 2026-11-26): the email of a
-- refund goes once per credit note. credit_notes.refund_email_claimed_at
-- and refund_emailed_at are written only by credit_note_email_claim, _sent,
-- _release and credit_notes_emailed_elsewhere, open to the service role
-- (the webhook, or the admin action after its own check); the owner of the
-- plan and the team read them with the credit note, nobody else. The team
-- opening a document of a seller, or sending a refund email again, is
-- written in audit_log. The downloads have their own limit.
begin;
\ir _helpers.psql
select plan(45);
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
  '[{"id":"cn_rls_bd_1","number":"LK-0001-CN-01","amount_cents":40000,"pdf_url":"https://pay.stripe.com/credit_notes/x","issued_at":"2026-11-26T10:00:00Z"},
    {"id":"cn_rls_bd_2","number":"LK-0001-CN-02","amount_cents":59000,"pdf_url":"https://pay.stripe.com/credit_notes/z","issued_at":"2026-11-26T11:00:00Z"}]'::jsonb)
  is not null as recorded \gset
reset role;
select id as cn from credit_notes where stripe_credit_note_id = 'cn_rls_bd_1' \gset
select id as cn2 from credit_notes where stripe_credit_note_id = 'cn_rls_bd_2' \gset

select ok((select refund_emailed_at is null and refund_email_claimed_at is null
             from credit_notes where id = :'cn'),
          'a credit note just recorded: its email is still to send');

-- The service role takes the email once (two deliveries at the same time).
set local role service_role;
select is(credit_note_email_claim(:'cn'), true, 'service role: takes the email of a credit note');
select is(credit_note_email_claim(:'cn'), false,
          'service role: a second delivery at the same time does not take it');
select is(credit_note_email_claim(gen_random_uuid()), false, 'service role: an unknown credit note is not taken');
reset role;
select ok((select refund_emailed_at is null and refund_email_claimed_at is not null
             from credit_notes where id = :'cn'),
          'taken is not sent: the claim alone is written');

-- A second delivery of the credit note (credit_notes_record) keeps the claim.
set local role service_role;
select credit_notes_record('pi_rls_bd_a',
  '[{"id":"cn_rls_bd_1","number":"LK-0001-CN-01","amount_cents":40000,"pdf_url":"https://pay.stripe.com/credit_notes/y","issued_at":"2026-11-26T10:00:00Z"}]'::jsonb)
  is not null as recorded_again \gset
reset role;
select ok((select refund_email_claimed_at is not null and pdf_url like '%/y' from credit_notes where id = :'cn'),
          'recorded again (a new address of the PDF): the email stays taken');

-- Given back when it could not leave, then taken again.
set local role service_role;
select lives_ok(format('select credit_note_email_release(%L)', :'cn'),
                'service role: gives the email back when it could not leave');
select is(credit_note_email_claim(:'cn'), true, 'service role: takes it again after a release');
reset role;

-- A sender that died: its claim is stale after 10 minutes, not before.
update credit_notes set refund_email_claimed_at = now() - interval '9 minutes' where id = :'cn';
set local role service_role;
select is(credit_note_email_claim(:'cn'), false, 'a claim of 9 minutes still holds');
reset role;
update credit_notes set refund_email_claimed_at = now() - interval '11 minutes' where id = :'cn';
set local role service_role;
select is(credit_note_email_claim(:'cn'), true, 'a claim older than 10 minutes is taken back');

-- Sent is final.
select lives_ok(format('select credit_note_email_sent(%L)', :'cn'), 'service role: marks the email sent');
select is(credit_note_email_claim(:'cn'), false, 'sent: never taken again');
select lives_ok(format('select credit_note_email_release(%L)', :'cn'), 'sent: a late release changes nothing');
reset role;
update credit_notes set refund_email_claimed_at = now() - interval '1 day' where id = :'cn';
set local role service_role;
select is(credit_note_email_claim(:'cn'), false, 'sent: never taken again, however old its claim');
reset role;
select ok((select refund_emailed_at is not null from credit_notes where id = :'cn'),
          'sent: the date of the email stays');

-- A credit note made by hand in Stripe: marked, nothing to send.
set local role service_role;
select is(credit_notes_emailed_elsewhere(array['cn_rls_bd_2', 'cn_rls_bd_1', 'cn_unknown']), 1,
          'service role: marks the credit notes Stripe emailed itself, those still to send only');
select is(credit_note_email_claim(:'cn2'), false, 'emailed elsewhere: never taken');
reset role;

-- Nobody else calls them, nor writes the columns.
\set who anon
\ir _as.psql
select throws_ok(format('select credit_note_email_claim(%L)', :'cn'), '42501', null,
                 'anon: never takes the email of a credit note');
select throws_ok(format('select credit_note_email_sent(%L)', :'cn'), '42501', null,
                 'anon: never marks it sent');
select throws_ok(format('select credit_note_email_release(%L)', :'cn'), '42501', null,
                 'anon: never releases it');
select throws_ok('select credit_notes_emailed_elsewhere(array[''cn_rls_bd_1''])', '42501', null,
                 'anon: never marks credit notes');
select throws_ok('select refund_emailed_at from credit_notes', '42501', null,
                 'anon: never reads a credit note');
select throws_ok(format('select billing_document_opened(%L, %L)', 'facture', :'sa'), '42501', null,
                 'anon: opens no document');
select throws_ok(format('select refund_email_resent(%L, 1, 0)', :'sa'), '42501', null,
                 'anon: never writes a resend');

\set who seller_a
\ir _as.psql
select ok((select refund_emailed_at is not null from credit_notes where id = :'cn'),
          'seller_a: reads when the email of their credit note was sent');
select throws_ok(format('select credit_note_email_claim(%L)', :'cn'), '42501', null,
                 'seller_a: never takes the email of a credit note');
select throws_ok(format('select credit_note_email_sent(%L)', :'cn'), '42501', null,
                 'seller_a: never marks it sent');
select throws_ok(format('select credit_note_email_release(%L)', :'cn'), '42501', null,
                 'seller_a: never releases it');
select throws_ok(format('update credit_notes set refund_emailed_at = null, refund_email_claimed_at = null where id = %L', :'cn'),
                 '42501', null, 'seller_a: never writes the marks');
select throws_ok(format('select billing_document_opened(%L, %L)', 'facture', :'sa'), '42501', null,
                 'seller_a: the audit of the team is not theirs to call');
select throws_ok(format('select refund_email_resent(%L, 1, 0)', :'sa'), '42501', null,
                 'seller_a: never writes a resend');

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
select throws_ok(format('select credit_notes_emailed_elsewhere(array[%L])', 'cn_rls_bd_1'), '42501', null,
                 'buyer_d: never marks credit notes');

\set who admin
\ir _as.psql
select ok((select refund_emailed_at is not null from credit_notes where id = :'cn'),
          'admin: reads when the email of a credit note was sent');
select throws_ok(format('select credit_note_email_claim(%L)', :'cn'), '42501', null,
                 'admin: the email of a credit note is the service role''s, never a client''s');
select lives_ok(format('select billing_document_opened(%L, %L)', 'facture', :'sa'),
                'admin: opens the invoice of a seller');
select lives_ok(format('select billing_document_opened(%L, %L)', 'avoir', :'cn'),
                'admin: opens the credit note of a seller');
select throws_ok(format('select billing_document_opened(%L, %L)', 'avoir', gen_random_uuid()), '42501', null,
                 'admin: a document that does not exist is not opened');
select throws_ok(format('select billing_document_opened(%L, %L)', 'other', :'sa'), '22023', null,
                 'admin: an unknown kind is refused');
select lives_ok(format('select refund_email_resent(%L, 1, 0)', :'sa'), 'admin: a resend is written');
reset role;
select is((select array_agg(action order by action) from audit_log
            where actor_id = tests.uid('admin')
              and action in ('billing_document.opened', 'refund_email.resend')),
          array['billing_document.opened', 'billing_document.opened', 'refund_email.resend'],
          'audit_log: who opened which document of a seller, who sent an email again');

-- The downloads: 30 per quarter of an hour per account, with the key of the site.
select vault.create_secret('rls-test-cron-secret', 'cron_secret')
 where not exists (select 1 from vault.secrets where name = 'cron_secret');
select encode(extensions.hmac('leenkey:rate-limit:server', decrypted_secret, 'sha256'), 'hex') as key
  from vault.decrypted_secrets where name = 'cron_secret' \gset
select encode(sha256('account-one'), 'hex') as u1 \gset
\set who anon
\ir _as.psql
select is((select count(*)::int from (select rate_limit_hit(:'key', 'document', :'u1') as ok
                                        from generate_series(1, 31)) x where ok), 30,
          'document: 30 downloads in the quarter of an hour, the 31st refused');

select * from finish();
rollback;
