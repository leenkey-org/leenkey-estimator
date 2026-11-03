-- L1-30a: the dashboard and the users of the back office. Every function is
-- the admin's only (a visitor, a seller and a buyer are refused); the admin
-- reads what waits for them (a listing to review and the oldest one, an open
-- case, an open report), the plans sold and the sign-ups of the last days,
-- the accounts with their search and filters, and the email of one account;
-- never an account of the team in the sign-ups, never a deleted account; an
-- account of the team is never suspended, a decision on an account already
-- in that state is refused.
begin;
\ir _helpers.psql
select plan(42);
\ir _plan.psql

-- The plans of the seed (reference data, absent from a bare database).
insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils pour vendre vous-même.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Vous vendez. Nous vous accompagnons.', 99000, 'Accompagné', '{}', 2),
  ('serenite', 'Sérénité', 'Nous pilotons avec vous.', 150000, 'Sérénité', '{}', 3)
on conflict (code) do nothing;

-- Out of the way: what the seed or a previous test left (the rest is counted
-- before, the seed may hold listings to review and plans sold).
delete from reports;
delete from case_notes;
delete from cases;
select count(*)::int as pending0 from listings where status = 'pending' and deleted_at is null \gset
select count(*)::int as sold0, coalesce(sum(amount_paid_cents), 0)::bigint as amount0
  from subscriptions
 where activated_at >= now() - interval '30 days' and amount_paid_cents > 0 and refunded_at is null \gset

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '12 rue de la Gare', '91600', 'Savigny-sur-Orge', 68, 3)
returning id as prop_a \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_a', 'Appartement 3 pièces', 'Proche gare.', 35000000)
returning id as listing_a \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as prop_p \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_p', 'Maison 5 pièces', 'Jardin.', 42000000)
returning id as listing_p \gset
\o /dev/null
select listing_submit(:'listing_a');
select listing_submit(:'listing_p');
\o

\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing_a');
\o

\set who buyer_c
\ir _as.psql
select conversation_open(:'listing_a', 'Bonjour') as conv \gset
insert into reports (conversation_id, reporter_id, reason)
values (:'conv', tests.uid('buyer_c'), 'Messages insistants.');

reset role;
-- A paid plan on the property (written by the webhook, L1-26), an older one
-- out of the period, a refunded one; a case opened for the seller.
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop_a', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '2 days');
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, refunded_at)
values (:'prop_a', tests.uid('seller_a'), 'serenite', 150000, now() - interval '1 day', now());
insert into cases (property_id, profile_id, source, status, subject)
values (:'prop_a', tests.uid('seller_a'), 'manual', 'new', 'Question sur le diagnostic');
insert into cases (profile_id, source, status, subject)
values (tests.uid('buyer_c'), 'manual', 'closed', 'Traité');
update listings set submitted_at = now() - interval '30 hours' where id = :'listing_p';

-- Everyone but the admin is refused --------------------------------------------
\set who anon
\ir _as.psql
select throws_ok('select * from admin_counts()', '42501', null, 'anon: no counters of the back office');
select throws_ok('select * from admin_users()', '42501', null, 'anon: no list of the accounts');
select throws_ok(format('select * from admin_user_contact(%L)', tests.uid('seller_a')), '42501', null,
                 'anon: no email of an account');
select throws_ok('select * from admin_activity()', '42501', null, 'anon: no activity of the site');
select throws_ok('select * from admin_user_counts()', '42501', null, 'anon: no count of the accounts');

\set who seller_a
\ir _as.psql
select throws_ok('select * from admin_counts()', '42501', null, 'seller_a: no counters of the back office');
select throws_ok('select * from admin_activity()', '42501', null, 'seller_a: no activity of the site');
select throws_ok('select * from admin_users()', '42501', null, 'seller_a: no list of the accounts');
select throws_ok('select * from admin_user_counts()', '42501', null, 'seller_a: no count of the accounts');
select throws_ok(format('select * from admin_user_contact(%L)', tests.uid('buyer_c')), '42501', null,
                 'seller_a: no email of another account');

\set who buyer_c
\ir _as.psql
select throws_ok('select * from admin_counts()', '42501', null, 'buyer_c: no counters of the back office');
select throws_ok('select * from admin_users(''buyer'')', '42501', null, 'buyer_c: no list of the accounts');

\set who seller_b
\ir _as.psql
select throws_ok('select * from admin_activity(7)', '42501', null, 'seller_b: no activity of the site');

\set who buyer_d
\ir _as.psql
select throws_ok('select * from admin_user_counts()', '42501', null, 'buyer_d: no count of the accounts');

-- The admin --------------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select listings_pending from admin_counts()), :pending0 + 1, 'admin: one more listing to review');
select ok((select listings_oldest_submitted_at < now() - interval '1 day' from admin_counts()),
          'admin: the oldest listing to review, waiting for more than 24 h');
select is((select cases_open from admin_counts()), 1, 'admin: one open case, the closed one left out');
select is((select reports_open from admin_counts()), 1, 'admin: one open report');

select is((select row(plans_sold, plans_amount_cents)::text from admin_activity(30)),
          format('(%s,%s)', :sold0 + 1, :amount0 + 99000),
          'admin: one more plan sold in 30 days, the refunded one left out');
select is((select plans_sold from admin_activity(1)), 0, 'admin: none sold in the last day');
select ok((select signups_sellers >= 2 and signups_buyers >= 2 from admin_activity(30)),
          'admin: the sign-ups of the period, sellers and buyers');
select signups_sellers as sellers0 from admin_activity(30) \gset
select throws_ok('select * from admin_activity(0)', '22023', null, 'admin: a period of at least one day');

select ok((select count(*) >= 5 from admin_users()), 'admin: every account');
select is((select array_agg(first_name order by first_name) from admin_users(p_query => 'rls.leenkey.test')
            where first_name in ('Alice', 'Chloé')), '{Alice,Chloé}'::text[],
          'admin: search on the email');
select ok((select count(*) >= 1 and bool_and(first_name = 'Alice') from admin_users(p_query => 'ALICE')),
          'admin: search on the name, any case');
select is((select row(properties, paid_plan)::text from admin_users(p_query => 'seller_a@rls')),
          '(2,accompagne)', 'admin: the properties and the paid plan in force');
select ok((select bool_and('buyer' = any(roles)) from admin_users('buyer')), 'admin: the buyers only');
select is((select count(*)::int from admin_users(p_query => '%')), 0,
          'admin: a % in the search is a character, not a wildcard');
select is((select count(*)::int from admin_users(p_query => 'seller_a@rls_leenkey')), 0,
          'admin: a _ in the search is a character, not a wildcard');
select throws_ok('select * from admin_users(''proprietaire'')', '22023', null, 'admin: an unknown filter is refused');

select lives_ok(format('select admin_suspend_user(%L, %L)', tests.uid('buyer_d'), 'Comportement abusif'),
                'admin: suspends an account');
select ok((select bool_or(email = 'buyer_d@rls.leenkey.test') and bool_and(suspended_at is not null)
             from admin_users('suspended')), 'admin: the suspended accounts only');
select is((select email from admin_user_contact(tests.uid('buyer_c'))), 'buyer_c@rls.leenkey.test',
          'admin: the email of an account');
select throws_ok(format('select admin_suspend_user(%L, %L)', tests.uid('buyer_d'), 'Encore'), '22023', null,
                 'admin: an account already suspended is refused (no new date, motive nor email)');
select lives_ok(format('select admin_unsuspend_user(%L)', tests.uid('buyer_d')), 'admin: lifts the suspension');
select throws_ok(format('select admin_unsuspend_user(%L)', tests.uid('buyer_c')), '22023', null,
                 'admin: an account not suspended is refused (no false « réactivé » in the history)');
select is((select array_agg(action order by created_at, id) from audit_log
            where entity = 'profile' and entity_id = tests.uid('buyer_d')),
          '{user.suspend,user.unsuspend}'::text[], 'admin: one decision each in the history');
select throws_ok(format('select admin_suspend_user(%L, %L)', tests.uid('admin'), 'Essai'), '22023', null,
                 'admin: never suspends themselves');

-- The team: never in the sign-ups, never suspended.
reset role;
update profiles set roles = '{admin,seller}' where id = tests.uid('admin');
update profiles set roles = '{seller,admin}' where id = tests.uid('seller_b');
\set who admin
\ir _as.psql
select is((select signups_sellers from admin_activity(30)), :sellers0 - 1,
          'admin: an account of the team that also sells is not a seller sign-up');
select throws_ok(format('select admin_suspend_user(%L, %L)', tests.uid('seller_b'), 'Comportement abusif'),
                 '22023', null, 'admin: another account of the team is never suspended');

-- A deleted account: out of the list, no email.
reset role;
update profiles set deleted_at = now() where id = tests.uid('buyer_c');
\set who admin
\ir _as.psql
select is((select count(*)::int from admin_users(p_query => 'buyer_c@rls')), 0,
          'admin: a deleted account is out of the list');
select is((select count(*)::int from admin_user_contact(tests.uid('buyer_c'))), 0,
          'admin: no email of a deleted account');

select * from finish();
rollback;
