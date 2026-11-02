-- L1-29: the suggestions of the assistant. Their log has its own kind (the
-- conversation with the assistant by default), chosen by the person among
-- three, on their own property only; read by them and the admin, never by
-- another account nor by a visitor. A message sent from a suggestion says so
-- (messages.ai_suggested), for the seller of the conversation only; the
-- others never.
begin;
\ir _helpers.psql
select plan(20);
\ir _plan.psql

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
select conversation_open(:'listing_a', 'Bonjour, la cave est-elle comprise ?') as conv \gset
select is((select ai_suggested from messages where conversation_id = :'conv'), false,
          'buyer_c: a message is not a suggestion by default');
insert into messages (conversation_id, sender_id, body, ai_suggested)
values (:'conv', tests.uid('buyer_c'), 'Et le parking ?', true);
select is((select ai_suggested from messages where conversation_id = :'conv' and body = 'Et le parking ?'),
          false, 'buyer_c: the mark of a suggestion is the seller''s only, dropped for the buyer');
select throws_ok(format($$insert into ai_conversations (profile_id, context, property_id, kind)
                         values (tests.uid('buyer_c'), 'seller', %L, 'listing_description')$$, :'prop_a'),
                 '42501', null, 'buyer_c: no suggestion log on the property of another');

\set who seller_a
\ir _as.psql
insert into ai_conversations (profile_id, context) values (tests.uid('seller_a'), 'seller')
returning id as chat \gset
select is((select kind from ai_conversations where id = :'chat'), 'chat',
          'seller_a: a conversation with the assistant by default');
select lives_ok(format($$insert into ai_conversations (profile_id, context, property_id, kind)
                         values (tests.uid('seller_a'), 'seller', %L, 'reply_suggestion')$$, :'prop_a'),
                'seller_a: logs a reply suggestion on its property');
select lives_ok(format($$insert into ai_conversations (profile_id, context, property_id, kind)
                         values (tests.uid('seller_a'), 'seller', %L, 'listing_description')$$, :'prop_a'),
                'seller_a: logs a description drafted for its property');
select throws_ok($$insert into ai_conversations (profile_id, context, kind)
                   values (tests.uid('seller_a'), 'seller', 'autre')$$,
                 '23514', null, 'seller_a: an unknown kind is refused');
select lives_ok(format($$insert into ai_messages (conversation_id, role, content, model, input_tokens, output_tokens)
                         select id, 'assistant', '{"type":"suggestion","text":"Oui, la cave est comprise."}',
                                'test-model', 120, 30
                           from ai_conversations where kind = 'reply_suggestion' and property_id = %L$$, :'prop_a'),
                'seller_a: logs the suggestion and its tokens');
select lives_ok(format($$insert into messages (conversation_id, sender_id, body, ai_suggested)
                         values (%L, tests.uid('seller_a'), 'Oui, la cave est comprise.', true)$$, :'conv'),
                'seller_a: replies with the suggestion');
select is((select ai_suggested from messages where conversation_id = :'conv' and sender_id = tests.uid('seller_a')),
          true, 'seller_a: the reply says it came from a suggestion');

\set who buyer_c
\ir _as.psql
select is((select count(*) from ai_conversations where kind <> 'chat')::int, 0,
          'buyer_c: never the suggestions of the seller');
select is((select count(*) from ai_messages)::int, 0, 'buyer_c: never their log');

\set who seller_b
\ir _as.psql
select is((select count(*) from ai_conversations)::int, 0, 'seller_b: never the logs of seller_a');
select is((select count(*) from ai_messages)::int, 0, 'seller_b: never their messages');
select throws_ok(format($$insert into ai_conversations (profile_id, context, property_id, kind)
                         values (tests.uid('seller_b'), 'seller', %L, 'reply_suggestion')$$, :'prop_a'),
                 '42501', null, 'seller_b: no suggestion log on the property of seller_a');

\set who buyer_d
\ir _as.psql
select is((select count(*) from ai_conversations)::int, 0, 'buyer_d: never the logs of seller_a');
select throws_ok(format($$insert into ai_conversations (profile_id, context, property_id, kind)
                         values (tests.uid('buyer_d'), 'seller', %L, 'listing_description')$$, :'prop_a'),
                 '42501', null, 'buyer_d: no suggestion log on the property of seller_a');

\set who anon
\ir _as.psql
select throws_ok('select count(*) from ai_conversations', '42501', null, 'anon: never a log of the assistant');
select throws_ok($$insert into ai_conversations (profile_id, context, kind)
                   values (tests.uid('seller_a'), 'seller', 'reply_suggestion')$$,
                 '42501', null, 'anon: never logs a suggestion');

\set who admin
\ir _as.psql
select is((select array_agg(kind order by kind) from ai_conversations where profile_id = tests.uid('seller_a')),
          '{chat,listing_description,reply_suggestion}'::text[], 'admin: reads every kind');

select * from finish();
rollback;
