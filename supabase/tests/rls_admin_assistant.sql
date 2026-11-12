-- L1-30d (second part): the assistant in the back office. The log and the
-- tokens are read by the team only; the FAQ is imported by the team only,
-- as the seed script does it (an answer changed loses its embedding, a card
-- gone from the file is removed), written in audit_log; the summary of a
-- case is logged in the context of the team only.
begin;
\ir _helpers.psql
select plan(30);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into ai_conversations (profile_id, context) values (tests.uid('seller_a'), 'seller')
returning id as chat \gset
insert into ai_messages (conversation_id, role, content)
values (:'chat', 'user', '{"type":"user","text":"Comment fixer mon prix ?","context":null}');
insert into ai_messages (conversation_id, role, content, model, input_tokens, output_tokens)
values (:'chat', 'assistant', '{"type":"assistant","blocks":[]}', 'test-model', 1200, 300);
select throws_ok('select * from admin_ai_usage()', '42501', null, 'seller_a: never the tokens');
select throws_ok('select * from admin_ai_conversations()', '42501', null, 'seller_a: never the log');
select throws_ok($$select * from admin_knowledge_import('faq-test.md',
                   '[{"audience":"seller","category":"Prix","question":"Q ?","answer":"R."}]')$$,
                 '42501', null, 'seller_a: never imports the FAQ');
select throws_ok($$insert into ai_conversations (profile_id, context, kind)
                   values (tests.uid('seller_a'), 'seller', 'case_summary')$$,
                 '23514', null, 'seller_a: no summary of a case in its own context');
select throws_ok('select * from knowledge_import_cards(''[]'')', '42501', null,
                 'seller_a: never the helper of the import');

\set who seller_b
\ir _as.psql
select throws_ok('select * from admin_ai_usage()', '42501', null, 'seller_b: never the tokens');
select throws_ok('select * from admin_ai_conversations()', '42501', null, 'seller_b: never the log');
select is((select count(*)::int from ai_messages), 0, 'seller_b: never the messages of seller_a');

\set who buyer_c
\ir _as.psql
select throws_ok('select * from admin_ai_conversations()', '42501', null, 'buyer_c: never the log');
select throws_ok($$select * from admin_knowledge_import('faq-test.md',
                   '[{"audience":"buyer","category":"Visites","question":"Q ?","answer":"R."}]')$$,
                 '42501', null, 'buyer_c: never imports the FAQ');

\set who buyer_d
\ir _as.psql
select throws_ok('select * from admin_ai_usage()', '42501', null, 'buyer_d: never the tokens');
select is((select count(*)::int from knowledge_base), 0, 'buyer_d: never the table of the FAQ');

\set who anon
\ir _as.psql
select throws_ok('select * from admin_ai_usage()', '42501', null, 'anon: never the tokens');
select throws_ok('select * from admin_ai_conversations()', '42501', null, 'anon: never the log');
select throws_ok($$select * from admin_knowledge_import('faq-test.md',
                   '[{"audience":"seller","category":"Prix","question":"Q ?","answer":"R."}]')$$,
                 '42501', null, 'anon: never imports the FAQ');

\set who admin
\ir _as.psql
select is((select sum(input_tokens)::int from admin_ai_usage() where context = 'seller'
           and model = 'test-model'), 1200, 'admin: the tokens of the day by context and model');
select is((select answers::int from admin_ai_usage() where model = 'test-model'), 1,
          'admin: one answer counted');
select is((select first_question from admin_ai_conversations('seller') where id = :'chat'),
          'Comment fixer mon prix ?', 'admin: the log with its first question');
select is((select count(*)::int from admin_ai_conversations(null, 'fixer mon') where id = :'chat'), 1,
          'admin: searched in the messages');
select is((select count(*)::int from admin_ai_conversations('buyer') where id = :'chat'), 0,
          'admin: filtered by context');
select is((select count(*)::int from admin_ai_conversations(null, '100%_') where id = :'chat'), 0,
          'admin: the wildcards of a search are plain characters');
select throws_ok($$select * from admin_ai_conversations('autre')$$, '22023', null,
                 'admin: an unknown context is refused');
select lives_ok($$insert into ai_conversations (profile_id, context, kind)
                  values (tests.uid('admin'), 'admin', 'case_summary')$$,
                'admin: logs a summary of a case');

select results_eq($$select inserted, updated, removed, unchanged from admin_knowledge_import('faq-test.md',
  '[{"audience":"seller","category":"Prix","question":"Q1 ?","answer":"R1."},
    {"audience":"buyer","category":"Visites","question":"Q2 ?","answer":"R2.","step_code":"visits"}]')$$,
  $$values (2, 0, 0, 0)$$, 'admin: imports the cards of a file');
update knowledge_base set embedding = array_fill(0.01, array[384])::extensions.vector
 where source_file = 'faq-test.md';
select results_eq($$select inserted, updated, removed, unchanged from admin_knowledge_import('faq-test.md',
  '[{"audience":"seller","category":"Prix","question":"Q1 ?","answer":"R1 changée."},
    {"audience":"seller","category":"Prix","question":"Q3 ?","answer":"R3."}]')$$,
  $$values (1, 1, 1, 0)$$, 'admin: a new card, a changed one, one gone');
select is((select count(*)::int from knowledge_base where source_file = 'faq-test.md'
           and embedding is null), 2, 'admin: the changed and the new cards lose their embedding');
select throws_ok($$select * from admin_knowledge_import('../faq.md',
                   '[{"audience":"seller","category":"Prix","question":"Q ?","answer":"R."}]')$$,
                 '22023', null, 'admin: a file name with a path is refused');
select throws_ok($$select * from admin_knowledge_import('faq-test.md', null)$$,
                 '22023', null, 'admin: no list of cards is refused, the file is kept');
select is((select count(*)::int from knowledge_base where source_file = 'faq-test.md'), 2,
          'admin: the cards of the file are still there');
select is((select count(*)::int from audit_log where action = 'knowledge.import'
           and meta ->> 'file' = 'faq-test.md'), 2, 'admin: each import written in audit_log');

select * from finish();
rollback;
