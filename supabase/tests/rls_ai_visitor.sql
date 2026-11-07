-- The assistant of the public site (DECISIONS.md 2026-11-07): the route of
-- the site asks through ai_visitor_ask (the limits of the day: 10 per
-- visitor, 30 per address, 300 for the site), reads back only the
-- conversation of a visitor (ai_visitor_history) and writes one answer per
-- question (ai_visitor_answer), each time with the key of the server
-- (derived from the cron_secret of the Vault): called straight, with the
-- public anon key or a session, they refuse. Nothing of the tables is open
-- to a visitor, and no account reads a conversation of a visitor but the admin.
begin;
\ir _helpers.psql
select plan(56);
\ir _plan.psql

-- The secret of the jobs, as the Vault of the preprod holds it (a test one
-- when the base has none), and the key the server derives from it.
select vault.create_secret('rls-test-cron-secret', 'cron_secret')
 where not exists (select 1 from vault.secrets where name = 'cron_secret');
select encode(extensions.hmac('leenkey:ai-visitor:server', decrypted_secret, 'sha256'), 'hex') as key
  from vault.decrypted_secrets where name = 'cron_secret' \gset
select encode(sha256('not-the-key'), 'hex') as forged \gset
-- The counts of the day start from none (the base may hold earlier questions).
delete from ai_conversations where context = 'visitor';

-- Two visitors, two addresses (hashes as the server computes them).
select encode(sha256('visitor-one'), 'hex') as v1, encode(sha256('visitor-two'), 'hex') as v2,
       encode(sha256('address-one'), 'hex') as ip1, encode(sha256('address-two'), 'hex') as ip2 \gset

-- Called straight: by anyone, a visitor or an account, without the key -------------
\set who anon
\ir _as.psql
select throws_ok(format('select * from ai_visitor_ask(%L, %L, %L, null, %L)', :'forged', :'v1', :'ip1', 'Bonjour'),
                 '42501', null, 'anon: never asks without the key of the site');
select throws_ok(format('select * from ai_visitor_ask(null, %L, %L, null, %L)', :'v1', :'ip1', 'Bonjour'),
                 '42501', null, 'anon: never asks without a key');
select throws_ok(format('select * from knowledge_cards_visitor(%L)', :'forged'),
                 '42501', null, 'anon: never reads the cards of the prompt without the key');
select throws_ok(format('select ai_visitor_server(%L)', :'key'), '42501', null,
                 'anon: the check of the key is not open to it');
select throws_ok('select ai_visitor_purge()', '42501', null, 'anon: never purges');

\set who seller_a
\ir _as.psql
select throws_ok(format('select * from ai_visitor_ask(%L, %L, %L, null, %L)', :'forged', :'v1', :'ip1', 'Bonjour'),
                 '42501', null, 'seller_a: never asks without the key of the site');
\set who seller_b
\ir _as.psql
select throws_ok(format('select * from ai_visitor_history(%L, %L, gen_random_uuid())', :'forged', :'v1'),
                 '42501', null, 'seller_b: never reads a conversation without the key');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select ai_visitor_answer(%L, %L, gen_random_uuid(), '{"type":"assistant","blocks":[]}', 'm', 1, 1)$$,
                        :'forged', :'v1'),
                 '42501', null, 'buyer_c: never writes an answer without the key');
\set who buyer_d
\ir _as.psql
select throws_ok(format('select * from ai_visitor_ask(%L, %L, %L, null, %L)', :'forged', :'v1', :'ip1', 'Bonjour'),
                 '42501', null, 'buyer_d: never asks without the key of the site');
\set who admin
\ir _as.psql
select throws_ok(format('select * from ai_visitor_ask(%L, %L, %L, null, %L)', :'forged', :'v1', :'ip1', 'Bonjour'),
                 '42501', null, 'admin: never asks without the key of the site, even the admin');

-- The route of the site, with its key (the server calls without a session) -----------
\set who anon
\ir _as.psql
select throws_ok(format('select * from ai_visitor_ask(%L, %L, %L, null, %L)', :'key', 'not-a-hash', :'ip1', 'Bonjour'),
                 '22023', null, 'site: a key of visitor that is not a hash is refused');
select throws_ok(format('select * from ai_visitor_ask(%L, %L, %L, null, %L)', :'key', :'v1', :'ip1', '   '),
                 '22023', null, 'site: an empty question is refused');
select throws_ok(format('select * from ai_visitor_ask(%L, %L, %L, null, %L)', :'key', :'v1', :'ip1', repeat('a', 501)),
                 '22023', null, 'site: a question of more than 500 characters is refused');

select status as ask_status, conversation_id as conv1
  from ai_visitor_ask(:'key', :'v1', :'ip1', null, 'Est-ce vraiment gratuit ?') \gset
select is(:'ask_status'::text, 'ok', 'site: asks a question');
select ok(:'conv1' <> '', 'site: a conversation is opened');
select is((select conversation_id from ai_visitor_ask(:'key', :'v1', :'ip1', :'conv1', 'Et Sérénité ?')),
          :'conv1'::uuid, 'site: the next question goes on in the same conversation');
select is((select count(*)::int from ai_visitor_history(:'key', :'v1', :'conv1')), 2,
          'site: reads back the conversation of the visitor');
select is((select content ->> 'text' from ai_visitor_history(:'key', :'v1', :'conv1') order by created_at limit 1),
          'Est-ce vraiment gratuit ?', 'site: the question kept as written');
select throws_ok(format('select * from ai_visitor_history(%L, %L, %L)', :'key', :'v2', :'conv1'),
                 'P0002', null, 'site: never reads the conversation of another visitor');
select isnt((select conversation_id from ai_visitor_ask(:'key', :'v2', :'ip2', :'conv1', 'Bonjour')),
            :'conv1'::uuid, 'site: a conversation of another visitor is never written to, a new one opens');
reset role;
select lives_ok(format('select ai_visitor_server(%L)', :'key'),
                'site: its key is the one derived from the cron_secret of the Vault');
\ir _as.psql

-- One answer per question, in the shape of an answer of the model.
select ok(ai_visitor_answer(:'key', :'v1', :'conv1', '{"type":"assistant","blocks":[{"type":"text","text":"Oui."}]}', 'claude-sonnet-5-5', 120, 40)
          and ai_visitor_answer(:'key', :'v1', :'conv1', '{"type":"assistant","blocks":[]}', 'claude-sonnet-5-5', 90, 30),
          'site: one answer per question asked');
select ok(not ai_visitor_answer(:'key', :'v1', :'conv1', '{"type":"assistant","blocks":[]}', 'claude-sonnet-5-5', 1, 1),
          'site: never more answers than questions');
select throws_ok(format('select ai_visitor_answer(%L, %L, %L, %L, %L, 1, 1)', :'key', :'v2', :'conv1',
                        '{"type":"assistant","blocks":[]}', 'claude-sonnet-5-5'),
                 'P0002', null, 'site: never answers in the conversation of another visitor');
select throws_ok(format('select ai_visitor_answer(%L, %L, %L, %L, %L, 1, 1)', :'key', :'v1', :'conv1',
                        '{"type":"user","text":"x"}', 'claude-sonnet-5-5'),
                 '22023', null, 'site: only an answer of the assistant');
select throws_ok(format('select ai_visitor_answer(%L, %L, %L, %L, %L, 1, 1)', :'key', :'v1', :'conv1',
                        '{"type":"assistant","blocks":[{"type":"tool_use","id":"x","name":"y","input":{}}]}', 'claude-sonnet-5-5'),
                 '22023', null, 'site: an answer of text and thinking only, never a tool');
select throws_ok(format('select ai_visitor_answer(%L, %L, %L, %L, %L, 1, 1)', :'key', :'v1', :'conv1',
                        jsonb_build_object('type', 'assistant', 'blocks',
                          jsonb_build_array(jsonb_build_object('type', 'text', 'text', repeat('a', 40000)))),
                        'claude-sonnet-5-5'),
                 '22023', null, 'site: an answer of 32 KB at most');
select throws_ok(format('select ai_visitor_answer(%L, %L, %L, %L, %L, 1, 1501)', :'key', :'v1', :'conv1',
                        '{"type":"assistant","blocks":[]}', 'claude-sonnet-5-5'),
                 '22023', null, 'site: never more tokens than the cap of the route');

-- Never the conversation of an account, even by its id.
reset role;
insert into ai_conversations (profile_id, context) values (tests.uid('seller_a'), 'seller')
returning id as account_conv \gset
\ir _as.psql
select isnt((select conversation_id from ai_visitor_ask(:'key', :'v1', :'ip1', :'account_conv', 'Bonjour')),
            :'account_conv'::uuid, 'site: the id of a conversation of an account opens a new one');
select throws_ok(format('select * from ai_visitor_history(%L, %L, %L)', :'key', :'v1', :'account_conv'),
                 'P0002', null, 'site: never reads a conversation of an account');
select throws_ok(format('select ai_visitor_answer(%L, %L, %L, %L, %L, 1, 1)', :'key', :'v1', :'account_conv',
                        '{"type":"assistant","blocks":[]}', 'claude-sonnet-5-5'),
                 'P0002', null, 'site: never answers in a conversation of an account');

-- A conversation of the day and of one address: another address opens a new one.
select status as s3, conversation_id as conv3
  from ai_visitor_ask(:'key', :'v1', :'ip2', :'conv1', 'Depuis une autre adresse') \gset
select isnt(:'conv3'::uuid, :'conv1'::uuid, 'site: another address of the visitor opens a new conversation');

-- Nothing of the tables.
select throws_ok('select count(*) from ai_conversations', '42501', null,
                 'anon: reads no conversation');
select throws_ok('select count(*) from ai_messages', '42501', null, 'anon: reads no message');
select throws_ok(format($$insert into ai_conversations (profile_id, context, visitor_key, ip_key)
                          values (null, 'visitor', %L, %L)$$, :'v1', :'ip1'),
                 '42501', null, 'anon: opens no conversation itself');
select throws_ok(format('select ai_visitor_questions(%L, null)', :'v1'), '42501', null,
                 'anon: the counts are not open to it');
select ok((select count(*) from knowledge_cards_visitor(:'key')) >= 0, 'site: reads the FAQ of the prompt');

-- The limits of the day: 10 questions per visitor (4 asked so far).
select is((select array_agg(status) from (
            select (ai_visitor_ask(:'key', :'v1', :'ip1', :'conv1', 'Question ' || n)).status
              from generate_series(1, 6) n) x),
          array_fill('ok'::text, array[6]), 'visitor: up to 10 questions in a day');
select is((select status from ai_visitor_ask(:'key', :'v1', :'ip1', :'conv1', 'Une de trop')), 'visitor_limit',
          'visitor: the 11th question of the day is refused');
select is((select count(*)::int from ai_visitor_history(:'key', :'v1', :'conv1') where role = 'user'), 8,
          'visitor: the refused question is not written');

-- 30 per address: other visitors behind the same one (9 from ip1 so far).
select is((select count(*)::int from (
            select (ai_visitor_ask(:'key', encode(sha256(convert_to('visitor-' || n, 'UTF8')), 'hex'), :'ip1', null, 'Bonjour')).status as s
              from generate_series(100, 125) n) x where s = 'ok'), 21,
          'address: 30 questions at most, all visitors behind it');
select is((select status from ai_visitor_ask(:'key', encode(sha256('visitor-200'), 'hex'), :'ip1', null, 'Bonjour')),
          'ip_limit', 'address: the 31st question of the day is refused');

-- 300 for the site (32 asked so far).
reset role;
insert into ai_conversations (profile_id, context, kind, visitor_key, ip_key)
select null, 'visitor', 'chat', encode(sha256(convert_to('bulk-' || n, 'UTF8')), 'hex'), encode(sha256(convert_to('bulk-ip-' || n, 'UTF8')), 'hex')
  from generate_series(1, 268) n;
insert into ai_messages (conversation_id, role, content)
select c.id, 'user', '{"type":"user","text":"x","context":null}'
  from ai_conversations c where c.visitor_key in (select encode(sha256(convert_to('bulk-' || n, 'UTF8')), 'hex') from generate_series(1, 268) n);
select is((select count(*)::int from ai_messages m join ai_conversations c on c.id = m.conversation_id
            where c.context = 'visitor' and m.role = 'user'), 300, 'site: 300 questions asked today');
\ir _as.psql
select is((select status from ai_visitor_ask(:'key', encode(sha256('visitor-300'), 'hex'), encode(sha256('address-300'), 'hex'), null, 'Bonjour')),
          'site_limit', 'site: the 301st question of the day is refused, whoever asks');

-- The next day: the limits start again, yesterday's conversation is not reused,
-- and the purge of the night clears the hash of yesterday's addresses.
reset role;
update ai_messages m set created_at = public.ai_visitor_day_start() - interval '1 hour'
  from ai_conversations c where c.id = m.conversation_id and c.context = 'visitor';
update ai_conversations set created_at = public.ai_visitor_day_start() - interval '2 hours'
 where context = 'visitor';
\ir _as.psql
select status as s4, conversation_id as conv4 from ai_visitor_ask(:'key', :'v1', :'ip1', :'conv1', 'Bonjour') \gset
select is(:'s4'::text, 'ok', 'visitor: the limits start again each day');
select isnt(:'conv4'::uuid, :'conv1'::uuid, 'visitor: yesterday''s conversation is not reused, a new one opens');
reset role;
select ai_visitor_purge();
select is((select count(*)::int from ai_conversations where context = 'visitor' and ip_key is not null), 1,
          'purge: the hash of an address is kept for its day only');
update ai_conversations set created_at = now() - interval '31 days' where id = :'conv1';
select ai_visitor_purge();
select is((select count(*)::int from ai_conversations where id = :'conv1'), 0,
          'purge: a conversation of a visitor is kept 30 days');

-- The accounts --------------------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is((select count(*)::int from ai_conversations where context = 'visitor'), 0,
          'seller_a: reads no conversation of a visitor');
select is((select count(*)::int from ai_messages m join ai_conversations c on c.id = m.conversation_id
            where c.context = 'visitor'), 0, 'seller_a: reads no message of a visitor');
select throws_ok(format($$insert into ai_conversations (profile_id, context) values (%L, 'visitor')$$,
                        tests.uid('seller_a')),
                 '23514', null, 'seller_a: opens no conversation of a visitor');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from ai_conversations where context = 'visitor'), 0,
          'buyer_c: reads no conversation of a visitor');

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
select throws_ok($$insert into ai_conversations (profile_id, context, kind, visitor_key, ip_key)
                   values (null, 'visitor', 'chat', null, null)$$,
                 '23514', null, 'table: a conversation of a visitor always has the hash of its visitor');

select * from finish();
rollback;
