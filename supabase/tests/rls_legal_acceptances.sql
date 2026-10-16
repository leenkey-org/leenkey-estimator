-- L1-09: legal_acceptances (CGU and privacy policy accepted at signup, dated
-- and versioned), legal_accept().
begin;
\ir _helpers.psql
select plan(33);
\ir _plan.psql

-- Signup trigger -----------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-4000-a000-0000000000e1', 'legal1@rls.leenkey.test',
   '{"role":"buyer","legal":{"cgu":"2026-10-16","privacy":"2026-10-16"}}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e2', 'legal2@rls.leenkey.test',
   '{"role":"seller","legal":{"cgu":"v1","privacy":"2026-10-16","cgv":"2026-10-16"}}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e3', 'legal3@rls.leenkey.test',
   '{"role":"seller","legal":"yes"}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e4', 'legal4@rls.leenkey.test',
   '{"role":"buyer","legal":{"cgu":"2099-01-01","privacy":"2026-02-31"}}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e5', 'legal5@rls.leenkey.test',
   '{"role":"buyer","legal":{"cgu":"2026-06-28","privacy":"2026-10-16"}}', 'authenticated', 'authenticated');

select is((select string_agg(document || ' ' || version || ' ' || context, ', ' order by document)
           from legal_acceptances where profile_id = '00000000-0000-4000-a000-0000000000e1'),
          'cgu 2026-10-16 signup, privacy 2026-10-16 signup', 'signup: CGU and privacy recorded with their version');
select ok((select bool_and(accepted_at = now()) from legal_acceptances
           where profile_id = '00000000-0000-4000-a000-0000000000e1'), 'signup: accepted at the time of the signup');
select is((select string_agg(document, ', ') from legal_acceptances
           where profile_id = '00000000-0000-4000-a000-0000000000e2'),
          'privacy', 'signup: an invalid version and the CGV are ignored');
select is((select count(*) from legal_acceptances where profile_id = '00000000-0000-4000-a000-0000000000e3')::int, 0,
          'signup: malformed acceptances are ignored, the account is created');
select ok(exists (select 1 from profiles where id = '00000000-0000-4000-a000-0000000000e3'), 'signup: profile created anyway');
select is((select count(*) from legal_acceptances where profile_id = '00000000-0000-4000-a000-0000000000e4')::int, 0,
          'signup: a version dated in the future or an impossible date is ignored');
select is((select string_agg(document || ' ' || version, ', ' order by document)
           from legal_acceptances where profile_id = '00000000-0000-4000-a000-0000000000e5'),
          'cgu 2026-06-28, privacy 2026-10-16', 'signup: the current versions of the site are recorded');
select is((select count(*) from legal_acceptances where profile_id = tests.uid('seller_a'))::int, 0,
          'signup without acceptances: nothing recorded');

-- Anonymous ----------------------------------------------------------------
\set who anon
\ir _as.psql
select throws_ok('select count(*) from legal_acceptances', '42501', null, 'anon: no access to legal_acceptances');
select throws_ok($$select legal_accept('{"cgu":"2026-10-16"}')$$, '42501', null, 'anon: cannot call legal_accept');

-- Seller A -----------------------------------------------------------------
\set who seller_a
\ir _as.psql
select lives_ok($$select legal_accept('{"cgu":"2026-10-16","privacy":"2026-10-16"}')$$, 'seller_a: accepts the CGU and the privacy policy');
select is((select string_agg(document || ' ' || context, ', ' order by document) from legal_acceptances),
          'cgu update, privacy update', 'seller_a: an acceptance on /conditions has the update context');
select lives_ok($$select legal_accept('{"cgu":"2026-10-15"}')$$, 'seller_a: accepts another CGU version');
select is((select context from legal_acceptances where document = 'cgu' and version = '2026-10-15'),
          'update', 'seller_a: the other version has the update context');
select lives_ok($$select legal_accept('{"cgu":"2026-10-16","privacy":"2026-10-16"}')$$, 'seller_a: accepts the same versions again');
select is((select count(*) from legal_acceptances)::int, 3, 'seller_a: the same version is recorded once, reads only own acceptances');
select throws_ok($$select legal_accept('{"cgu":"2099-01-01"}')$$, '22023', null, 'seller_a: a version dated in the future is refused');
select throws_ok($$select legal_accept('{"privacy":"2026-02-31"}')$$, '22023', null, 'seller_a: an impossible date is refused');
select throws_ok($$select legal_accept('{"cgv":"2026-10-16"}')$$, '22023', null, 'seller_a: the CGV are not accepted here');
select throws_ok($$select legal_accept('{"cgu":"latest"}')$$, '22023', null, 'seller_a: a malformed version is refused');
select throws_ok($$select legal_accept('{}')$$, '22023', null, 'seller_a: an empty acceptance is refused');
select throws_ok(format($$insert into legal_acceptances (profile_id, document, version, context)
                          values (%L, 'cgu', '2026-10-16', 'signup')$$, tests.uid('seller_a')),
                 '42501', null, 'seller_a: cannot insert directly');
select throws_ok($$update legal_acceptances set version = '2020-01-01'$$, '42501', null, 'seller_a: cannot change an acceptance');
select throws_ok($$delete from legal_acceptances$$, '42501', null, 'seller_a: cannot delete an acceptance');
select throws_ok(format($$select legal_record_signup(%L, '{"cgu":"2026-10-16"}')$$, tests.uid('seller_b')),
                 '42501', null, 'seller_a: cannot record acceptances for someone else');

-- Seller B -----------------------------------------------------------------
\set who seller_b
\ir _as.psql
select is((select count(*) from legal_acceptances where profile_id = tests.uid('seller_a'))::int, 0,
          'seller_b: cannot read seller_a acceptances');
select is((select count(*) from legal_acceptances)::int, 0, 'seller_b: has accepted nothing yet');

-- Buyers -------------------------------------------------------------------
\set who buyer_c
\ir _as.psql
select is((select count(*) from legal_acceptances)::int, 0, 'buyer_c: reads no one else''s acceptances');
select lives_ok($$select legal_accept('{"cgu":"2026-06-28","privacy":"2026-10-16"}')$$, 'buyer_c: accepts the current versions');
select is((select count(*) from legal_acceptances where profile_id = tests.uid('buyer_c'))::int, 2, 'buyer_c: reads own acceptances');
\set who buyer_d
\ir _as.psql
select is((select count(*) from legal_acceptances)::int, 0, 'buyer_d: cannot read buyer_c acceptances');

-- Admin --------------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select count(*) from legal_acceptances where profile_id = tests.uid('seller_a'))::int, 3,
          'admin: reads seller_a acceptances');
select is((select count(*) from legal_acceptances where profile_id::text like '00000000-0000-4000-a000-%')::int, 10,
          'admin: reads all acceptances');

select * from finish();
rollback;
