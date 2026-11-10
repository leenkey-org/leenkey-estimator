-- L1-31: the handoff to a human. A seller (or a buyer) asks the team through
-- create_case, which writes the case they cannot write themselves: theirs
-- only, for their own property or none, 5 open requests at most, told to
-- every admin; ai_create_case writes the result of the tool with it.
begin;
\ir _helpers.psql
select plan(48);
\ir _plan.psql

insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Un conseiller.', 99000, 'Accompagné', '{Conseiller}', 2)
on conflict (code) do nothing;

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as home \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '12 rue de la Gare', '91600', 'Savigny-sur-Orge', 68, 3)
returning id as paid \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '5 rue des Lilas', '91170', 'Viry-Châtillon', 90, 4)
returning id as gone \gset
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '8 rue du Parc', '91000', 'Évry', 95, 4)
returning id as other \gset

-- The webhook (L1-26): a plan paid, and its case.
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'paid', tests.uid('seller_a'), 'accompagne', 99000, now());
insert into cases (property_id, profile_id, source, plan, subject)
values (:'paid', tests.uid('seller_a'), 'plan_purchase', 'accompagne', 'Formule Accompagné souscrite');
update profiles set last_name = 'Durand' where id = tests.uid('seller_a');
update properties set deleted_at = now() where id = :'gone';

-- A seller asks ---------------------------------------------------------------
\set who seller_a
\ir _as.psql
select throws_ok(format($$insert into cases (profile_id, source, subject) values (%L, 'manual', 'Une demande')$$,
                        tests.uid('seller_a')), '42501', null,
                 'seller_a: never writes a case directly');
select create_case('  Litige   avec un acquéreur ', 'Un acquéreur conteste la surface annoncée et menace de saisir un avocat.', 'assistant_handoff', :'home') as c1 \gset
select is((select row(profile_id, property_id, source, plan, status, subject)::text from cases where id = :'c1'),
          row(tests.uid('seller_a'), :'home'::uuid, 'assistant_handoff'::case_source,
              'autonomie'::plan_code, 'new'::case_status, 'Litige avec un acquéreur')::text,
          'seller_a: a case of theirs, for their property, with its plan, its subject tidied');
select is((select ai_summary from cases where id = :'c1'),
          'Un acquéreur conteste la surface annoncée et menace de saisir un avocat.',
          'seller_a: the summary the team will read');
select is((select count(*)::int from cases where id = :'c1'), 1, 'seller_a: reads their own case');
select create_case('Question sur ma formule', 'Je voudrais savoir ce que comprend ma formule.', 'manual', :'paid') as c2 \gset
select is((select plan::text || ' ' || source::text from cases where id = :'c2'), 'accompagne manual',
          'seller_a: the plan in force of the property on the case, written by them');
select create_case('Problème de compte', 'Je ne reçois plus les emails de Leenkey depuis hier.', 'manual') as c3 \gset
select is((select row(property_id, plan)::text from cases where id = :'c3'), row(null::uuid, null::plan_code)::text,
          'seller_a: a request about no property');

select throws_ok(format($$select create_case('Une demande', 'Une demande assez longue.', 'manual', %L)$$, :'other'),
                 '42501', null, 'seller_a: never for the property of another seller');
select throws_ok(format($$select create_case('Une demande', 'Une demande assez longue.', 'manual', %L)$$, :'gone'),
                 '42501', null, 'seller_a: never for a property removed');
select throws_ok($$select create_case('Une demande', 'Une demande assez longue.', 'plan_purchase')$$,
                 '22023', null, 'seller_a: never a case of a plan paid');
select throws_ok($$select create_case('Une demande', 'Une demande assez longue.', null)$$,
                 '22023', null, 'seller_a: a source is asked');
select throws_ok($$select create_case(' a ', 'Une demande assez longue.', 'manual')$$,
                 '22023', null, 'seller_a: a subject too short is refused');
select throws_ok(format($$select create_case(%L, 'Une demande assez longue.', 'manual')$$, repeat('a', 201)),
                 '22023', null, 'seller_a: a subject too long is refused');
select throws_ok($$select create_case('Une demande', '  court  ', 'manual')$$,
                 '22023', null, 'seller_a: a summary too short is refused');
select throws_ok(format($$select create_case('Une demande', %L, 'manual')$$, repeat('a', 4001)),
                 '22023', null, 'seller_a: a summary too long is refused');
select is((select count(*)::int from cases where source <> 'plan_purchase'), 3,
          'seller_a: a request refused writes nothing');

-- 5 open requests at most, the case of a plan aside -------------------------
select is((select count(create_case('Demande ' || i, 'Une demande assez longue, la ' || i || 'e.', 'manual'))::int
             from generate_series(4, 5) i), 2, 'seller_a: up to 5 open requests');
select throws_ok($$select create_case('Une sixième', 'Une demande assez longue.', 'manual')$$,
                 '54000', null, 'seller_a: no sixth open request');
\set who admin
\ir _as.psql
update cases set status = 'in_progress' where id = :'c2';
\set who seller_a
\ir _as.psql
select throws_ok($$select create_case('Une sixième', 'Une demande assez longue.', 'manual')$$,
                 '54000', null, 'seller_a: a request being handled is still open');
\set who admin
\ir _as.psql
update cases set status = 'closed' where id = :'c2';
\set who seller_a
\ir _as.psql
select isnt(create_case('Une sixième', 'Une demande assez longue.', 'manual'), null,
            'seller_a: asks again once a request is closed');
select is((select count(*)::int from cases), 7,
          'seller_a: reads their 6 requests and the case of their plan');

-- The assistant (tool create_case, confirmed) -------------------------------
insert into ai_conversations (profile_id, context) values (tests.uid('seller_a'), 'seller')
returning id as ai_a \gset
select throws_ok(format($$select ai_create_case(%L, 'toolu_1', 'create_case', 'Une demande', 'Une demande assez longue.')$$,
                        :'ai_a'), '54000', null,
                 'seller_a: the limit holds through the assistant too');
select is((select count(*)::int from ai_messages where conversation_id = :'ai_a'), 0,
          'seller_a: a request refused writes no result in the log');
\set who admin
\ir _as.psql
update cases set status = 'closed' where profile_id = tests.uid('seller_a') and subject like 'Demande %';
\set who seller_a
\ir _as.psql
select throws_ok(format($$select ai_create_case(%L, 'toolu_1', 'contact_advisor', 'Une demande', 'Une demande assez longue.')$$,
                        :'ai_a'), '22023', null,
                 'seller_a: through the assistant, only as the tool create_case');
select ai_create_case(:'ai_a', 'toolu_1', 'create_case', 'Un acquéreur insistant', 'Un acquéreur m''écrit dix fois par jour malgré mon refus.', :'home') as c4 \gset
select is((select row(source, property_id, subject)::text from cases where id = :'c4'),
          row('assistant_handoff'::case_source, :'home'::uuid, 'Un acquéreur insistant')::text,
          'seller_a: a request confirmed in the assistant becomes a case');
select is((select content->'result'->>'sent' || ' ' || (content->>'status') from ai_messages
            where conversation_id = :'ai_a' and content->>'tool_use_id' = 'toolu_1'), 'true confirmed',
          'seller_a: the result of the tool in the log of the assistant');
select throws_ok(format($$select ai_create_case(%L, 'toolu_1', 'create_case', 'Un acquéreur insistant', 'Une demande assez longue.', %L)$$,
                        :'ai_a', :'home'), '23505', null,
                 'seller_a: a confirmed call is answered once');
select is((select count(*)::int from cases where subject = 'Un acquéreur insistant'), 1,
          'seller_a: and writes one case only');

-- The others ------------------------------------------------------------------
\set who seller_b
\ir _as.psql
select is((select count(*)::int from cases), 0, 'seller_b: never reads the requests of another seller');
select is((select count(*)::int from notifications where type = 'case.created'), 0,
          'seller_b: not told of them');
select throws_ok(format($$select ai_create_case(%L, 'toolu_b', 'create_case', 'Une demande', 'Une demande assez longue.')$$,
                        :'ai_a'), '42501', null,
                 'seller_b: never through the assistant conversation of another account');
select throws_ok(format($$select create_case('Une demande', 'Une demande assez longue.', 'manual', %L)$$, :'home'),
                 '42501', null, 'seller_b: never for the property of seller_a');
\set who buyer_c
\ir _as.psql
select isnt(create_case('Une question d''acquéreur', 'Je voudrais comprendre comment déposer une offre.', 'manual'), null, 'buyer_c: a buyer asks too, about no property');
select throws_ok(format($$select create_case('Une demande', 'Une demande assez longue.', 'manual', %L)$$, :'home'),
                 '42501', null, 'buyer_c: never for the property of a seller');
select is((select count(*)::int from cases), 1, 'buyer_c: reads their own request only');
reset role;
update profiles set suspended_at = now() where id = tests.uid('buyer_d');
\set who buyer_d
\ir _as.psql
select throws_ok($$select create_case('Une demande', 'Une demande assez longue.', 'manual')$$,
                 '42501', null, 'buyer_d: a suspended account asks nothing');
select is((select count(*)::int from cases), 0, 'buyer_d: reads no request');
\set who anon
\ir _as.psql
select throws_ok($$select create_case('Une demande', 'Une demande assez longue.', 'manual')$$,
                 '42501', null, 'anon: closed to visitors');
select throws_ok(format($$select ai_create_case(%L, 'toolu_x', 'create_case', 'Une demande', 'Une demande assez longue.')$$,
                        :'ai_a'), '42501', null, 'anon: never through the assistant');
select throws_ok('select count(*) from cases', '42501', null, 'anon: never reads a case');

-- The team ----------------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select count(*)::int from cases
            where source <> 'plan_purchase'
              and profile_id in (tests.uid('seller_a'), tests.uid('buyer_c'))), 8,
          'admin: reads every request');
select is((select row(link, group_key, email_after is not null, read_at is null)::text from notifications
            where profile_id = tests.uid('admin') and type = 'case.created' and data->>'case_id' = :'c1'),
          row('/admin/dossiers/' || :'c1', 'cases:requests', true, true)::text,
          'admin: told of a request in the app and by email, with the link to its sheet');
select is((select data - 'case_id' from notifications
            where profile_id = tests.uid('admin') and type = 'case.created' and data->>'case_id' = :'c1'),
          jsonb_build_object('source', 'assistant_handoff', 'subject', 'Litige avec un acquéreur',
                             'reference', 'Athis-Mons', 'first_name', 'Alice', 'last_initial', 'D'),
          'admin: who asks, what and for which property');
select is((select data->>'reference' from notifications
            where profile_id = tests.uid('admin') and type = 'case.created' and data->>'case_id' = :'c3'),
          null, 'admin: a request about no property names none');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('admin') and type = 'case.created'
              and data->>'source' in ('assistant_handoff', 'manual')), 8,
          'admin: one notification per request');
select isnt(create_case('Une note de l''équipe', 'Une demande écrite par un admin, pour essai.', 'manual'),
            null, 'admin: may ask too');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('admin') and data->>'subject' = 'Une note de l''équipe'), 0,
          'admin: not told of their own request');
select lives_ok(format($$select admin_case_set_status(%L, 'closed')$$, :'c1'),
                'admin: closes a request as any case');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('admin') and type = 'case.created'
              and data->>'case_id' = :'c1' and read_at is null), 0,
          'admin: its notification is read once the case is handled');

select * from finish();
rollback;
