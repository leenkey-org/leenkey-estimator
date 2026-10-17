-- L1-11: a property saved from its address, as a draft (type, surface and
-- rooms come with the second step); its listing cannot be sent for review
-- before they are known. Fixtures in postal code 99995: the file passes on
-- an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(13);
\ir _plan.psql

-- ===========================================================================
-- seller_a: the draft
-- ===========================================================================
\set who seller_a
\ir _as.psql
insert into properties (owner_id, address_line, postal_code, city, location)
values (tests.uid('seller_a'), '3 rue des Brouillons', '99995', 'Brouillonville',
        extensions.st_setsrid(extensions.st_makepoint(2.3301, 48.6702), 4326)::extensions.geography)
returning id as draft \gset
select ok(exists (select 1 from properties
                  where id = :'draft' and type is null and surface_m2 is null and rooms is null),
          'seller_a: saves a property with its address only');
select ok((select public_location is not null from properties where id = :'draft'),
          'the public location is computed from the first step');

-- The listing of an incomplete property (L1-13 creates it after the second step).
insert into listings (property_id, title, description, price_cents)
values (:'draft', 'Bien à compléter', 'Description.', 20000000)
returning id as draft_listing, slug as draft_slug \gset
select matches(:'draft_slug'::text, '^bien-brouillonville-lk[0-9]{4,}$',
               'slug of a property without a type nor rooms');
select throws_ok(format($$select listing_submit(%L)$$, :'draft_listing'), '22023', null,
                 'seller_a: a listing of an incomplete property is not sent for review');
update properties set type = 'appartement', surface_m2 = 48 where id = :'draft';
select throws_ok(format($$select listing_submit(%L)$$, :'draft_listing'), '22023', null,
                 'seller_a: the rooms are still required');
update properties set rooms = 2 where id = :'draft';
select is(listing_submit(:'draft_listing'), 'pending'::listing_status,
          'seller_a: once complete, the listing goes for review');
select throws_ok(format($$update properties set surface_m2 = 0 where id = %L$$, :'draft'), '23514', null,
                 'the values are still checked: no surface of 0');

-- ===========================================================================
-- Everyone else
-- ===========================================================================
\set who seller_b
\ir _as.psql
select is((select count(*) from properties where id = :'draft')::int, 0,
          'seller_b: does not see the draft of seller_a');
update properties set city = 'Ailleurs' where id = :'draft';
select throws_ok($$insert into properties (owner_id, address_line, postal_code, city)
                   values (tests.uid('seller_a'), '1 rue X', '99995', 'Brouillonville')$$,
                 '42501', null, 'seller_b: cannot create a draft for seller_a');
\set who buyer_c
\ir _as.psql
select is((select count(*) from properties where id = :'draft')::int, 0, 'buyer_c: does not see the draft');
\set who anon
\ir _as.psql
select throws_ok($$insert into properties (owner_id, address_line, postal_code, city)
                   values (tests.uid('seller_a'), '1 rue X', '99995', 'Brouillonville')$$,
                 '42501', null, 'anon: cannot create a property');
\set who admin
\ir _as.psql
select is((select city from properties where id = :'draft'), 'Brouillonville',
          'admin: reads the draft, unchanged by seller_b');
select is((select status from listings where id = :'draft_listing'), 'pending'::listing_status,
          'admin: the listing waits for review');

select * from finish();
rollback;
