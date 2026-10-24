-- L1-22: notifications written by the database from its events (a message,
-- a listing sent for review, published, to correct), read and marked read by
-- their recipient only, never written by a client; the email queue of the
-- cron, its functions closed to the users; Realtime publication.
begin;
\ir _helpers.psql
select plan(47);
\ir _plan.psql

-- seller_a: a listing sent for review, then published by the team; seller_b:
-- one sent and rejected.
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

\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as prop_b \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_b', 'Maison 5 pièces', 'Jardin.', 42000000)
returning id as listing_b \gset
\o /dev/null
select listing_submit(:'listing_b');
\o

-- ===========================================================================
-- A listing sent for review: to the team, its email planned
-- ===========================================================================
reset role;
select is((select count(*) from notifications
            where profile_id = tests.uid('admin') and type = 'listing.pending')::int, 2,
          'the team gets « listing.pending » for each listing sent');
select ok((select email_after is not null and 'email' = any(channels) and group_key = 'listings:review'
             from notifications
            where profile_id = tests.uid('admin') and type = 'listing.pending'
              and data->>'listing_id' = :'listing_a'),
          'its email is planned, grouped with the other listings to review');
select is((select data->>'reference' is not null and data->>'city' = 'Savigny-sur-Orge'
                    and data->>'seller_first_name' = 'Alice'
             from notifications
            where profile_id = tests.uid('admin') and data->>'listing_id' = :'listing_a'), true,
          'its data: reference and town of the listing, first name of the seller');
select is((select link from notifications
            where profile_id = tests.uid('admin') and data->>'listing_id' = :'listing_a'),
          '/admin/annonces/' || :'listing_a', 'its link: the listing in the back office');
select is((select count(*) from notifications where profile_id = tests.uid('seller_a'))::int, 0,
          'nothing to the seller who sends it');

\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing_a');
select listing_reject(:'listing_b', 'Ajoutez les charges et l''étage.');
\o

reset role;
select is((select count(*) from notifications
            where profile_id = tests.uid('seller_a') and type = 'listing.published')::int, 1,
          'published after its review: « listing.published » to its seller');
select is((select email_after from notifications
            where profile_id = tests.uid('seller_a') and type = 'listing.published'), null,
          'without a queued email: it leaves with the decision (L1-19)');
select is((select data->>'reason' from notifications
            where profile_id = tests.uid('seller_b') and type = 'listing.rejected'),
          'Ajoutez les charges et l''étage.', 'to correct: « listing.rejected » with its reason');
select is((select count(*) from notifications
            where profile_id = tests.uid('admin') and type = 'listing.pending' and read_at is null)::int, 0,
          'reviewed: the notifications of the team are read, their email never leaves');

-- ===========================================================================
-- A message: to the other party only, its email in 5 minutes
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select conversation_open(:'listing_a', 'Bonjour, est-il toujours disponible ?') as conv \gset

reset role;
select is((select count(*) from notifications
            where profile_id = tests.uid('seller_a') and type = 'message.new')::int, 1,
          'a message of buyer_c: « message.new » to seller_a');
select is((select count(*) from notifications
            where profile_id = tests.uid('buyer_c') and type = 'message.new')::int, 0,
          'nothing to its sender');
select is((select data->>'sender_first_name' || ' / ' || (data->>'excerpt')
             from notifications where profile_id = tests.uid('seller_a') and type = 'message.new'),
          'Chloé / Bonjour, est-il toujours disponible ?', 'its data: first name of the sender, excerpt');
select is((select link || ' ' || group_key from notifications
            where profile_id = tests.uid('seller_a') and type = 'message.new'),
          '/messages/' || :'conv' || ' conversation:' || :'conv',
          'its link and its group: the conversation');
select ok((select email_after between now() + interval '4 minutes' and now() + interval '6 minutes'
             from notifications where profile_id = tests.uid('seller_a') and type = 'message.new'),
          'its email waits 5 minutes');

-- A long message: an excerpt of 140 characters, said truncated.
\set who buyer_c
\ir _as.psql
\o /dev/null
select conversation_open(:'listing_a', repeat('Très lumineux. ', 20));
\o
reset role;
select is((select char_length(data->>'excerpt') || ' ' || (data->>'truncated')
             from notifications where profile_id = tests.uid('seller_a') and type = 'message.new'
              and data->>'excerpt' like 'Très lumineux.%'),
          '140 true', 'a long message: 140 characters, truncated');

-- An old message (imported, seed): in the bell, never an email.
insert into messages (conversation_id, sender_id, body, created_at)
values (:'conv', tests.uid('buyer_c'), 'Message ancien', now() - interval '2 hours');
select is((select email_after from notifications
            where profile_id = tests.uid('seller_a') and data->>'excerpt' = 'Message ancien'), null,
          'a message of two hours ago: no email');
select is((select created_at from notifications
            where profile_id = tests.uid('seller_a') and data->>'excerpt' = 'Message ancien'),
          now() - interval '2 hours', 'dated as the message');

-- A system message: no notification (its own types, L2 and L3).
insert into messages (conversation_id, sender_id, body, kind)
values (:'conv', tests.uid('buyer_c'), 'Visite proposée', 'system');
select is((select count(*) from notifications where data->>'excerpt' = 'Visite proposée')::int, 0,
          'a system message: no notification');

-- The seller replies: to buyer_c. One transaction, one now(): the reading of
-- buyer_c, when they sent, is dated a minute earlier.
update conversations set buyer_last_read_at = now() - interval '1 minute' where id = :'conv';
\set who seller_a
\ir _as.psql
insert into messages (conversation_id, sender_id, body)
values (:'conv', tests.uid('seller_a'), 'Oui, toujours.');
reset role;
select is((select count(*) from notifications
            where profile_id = tests.uid('buyer_c') and type = 'message.new')::int, 1,
          'the reply of seller_a: « message.new » to buyer_c');

-- Reading the conversation reads its notifications up to then.
\set who seller_a
\ir _as.psql
\o /dev/null
select conversation_mark_read(:'conv');
\o
reset role;
select is((select count(*) from notifications
            where profile_id = tests.uid('seller_a') and type = 'message.new' and read_at is null)::int, 0,
          'seller_a reads the conversation: its message notifications are read');
select is((select count(*) from notifications
            where profile_id = tests.uid('buyer_c') and type = 'message.new' and read_at is null)::int, 1,
          'not those of buyer_c');

-- ===========================================================================
-- Reading and marking read: the recipient only
-- ===========================================================================
\set who anon
\ir _as.psql
select throws_ok('select count(*) from notifications', '42501', null, 'anon: no notifications');

\set who buyer_d
\ir _as.psql
select is((select count(*) from notifications)::int, 0, 'buyer_d: none of the others');

\set who buyer_c
\ir _as.psql
select is((select count(*) from notifications where profile_id <> tests.uid('buyer_c'))::int, 0,
          'buyer_c: only theirs');
select is((select count(*) from notifications where profile_id = tests.uid('buyer_c'))::int, 1,
          'buyer_c: reads theirs');
select lives_ok($$update notifications set read_at = now() where profile_id = tests.uid('buyer_c')$$,
                'buyer_c: marks theirs read');
select is((select count(*) from notifications where profile_id = tests.uid('buyer_c') and read_at is null)::int, 0,
          'they are read');
select throws_ok($$update notifications set data = '{}' where profile_id = tests.uid('buyer_c')$$,
                 '42501', null, 'buyer_c: cannot change their data');
select throws_ok($$update notifications set link = 'https://example.com' where profile_id = tests.uid('buyer_c')$$,
                 '42501', null, 'buyer_c: cannot change their link');
select throws_ok($$update notifications set email_after = null where profile_id = tests.uid('buyer_c')$$,
                 '42501', null, 'buyer_c: cannot change their email');
select throws_ok(format($$insert into notifications (profile_id, type, title) values (%L, 'message.new', 'Hameçon')$$,
                        tests.uid('seller_a')),
                 '42501', null, 'buyer_c: cannot write a notification, not even to seller_a');
select throws_ok('delete from notifications', '42501', null, 'buyer_c: cannot delete one');

\set who seller_a
\ir _as.psql
update notifications set read_at = now() where profile_id = tests.uid('seller_b');
reset role;
select is((select count(*) from notifications
            where profile_id = tests.uid('seller_b') and read_at is not null)::int, 0,
          'seller_a: cannot mark those of seller_b read');

\set who admin
\ir _as.psql
select ok((select count(*) from notifications where profile_id = tests.uid('seller_a')) > 0,
          'admin: reads them (back office)');
update notifications set read_at = now() where profile_id = tests.uid('seller_a') and read_at is null;
reset role;
select ok((select count(*) from notifications
            where profile_id = tests.uid('seller_a') and read_at is null) > 0,
          'admin: cannot mark those of a seller read (their email would never leave)');

-- ===========================================================================
-- The functions of the server only
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$select notification_add(%L, 'message.new', '{}', '/messages')$$, tests.uid('buyer_c')),
                 '42501', null, 'seller_a: cannot call notification_add');
select throws_ok('select * from notification_email_queue()', '42501', null,
                 'seller_a: cannot read the email queue');
select throws_ok($$select cron_call('/api/cron/send-notification-emails')$$, '42501', null,
                 'seller_a: cannot call a cron job');
reset role;
select throws_ok($$select cron_call('@hote-tiers.example/x')$$, '22023', null,
                 'a job calls a route of the site only: the secret never leaves for another host');
select throws_ok(format($$select notification_add(%L, 'x', '{}', '//hote-tiers.example')$$, tests.uid('buyer_c')),
                 '23514', null, 'a notification leads inside the site only');
select is(has_function_privilege('service_role', 'public.cron_call(text)', 'execute'), false,
          'cron_call: the job of pg_cron only, not the service role');
\set who seller_a
\ir _as.psql

\set who admin
\ir _as.psql
select throws_ok('select * from notification_email_queue()', '42501', null,
                 'admin: the email queue is the cron''s (service role)');

-- ===========================================================================
-- The email queue of the cron
-- ===========================================================================
reset role;
update notifications set email_after = now() - interval '1 minute'
 where profile_id = tests.uid('seller_a') and type = 'message.new' and data->>'excerpt' like 'Bonjour%';
select is((select count(*) from notification_email_queue() q where q.profile_id = tests.uid('seller_a'))::int, 1,
          'a planned email that is due is in the queue');
select is((select q.email || ' ' || q.first_name || ' ' || (q.prefs->>'email_messages') || ' ' || q.active
             from notification_email_queue() q where q.profile_id = tests.uid('seller_a')),
          'seller_a@rls.leenkey.test Alice true true', 'with its recipient, their preferences, their account open');
update notifications set email_sent_at = now() - interval '3 minutes'
 where profile_id = tests.uid('seller_a') and type = 'message.new' and data->>'excerpt' like 'Très%';
select ok((select q.group_last_sent_at is not null from notification_email_queue() q
            where q.profile_id = tests.uid('seller_a')),
          'and the last email of its group');
select is((select count(*) from notification_email_queue() q where q.profile_id = tests.uid('buyer_c'))::int, 0,
          'an email planned for later is not in the queue yet');

-- ===========================================================================
-- Realtime
-- ===========================================================================
select ok(not exists (select 1 from pg_publication where pubname = 'supabase_realtime')
          or exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public'
                        and tablename = 'notifications'),
          'notifications are published to Realtime');

select * from finish();
rollback;
