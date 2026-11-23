-- Interventions of the adviser (DECISIONS.md 2026-11-23): the request of a
-- seller whose plan sells interventions, its message in the conversation with
-- the adviser, the counter (an intervention done counts, nothing else), the
-- refusal once the interventions of the plan are used, the passage to a
-- dearer plan, the initial appointment, the actions of the team (audited),
-- and the account (export, anonymisation). Read by the owner of the property
-- and the team only.
begin;
\ir _helpers.psql
select plan(70);
\ir _plan.psql

insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Un conseiller.', 99000, 'Accompagné', '{Conseiller}', 2),
  ('serenite', 'Sérénité', 'Jusqu''à la signature.', 150000, 'Sérénité', '{Conseiller,Dossier}', 3)
on conflict (code) do nothing;
-- Small numbers, whatever the seed says: 2 interventions, 3 with the dearer plan.
update plans set advisor_interventions = case code when 'accompagne' then 2 when 'serenite' then 3 end;
insert into plan_entitlements (plan, feature) values
  ('accompagne', 'advisor'), ('serenite', 'advisor')
on conflict do nothing;

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '12 rue de la Gare', '91600', 'Savigny-sur-Orge', 68, 3)
returning id as paid \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as free \gset

-- The webhook (L1-26): a plan paid, its conversation with the adviser.
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, early_start_requested_at)
values (:'paid', tests.uid('seller_a'), 'accompagne', 99000, now(), now())
returning id as sub \gset
set constraints all immediate;
set constraints all deferred;
select conversations.id as conv from conversations where kind = 'advisor' and property_id = :'paid' \gset

-- The seller ---------------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is((select row(quota, used, pending, initial_meeting, next_plan, next_quota)::text
             from advisor_intervention_summary(:'paid')),
          '(2,0,0,,serenite,3)',
          'seller_a: the counter of their plan, and the plan that sells more');
select is((select count(*)::int from advisor_intervention_summary(:'free')), 0,
          'seller_a: no counter for an Autonomie property');
select throws_ok(format($$select advisor_intervention_request(%L, 'listing', 'Pouvez-vous relire mon annonce ?')$$, :'free'),
                 '22023', null, 'seller_a: no request without the adviser in the plan');
select throws_ok(format($$select advisor_intervention_request(%L, 'initial_meeting', 'Je souhaite mon rendez-vous initial.')$$, :'paid'),
                 '22023', null, 'seller_a: the initial appointment is not asked for here');
select throws_ok(format($$select advisor_intervention_request(%L, 'listing', 'Court')$$, :'paid'),
                 '22023', null, 'seller_a: a message too short is refused');
select advisor_intervention_request(:'paid', 'price_strategy', 'Bonjour, faut-il revoir mon prix avant les visites ?') as r1 \gset
select is((select row(reason, status, message)::text from advisor_interventions where id = :'r1'),
          '(price_strategy,requested,"Bonjour, faut-il revoir mon prix avant les visites ?")',
          'seller_a: their request, with its reason and its message');
select is((select row(kind, sender_id)::text from messages
            where conversation_id = :'conv' and meta->>'intervention_id' = :'r1'),
          format('(text,%s)', tests.uid('seller_a')),
          'seller_a: the request is their message to the adviser');
select ok((select body like E'Demande d''intervention : Prix et stratégie\n\nBonjour, faut-il revoir%'
             from messages where conversation_id = :'conv' and meta->>'intervention_id' = :'r1'),
          'seller_a: the message says the reason, then their words');
select is((select row(used, pending)::text from advisor_intervention_summary(:'paid')), '(0,1)',
          'seller_a: a request does not count');
select throws_ok('select team_note from advisor_interventions', '42501', null,
                 'seller_a: never reads the note of the team');
select throws_ok('select done_by from advisor_interventions', '42501', null,
                 'seller_a: never reads who of the team did it');
select throws_ok(format($$insert into advisor_interventions (property_id, requested_by, reason, message)
                          values (%L, %L, 'listing', 'Une demande écrite à la main')$$,
                        :'paid', tests.uid('seller_a')),
                 '42501', null, 'seller_a: never writes a request without the function');
select throws_ok(format($$update advisor_interventions set status = 'cancelled' where id = %L$$, :'r1'),
                 '42501', null, 'seller_a: never changes the status of a request');
select throws_ok(format($$select admin_advisor_intervention_set(%L, 'done')$$, :'r1'),
                 '42501', null, 'seller_a: never marks an intervention done');
select throws_ok(format($$select admin_advisor_initial_meeting(%L, 'done')$$, :'paid'),
                 '42501', null, 'seller_a: never marks the initial appointment done');
select throws_ok('select * from admin_advisor_interventions()', '42501', null,
                 'seller_a: never reads the list of the team');

-- The others ---------------------------------------------------------------------
\set who seller_b
\ir _as.psql
select is((select count(*)::int from advisor_interventions), 0,
          'seller_b: never reads the requests of another seller');
select is((select count(*)::int from advisor_intervention_summary(:'paid')), 0,
          'seller_b: never reads the counter of another seller');
select throws_ok(format($$select advisor_intervention_request(%L, 'listing', 'Pouvez-vous relire mon annonce ?')$$, :'paid'),
                 '42501', null, 'seller_b: never asks on the property of another seller');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from advisor_interventions), 0, 'buyer_c: reads no request');
select is((select count(*)::int from advisor_intervention_summary(:'paid')), 0,
          'buyer_c: reads no counter');
select throws_ok(format($$select advisor_intervention_request(%L, 'visits', 'Comment préparer mes visites ?')$$, :'paid'),
                 '42501', null, 'buyer_c: never asks for an intervention');
\set who buyer_d
\ir _as.psql
select throws_ok('select * from admin_advisor_interventions()', '42501', null,
                 'buyer_d: never reads the list of the team');
select throws_ok(format($$select admin_advisor_intervention_set(%L, 'cancelled')$$, :'r1'),
                 '42501', null, 'buyer_d: never changes a request');
\set who anon
\ir _as.psql
select throws_ok('select id from advisor_interventions', '42501', null,
                 'anon: the table is closed to visitors');
select throws_ok(format($$select advisor_intervention_request(%L, 'listing', 'Pouvez-vous relire mon annonce ?')$$, :'paid'),
                 '42501', null, 'anon: cannot execute the request');
select throws_ok(format('select * from advisor_intervention_summary(%L)', :'paid'), '42501', null,
                 'anon: cannot execute the counter');
select throws_ok('select * from admin_advisor_interventions()', '42501', null,
                 'anon: cannot execute the list of the team');
select throws_ok(format($$select admin_advisor_intervention_set(%L, 'done')$$, :'r1'), '42501', null,
                 'anon: cannot execute an action of the team');
select throws_ok(format($$select admin_advisor_initial_meeting(%L, 'done')$$, :'paid'), '42501', null,
                 'anon: cannot plan an initial appointment');

-- The team -----------------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select count(*)::int from notifications
            where profile_id = tests.uid('admin') and type = 'advisor.message_from_client'
              and data->>'intervention_id' = :'r1' and data->>'reason' = 'price_strategy'
              and data->'intervention' = 'true'::jsonb
              and link = '/admin/messages/interventions' and email_after is not null), 1,
          'admin: told of the request, in the app and by email, with the way to the list');
select is((select row(status, reason, quota, used, plan, seller_first_name, conversation_id)::text
             from admin_advisor_interventions() where id = :'r1'),
          format('(requested,price_strategy,2,0,accompagne,Alice,%s)', :'conv'),
          'admin: the request in the list, with the counter of the property');
select is((select count(*)::int from admin_advisor_interventions()
            where id is null and property_id = :'paid' and reason = 'initial_meeting'
              and status = 'requested'), 1,
          'admin: the initial appointment of the plan, to plan');
select throws_ok(format($$select admin_advisor_intervention_set(%L, 'requested')$$, :'r1'),
                 '22023', null, 'admin: a request never goes back to « requested »');
select lives_ok(format($$select admin_advisor_intervention_set(%L, 'scheduled', 'Appel jeudi à 10 h')$$, :'r1'),
                'admin: schedules the intervention, with a note');
select throws_ok(format($$select admin_advisor_intervention_set(%L, 'scheduled')$$, :'r1'),
                 '22023', null, 'admin: a change already made is refused (a stale tab)');
select is((select meta - 'property_id' from audit_log
            where action = 'advisor_intervention.status' and entity = 'advisor_intervention'
              and entity_id = :'r1' and actor_id = tests.uid('admin')),
          '{"reason": "price_strategy", "from": "requested", "to": "scheduled", "note": true}'::jsonb,
          'admin: the action is written to audit_log');
select is((select used from admin_advisor_interventions() where id = :'r1'), 0,
          'admin: a scheduled intervention does not count');
select lives_ok(format($$select admin_advisor_intervention_set(%L, 'done')$$, :'r1'),
                'admin: marks the intervention done');
select is((select row(status, used, done_by_first_name, team_note, done_at is not null)::text
             from admin_advisor_interventions() where id = :'r1'),
          '(done,1,Cédric,"Appel jeudi à 10 h",t)',
          'admin: done counts, by whom, the note kept');

-- Two more requests: only the interventions done count.
\set who seller_a
\ir _as.psql
select is((select row(used, pending)::text from advisor_intervention_summary(:'paid')), '(1,0)',
          'seller_a: one intervention used');
select advisor_intervention_request(:'paid', 'visits', 'Comment préparer mes premières visites ?') as r2 \gset
select advisor_intervention_request(:'paid', 'offer', 'J''ai reçu une offre, pouvons-nous en parler ?') as r3 \gset
select is((select row(used, pending)::text from advisor_intervention_summary(:'paid')), '(1,2)',
          'seller_a: two requests wait, still one used');
\set who admin
\ir _as.psql
select lives_ok(format($$select admin_advisor_intervention_set(%L, 'cancelled')$$, :'r2'),
                'admin: cancels a request');
select lives_ok(format($$select admin_advisor_intervention_set(%L, 'done')$$, :'r3'),
                'admin: marks another one done');

-- The interventions of the plan are used.
\set who seller_a
\ir _as.psql
select is((select row(quota, used, pending)::text from advisor_intervention_summary(:'paid')), '(2,2,0)',
          'seller_a: a cancelled request does not count, two are used');
select throws_ok(format($$select advisor_intervention_request(%L, 'documents', 'Quels documents dois-je préparer ?')$$, :'paid'),
                 '54000', 'advisor_intervention: quota',
                 'seller_a: the request beyond the interventions of the plan is refused');
select lives_ok(format('insert into messages (conversation_id, sender_id, body) values (%L, %L, %L)',
                       :'conv', tests.uid('seller_a'), 'Bonjour, une question rapide sur mon annonce.'),
                'seller_a: still writes to the adviser');

-- A mistake corrected: an intervention no longer done no longer counts.
\set who admin
\ir _as.psql
select lives_ok(format($$select admin_advisor_intervention_set(%L, 'cancelled')$$, :'r3'),
                'admin: cancels an intervention marked done by mistake');
select is((select row(used, done_at is null, done_by_first_name is null)::text
             from admin_advisor_interventions() where id = :'r3'), '(1,t,t)',
          'admin: it no longer counts, nor says when and by whom');
select lives_ok(format($$select admin_advisor_intervention_set(%L, 'done')$$, :'r3'),
                'admin: marks it done again');

-- The initial appointment: planned by the team, never counted.
select throws_ok(format($$select admin_advisor_initial_meeting(%L, 'done')$$, :'free'),
                 '22023', null, 'admin: no initial appointment without the adviser in the plan');
select admin_advisor_initial_meeting(:'paid', 'scheduled') as initial \gset
select throws_ok(format($$select admin_advisor_initial_meeting(%L, 'done')$$, :'paid'),
                 '22023', null, 'admin: the initial appointment is planned once');
select lives_ok(format($$select admin_advisor_intervention_set(%L, 'done')$$, :'initial'),
                'admin: marks the initial appointment done');
select is((select count(*)::int from admin_advisor_interventions()
            where id is null and property_id = :'paid'), 0,
          'admin: nothing left to plan for this property');
-- Cancelled, it is to plan again, from the property and never from its row.
select lives_ok(format($$select admin_advisor_intervention_set(%L, 'cancelled')$$, :'initial'),
                'admin: cancels the initial appointment');
select throws_ok(format($$select admin_advisor_intervention_set(%L, 'done')$$, :'initial'),
                 '22023', null, 'admin: a cancelled initial appointment is never brought back');
select is((select count(*)::int from admin_advisor_interventions()
            where id is null and property_id = :'paid'), 1,
          'admin: the initial appointment is to plan again');
select lives_ok(format($$select admin_advisor_initial_meeting(%L, 'done', 'Fait par téléphone')$$, :'paid'),
                'admin: plans it again, done');
select is((select count(*)::int from audit_log
            where action = 'advisor_intervention.status' and actor_id = tests.uid('admin')
              and meta->>'property_id' = :'paid'), 10,
          'admin: every action of the team is in audit_log');
\set who seller_a
\ir _as.psql
select is((select row(used, initial_meeting)::text from advisor_intervention_summary(:'paid')), '(2,done)',
          'seller_a: the initial appointment is done, and not counted');

-- The passage to the dearer plan (stripe_checkout_complete): its number of
-- interventions, those used stay counted.
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, early_start_requested_at)
values (:'paid', tests.uid('seller_a'), 'serenite', 51000, now(), now())
returning id as upgrade \gset
update subscriptions set replaced_by = :'upgrade' where id = :'sub';
\set who seller_a
\ir _as.psql
select is((select row(quota, used, initial_meeting, next_plan)::text from advisor_intervention_summary(:'paid')),
          '(3,2,done,)',
          'seller_a: after the upgrade, the number of the new plan, what was used kept, no dearer plan');
select lives_ok(format($$select advisor_intervention_request(%L, 'documents', 'Quels documents dois-je préparer ?')$$, :'paid'),
                'seller_a: asks again with the dearer plan');
select is(jsonb_array_length(account_export()->'advisor_interventions'), 6,
          'seller_a: their requests are in the export of the account');
select is((select count(*)::int from jsonb_array_elements(account_export()->'advisor_interventions') e
            where e ? 'team_note' or e ? 'done_by'), 0,
          'seller_a: the export holds neither the note of the team nor who did it');

-- A plan bought again after its end starts anew.
reset role;
update subscriptions set activated_at = now() - interval '13 months', ends_at = now() - interval '1 month'
 where property_id = :'paid';
update advisor_interventions set requested_at = now() - interval '2 months',
       done_at = case when status = 'done' then now() - interval '2 months' end
 where property_id = :'paid';
\set who seller_a
\ir _as.psql
select is((select count(*)::int from advisor_intervention_summary(:'paid')), 0,
          'seller_a: no counter once the plan has ended');
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, early_start_requested_at)
values (:'paid', tests.uid('seller_a'), 'accompagne', 99000, now(), now());
\set who seller_a
\ir _as.psql
select is((select row(quota, used, initial_meeting)::text from advisor_intervention_summary(:'paid')),
          '(2,0,)',
          'seller_a: a plan bought again starts anew, its initial appointment too');

-- A suspended account asks for nothing.
reset role;
update profiles set suspended_at = now(), suspension_reason = 'Test' where id = tests.uid('seller_a');
\set who seller_a
\ir _as.psql
select throws_ok(format($$select advisor_intervention_request(%L, 'other', 'Une autre question pour mon conseiller.')$$, :'paid'),
                 '42501', null, 'seller_a: a suspended account never asks for an intervention');

-- The account closed for 30 days: the free texts are erased.
reset role;
update profiles set suspended_at = null, suspension_reason = null,
                    deleted_at = now() - interval '31 days'
 where id = tests.uid('seller_a');
select lives_ok(format('select account_anonymize(%L)', tests.uid('seller_a')),
                'the closed account is anonymised');
select is((select count(*)::int from advisor_interventions
            where property_id = :'paid' and (message is not null or team_note is not null)), 0,
          'anonymised: neither the messages of the requests nor the notes of the team stay');
select is((select count(*)::int from advisor_interventions where property_id = :'paid'), 6,
          'anonymised: the rows stay (what was done, when)');

select * from finish();
rollback;
