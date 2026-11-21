-- L3-06: the daily digest of the alerts (SPEC-V2 16). The two queues are for
-- the service role only; an alert is due when it is active and its buyer
-- neither closed, nor suspended, nor without the emails of the alerts; a
-- listing sold is told to the buyers who followed it and keep an active
-- alert, once (alert_similar_sent, read by the admin only). Fixtures in 99995.
begin;
\ir _helpers.psql
select plan(17);
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
\set who buyer_c
\ir _as.psql
select throws_ok('select * from alert_digest_queue()', '42501', null, 'buyer_c: never reads the alerts due');
select throws_ok('select * from alert_similar_queue()', '42501', null, 'buyer_c: never reads the buyers of a listing sold');
\set who admin
\ir _as.psql
select throws_ok('select * from alert_digest_queue()', '42501', null, 'admin: not through the API either');

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
update profiles set suspended_at = null where id = tests.uid('buyer_c');

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
