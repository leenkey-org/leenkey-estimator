-- Limits of requests per address (L1-38): the table is open to nobody, the
-- function counts only with the key of the server (derived from the
-- cron_secret of the Vault), and refuses once the limit of the bucket is
-- passed; a check without counting (sign-in) writes nothing; the counts of
-- past windows are purged, those of the current ones kept.
begin;
\ir _helpers.psql
select plan(27);
\ir _plan.psql

select vault.create_secret('rls-test-cron-secret', 'cron_secret')
 where not exists (select 1 from vault.secrets where name = 'cron_secret');
select encode(extensions.hmac('leenkey:rate-limit:server', decrypted_secret, 'sha256'), 'hex') as key
  from vault.decrypted_secrets where name = 'cron_secret' \gset
select encode(sha256('not-the-key'), 'hex') as forged,
       encode(sha256('address-one'), 'hex') as a1,
       encode(sha256('address-two'), 'hex') as a2,
       encode(sha256('address-three'), 'hex') as a3 \gset
delete from rate_limits;

-- Nobody reads or writes the table -------------------------------------------------
\set who anon
\ir _as.psql
select throws_ok('select count(*) from rate_limits', '42501', null, 'anon: reads no count');
select throws_ok(format($$insert into rate_limits (bucket, key, window_start) values ('signup', %L, now())$$, :'a1'),
                 '42501', null, 'anon: writes no count');
select throws_ok(format('select rate_limit_hit(%L, %L, %L)', :'forged', 'signup', :'a1'),
                 '42501', null, 'anon: never counts without the key of the site');
select throws_ok(format('select rate_limit_server(%L)', :'key'), '42501', null,
                 'anon: the check of the key is not open to it');
select throws_ok('select rate_limits_purge()', '42501', null, 'anon: never purges');
\set who seller_a
\ir _as.psql
select throws_ok('select count(*) from rate_limits', '42501', null, 'seller_a: reads no count');
select throws_ok(format('select rate_limit_hit(%L, %L, %L)', :'forged', 'signin', :'a1'),
                 '42501', null, 'seller_a: never counts without the key of the site');
\set who seller_b
\ir _as.psql
select throws_ok('select count(*) from rate_limits', '42501', null, 'seller_b: reads no count');
\set who buyer_c
\ir _as.psql
select throws_ok('select count(*) from rate_limits', '42501', null, 'buyer_c: reads no count');
\set who buyer_d
\ir _as.psql
select throws_ok('select count(*) from rate_limits', '42501', null, 'buyer_d: reads no count');
\set who admin
\ir _as.psql
select throws_ok('select count(*) from rate_limits', '42501', null, 'admin: reads no count, even the admin');

-- The server of the site (no session) -----------------------------------------------
\set who anon
\ir _as.psql
select throws_ok(format('select rate_limit_hit(%L, %L, %L)', :'key', 'other', :'a1'),
                 '22023', null, 'site: an unknown bucket is refused');
select throws_ok(format('select rate_limit_hit(%L, %L, %L)', :'key', 'signup', 'not-a-hash'),
                 '22023', null, 'site: a key that is not a hash is refused');
select is((select array_agg(ok) from (select rate_limit_hit(:'key', 'signup', :'a1') as ok
                                        from generate_series(1, 5)) x),
          array_fill(true, array[5]), 'signup: 5 in the hour pass');
select ok(not rate_limit_hit(:'key', 'signup', :'a1'), 'signup: the 6th is refused');
select ok(rate_limit_hit(:'key', 'signup', :'a2'), 'signup: another address is not held back');
select ok(rate_limit_hit(:'key', 'contact', :'a1'), 'contact: its own count');
select is((select count(*)::int from (select rate_limit_hit(:'key', 'signin', :'a1') as ok
                                        from generate_series(1, 25)) x where ok), 20,
          'signin: 20 in a quarter of an hour');
select is((select count(*)::int from (select rate_limit_hit(:'key', 'reset', :'a1') as ok
                                        from generate_series(1, 7)) x where ok), 5,
          'reset: 5 in the hour');
select is((select count(*)::int from (select rate_limit_hit(:'key', 'report', :'a1') as ok
                                        from generate_series(1, 7)) x where ok), 5,
          'report: 5 in the hour');
select is((select count(*)::int from (select rate_limit_hit(:'key', 'estimate', :'a1') as ok
                                        from generate_series(1, 22)) x where ok), 20,
          'estimate: 20 in the hour');
select ok(not rate_limit_hit(:'key', 'signin', :'a1', false),
          'signin: checked without counting, an address past its limit is refused');
select ok(rate_limit_hit(:'key', 'signin', :'a3', false),
          'signin: checked without counting, a new address passes');
reset role;
select is((select count(*)::int from rate_limits where key = :'a3'), 0,
          'signin: a check without counting writes nothing');
\ir _as.psql

-- The next window, and the purge ------------------------------------------------------
reset role;
update rate_limits set window_start = window_start - interval '2 hours' where bucket = 'signup';
\ir _as.psql
select ok(rate_limit_hit(:'key', 'signup', :'a1'), 'signup: a new hour starts again');
reset role;
update rate_limits set window_start = now() - interval '2 days' where bucket = 'contact';
select rate_limits_purge();
select is((select count(*)::int from rate_limits where bucket = 'contact'), 0,
          'purge: the counts of past windows are deleted after a day');
select ok((select count(*)::int from rate_limits where bucket = 'reset') > 0,
          'purge: the counts of the current windows are kept');

select * from finish();
rollback;
