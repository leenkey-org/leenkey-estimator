-- L3-01: buyer alerts (SPEC-V2 16, CLAUDE.md 7). A buyer manages their own
-- alerts, 5 at most; nobody else reads them but the admin; last_sent_at is
-- written by the cron only.
begin;
\ir _helpers.psql
select plan(16);
\ir _plan.psql

\set who buyer_c
\ir _as.psql
select throws_ok(format($$insert into alerts (buyer_id, name, criteria) values (%L, 'Pour D', '{}')$$, tests.uid('buyer_d')),
                 '42501', null, 'buyer_c: no alert for another buyer');
select throws_ok(format($$insert into alerts (buyer_id, name, criteria) values (%L, 'Liste', '[]')$$, tests.uid('buyer_c')),
                 '23514', null, 'buyer_c: the criteria are an object');
select throws_ok(format($$insert into alerts (buyer_id, name, criteria) values (%L, '  ', '{}')$$, tests.uid('buyer_c')),
                 '23514', null, 'buyer_c: an alert has a name');
select throws_ok(format($$insert into alerts (buyer_id, name, criteria, last_sent_at) values (%L, 'Date', '{}', now())$$, tests.uid('buyer_c')),
                 '42501', null, 'buyer_c: never writes last_sent_at');
insert into alerts (buyer_id, name, criteria)
select tests.uid('buyer_c'), 'Alerte ' || n, jsonb_build_object('city', 'Lyon', 'rooms_min', n)
  from generate_series(1, 5) n;
select throws_ok(format($$insert into alerts (buyer_id, name, criteria) values (%L, 'Sixième', '{}')$$, tests.uid('buyer_c')),
                 '23514', null, 'buyer_c: five alerts at most');
select is((select count(*)::int from alerts), 5, 'buyer_c: reads its alerts');
select id as alert1 from alerts where name = 'Alerte 1' \gset
select lives_ok(format($$update alerts set active = false, name = 'Lyon 3 pièces' where id = %L$$, :'alert1'),
                'buyer_c: renames and pauses an alert');
select throws_ok(format($$update alerts set last_sent_at = now() where id = %L$$, :'alert1'),
                 '42501', null, 'buyer_c: never moves last_sent_at');
select throws_ok(format($$update alerts set buyer_id = %L where id = %L$$, tests.uid('buyer_d'), :'alert1'),
                 '42501', null, 'buyer_c: never gives an alert to another buyer');

\set who buyer_d
\ir _as.psql
select is((select count(*)::int from alerts), 0, 'buyer_d: reads no alert of buyer_c');
update alerts set name = 'x' where id = :'alert1';
delete from alerts where id = :'alert1';
\set who seller_a
\ir _as.psql
select is((select count(*)::int from alerts), 0, 'seller_a: reads no alert of a buyer');
\set who anon
\ir _as.psql
select throws_ok('select count(*) from alerts', '42501', null, 'anon: no access to the alerts');

\set who admin
\ir _as.psql
select is((select name || '|' || active::text from alerts where id = :'alert1'), 'Lyon 3 pièces|false',
          'admin: reads the alerts; buyer_d changed and deleted nothing');
select is((with u as (select 1 from alerts where buyer_id = tests.uid('buyer_c')) select count(*)::int from u), 5,
          'admin: reads every alert of buyer_c');

\set who buyer_c
\ir _as.psql
delete from alerts where id = :'alert1';
select is((select count(*)::int from alerts), 4, 'buyer_c: deletes its alert');
select lives_ok(format($$insert into alerts (buyer_id, name, criteria) values (%L, 'Nouvelle', '{}')$$, tests.uid('buyer_c')),
                'buyer_c: room again for a fifth alert');

select * from finish();
rollback;
