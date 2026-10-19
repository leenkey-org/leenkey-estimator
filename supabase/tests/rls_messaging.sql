-- L1-21: the first message opens the conversation (atomically), the summaries
-- of a participant, the anti-abuse limits, Realtime publication.
begin;
\ir _helpers.psql
select plan(34);
\ir _plan.psql

-- seller_a: a published listing with a cover photo; seller_b: a published
-- listing and a draft.
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
insert into photos (property_id, storage_path)
values (:'prop_a', :'prop_a' || '/' || gen_random_uuid())
returning storage_path as cover_a \gset

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
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '5 allée des Tilleuls', '91200', 'Athis-Mons', 90, 4)
returning id as prop_draft \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_draft', 'Maison 4 pièces', 'Brouillon.', 39000000)
returning id as listing_draft \gset

\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing_a');
select listing_publish(:'listing_b');
\o

-- ===========================================================================
-- The first message opens the conversation
-- ===========================================================================
\set who anon
\ir _as.psql
select throws_ok(format($$select conversation_open(%L, 'Bonjour')$$, :'listing_a'),
                 '42501', null, 'anon: cannot open a conversation');
select throws_ok('select * from conversation_summaries()', '42501', null,
                 'anon: cannot read conversation summaries');

\set who buyer_c
\ir _as.psql
select conversation_open(:'listing_a', 'Bonjour, est-il toujours disponible ?') as conv \gset
select ok(:'conv' <> '', 'buyer_c: the first message opens the conversation');
select is((select count(*) from messages where conversation_id = :'conv')::int, 1,
          'the conversation holds the first message');
select is(conversation_open(:'listing_a', 'Et la cave ?'), :'conv'::uuid,
          'a second message on the same listing goes to the same conversation');
select is((select count(*) from messages where conversation_id = :'conv')::int, 2,
          'the message is added to it');
-- One transaction, one now(): the first message is dated two minutes earlier.
reset role;
update messages set created_at = now() - interval '2 minutes'
 where conversation_id = :'conv' and body = 'Bonjour, est-il toujours disponible ?';
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select conversation_open(%L, 'Bonjour')$$, :'listing_draft'),
                 '22023', null, 'buyer_c: no conversation on an unpublished listing');
select throws_ok(format($$select conversation_open(%L, '')$$, :'listing_b'),
                 '23514', null, 'buyer_c: an empty message is refused');
select is((select count(*) from conversations where listing_id = :'listing_b')::int, 0,
          'a refused first message leaves no empty conversation');

\set who seller_a
\ir _as.psql
select throws_ok(format($$select conversation_open(%L, 'Bonjour')$$, :'listing_a'),
                 '22023', null, 'seller_a: cannot open a conversation on their own listing');

-- ===========================================================================
-- Summaries: the other party, the property, unread, financing for the seller
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is((select count(*) from conversation_summaries())::int, 1, 'buyer_c: one conversation');
select is((select role || '/' || counterpart_first_name || '/' || listing_title from conversation_summaries()),
          'buyer/Alice/Appartement 3 pièces', 'buyer_c: the seller first name and the listing');
select ok((select buyer_financing_status is null from conversation_summaries()),
          'buyer_c: no financing status on the buyer side');
select ok((select last_message_mine and not unread from conversation_summaries()),
          'buyer_c: their own last message is not unread');
select is((select cover_path from conversation_summaries()), :'cover_a',
          'buyer_c: the cover photo of a published listing');

\set who seller_a
\ir _as.psql
select is((select role || '/' || counterpart_first_name from conversation_summaries()),
          'seller/Chloé', 'seller_a: the buyer first name');
select is((select buyer_financing_status::text from conversation_summaries()), 'not_provided',
          'seller_a: the financing status of the buyer (never amounts)');
select ok((select unread and not last_message_mine from conversation_summaries()),
          'seller_a: the buyer message is unread');
select is((select last_message_body from conversation_summaries()), 'Et la cave ?',
          'seller_a: the last message');
select lives_ok(format($$select conversation_mark_read(%L)$$, :'conv'), 'seller_a: opens the conversation');
select ok((select not unread from conversation_summaries()), 'seller_a: read once opened');
select lives_ok(format($$insert into messages (conversation_id, sender_id, body)
                         values (%L, tests.uid('seller_a'), 'Oui, la cave est comprise.')$$, :'conv'),
                'seller_a: replies');
-- One transaction, one now(): the reply is dated a minute later, as it
-- would be in real use.
reset role;
update messages set created_at = now() + interval '1 minute'
 where conversation_id = :'conv' and sender_id = tests.uid('seller_a');
update conversations set last_message_at = now() + interval '1 minute' where id = :'conv';
\set who seller_a
\ir _as.psql
select is((select count(*) from conversation_summaries(gen_random_uuid()))::int, 0,
          'seller_a: an unknown conversation gives nothing');
select lives_ok(format($$select listing_pause(%L)$$, :'listing_a'), 'seller_a: pauses the listing');
select is((select cover_path from conversation_summaries(:'conv'::uuid)), :'cover_a',
          'seller_a: the cover photo of their paused listing');

\set who buyer_c
\ir _as.psql
select ok((select unread from conversation_summaries(:'conv'::uuid)), 'buyer_c: the reply is unread');
select ok((select cover_path is null from conversation_summaries(:'conv'::uuid)),
          'buyer_c: no cover photo once the listing is paused (the photo route no longer serves it)');

\set who seller_a
\ir _as.psql
\o /dev/null
select listing_resume(:'listing_a');
\o

\set who seller_b
\ir _as.psql
select is((select count(*) from conversation_summaries())::int, 0, 'seller_b: no access to the conversation');
\set who buyer_d
\ir _as.psql
select is((select count(*) from conversation_summaries())::int, 0, 'buyer_d: no access to the conversation');

-- ===========================================================================
-- Anti-abuse: 20 messages an hour per sender
-- ===========================================================================
\set who buyer_c
\ir _as.psql
do $$
begin
  for i in 1..18 loop
    insert into public.messages (conversation_id, sender_id, body)
    select id, auth.uid(), 'Message ' || i from public.conversations where buyer_id = auth.uid() limit 1;
  end loop;
end;
$$;
select is((select count(*) from messages where sender_id = tests.uid('buyer_c'))::int, 20,
          'buyer_c: 20 messages in the hour');
select throws_ok(format($$insert into messages (conversation_id, sender_id, body)
                          values (%L, tests.uid('buyer_c'), 'Un de trop')$$, :'conv'),
                 '54000', 'messages_per_hour', 'buyer_c: the 21st message of the hour is refused');

-- ===========================================================================
-- Anti-abuse: 5 new conversations a day per buyer; a known one stays open
-- ===========================================================================
\set who buyer_d
\ir _as.psql
select conversation_open(:'listing_b', 'Bonjour, le jardin est-il clos ?') as conv_d \gset
reset role;
-- Four more conversations of buyer_d today (on listings made here), through
-- the limit trigger: auth.uid() is still buyer_d.
with p as (
  insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
  select tests.uid('seller_b'), 'maison', n || ' rue du Test', '91200', 'Athis-Mons', 80, 4
  from generate_series(1, 4) n
  returning id
), l as (
  insert into listings (property_id, title, description, price_cents)
  select id, 'Maison test', 'Test.', 30000000 from p
  returning id, property_id
)
insert into conversations (kind, property_id, listing_id, seller_id, buyer_id)
select 'listing', property_id, id, tests.uid('seller_b'), tests.uid('buyer_d') from l;
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select conversation_open(%L, 'Bonjour')$$, :'listing_a'),
                 '54000', 'conversations_per_day', 'buyer_d: a 6th new conversation of the day is refused');
select is(conversation_open(:'listing_b', 'Et la toiture ?'), :'conv_d'::uuid,
          'buyer_d: a conversation already open takes new messages');

-- ===========================================================================
-- Realtime
-- ===========================================================================
reset role;
select ok(not exists (select 1 from pg_publication where pubname = 'supabase_realtime')
          or (select count(*) from pg_publication_tables
              where pubname = 'supabase_realtime' and schemaname = 'public'
                and tablename in ('messages', 'conversations')) = 2,
          'messages and conversations are published to Realtime');

select * from finish();
rollback;
