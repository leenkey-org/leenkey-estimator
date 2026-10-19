-- L1-14b: a listing sent for review, online or paused changes from the page
-- of its property and stays as it is (SPEC-V2 8.3): characteristics, photos,
-- price, title, description. Not its address once sent (only the admin
-- corrects it), nothing once sold. A draft or a rejected listing still
-- changes its address (step 1). Fixtures in postal code 99993: the file
-- passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(23);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '5 rue des Retouches', '99993', 'Retoucheville', 61, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3401, 48.6802), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Appartement à retoucher', 'Description.', 25000000)
returning id as listing \gset
select lives_ok(format($$update properties set address_line = '7 rue des Retouches' where id = %L$$, :'prop'),
                'seller_a: changes the address of a draft (step 1)');
select listing_submit(:'listing') \gset

-- ===========================================================================
-- In review: everything but the address
-- ===========================================================================
update properties set surface_m2 = 63, bedrooms = 2 where id = :'prop';
select ok((select surface_m2 = 63 and bedrooms = 2 from properties where id = :'prop'),
          'seller_a: changes the characteristics of a listing in review');
update listings set price_cents = 24500000, description = 'Description revue.' where id = :'listing';
select is((select array[price_cents::text, description, status::text] from listings where id = :'listing'),
          array['24500000', 'Description revue.', 'pending'],
          'seller_a: and its price and description; it stays in review');
select gen_random_uuid() as f1 \gset
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('photos', %L, %L)$$,
                       :'prop' || '/' || :'f1' || '-400.webp', tests.uid('seller_a')),
                'seller_a: uploads the file of a photo while it is in review');
select lives_ok(format($$insert into photos (property_id, storage_path) values (%L, %L)$$,
                       :'prop', :'prop' || '/' || :'f1'),
                'seller_a: and adds its photo');
select throws_ok(format($$update properties set address_line = '9 rue des Retouches' where id = %L$$, :'prop'),
                 '42501', null, 'seller_a: not the address of a listing in review');

-- ===========================================================================
-- Online: it stays online
-- ===========================================================================
\set who admin
\ir _as.psql
select listing_publish(:'listing') \gset
\set who seller_a
\ir _as.psql
update listings set price_cents = 23900000, title = 'Appartement retouché' where id = :'listing';
select is((select array[price_cents::text, title, status::text] from listings where id = :'listing'),
          array['23900000', 'Appartement retouché', 'published'],
          'seller_a: changes the price and the title of its listing online, which stays online');
update properties set rooms = 4 where id = :'prop';
select ok((select rooms = 4 from properties where id = :'prop'),
          'seller_a: and its characteristics');
select gen_random_uuid() as f2 \gset
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('photos', %L, %L)$$,
                       :'prop' || '/' || :'f2' || '-400.webp', tests.uid('seller_a')),
                'seller_a: uploads the file of a photo of its listing online');
select lives_ok(format($$insert into photos (property_id, storage_path) values (%L, %L)$$,
                       :'prop', :'prop' || '/' || :'f2'),
                'seller_a: and adds its photo');
select throws_ok(format($$update properties set city = 'Ailleurs' where id = %L$$, :'prop'),
                 '42501', null, 'seller_a: not the commune of a listing online');
select throws_ok(format($$update properties
                            set location = extensions.st_setsrid(extensions.st_makepoint(2.36, 48.69), 4326)::extensions.geography
                          where id = %L$$, :'prop'),
                 '42501', null, 'seller_a: nor its point');
select lives_ok(format($$update properties set address_line = address_line, city = city where id = %L$$, :'prop'),
                'seller_a: an update that keeps the address passes');
\set who seller_b
\ir _as.psql
update listings set price_cents = 100 where id = :'listing';
\set who seller_a
\ir _as.psql
select is((select price_cents from listings where id = :'listing'), 23900000::bigint,
          'seller_b: changes nothing of the listing of seller_a');
\set who anon
\ir _as.psql
select is((select count(*) from public_listing_photos(array[:'listing']::uuid[]))::int, 2,
          'anon: the photos added in review and online are public');
\set who admin
\ir _as.psql
select lives_ok(format($$update properties set address_line = '11 rue des Retouches' where id = %L$$, :'prop'),
                'admin: corrects the address of a listing online');
select is((select address_line from properties where id = :'prop'), '11 rue des Retouches',
          'admin: the address is corrected');

-- ===========================================================================
-- Paused: the same; sold: nothing more
-- ===========================================================================
\set who seller_a
\ir _as.psql
select listing_pause(:'listing') \gset
select gen_random_uuid() as f3 \gset
insert into storage.objects (bucket_id, name, owner)
values ('photos', :'prop' || '/' || :'f3' || '-400.webp', tests.uid('seller_a'));
select lives_ok(format($$insert into photos (property_id, storage_path) values (%L, %L)$$,
                       :'prop', :'prop' || '/' || :'f3'),
                'seller_a: adds a photo to its paused listing');
update listings set description = 'En pause, retouchée.' where id = :'listing';
select is((select array[description, status::text] from listings where id = :'listing'),
          array['En pause, retouchée.', 'paused'],
          'seller_a: changes its description, which stays paused');
select listing_mark_sold(:'listing') \gset
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('photos', %L, %L)$$,
                        :'prop' || '/' || gen_random_uuid() || '-400.webp', tests.uid('seller_a')),
                 '42501', null, 'seller_a: uploads nothing for a sold listing');
select throws_ok(format($$insert into photos (property_id, storage_path) values (%L, %L)$$,
                        :'prop', :'prop' || '/' || gen_random_uuid()),
                 '42501', null, 'seller_a: adds no photo to it');
select throws_ok(format($$update properties set postal_code = '99992' where id = %L$$, :'prop'),
                 '42501', null, 'seller_a: nor changes its address');

-- ===========================================================================
-- Rejected: back to the creation, its address changes again
-- ===========================================================================
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'maison', '2 allée des Refus', '99993', 'Retoucheville', 95, 5)
returning id as prop_r \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_r', 'Maison à revoir', 'Description.', 31000000)
returning id as listing_r \gset
select listing_submit(:'listing_r') \gset
\set who admin
\ir _as.psql
select listing_reject(:'listing_r', 'Adresse à vérifier') \gset
\set who seller_a
\ir _as.psql
select lives_ok(format($$update properties set address_line = '4 allée des Refus' where id = %L$$, :'prop_r'),
                'seller_a: changes the address of a rejected listing (step 1)');

select * from finish();
rollback;
