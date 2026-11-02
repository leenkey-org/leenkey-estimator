-- L1-28: the assistant. The daily count of messages (ai_quota_consume): its
-- owner never writes it directly, a call counts one message until the limit
-- given, the count restarts on a new day in Europe/Paris, a suspended
-- account is refused. The FAQ of the system prompt (knowledge_cards): the
-- cards of an audience among the roles of the account, never the others, the
-- table staying closed. One result per call of a tool in the log.
begin;
\ir _helpers.psql
select plan(31);
\ir _plan.psql

-- The cards of the seed (or of a previous import) stay out of the way.
delete from knowledge_base;
insert into knowledge_base (audience, category, step_code, question, answer, source_file) values
  ('seller', 'prix', 'S2', 'Q seller', 'Réponse vendeur.', 'rls-test'),
  ('buyer', 'visites', null, 'Q buyer', 'Réponse acquéreur.', 'rls-test'),
  ('both', 'notaire', null, 'Q both', 'Réponse commune.', 'rls-test');
update profiles set ai_messages_today = 0, ai_messages_date = null;

select ok(not has_function_privilege('anon', 'public.ai_quota_consume(integer)', 'execute'),
          'anon: may not count an assistant message');
select ok(not has_function_privilege('anon', 'public.knowledge_cards(text)', 'execute'),
          'anon: may not read the FAQ');

-- Seller A --------------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is((select row(allowed, used)::text from ai_quota_consume(2)), '(t,1)', 'seller_a: a first message counted');
select is((select row(allowed, used)::text from ai_quota_consume(2)), '(t,2)', 'seller_a: a second message counted');
select is((select row(allowed, used)::text from ai_quota_consume(2)), '(f,2)', 'seller_a: refused at the limit, nothing counted');
select is((select ai_messages_today from profiles where id = tests.uid('seller_a')), 2,
          'seller_a: the count of the day in the profile');
select is((select row(allowed, used)::text from ai_quota_consume(5)), '(t,3)', 'seller_a: a higher limit lets one more through');
select is((select row(allowed, used)::text from ai_quota_consume(null)), '(t,4)', 'seller_a: without a limit, counted all the same');
select throws_ok($$select * from ai_quota_consume(-1)$$, '22023', null, 'seller_a: a negative limit is refused');
select throws_ok($$update profiles set ai_messages_today = 0 where id = tests.uid('seller_a')$$, '42501', null,
                 'seller_a: does not reset its count itself');
select throws_ok($$update profiles set ai_messages_date = null where id = tests.uid('seller_a')$$, '42501', null,
                 'seller_a: does not change the date of its count');

reset role;
update profiles set ai_messages_today = 30,
       ai_messages_date = (now() at time zone 'Europe/Paris')::date - 1
 where id = tests.uid('seller_a');
\set who seller_a
\ir _as.psql
select is((select row(allowed, used)::text from ai_quota_consume(30)), '(t,1)',
          'seller_a: the count of yesterday does not weigh on today');
select is((select ai_messages_date from profiles where id = tests.uid('seller_a')),
          (now() at time zone 'Europe/Paris')::date, 'seller_a: dated today, in Paris');

select is((select array_agg(question order by question) from knowledge_cards('seller')),
          '{"Q both","Q seller"}'::text[], 'seller_a: the cards for sellers and for both');
select throws_ok($$select * from knowledge_cards('buyer')$$, '42501', null,
                 'seller_a: the cards of a role it does not have are refused');
select throws_ok($$select * from knowledge_cards('admin')$$, '42501', null,
                 'seller_a: the cards of the admin are refused');
select throws_ok($$select * from knowledge_cards('tous')$$, '22023', null, 'seller_a: an unknown audience is refused');
select is((select count(*) from knowledge_base)::int, 0, 'seller_a: still no direct read of the table');

-- One result per call of a tool.
insert into ai_conversations (profile_id, context) values (tests.uid('seller_a'), 'seller')
returning id as ai_conv \gset
select lives_ok(format($$insert into ai_messages (conversation_id, role, content)
                        values (%L, 'tool', '{"tool_use_id":"toolu_1","status":"confirmed"}')$$, :'ai_conv'),
                'seller_a: logs the result of a tool');
select throws_ok(format($$insert into ai_messages (conversation_id, role, content)
                          values (%L, 'tool', '{"tool_use_id":"toolu_1","status":"declined"}')$$, :'ai_conv'),
                 '23505', null, 'seller_a: a second result for the same call is refused');

-- A change of a listing confirmed, logged with it, once.
reset role;
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '3 rue de l''Assistant', '99994', 'Assistville', 58, 3)
returning id as prop_a \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_a', 'Appartement de l''assistant', 'Description.', 20000000)
returning id as listing_a \gset
\set who seller_a
\ir _as.psql
select lives_ok(format($$select ai_listing_update(%L, 'toolu_2', 'update_listing_price', %L, null, 12345600)$$,
                       :'ai_conv', :'listing_a'),
                'seller_a: a confirmed change of its listing');
select is((select price_cents from listings where id = :'listing_a'), 12345600::bigint,
          'seller_a: the listing changed');
select is((select content->>'status' from ai_messages where content->>'tool_use_id' = 'toolu_2'), 'confirmed',
          'seller_a: and its result logged with it');
select throws_ok(format($$select ai_listing_update(%L, 'toolu_2', 'update_listing_price', %L, null, 99900)$$,
                        :'ai_conv', :'listing_a'),
                 '23505', null, 'seller_a: a call already answered changes nothing');
select is((select price_cents from listings where id = :'listing_a'), 12345600::bigint,
          'seller_a: the listing kept its price');
select throws_ok(format($$select ai_listing_update(%L, 'toolu_3', 'update_listing_price', %L, 'x', 100)$$,
                        :'ai_conv', :'listing_a'),
                 '22023', null, 'seller_a: one change at a time');

-- Seller B --------------------------------------------------------------------
\set who seller_b
\ir _as.psql
select is((select row(allowed, used)::text from ai_quota_consume(30)), '(t,1)', 'seller_b: its own count, not the one of seller_a');
insert into ai_conversations (profile_id, context) values (tests.uid('seller_b'), 'seller')
returning id as ai_conv_b \gset
select throws_ok(format($$select ai_listing_update(%L, 'toolu_9', 'update_listing_price', %L, null, 100)$$,
                        :'ai_conv_b', :'listing_a'),
                 'P0002', null, 'seller_b: never the listing of seller_a, nothing logged');

-- Buyer C ---------------------------------------------------------------------
\set who buyer_c
\ir _as.psql
select is((select array_agg(question order by question) from knowledge_cards('buyer')),
          '{"Q both","Q buyer"}'::text[], 'buyer_c: the cards for buyers and for both');

-- Admin -----------------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select count(*) from knowledge_cards('admin'))::int, 3, 'admin: every card');

-- A suspended account ---------------------------------------------------------
reset role;
update profiles set suspended_at = now() where id = tests.uid('buyer_d');
\set who buyer_d
\ir _as.psql
select throws_ok($$select * from ai_quota_consume(20)$$, '42501', null, 'buyer_d suspended: no assistant message');

select * from finish();
rollback;
