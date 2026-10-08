-- L1-03: profiles, buyer_profiles, signup trigger, profile_add_role.
begin;
\ir _helpers.psql
select plan(32);
\ir _plan.psql

-- Signup trigger -----------------------------------------------------------
select is((select roles from profiles where id = tests.uid('seller_a')), '{seller}'::user_role[], 'signup: seller role from metadata');
select is((select roles from profiles where id = tests.uid('buyer_c')), '{buyer}'::user_role[], 'signup: buyer role from metadata');
select ok(exists (select 1 from buyer_profiles where profile_id = tests.uid('buyer_c')), 'signup: buyer_profiles row created for a buyer');
select ok(not exists (select 1 from buyer_profiles where profile_id = tests.uid('seller_a')), 'signup: no buyer_profiles row for a seller');
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values ('00000000-0000-4000-a000-0000000000ee', 'evil@test.leenkey.fr', '{"role":"admin"}', 'authenticated', 'authenticated');
select is((select roles from profiles where id = '00000000-0000-4000-a000-0000000000ee'), '{}'::user_role[], 'signup: admin role in metadata is ignored');

-- Anonymous ----------------------------------------------------------------
\set who anon
\ir _as.psql
select throws_ok('select count(*) from profiles', '42501', null, 'anon: no access to profiles');
select throws_ok('select count(*) from buyer_profiles', '42501', null, 'anon: no access to buyer_profiles');
select throws_ok($$select profile_add_role('buyer')$$, '42501', null, 'anon: cannot call profile_add_role');

-- Seller A -----------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is((select count(*) from profiles)::int, 1, 'seller_a: sees exactly one profile');
select is((select id from profiles), tests.uid('seller_a'), 'seller_a: the profile is their own');
select is((select count(*) from buyer_profiles)::int, 0, 'seller_a: sees no buyer profile');
select lives_ok($$update profiles set first_name = 'Alice B.', notification_prefs = '{"email_messages":false,"email_offers":true,"email_alerts":true}' where id = tests.uid('seller_a')$$, 'seller_a: edits own identity and preferences');
select throws_ok($$update profiles set roles = '{seller,admin}' where id = tests.uid('seller_a')$$, '42501', null, 'seller_a: cannot edit own roles');
select throws_ok($$update profiles set suspended_at = null, ai_messages_today = 0 where id = tests.uid('seller_a')$$, '42501', null, 'seller_a: cannot edit suspension or quota');
select throws_ok($$update profiles set deleted_at = now() where id = tests.uid('seller_a')$$, '42501', null, 'seller_a: cannot set deleted_at directly');
update profiles set first_name = 'Hacked' where id = tests.uid('seller_b');
select throws_ok($$insert into profiles (id) values (gen_random_uuid())$$, '42501', null, 'seller_a: cannot insert a profile');
select throws_ok($$delete from profiles where id = tests.uid('seller_a')$$, '42501', null, 'seller_a: cannot delete a profile');
select throws_ok($$select profile_add_role('admin')$$, '42501', null, 'seller_a: cannot self-grant admin');
select is(profile_add_role('buyer'), '{seller,buyer}'::user_role[], 'seller_a: adds the buyer role');
select is((select count(*) from buyer_profiles)::int, 1, 'seller_a: buyer profile created with the role');

-- Buyer C ------------------------------------------------------------------
\set who buyer_c
\ir _as.psql
select is((select count(*) from profiles)::int, 1, 'buyer_c: sees exactly one profile');
select is((select count(*) from buyer_profiles)::int, 1, 'buyer_c: sees only own buyer profile');
select lives_ok($$update buyer_profiles set project = 'residence_principale', budget_max_cents = 35000000, down_payment_cents = 7000000, loan_needed = true, situation_note = 'CDI, primo-accédant' where profile_id = tests.uid('buyer_c')$$, 'buyer_c: edits own buyer profile');
select is((select financing_status from buyer_profiles where profile_id = tests.uid('buyer_c')), 'declared'::financing_status, 'buyer_c: complete declaration sets status declared');
select throws_ok($$update buyer_profiles set financing_status = 'document_checked' where profile_id = tests.uid('buyer_c')$$, '42501', null, 'buyer_c: cannot set financing_status');
select throws_ok($$update buyer_profiles set situation_note = repeat('x', 281) where profile_id = tests.uid('buyer_c')$$, '23514', null, 'buyer_c: situation_note limited to 280 characters');
update buyer_profiles set budget_max_cents = 1 where profile_id = tests.uid('buyer_d');

-- Buyer D ------------------------------------------------------------------
\set who buyer_d
\ir _as.psql
select is((select budget_max_cents from buyer_profiles where profile_id = tests.uid('buyer_d')), null, 'buyer_d: own profile untouched by buyer_c');
select is((select count(*) from buyer_profiles where profile_id = tests.uid('buyer_c'))::int, 0, 'buyer_d: cannot read buyer_c');

-- Admin --------------------------------------------------------------------
\set who admin
\ir _as.psql
select ok(is_admin(), 'admin: is_admin() is true');
select is((select count(*) from profiles)::int, 6, 'admin: reads all profiles');
select is((select first_name from profiles where id = tests.uid('seller_b')), 'Bruno', 'seller_b: untouched by seller_a update');
select is((select count(*) from buyer_profiles)::int, 3, 'admin: reads all buyer profiles');

select * from finish();
rollback;
