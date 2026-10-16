-- L1-09: legal_acceptances (CGU and privacy policy accepted at signup, dated
-- and versioned), legal_accept().
begin;
\ir _helpers.psql
select plan(24);
\ir _plan.psql

-- Signup trigger -----------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-4000-a000-0000000000e1', 'legal1@rls.leenkey.test',
   '{"role":"buyer","legal":{"cgu":"2026-10-16","privacy":"2026-10-16"}}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e2', 'legal2@rls.leenkey.test',
   '{"role":"seller","legal":{"cgu":"v1","privacy":"2026-10-16","cgv":"2026-10-16"}}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000e3', 'legal3@rls.leenkey.test',
   '{"role":"seller","legal":"yes"}', 'authenticated', 'authenticated');

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
          'cgu signup, privacy signup', 'seller_a: first acceptance has the signup context');
select lives_ok($$select legal_accept('{"cgu":"2026-11-20"}')$$, 'seller_a: accepts a new CGU version');
select is((select context from legal_acceptances where document = 'cgu' and version = '2026-11-20'),
          'update', 'seller_a: a later acceptance has the update context');
select is((select count(*) from legal_acceptances)::int, 3, 'seller_a: reads only own acceptances');
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

-- Admin --------------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select count(*) from legal_acceptances where profile_id = tests.uid('seller_a'))::int, 3,
          'admin: reads seller_a acceptances');
select is((select count(*) from legal_acceptances where profile_id::text like '00000000-0000-4000-a000-%')::int, 6,
          'admin: reads all acceptances');

select * from finish();
rollback;
