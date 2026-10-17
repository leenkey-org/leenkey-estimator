-- L1-19: back office v0 of the listings. admin_listings, admin_listing_counts
-- and admin_listing_seller_contact answer the admin only. Fixtures live in
-- postal code 99996: every list assertion is scoped to them, so the file
-- passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(34);
\ir _plan.psql

-- ===========================================================================
-- Fixtures, written as the superuser (the transitions are tested elsewhere)
-- ===========================================================================
\set pa '00000000-0000-4000-b000-000000000901'
\set pb '00000000-0000-4000-b000-000000000902'
\set pc '00000000-0000-4000-b000-000000000903'
\set pd '00000000-0000-4000-b000-000000000904'
\set la '00000000-0000-4000-c000-000000000901'
\set lb '00000000-0000-4000-c000-000000000902'
\set lc '00000000-0000-4000-c000-000000000903'
\set ld '00000000-0000-4000-c000-000000000904'

insert into properties (id, owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (:'pa', tests.uid('seller_a'), 'appartement', '1 rue des Tests', '99996', 'Modérationville', 60, 3),
       (:'pb', tests.uid('seller_b'), 'maison', '2 rue des Tests', '99996', 'Modérationville', 110, 5),
       (:'pc', tests.uid('seller_b'), 'appartement', '3 rue des Tests', '99996', 'Modérationville', 45, 2),
       (:'pd', tests.uid('seller_a'), 'appartement', '4 rue des Tests', '99996', 'Modérationville', 50, 2);
insert into listings (id, property_id, title, description, price_cents)
values (:'la', :'pa', 'Annonce à valider', 'Description.', 25000000),
       (:'lb', :'pb', 'Annonce en ligne', 'Description.', 42000000),
       (:'lc', :'pc', 'Annonce suspendue', 'Description.', 19000000),
       (:'ld', :'pd', 'Annonce supprimée', 'Description.', 21000000);
update listings set status = 'pending', submitted_at = now() - interval '2 hours' where id = :'la';
update listings set status = 'published', published_at = now() - interval '3 days' where id = :'lb';
update listings set status = 'suspended', published_at = now() - interval '9 days',
                    suspended_at = now() - interval '1 day', suspension_reason = 'Test'
 where id = :'lc';
update listings set status = 'pending', submitted_at = now(), deleted_at = now() where id = :'ld';
update sale_progress set plan = 'serenite' where property_id = :'pb';
select reference as ref_b from listings where id = :'lb' \gset

-- ===========================================================================
-- admin
-- ===========================================================================
\set who admin
\ir _as.psql
select is((select array_agg(id order by ord) from (
             select id, row_number() over () as ord from admin_listings(null, '99996')) t),
          array[:'la', :'lb', :'lc']::uuid[],
          'admin: every listing of the fixtures, pending first, deleted ones left out');
select is((select count(*) from admin_listings('published', '99996'))::int, 1,
          'admin: filters by status');
select is((select id from admin_listings(null, :'ref_b')), :'lb'::uuid,
          'admin: finds a listing by its reference');
select is((select count(*) from admin_listings(null, 'Bruno') where postal_code = '99996')::int, 2,
          'admin: finds the listings of a seller by name');
select is((select count(*) from admin_listings(null, 'modérationVILLE') where postal_code = '99996')::int, 3,
          'admin: finds the listings of a town, whatever the case');
select is((select count(*) from admin_listings(null, '%') where postal_code = '99996')::int, 0,
          'admin: « % » is searched as a character, not as a wildcard');
select is((select count(*) from admin_listings(null, '_') where postal_code = '99996')::int, 0,
          'admin: « _ » is searched as a character, not as a wildcard');
-- Unescaped, « \a » would be a plain « a », found in every title.
select is((select count(*) from admin_listings(null, '\a') where postal_code = '99996')::int, 0,
          'admin: a backslash is searched as a character, not as an escape');
select is((select count(*) from admin_listings(null, '   '))::int,
          (select count(*) from admin_listings(null, null))::int,
          'admin: a blank search is no search');
select is((select plan from admin_listings(null, :'ref_b')), 'serenite'::plan_code,
          'admin: the plan of the sale');
select is((select plan from admin_listings(null, '99996') where id = :'la'), 'autonomie'::plan_code,
          'admin: Autonomie without a paid plan');
select is((select seller_first_name from admin_listings(null, '99996') where id = :'la'), 'Alice',
          'admin: the first name of the seller');
select is((select count(*) from admin_listings(null, '99996', 1))::int, 1, 'admin: the limit applies');
\o /dev/null
reset role;
select count(*) as pending_now from listings l join properties p on p.id = l.property_id
 where l.status = 'pending' and l.deleted_at is null and p.deleted_at is null \gset
\o
\set who admin
\ir _as.psql
select is((select total from admin_listing_counts() where status = 'pending')::int, :'pending_now'::int,
          'admin: counter of the pending listings, deleted ones left out');
select is((select first_name || ' ' || email from admin_listing_seller_contact(:'la')),
          'Alice seller_a@rls.leenkey.test', 'admin: first name and email of the seller');
select is((select count(*) from admin_listing_seller_contact('00000000-0000-4000-c000-000000000999'))::int, 0,
          'admin: no contact for an unknown listing');

-- ===========================================================================
-- Everyone else: refused
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok($$select * from admin_listings()$$, '42501', null, 'seller_a: cannot list the listings');
select throws_ok($$select * from admin_listing_counts()$$, '42501', null, 'seller_a: cannot count the listings');
select throws_ok(format($$select * from admin_listing_seller_contact(%L)$$, :'la'), '42501', null,
                 'seller_a: cannot read a seller email, not even their own');
\set who seller_b
\ir _as.psql
select throws_ok($$select * from admin_listings()$$, '42501', null, 'seller_b: cannot list the listings');
select throws_ok($$select * from admin_listing_counts()$$, '42501', null, 'seller_b: cannot count the listings');
select throws_ok(format($$select * from admin_listing_seller_contact(%L)$$, :'la'), '42501', null,
                 'seller_b: cannot read the email of seller_a');
\set who buyer_c
\ir _as.psql
select throws_ok($$select * from admin_listings()$$, '42501', null, 'buyer_c: cannot list the listings');
select throws_ok($$select * from admin_listing_counts()$$, '42501', null, 'buyer_c: cannot count the listings');
select throws_ok(format($$select * from admin_listing_seller_contact(%L)$$, :'la'), '42501', null,
                 'buyer_c: cannot read a seller email');
\set who buyer_d
\ir _as.psql
select throws_ok($$select * from admin_listings()$$, '42501', null, 'buyer_d: cannot list the listings');
select throws_ok($$select * from admin_listing_counts()$$, '42501', null, 'buyer_d: cannot count the listings');
select throws_ok(format($$select * from admin_listing_seller_contact(%L)$$, :'la'), '42501', null,
                 'buyer_d: cannot read a seller email');
\set who anon
\ir _as.psql
select throws_ok($$select * from admin_listings()$$, '42501', null, 'anon: cannot list the listings');
select throws_ok($$select * from admin_listing_counts()$$, '42501', null, 'anon: cannot count the listings');
select throws_ok(format($$select * from admin_listing_seller_contact(%L)$$, :'la'), '42501', null,
                 'anon: cannot read a seller email');
-- Refused before any check of the role: the execute right is revoked.
select ok(not has_function_privilege('anon', 'public.admin_listings(public.listing_status, text, int)', 'execute'),
          'anon: no execute right on admin_listings');
select ok(not has_function_privilege('anon', 'public.admin_listing_counts()', 'execute'),
          'anon: no execute right on admin_listing_counts');
select ok(not has_function_privilege('anon', 'public.admin_listing_seller_contact(uuid)', 'execute'),
          'anon: no execute right on admin_listing_seller_contact');

select * from finish();
rollback;
