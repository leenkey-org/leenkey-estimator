-- Analyses of value without an account are deleted after 12 months
-- (privacy policy of 2026-11-09); the purge is open to nobody, and keeps the
-- recent ones, those taken by an account and those used for a property.
begin;
\ir _helpers.psql
select plan(9);
\ir _plan.psql

reset role;
insert into estimations (input, result, created_at) values ('{}', '{}', now() - interval '13 months')
returning id as old_anon \gset
insert into estimations (input, result, created_at) values ('{}', '{}', now() - interval '11 months')
returning id as recent_anon \gset
insert into estimations (profile_id, input, result, created_at)
values (tests.uid('seller_a'), '{}', '{}', now() - interval '13 months')
returning id as old_claimed \gset

\set who anon
\ir _as.psql
select throws_ok('select estimations_purge()', '42501', null, 'anon: never purges');
\set who seller_a
\ir _as.psql
select throws_ok('select estimations_purge()', '42501', null, 'seller_a: never purges');
\set who seller_b
\ir _as.psql
select throws_ok('select estimations_purge()', '42501', null, 'seller_b: never purges');
\set who buyer_c
\ir _as.psql
select throws_ok('select estimations_purge()', '42501', null, 'buyer_c: never purges');
\set who buyer_d
\ir _as.psql
select throws_ok('select estimations_purge()', '42501', null, 'buyer_d: never purges');
\set who admin
\ir _as.psql
select throws_ok('select estimations_purge()', '42501', null, 'admin: never purges by hand');

reset role;
select estimations_purge();
select ok(not exists (select 1 from estimations where id = :'old_anon'),
          'purge: an analysis without an account is deleted after 12 months');
select ok(exists (select 1 from estimations where id = :'recent_anon'),
          'purge: a recent analysis without an account stays');
select ok(exists (select 1 from estimations where id = :'old_claimed'),
          'purge: an analysis taken by an account stays');

select * from finish();
rollback;
