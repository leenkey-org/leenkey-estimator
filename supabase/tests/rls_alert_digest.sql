-- L3-06: the daily digest of the alerts (SPEC-V2 16). The two queues are for
-- the service role only; an alert is due when it is active and its buyer
-- neither closed, nor suspended, nor without the emails of the alerts; a
-- listing sold is told to the buyers who followed it and keep an active
-- alert, once (alert_similar_sent, read by the admin only, written by no
-- client). The alerts of a buyer are claimed together or not at all.
-- Fixtures in 99995.
begin;
\ir _helpers.psql
select plan(43);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '5 rue des Alertes', '99995', 'Alerteville', 90, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.41, 48.76), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison aux alertes', 'Description.', 30000000)
returning id as listing \gset
\o /dev/null
select tests.dpe(:'listing');
select listing_submit(:'listing');
\o
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing');
\o

-- buyer_c follows the listing and keeps an alert; buyer_d follows it without any alert.
\set who buyer_c
\ir _as.psql
\o /dev/null
select conversation_open(:'listing', 'Bonjour, le bien est-il disponible ?');
\o
insert into alerts (buyer_id, name, criteria)
values (tests.uid('buyer_c'), 'Alerteville', '{"location": "alerteville"}')
returning id as alert_c \gset
\set who buyer_d
\ir _as.psql
\o /dev/null
select conversation_open(:'listing', 'Bonjour, puis-je visiter ?');
\o

-- The queues: the service role only -------------------------------------------------
\set who anon
\ir _as.psql
select throws_ok('select * from alert_digest_queue()', '42501', null, 'anon: never reads the alerts due');
select throws_ok('select * from alert_similar_queue()', '42501', null, 'anon: never reads the buyers of a listing sold');
select throws_ok(format($$insert into alert_similar_sent (buyer_id, listing_id, listings_count) values (%L, %L, 1)$$, tests.uid('buyer_c'), :'listing'),
                 '42501', null, 'anon: writes nothing in what was told');
select throws_ok('update alert_similar_sent set listings_count = 0', '42501', null, 'anon: changes nothing of it');
select throws_ok('delete from alert_similar_sent', '42501', null, 'anon: deletes nothing of it');
\set who buyer_c
\ir _as.psql
select throws_ok('select * from alert_digest_queue()', '42501', null, 'buyer_c: never reads the alerts due');
select throws_ok('select * from alert_similar_queue()', '42501', null, 'buyer_c: never reads the buyers of a listing sold');
select throws_ok(format($$select alert_digest_claim(array[%L]::uuid[], array[null]::timestamptz[], now())$$, :'alert_c'),
                 '42501', null, 'buyer_c: never dates an alert as the digest does');
select throws_ok(format($$select alert_digest_release(array[%L]::uuid[], array[null]::timestamptz[], now())$$, :'alert_c'),
                 '42501', null, 'buyer_c: nor gives it back');
select throws_ok(format($$insert into alert_similar_sent (buyer_id, listing_id, listings_count) values (%L, %L, 1)$$, tests.uid('buyer_c'), :'listing'),
                 '42501', null, 'buyer_c: writes nothing in what was told');
select throws_ok('update alert_similar_sent set listings_count = 0', '42501', null, 'buyer_c: changes nothing of it');
select throws_ok('delete from alert_similar_sent', '42501', null, 'buyer_c: deletes nothing of it');
\set who admin
\ir _as.psql
select throws_ok('select * from alert_digest_queue()', '42501', null, 'admin: not through the API either');
select throws_ok(format($$insert into alert_similar_sent (buyer_id, listing_id, listings_count) values (%L, %L, 1)$$, tests.uid('buyer_c'), :'listing'),
                 '42501', null, 'admin: reads what was told, writes nothing in it');

-- The alerts due --------------------------------------------------------------------
reset role;
select is((select row(q.name, q.email, q.last_sent_at is null, q.since = a.created_at)::text
             from alert_digest_queue() q join alerts a on a.id = q.alert_id where q.alert_id = :'alert_c'),
          '(Alerteville,buyer_c@rls.leenkey.test,t,t)',
          'digest: an active alert is due, read from its creation, with the address of its buyer');
update alerts set last_sent_at = now() - interval '1 day' where id = :'alert_c';
select is((select q.since = a.last_sent_at from alert_digest_queue() q join alerts a on a.id = q.alert_id where q.alert_id = :'alert_c'),
          true, 'digest: then read from its last digest');
update alerts set active = false where id = :'alert_c';
select is((select count(*)::int from alert_digest_queue() where alert_id = :'alert_c'), 0, 'digest: a paused alert is not due');
update alerts set active = true where id = :'alert_c';
update profiles set notification_prefs = notification_prefs || '{"email_alerts": false}' where id = tests.uid('buyer_c');
select is((select count(*)::int from alert_digest_queue() where alert_id = :'alert_c'), 0, 'digest: none with the emails of the alerts off');
update profiles set notification_prefs = notification_prefs || '{"email_alerts": true}', suspended_at = now() where id = tests.uid('buyer_c');
select is((select count(*)::int from alert_digest_queue() where alert_id = :'alert_c'), 0, 'digest: none for a suspended account');
update profiles set suspended_at = null, deleted_at = now() where id = tests.uid('buyer_c');
select is((select count(*)::int from alert_digest_queue() where alert_id = :'alert_c'), 0, 'digest: none for a closed account');
update profiles set deleted_at = null where id = tests.uid('buyer_c');

-- The claim: all the alerts of a buyer, or none -------------------------------------
insert into alerts (buyer_id, name, criteria) values (tests.uid('buyer_c'), 'Seconde', '{"type": "maison"}')
returning id as alert_c2 \gset
select last_sent_at as read_c from alerts where id = :'alert_c' \gset
select is((select alert_digest_claim(array[:'alert_c', :'alert_c2']::uuid[], array[null, null]::timestamptz[], '2026-11-21 05:00+00')),
          false, 'claim: refused when one alert is no longer as it was read');
select is((select count(*)::int from alerts where id in (:'alert_c', :'alert_c2') and last_sent_at = '2026-11-21 05:00+00'), 0,
          'claim: then none of them is dated');
select is((select alert_digest_claim(array[:'alert_c', :'alert_c2']::uuid[], array[:'read_c', null]::timestamptz[], '2026-11-21 05:00+00')),
          true, 'claim: taken when every alert is as it was read (one never sent)');
select is((select count(*)::int from alerts where id in (:'alert_c', :'alert_c2') and last_sent_at = '2026-11-21 05:00+00'), 2,
          'claim: both are dated');
select is((select alert_digest_claim(array[:'alert_c', :'alert_c2']::uuid[], array[:'read_c', null]::timestamptz[], '2026-11-21 05:10+00')),
          false, 'claim: a second run finds them taken');
select is((select alert_digest_release(array[:'alert_c', :'alert_c2']::uuid[], array[:'read_c', null]::timestamptz[], '2026-11-21 05:00+00')),
          2, 'release: both are given back');
select is((select array_agg(last_sent_at is not distinct from r.read_at order by r.ord)
             from unnest(array[:'alert_c', :'alert_c2']::uuid[], array[:'read_c', null]::timestamptz[]) with ordinality as r(id, read_at, ord)
             join alerts a on a.id = r.id),
          array[true, true], 'release: each with the date it had');
delete from alerts where id = :'alert_c2';

-- Similar listings after a sale -----------------------------------------------------
select is((select count(*)::int from alert_similar_queue() where listing_id = :'listing'), 0, 'similar: nothing while the listing is online');
\set who seller_a
\ir _as.psql
\o /dev/null
select listing_mark_sold(:'listing');
\o
reset role;
select is((select array_agg(email order by email) from alert_similar_queue() where listing_id = :'listing'),
          array['buyer_c@rls.leenkey.test'],
          'similar: the buyer who followed the listing and keeps an active alert; never the one without an alert');
select is((select row(title, city, price_cents, rooms)::text from alert_similar_queue() where listing_id = :'listing'),
          '("Maison aux alertes",Alerteville,30000000,4)', 'similar: with the public facts of the listing sold');
update alerts set active = false where id = :'alert_c';
select is((select count(*)::int from alert_similar_queue() where listing_id = :'listing'), 0, 'similar: none once the alert is paused');
update alerts set active = true where id = :'alert_c';
update profiles set deleted_at = now() where id = tests.uid('buyer_c');
select is((select count(*)::int from alert_similar_queue() where listing_id = :'listing'), 0, 'similar: none for a closed account');
update profiles set deleted_at = null where id = tests.uid('buyer_c');

-- The offer branch, and who is left out: seller_b sent an offer without any
-- conversation; buyer_d has an alert now, and the accepted offer; the owner
-- has an alert and a conversation written for the test.
insert into alerts (buyer_id, name, criteria) values
  (tests.uid('seller_b'), 'Alerte de B', '{"type": "maison"}'),
  (tests.uid('buyer_d'), 'Alerte de D', '{"type": "maison"}'),
  (tests.uid('seller_a'), 'Alerte de A', '{"type": "maison"}');
set local session_replication_role = replica;
insert into offers (reference, listing_id, buyer_id, seller_id, status, submitted_at,
                    price_cents, price_in_words, financing_mode, validity_until, visited) values
  ('LK-9995-00001', :'listing', tests.uid('seller_b'), tests.uid('seller_a'), 'submitted', now(),
   29000000, 'deux cent quatre-vingt-dix mille euros', 'no_loan', now() + interval '7 days', true),
  ('LK-9995-00002', :'listing', tests.uid('buyer_d'), tests.uid('seller_a'), 'accepted', now(),
   30000000, 'trois cent mille euros', 'no_loan', now() + interval '7 days', true);
insert into conversations (kind, property_id, listing_id, seller_id, buyer_id)
values ('listing', :'prop', :'listing', tests.uid('seller_a'), tests.uid('seller_a'));
select is((select array_agg(email order by email) from alert_similar_queue() where listing_id = :'listing'),
          array['buyer_c@rls.leenkey.test', 'seller_b@rls.leenkey.test'],
          'similar: a buyer who sent an offer without a conversation too');
select is((select count(*)::int from alert_similar_queue() where listing_id = :'listing' and buyer_id = tests.uid('buyer_d')), 0,
          'similar: never the buyer whose offer was accepted');
select is((select count(*)::int from alert_similar_queue() where listing_id = :'listing' and buyer_id = tests.uid('seller_a')), 0,
          'similar: never the owner of the property');
update offers set status = 'draft' where listing_id = :'listing' and buyer_id = tests.uid('seller_b');
select is((select count(*)::int from alert_similar_queue() where listing_id = :'listing' and buyer_id = tests.uid('seller_b')), 0,
          'similar: an offer never sent does not count');
update listings set sold_at = now() - interval '8 days' where id = :'listing';
select is((select count(*)::int from alert_similar_queue() where listing_id = :'listing'), 0, 'similar: none for a listing sold more than 7 days ago');
update listings set sold_at = now() - interval '6 days', deleted_at = now() where id = :'listing';
select is((select count(*)::int from alert_similar_queue() where listing_id = :'listing'), 0, 'similar: none for a deleted listing');
update listings set deleted_at = null where id = :'listing';
set local session_replication_role = origin;
select is((select array_agg(email order by email) from alert_similar_queue() where listing_id = :'listing'),
          array['buyer_c@rls.leenkey.test'], 'similar: within 7 days, the buyer is still to tell');
insert into alert_similar_sent (buyer_id, listing_id, listings_count) values (tests.uid('buyer_c'), :'listing', 2);
select is((select count(*)::int from alert_similar_queue() where listing_id = :'listing'), 0, 'similar: once per buyer and listing sold');
select throws_ok(format($$insert into alert_similar_sent (buyer_id, listing_id, listings_count) values (%L, %L, 1)$$, tests.uid('buyer_c'), :'listing'),
                 '23505', null, 'similar: a second claim is refused');

-- What was told: the admin only -----------------------------------------------------
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from alert_similar_sent), 0, 'buyer_c: does not read what was told');
\set who admin
\ir _as.psql
select is((select count(*)::int from alert_similar_sent where listing_id = :'listing'), 1, 'admin: reads it');

select * from finish();
rollback;
