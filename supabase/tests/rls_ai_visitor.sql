-- The assistant of the public site (DECISIONS.md 2026-11-07): a visitor
-- without an account asks through ai_visitor_ask (the limits of the day: 10
-- per visitor, 30 per address, 300 for the site), reads back only its own
-- conversation (ai_visitor_history) and gets one answer per question
-- (ai_visitor_answer); nothing of the tables is open to it, and no account
-- reads a conversation of a visitor but the admin. The FAQ of its prompt is
-- open to anyone.
begin;
\ir _helpers.psql
select plan(33);
\ir _plan.psql

-- Two visitors, two addresses (hashes as the server computes them).
select encode(sha256('visitor-one'), 'hex') as v1, encode(sha256('visitor-two'), 'hex') as v2,
       encode(sha256('address-one'), 'hex') as ip1, encode(sha256('address-two'), 'hex') as ip2 \gset

-- A visitor --------------------------------------------------------------------------
\set who anon
\ir _as.psql
select throws_ok(format('select * from ai_visitor_ask(%L, %L, null, %L)', 'not-a-hash', :'ip1', 'Bonjour'),
                 '22023', null, 'visitor: a key that is not a hash is refused');
select throws_ok(format('select * from ai_visitor_ask(%L, %L, null, %L)', :'v1', :'ip1', '   '),
                 '22023', null, 'visitor: an empty question is refused');
select throws_ok(format('select * from ai_visitor_ask(%L, %L, null, %L)', :'v1', :'ip1', repeat('a', 501)),
                 '22023', null, 'visitor: a question of more than 500 characters is refused');

select status as ask_status, conversation_id as conv1
  from ai_visitor_ask(:'v1', :'ip1', null, 'Est-ce vraiment gratuit ?') \gset
select is(:'ask_status'::text, 'ok', 'visitor: asks a question');
select ok(:'conv1' <> '', 'visitor: a conversation is opened');
select is((select conversation_id from ai_visitor_ask(:'v1', :'ip1', :'conv1', 'Et Sérénité ?')),
          :'conv1'::uuid, 'visitor: the next question goes on in the same conversation');
select is((select count(*)::int from ai_visitor_history(:'v1', :'conv1')), 2,
          'visitor: reads back its conversation');
select is((select content ->> 'text' from ai_visitor_history(:'v1', :'conv1') order by created_at limit 1),
          'Est-ce vraiment gratuit ?', 'visitor: the question kept as written');
select throws_ok(format('select * from ai_visitor_history(%L, %L)', :'v2', :'conv1'),
                 'P0002', null, 'visitor: never reads the conversation of another');
select isnt((select conversation_id from ai_visitor_ask(:'v2', :'ip2', :'conv1', 'Bonjour')),
            :'conv1'::uuid, 'visitor: a conversation of another is never written to, a new one opens');

-- One answer per question.
select ok(ai_visitor_answer(:'v1', :'conv1', '{"type":"assistant","blocks":[]}', 'claude-sonnet-5-5', 120, 40)
          and ai_visitor_answer(:'v1', :'conv1', '{"type":"assistant","blocks":[]}', 'claude-sonnet-5-5', 90, 30),
          'visitor: one answer per question asked');
select ok(not ai_visitor_answer(:'v1', :'conv1', '{"type":"assistant","blocks":[]}', 'claude-sonnet-5-5', 1, 1),
          'visitor: never more answers than questions');
select throws_ok(format('select ai_visitor_answer(%L, %L, %L, %L, 1, 1)', :'v2', :'conv1',
                        '{"type":"assistant","blocks":[]}', 'claude-sonnet-5-5'),
                 'P0002', null, 'visitor: never answers in the conversation of another');
select throws_ok(format('select ai_visitor_answer(%L, %L, %L, %L, 1, 1)', :'v1', :'conv1',
                        '{"type":"user","text":"x"}', 'claude-sonnet-5-5'),
                 '22023', null, 'visitor: only an answer of the assistant');

-- Nothing of the tables.
select throws_ok('select count(*) from ai_conversations', '42501', null,
                 'visitor: reads no conversation');
select throws_ok('select count(*) from ai_messages', '42501', null, 'visitor: reads no message');
select throws_ok(format($$insert into ai_conversations (profile_id, context, visitor_key, ip_key)
                          values (null, 'visitor', %L, %L)$$, :'v1', :'ip1'),
                 '42501', null, 'visitor: opens no conversation itself');
select throws_ok(format('select ai_visitor_questions(%L, null)', :'v1'), '42501', null,
                 'visitor: the counts are not open to it');
select ok((select count(*) from knowledge_cards_visitor()) >= 0, 'visitor: reads the FAQ of the prompt');

-- The limits of the day: 10 questions per visitor.
select is((select array_agg(status) from (
            select (ai_visitor_ask(:'v1', :'ip1', :'conv1', 'Question ' || n)).status
              from generate_series(1, 8) n) x),
          array_fill('ok'::text, array[8]), 'visitor: up to 10 questions in a day');
select is((select status from ai_visitor_ask(:'v1', :'ip1', :'conv1', 'Une de trop')), 'visitor_limit',
          'visitor: the 11th question of the day is refused');
select is((select count(*)::int from ai_visitor_history(:'v1', :'conv1') where role = 'user'), 10,
          'visitor: the refused question is not written');

-- 30 per address: other visitors behind the same one.
select is((select count(*)::int from (
            select (ai_visitor_ask(encode(sha256(convert_to('visitor-' || n, 'UTF8')), 'hex'), :'ip1', null, 'Bonjour')).status as s
              from generate_series(100, 125) n) x where s = 'ok'), 20,
          'address: 30 questions at most, all visitors behind it');
select is((select status from ai_visitor_ask(encode(sha256('visitor-200'), 'hex'), :'ip1', null, 'Bonjour')),
          'ip_limit', 'address: the 31st question of the day is refused');

-- 300 for the site.
reset role;
insert into ai_conversations (profile_id, context, kind, visitor_key, ip_key)
select null, 'visitor', 'chat', encode(sha256(convert_to('bulk-' || n, 'UTF8')), 'hex'), encode(sha256(convert_to('bulk-ip-' || n, 'UTF8')), 'hex')
  from generate_series(1, 269) n;
insert into ai_messages (conversation_id, role, content)
select c.id, 'user', '{"type":"user","text":"x","context":null}'
  from ai_conversations c where c.visitor_key in (select encode(sha256(convert_to('bulk-' || n, 'UTF8')), 'hex') from generate_series(1, 269) n);
\ir _as.psql
select is((select status from ai_visitor_ask(:'v2', :'ip2', null, 'Bonjour')), 'site_limit',
          'site: the 301st question of the day is refused, whoever asks');

-- Yesterday's questions do not count.
reset role;
update ai_messages m set created_at = public.ai_visitor_day_start() - interval '1 hour'
  from ai_conversations c where c.id = m.conversation_id and c.context = 'visitor';
\ir _as.psql
select is((select status from ai_visitor_ask(:'v1', :'ip1', null, 'Bonjour')), 'ok',
          'visitor: the limits start again each day');

-- An account -------------------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is((select count(*)::int from ai_conversations where context = 'visitor'), 0,
          'seller: reads no conversation of a visitor');
select is((select count(*)::int from ai_messages m join ai_conversations c on c.id = m.conversation_id
            where c.context = 'visitor'), 0, 'seller: reads no message of a visitor');
select throws_ok(format($$insert into ai_conversations (profile_id, context) values (%L, 'visitor')$$,
                        tests.uid('seller_a')),
                 '23514', null, 'seller: opens no conversation of a visitor');
select lives_ok($$select * from ai_visitor_ask(encode(sha256('signed-in'), 'hex'),
                                               encode(sha256('signed-in-ip'), 'hex'), null, 'Bonjour')$$,
                'seller: on the public site, asks as a visitor');

\set who admin
\ir _as.psql
select ok((select count(*) from ai_conversations where context = 'visitor') > 0,
          'admin: reads the conversations of the visitors');
select throws_ok(format('select ai_visitor_questions(%L, null)', :'v1'), '42501', null,
                 'admin: the counts are not open, even to the admin');

-- The table itself ----------------------------------------------------------------------
reset role;
select throws_ok($$insert into ai_conversations (profile_id, context, kind, visitor_key, ip_key)
                   values (null, 'visitor', 'chat', 'x', 'y')$$,
                 '23514', null, 'table: a visitor known by its hashes only');

select * from finish();
rollback;
