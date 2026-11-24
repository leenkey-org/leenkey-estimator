-- L1-30b: « Résumé du jour » of the back office. The cache of the brief is
-- read and written by the team only, never changed nor deleted by a client;
-- a new brief is refused within 5 minutes of the last one; the call is
-- logged in the context of the team only.
begin;
\ir _helpers.psql
select plan(24);
\ir _plan.psql

-- The briefs already written on this base (end-to-end tests): set aside, the
-- transaction is rolled back.
delete from admin_daily_briefs;

-- The team writes a brief first: nobody else reads it.
\set who admin
\ir _as.psql
insert into ai_conversations (profile_id, context, kind)
values (tests.uid('admin'), 'admin', 'daily_brief')
returning id as brief_log \gset
select lives_ok($$insert into admin_daily_briefs (body, conversation_id)
                  values ('Deux annonces attendent leur validation.', '$$ || :'brief_log' || $$')$$,
                'admin: writes a brief');
select is((select generated_by from admin_daily_briefs where conversation_id = :'brief_log'),
          tests.uid('admin'), 'admin: the brief is written in its name');
select is((select count(*)::int from admin_daily_briefs where conversation_id = :'brief_log'), 1,
          'admin: reads the brief');
select throws_ok($$insert into admin_daily_briefs (body) values ('Un autre résumé.')$$,
                 '42501', null, 'admin: no new brief within 5 minutes');
select throws_ok($$update admin_daily_briefs set body = 'Changé.'$$,
                 '42501', null, 'admin: a brief is never changed');
select throws_ok($$delete from admin_daily_briefs$$,
                 '42501', null, 'admin: a brief is never deleted by a client');
select throws_ok($$insert into admin_daily_briefs (body, generated_by)
                   values ('Au nom d''un autre.', tests.uid('seller_a'))$$,
                 '42501', null, 'admin: never in the name of another account');
select throws_ok($$insert into ai_conversations (profile_id, context, kind)
                   values (tests.uid('admin'), 'seller', 'daily_brief')$$,
                 '23514', null, 'admin: a brief is logged in the context of the team only');

\set who seller_a
\ir _as.psql
select is((select count(*)::int from admin_daily_briefs), 0, 'seller_a: never the brief');
select throws_ok($$insert into admin_daily_briefs (body) values ('Résumé.')$$,
                 '42501', null, 'seller_a: never writes a brief');
select throws_ok($$insert into ai_conversations (profile_id, context, kind)
                   values (tests.uid('seller_a'), 'seller', 'daily_brief')$$,
                 '23514', null, 'seller_a: no brief in its own context');
select throws_ok($$insert into ai_conversations (profile_id, context, kind)
                   values (tests.uid('seller_a'), 'admin', 'daily_brief')$$,
                 '42501', null, 'seller_a: never the context of the team');

\set who seller_b
\ir _as.psql
select is((select count(*)::int from admin_daily_briefs), 0, 'seller_b: never the brief');
select throws_ok($$insert into admin_daily_briefs (body) values ('Résumé.')$$,
                 '42501', null, 'seller_b: never writes a brief');

\set who buyer_c
\ir _as.psql
select is((select count(*)::int from admin_daily_briefs), 0, 'buyer_c: never the brief');
select throws_ok($$insert into admin_daily_briefs (body) values ('Résumé.')$$,
                 '42501', null, 'buyer_c: never writes a brief');
select throws_ok($$update admin_daily_briefs set body = 'Changé.'$$,
                 '42501', null, 'buyer_c: never changes a brief');

\set who buyer_d
\ir _as.psql
select is((select count(*)::int from admin_daily_briefs), 0, 'buyer_d: never the brief');
select throws_ok($$insert into admin_daily_briefs (body) values ('Résumé.')$$,
                 '42501', null, 'buyer_d: never writes a brief');

\set who anon
\ir _as.psql
select throws_ok('select count(*) from admin_daily_briefs', '42501', null, 'anon: never the brief');
select throws_ok($$insert into admin_daily_briefs (body) values ('Résumé.')$$,
                 '42501', null, 'anon: never writes a brief');

-- Once the last brief is older than 5 minutes, the team writes a new one.
reset role;
update admin_daily_briefs set created_at = now() - interval '61 minutes';
\set who admin
\ir _as.psql
select lives_ok($$insert into admin_daily_briefs (body) values ('Rien n''attend l''équipe.')$$,
                'admin: a new brief once the last one is older than 5 minutes');
select is((select body from admin_daily_briefs order by created_at desc limit 1),
          'Rien n''attend l''équipe.', 'admin: the newest brief is read first');
select is((select count(*)::int from admin_daily_briefs where generated_by = tests.uid('admin')), 2,
          'admin: both briefs kept');

select * from finish();
rollback;
