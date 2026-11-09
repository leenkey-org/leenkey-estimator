-- L1-34: the conversation with the Leenkey adviser. Opened when the plan in
-- force of a property includes the adviser (never a held order), read by its
-- seller and the team only, written by both while the plan holds; the
-- seller's messages go to every admin, the team's to the seller; the shared
-- inbox and the handoff of the assistant.
begin;
\ir _helpers.psql
select plan(42);
\ir _plan.psql

insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Un conseiller.', 99000, 'Accompagné', '{Conseiller}', 2),
  ('serenite', 'Sérénité', 'Jusqu''à la signature.', 150000, 'Sérénité', '{Conseiller,Dossier}', 3)
on conflict (code) do nothing;
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
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '5 rue des Lilas', '91170', 'Viry-Châtillon', 90, 4)
returning id as held \gset

-- The webhook (L1-26): a plan paid, and an order held in the same way as
-- stripe_checkout_complete does (recorded, then closed at once).
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, early_start_requested_at)
values (:'paid', tests.uid('seller_a'), 'accompagne', 99000, now(), now())
returning id as sub \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'held', tests.uid('seller_a'), 'serenite', 150000, now())
returning id as held_sub \gset
update subscriptions set ends_at = activated_at where id = :'held_sub';
-- The trigger waits for the end of the transaction: run it now.
set constraints all immediate;
set constraints all deferred;

select is((select count(*)::int from conversations where kind = 'advisor' and property_id = :'paid'), 1,
          'a plan with the adviser opens its conversation');
select is((select count(*)::int from conversations where kind = 'advisor' and property_id in (:'free', :'held')), 0,
          'neither Autonomie nor a held order opens one');
select conversations.id as conv from conversations where kind = 'advisor' and property_id = :'paid' \gset
select is((select kind from messages where conversation_id = :'conv'), 'system',
          'its welcome message, written by the team');
select ok((select body like 'Bonjour, je suis votre conseiller Leenkey%sous 24 h. L''équipe Leenkey'
             from messages where conversation_id = :'conv'),
          'immediate start: the adviser answers within 24 h');

-- One transaction gives every row the same now(): the welcome an hour ago.
update messages set created_at = now() - interval '1 hour' where conversation_id = :'conv';
update conversations set last_message_at = now() - interval '1 hour',
                         leenkey_last_read_at = now() - interval '1 hour'
 where id = :'conv';

-- The seller ---------------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is((select kind::text from conversation_summaries() limit 1), 'advisor',
          'seller_a: the adviser first in the list');
select is((select unread from conversation_summaries() where id = :'conv'), true,
          'seller_a: the welcome is unread');
select is((select row(plan, advisor_ordered_at)::text from conversation_summaries() where id = :'conv'),
          '(accompagne,)', 'seller_a: its plan, an immediate start: no day to wait for');
select lives_ok(format('insert into messages (conversation_id, sender_id, body) values (%L, %L, %L)',
                       :'conv', tests.uid('seller_a'), 'Bonjour, quel prix conseillez-vous ?'),
                'seller_a: writes to the adviser');
select throws_ok('select admin_advisor_conversations()', '42501', null,
                 'seller_a: never reads the inbox of the team');
select is((select count(*)::int from conversations where kind = 'advisor' and property_id = :'free'), 0,
          'seller_a: no conversation for an Autonomie property');

-- Their message half an hour ago, before the answer of the team.
reset role;
update messages set created_at = now() - interval '30 minutes'
 where conversation_id = :'conv' and sender_id = tests.uid('seller_a');
update conversations set last_message_at = now() - interval '30 minutes' where id = :'conv';
update notifications set created_at = now() - interval '30 minutes'
 where data->>'conversation_id' = :'conv';

-- The others ---------------------------------------------------------------------
\set who seller_b
\ir _as.psql
select is((select count(*)::int from conversation_summaries() where id = :'conv'), 0,
          'seller_b: never sees the adviser of another seller');
select is((select count(*)::int from messages where conversation_id = :'conv'), 0,
          'seller_b: never reads its messages');
select throws_ok(format('insert into messages (conversation_id, sender_id, body) values (%L, %L, %L)',
                        :'conv', tests.uid('seller_b'), 'Bonjour'),
                 '42501', null, 'seller_b: never writes in it');
select is((select count(*)::int from conversation_senders(:'conv')), 0,
          'seller_b: never reads its authors');
insert into ai_conversations (profile_id, context) values (tests.uid('seller_b'), 'seller')
returning id as ai_b \gset
select throws_ok(format($$select ai_advisor_handoff(%L, 'toolu_b', 'contact_advisor', %L, 'Une question')$$,
                        :'ai_b', :'paid'), '42501', null,
                 'seller_b: never hands a question over for another seller');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from messages where conversation_id = :'conv'), 0,
          'buyer_c: never reads it');
select throws_ok(format('insert into messages (conversation_id, sender_id, body) values (%L, %L, %L)',
                        :'conv', tests.uid('buyer_c'), 'Bonjour'),
                 '42501', null, 'buyer_c: never writes in it');
\set who buyer_d
\ir _as.psql
select throws_ok('select admin_advisor_conversations()', '42501', null,
                 'buyer_d: never reads the inbox of the team');
\set who anon
\ir _as.psql
select throws_ok('select admin_advisor_conversations()', '42501', null,
                 'anon: closed to visitors');
select throws_ok(format($$select ai_advisor_handoff(%L, 'toolu_x', 'contact_advisor', %L, 'Une question')$$,
                        :'ai_b', :'paid'), '42501', null,
                 'anon: never hands a question over');
select throws_ok('select * from conversation_summaries()', '42501', null,
                 'anon: no conversation list');
select throws_ok(format('select * from conversation_senders(%L)', :'conv'), '42501', null,
                 'anon: never reads the authors of a thread');

-- The team -----------------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select count(*)::int from notifications
            where profile_id = tests.uid('admin')
              and type = 'advisor.message_from_client' and data->>'conversation_id' = :'conv'
              and email_after is not null), 1,
          'admin: told of the message of the seller, by email too');
select is((select unread from admin_advisor_conversations() where id = :'conv'), true,
          'admin: unread in the shared inbox');
select advisor_unread as unread0 from admin_counts() \gset
select ok(:unread0 >= 1, 'admin: counted in the sidebar of the back office');
select lives_ok(format('insert into messages (conversation_id, sender_id, body) values (%L, %L, %L)',
                       :'conv', tests.uid('admin'), 'Bonjour Alice, je regarde votre prix.'),
                'admin: answers in the name of the team');
select is((select unread from admin_advisor_conversations() where id = :'conv'), false,
          'admin: answered, read for the team');
select is((select advisor_unread from admin_counts()), :unread0 - 1,
          'admin: no longer counted once answered');
select is((select count(*)::int from notifications
            where type = 'advisor.message_from_client' and data->>'conversation_id' = :'conv'
              and read_at is null), 0,
          'admin: the notification of the team is read once answered');

\set who seller_a
\ir _as.psql
select is((select count(*)::int from notifications
            where type = 'advisor.message' and data->>'conversation_id' = :'conv'), 1,
          'seller_a: told of the answer of the team');
select is((select first_name from conversation_senders(:'conv') where sender_id = tests.uid('admin')),
          'Cédric', 'seller_a: reads the first name of the admin who answered');
insert into ai_conversations (profile_id, context) values (tests.uid('seller_a'), 'seller')
returning id as ai_a \gset
select throws_ok(format($$select ai_advisor_handoff(%L, 'toolu_1', 'contact_advisor', %L, 'Une question')$$,
                        :'ai_b', :'paid'), '42501', null,
                 'seller_a: never through the assistant conversation of another account');
select is(ai_advisor_handoff(:'ai_a', 'toolu_1', 'contact_advisor', :'paid',
                             'Question de l''assistant : faut-il baisser le prix ?'),
          :'conv'::uuid, 'seller_a: hands a question over through the assistant, once confirmed');
select is((select count(*)::int from messages
            where conversation_id = :'conv' and kind = 'assistant_handoff'
              and sender_id = tests.uid('seller_a') and body like 'Question de l''assistant%'),
          1, 'seller_a: the question in the conversation, as a handoff of the assistant');
select is((select content->'result'->>'sent' from ai_messages
            where conversation_id = :'ai_a' and content->>'tool_use_id' = 'toolu_1'), 'true',
          'seller_a: the result of the tool in the log of the assistant');
select throws_ok(format($$select ai_advisor_handoff(%L, 'toolu_1', 'contact_advisor', %L, 'Encore')$$,
                        :'ai_a', :'paid'), '23505', null,
                 'seller_a: a confirmed call is answered once');
select throws_ok(format($$select ai_advisor_handoff(%L, 'toolu_2', 'contact_advisor', %L, 'Une question')$$,
                        :'ai_a', :'free'), '22023', null,
                 'seller_a: no handoff without the adviser in the plan');
select throws_ok(format($$select ai_advisor_handoff(%L, 'toolu_3', 'update_listing_price', %L, 'Une question')$$,
                        :'ai_a', :'paid'), '22023', null,
                 'seller_a: a handoff only as the tool contact_advisor');

-- A refund closes it ---------------------------------------------------------------
reset role;
update subscriptions set refunded_at = now() where id = :'sub';
\set who seller_a
\ir _as.psql
select throws_ok(format('insert into messages (conversation_id, sender_id, body) values (%L, %L, %L)',
                        :'conv', tests.uid('seller_a'), 'Toujours là ?'),
                 '42501', null, 'seller_a: a refunded plan closes the conversation');
select ok((select closed_at is not null from conversation_summaries() where id = :'conv'),
          'seller_a: said closed in the list');
\set who admin
\ir _as.psql
select throws_ok(format('insert into messages (conversation_id, sender_id, body) values (%L, %L, %L)',
                        :'conv', tests.uid('admin'), 'Bonjour'),
                 '42501', null, 'admin: the team no longer writes in it either');
select ok((select closed_at is not null from admin_advisor_conversations() where id = :'conv'),
          'admin: said closed in the shared inbox');

select * from finish();
rollback;
