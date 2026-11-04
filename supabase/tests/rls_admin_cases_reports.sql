-- L1-30c: the cases and the reports of the back office. Every function is
-- the admin's only (a visitor, the sellers and the buyers are refused, the
-- reporter included); the admin lists the cases (open ones, closed ones, a
-- search, those holding a payment to check), changes a status, follows a
-- case, writes a note, ticks a task of Leenkey of the sale, each change in
-- the history and never twice; reads a reported conversation (each reading
-- traced), warns the other party, closes the report. A report sent tells
-- each admin.
begin;
\ir _helpers.psql
select plan(62);
\ir _plan.psql

-- The plans of the seed (reference data, absent from a bare database).
insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils pour vendre vous-même.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Vous vendez. Nous vous accompagnons.', 99000, 'Accompagné', '{}', 2),
  ('serenite', 'Sérénité', 'Nous pilotons avec vous.', 150000, 'Sérénité', '{}', 3)
on conflict (code) do nothing;

-- A step of Accompagné with a task of Leenkey, one of the seller and one
-- ticked by an event (codes of the test, beside those of the seed).
insert into sale_steps (plan, code, position, title, description, owner)
values ('accompagne', 'rls_step', 99, 'Étape de test', 'Test', 'both')
on conflict (plan, code) do nothing;
insert into sale_step_tasks (step_id, code, title, auto_trigger, required, position, owner)
select s.id, t.code, t.title, t.auto_trigger, t.required, t.position, t.owner
  from sale_steps s,
       (values ('rls_leenkey', 'Tâche de Leenkey', null, false, 1, 'leenkey'),
               ('rls_seller', 'Tâche du vendeur', null, true, 2, 'seller'),
               ('rls_auto', 'Tâche cochée par un événement', 'listing.published', false, 3, 'leenkey'))
         as t(code, title, auto_trigger, required, position, owner)
 where s.plan = 'accompagne' and s.code = 'rls_step'
on conflict (step_id, code) do nothing;
select t.id as task_leenkey from sale_step_tasks t join sale_steps s on s.id = t.step_id
 where s.code = 'rls_step' and t.code = 'rls_leenkey' \gset
select t.id as task_seller from sale_step_tasks t join sale_steps s on s.id = t.step_id
 where s.code = 'rls_step' and t.code = 'rls_seller' \gset
select t.id as task_auto from sale_step_tasks t join sale_steps s on s.id = t.step_id
 where s.code = 'rls_step' and t.code = 'rls_auto' \gset

-- Out of the way: what the seed or a previous test left.
delete from reports;
delete from case_notes;
delete from cases;

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '12 rue de la Gare', '91600', 'Savigny-sur-Orge', 68, 3)
returning id as prop_a \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_a', 'Appartement 3 pièces', 'Proche gare.', 35000000)
returning id as listing_a \gset
\o /dev/null
select listing_submit(:'listing_a');
\o

\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing_a');
\o

\set who buyer_c
\ir _as.psql
select conversation_open(:'listing_a', 'Bonjour, le bien est-il disponible ?') as conv \gset
-- Without « returning »: the reporter never reads the reports again.
insert into reports (conversation_id, reporter_id, reason)
values (:'conv', tests.uid('buyer_c'), 'Messages insistants du vendeur.');

reset role;
select id as report from reports where conversation_id = :'conv' \gset
update sale_progress set plan = 'accompagne' where property_id = :'prop_a';
-- One transaction, one now(): their ages are set.
insert into cases (property_id, profile_id, source, plan, status, subject, created_at)
values (:'prop_a', tests.uid('seller_a'), 'manual', 'accompagne', 'new', 'Question sur le diagnostic',
        now() - interval '2 days')
returning id as case_a \gset
insert into cases (property_id, profile_id, source, plan, status, subject, created_at)
values (:'prop_a', tests.uid('seller_a'), 'plan_purchase', 'accompagne', 'new',
        'Paiement de la formule Sérénité à vérifier · Savigny-sur-Orge', now() - interval '1 day')
returning id as case_check \gset
insert into case_notes (case_id, author_id, body)
values (:'case_check', null, 'À vérifier : passage payé sans la formule inférieure en vigueur.');
insert into cases (profile_id, source, status, subject)
values (tests.uid('buyer_c'), 'manual', 'closed', 'Traité')
returning id as case_closed \gset
\o /dev/null
select notification_add(tests.uid('admin'), 'case.created', jsonb_build_object('case_id', :'case_a'),
                        '/admin/dossiers');
\o

-- Everyone but the admin is refused --------------------------------------------
\set who anon
\ir _as.psql
select throws_ok('select * from admin_cases()', '42501', null, 'anon: no list of the cases');
select throws_ok('select * from admin_case_counts()', '42501', null, 'anon: no count of the cases');
select throws_ok('select * from admin_reports()', '42501', null, 'anon: no list of the reports');
select throws_ok(format('select * from admin_report_read(%L)', :'report'), '42501', null,
                 'anon: no reading of a reported conversation');

\set who seller_a
\ir _as.psql
select throws_ok('select * from admin_cases()', '42501', null, 'seller_a: no list of the cases');
select throws_ok(format('select admin_case_set_status(%L, %L)', :'case_a', 'closed'), '42501', null,
                 'seller_a: does not close their own case');
select throws_ok(format('select admin_case_add_note(%L, %L)', :'case_a', 'Note'), '42501', null,
                 'seller_a: no internal note');
select throws_ok(format('select admin_case_task_set(%L, %L, true)', :'case_a', :'task_leenkey'), '42501', null,
                 'seller_a: does not tick a task of Leenkey through a case');
select throws_ok(format('select admin_report_warn(%L, %L)', :'report', 'Avertissement'), '42501', null,
                 'seller_a: does not warn');
select is((select count(*)::int from cases where id = :'case_a'), 1, 'seller_a: still reads their own case');
select is((select count(*)::int from case_notes), 0, 'seller_a: never reads the internal notes');
select is((select count(*)::int from reports), 0, 'seller_a: never reads the reports');

\set who buyer_c
\ir _as.psql
select throws_ok(format('select * from admin_report_read(%L)', :'report'), '42501', null,
                 'buyer_c: does not read the conversation through their report');
select throws_ok(format('select admin_report_resolve(%L)', :'report'), '42501', null,
                 'buyer_c: does not close their own report');
select throws_ok(format('select admin_case_assign(%L, %L)', :'case_a', tests.uid('buyer_c')), '42501', null,
                 'buyer_c: does not follow a case');

\set who seller_b
\ir _as.psql
select throws_ok('select * from admin_report_counts()', '42501', null, 'seller_b: no count of the reports');
select throws_ok(format('select admin_case_set_status(%L, %L)', :'case_a', 'in_progress'), '42501', null,
                 'seller_b: does not change a case of another');

\set who buyer_d
\ir _as.psql
select throws_ok('select * from admin_reports(false)', '42501', null, 'buyer_d: no list of the reports');
select throws_ok(format('select admin_report_warn(%L, %L)', :'report', 'Avertissement'), '42501', null,
                 'buyer_d: does not warn');

-- The admin: the cases --------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select array_agg(subject order by created_at, id) from admin_cases()),
          array['Question sur le diagnostic', 'Paiement de la formule Sérénité à vérifier · Savigny-sur-Orge'],
          'admin: the open cases, the oldest first, the closed one left out');
select is((select array_agg(subject) from admin_cases('closed')), array['Traité'], 'admin: the closed ones');
select is((select array_agg(to_check order by created_at, id) from admin_cases()), array[false, true],
          'admin: the case holding a payment to check');
select is((select reference from admin_cases() where id = :'case_a'),
          (select reference from listings where id = :'listing_a'), 'admin: the reference of the property');
select is((select array_agg(subject) from admin_cases(p_query => 'DIAGNOSTIC')),
          array['Question sur le diagnostic'], 'admin: search on the subject, any case');
select is((select count(*)::int from admin_cases(p_query => 'Alice')), 2, 'admin: search on the seller');
select is((select count(*)::int from admin_cases(p_query => '%')), 0,
          'admin: a % in the search is a character');
select is((select row(open, new, in_progress, closed, to_check)::text from admin_case_counts()),
          '(2,2,0,1,1)', 'admin: the counts of the cases');

select lives_ok(format('select admin_case_set_status(%L, %L)', :'case_a', 'in_progress'),
                'admin: takes a case in hand');
select throws_ok(format('select admin_case_set_status(%L, %L)', :'case_a', 'in_progress'), '22023', null,
                 'admin: a status already there is refused (a stale tab)');
select is((select count(*)::int from notifications
            where type = 'case.created' and data->>'case_id' = :'case_a' and read_at is null), 0,
          'admin: a case taken in hand reads its notifications');
select throws_ok(format('select admin_case_set_status(%L, %L)', gen_random_uuid(), 'closed'), 'P0002', null,
                 'admin: an unknown case');

select lives_ok(format('select admin_case_assign(%L, %L)', :'case_a', tests.uid('admin')),
                'admin: follows a case');
select throws_ok(format('select admin_case_assign(%L, %L)', :'case_a', tests.uid('admin')), '22023', null,
                 'admin: already following it');
select throws_ok(format('select admin_case_assign(%L, %L)', :'case_a', tests.uid('seller_b')), '22023', null,
                 'admin: a case is followed by an admin only');
select is((select row(assigned_first_name, assigned_to)::text from admin_cases() where id = :'case_a'),
          (select row(first_name, id)::text from profiles where id = tests.uid('admin')),
          'admin: the admin who follows it');

select ok((select admin_case_add_note(:'case_a', '  Rappeler le vendeur mardi.  ') is not null),
          'admin: writes an internal note');
select is((select row(author_id, body)::text from case_notes where case_id = :'case_a'),
          format('(%s,"Rappeler le vendeur mardi.")', tests.uid('admin')),
          'admin: the note, by its author, trimmed');
select throws_ok(format('select admin_case_add_note(%L, %L)', :'case_a', '   '), '22023', null,
                 'admin: an empty note is refused');

select is((select admin_case_task_set(:'case_a', :'task_leenkey', true)), true,
          'admin: ticks a task of Leenkey of the sale');
select is((select done_by from sale_task_status where property_id = :'prop_a' and task_id = :'task_leenkey'
             and done_at is not null), tests.uid('admin'), 'admin: the task done, by them');
select throws_ok(format('select admin_case_task_set(%L, %L, true)', :'case_a', :'task_leenkey'), '22023', null,
                 'admin: a task already done is refused');
select is((select admin_case_task_set(:'case_a', :'task_leenkey', false)), false,
          'admin: unticks it');
select throws_ok(format('select admin_case_task_set(%L, %L, true)', :'case_a', :'task_seller'), '22023', null,
                 'admin: a task of the seller is not ticked through a case');
select throws_ok(format('select admin_case_task_set(%L, %L, true)', :'case_a', :'task_auto'), '22023', null,
                 'admin: a task ticked by an event is not ticked by hand');
select throws_ok(format('select admin_case_task_set(%L, %L, true)', :'case_closed', :'task_leenkey'), '22023',
                 null, 'admin: a case without a property has no task');

select is((select array_agg(action order by created_at, id) from audit_log
            where entity = 'case' and entity_id = :'case_a'),
          '{case.status,case.assign,case.note,case.task,case.task}'::text[],
          'admin: every change of the case in its history, once');
select is((select meta->>'to' from audit_log where entity = 'case' and entity_id = :'case_a'
            and action = 'case.status'), 'in_progress', 'admin: the status written to the history');

-- The admin: the reports ------------------------------------------------------------
select is((select count(*)::int from notifications
            where profile_id = tests.uid('admin') and type = 'report.created'
              and link = '/admin/signalements/' || :'report' and data->>'excerpt' = 'Messages insistants du vendeur.'),
          1, 'admin: told of the report sent, with its reason');
select is((select row(reporter_first_name, target_id, target_first_name)::text from admin_reports()
            where id = :'report'),
          format('(Chloé,%s,Alice)', tests.uid('seller_a')),
          'admin: who reported whom');
select is((select row(open, resolved)::text from admin_report_counts()), '(1,0)', 'admin: one open report');

select is((select array_agg(body) from admin_report_read(:'report')),
          array['Bonjour, le bien est-il disponible ?'], 'admin: reads the reported conversation');
select is((select count(*)::int from audit_log where entity = 'report' and entity_id = :'report'
            and action = 'report.read' and actor_id = tests.uid('admin')),
          1, 'admin: the reading is in the history of the report');
select is((select count(*)::int from admin_report_read(:'report')), 1, 'admin: reads it again');
select is((select count(*)::int from audit_log where entity = 'report' and entity_id = :'report'
            and action = 'report.read' and actor_id = tests.uid('admin')),
          1, 'admin: read again within half an hour, written once');

select is((select admin_report_warn(:'report', 'Restez courtois dans vos échanges.')), tests.uid('seller_a'),
          'admin: warns the other party of the conversation');
select is((select meta->>'reason' from audit_log where entity = 'profile' and entity_id = tests.uid('seller_a')
            and action = 'user.warn'), 'Restez courtois dans vos échanges.',
          'admin: the warning in the history of the account');
select throws_ok(format('select admin_report_warn(%L, %L)', :'report', 'ok'), '22023', null,
                 'admin: a warning needs a reason');

select lives_ok(format('select admin_report_resolve(%L, %L)', :'report', 'Vendeur averti.'),
                'admin: closes the report');
select throws_ok(format('select admin_report_resolve(%L)', :'report'), '22023', null,
                 'admin: a report already closed is refused');
select throws_ok(format('select admin_report_warn(%L, %L)', :'report', 'Restez courtois.'), '22023', null,
                 'admin: a closed report warns nobody');
select is((select count(*)::int from notifications where type = 'report.created'
            and data->>'report_id' = :'report' and read_at is null), 0,
          'admin: a closed report reads its notifications');
select is((select row(open, resolved)::text from admin_report_counts()), '(0,1)', 'admin: one closed report');

select * from finish();
rollback;
