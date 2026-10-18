-- L1-12: photos of a property. Rows (public.photos): added at the end, 15
-- at most, the first is the cover, reordered by the owner only. Files
-- (storage.objects, bucket photos): uploaded and deleted by the owner of an
-- editable property, under `{property_id}/{uuid}-{size}.webp` only; read by
-- the owner and the admin, by anyone once the listing is published, and then
-- only for a declared photo. Fixtures in postal code 99994: the file passes
-- on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(26);
\ir _plan.psql

\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '9 rue des Photos', '99994', 'Photoville', 90, 4)
returning id as prop_b \gset

-- ===========================================================================
-- seller_a: the photos of a draft
-- ===========================================================================
\set who seller_a
\ir _as.psql
insert into properties (owner_id, address_line, postal_code, city)
values (tests.uid('seller_a'), '1 rue des Photos', '99994', 'Photoville')
returning id as prop_a \gset
select gen_random_uuid() as p1_file, gen_random_uuid() as p2_file, gen_random_uuid() as stray_file \gset

insert into photos (property_id, storage_path, width, height, position, is_cover)
values (:'prop_a', :'prop_a' || '/' || :'p1_file', 1600, 1200, 7, false)
returning id as p1 \gset
select is((select array[position::text, is_cover::text] from photos where id = :'p1'), array['0', 'true'],
          'seller_a: the first photo comes first, as the cover, whatever is sent');
insert into photos (property_id, storage_path, width, height)
values (:'prop_a', :'prop_a' || '/' || :'p2_file', 1600, 1067)
returning id as p2 \gset
select is((select array[position::text, is_cover::text] from photos where id = :'p2'), array['1', 'false'],
          'seller_a: the next one at the end');
select throws_ok(format($$insert into photos (property_id, storage_path) values (%L, %L)$$,
                        :'prop_a', :'prop_a' || '/photo.jpg'),
                 '23514', null, 'a photo is {property_id}/{uuid}');

select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('photos', %L, %L)$$,
                       :'prop_a' || '/' || :'p1_file' || '-400.webp', tests.uid('seller_a')),
                'seller_a: uploads a file of its photo');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('photos', %L, %L)$$,
                        :'prop_a' || '/' || :'p1_file' || '.jpg', tests.uid('seller_a')),
                 '42501', null, 'seller_a: no other name than {uuid}-{400|800|1600}.webp');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('photos', %L, %L)$$,
                        :'prop_b' || '/' || :'p1_file' || '-400.webp', tests.uid('seller_a')),
                 '42501', null, 'seller_a: nothing in the folder of the property of seller_b');
insert into storage.objects (bucket_id, name, owner)
values ('photos', :'prop_a' || '/' || :'stray_file' || '-400.webp', tests.uid('seller_a'));

select lives_ok(format($$select photos_reorder(%L, array[%L, %L]::uuid[])$$, :'prop_a', :'p2', :'p1'),
                'seller_a: reorders the photos');
select is((select array_agg(id::text || ':' || is_cover order by position) from photos where property_id = :'prop_a'),
          array[:'p2' || ':true', :'p1' || ':false'],
          'the first one of the order is the cover');
select throws_ok(format($$select photos_reorder(%L, array[%L]::uuid[])$$, :'prop_a', :'p1'),
                 '22023', null, 'an order lists every photo once');

-- ===========================================================================
-- Everyone else, on the draft
-- ===========================================================================
\set who seller_b
\ir _as.psql
select is((select count(*) from photos where property_id = :'prop_a')::int, 0,
          'seller_b: does not see the photos of seller_a');
select is((select count(*) from storage.objects where bucket_id = 'photos' and name like :'prop_a' || '/%')::int, 0,
          'seller_b: nor their files');
select throws_ok(format($$select photos_reorder(%L, array[%L, %L]::uuid[])$$, :'prop_a', :'p1', :'p2'),
                 '42501', null, 'seller_b: cannot reorder them');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('photos', %L, %L)$$,
                        :'prop_a' || '/' || gen_random_uuid() || '-800.webp', tests.uid('seller_b')),
                 '42501', null, 'seller_b: uploads nothing for seller_a');
\set who buyer_c
\ir _as.psql
select is((select count(*) from storage.objects where bucket_id = 'photos' and name like :'prop_a' || '/%')::int, 0,
          'buyer_c: does not see the files of a draft');
\set who anon
\ir _as.psql
select is((select count(*) from storage.objects where bucket_id = 'photos' and name like :'prop_a' || '/%')::int, 0,
          'anon: does not see the files of a draft');
\set who admin
\ir _as.psql
select is((select count(*) from storage.objects where bucket_id = 'photos' and name like :'prop_a' || '/%')::int, 2,
          'admin: sees the files of the draft');

-- ===========================================================================
-- seller_a: 15 at most, the cover kept
-- ===========================================================================
\set who seller_a
\ir _as.psql
insert into photos (property_id, storage_path)
select :'prop_a', :'prop_a' || '/' || gen_random_uuid() from generate_series(1, 13);
select is((select count(*) from photos where property_id = :'prop_a')::int, 15, 'seller_a: 15 photos');
select throws_ok(format($$insert into photos (property_id, storage_path) values (%L, %L)$$,
                        :'prop_a', :'prop_a' || '/' || gen_random_uuid()),
                 '23514', null, 'seller_a: not a 16th');
delete from photos where id = :'p2';
select is((select id from photos where property_id = :'prop_a' and is_cover), :'p1'::uuid,
          'seller_a: the cover deleted, the next photo becomes the cover');

-- ===========================================================================
-- Published: the declared photos for everyone
-- ===========================================================================
update properties set type = 'appartement', surface_m2 = 52, rooms = 2 where id = :'prop_a';
insert into listings (property_id, title, description, price_cents)
values (:'prop_a', 'Appartement en photos', 'Description.', 21000000)
returning id as listing_a \gset
select listing_submit(:'listing_a') \gset
\set who admin
\ir _as.psql
select listing_publish(:'listing_a') \gset
\set who anon
\ir _as.psql
select is((select count(*) from storage.objects
            where bucket_id = 'photos' and name = :'prop_a' || '/' || :'p1_file' || '-400.webp')::int, 1,
          'anon: reads the file of a photo of a published listing');
select is((select count(*) from storage.objects
            where bucket_id = 'photos' and name = :'prop_a' || '/' || :'stray_file' || '-400.webp')::int, 0,
          'anon: never a file uploaded without its photo');
select is((select count(*) from public_listing_photos(array[:'listing_a']::uuid[]))::int, 14,
          'anon: the photos of the published listing');
select is((select array[path, total::text] from public_listing_photos(array[:'listing_a']::uuid[], true)),
          array[:'prop_a' || '/' || :'p1_file', '14'],
          'anon: its cover alone for the search, with the number of photos');

-- ===========================================================================
-- Suspended: read-only for the seller
-- ===========================================================================
\set who admin
\ir _as.psql
select listing_suspend(:'listing_a', 'Vérification en cours') \gset
\set who seller_a
\ir _as.psql
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('photos', %L, %L)$$,
                        :'prop_a' || '/' || gen_random_uuid() || '-400.webp', tests.uid('seller_a')),
                 '42501', null, 'seller_a: uploads nothing for a suspended listing');
select throws_ok(format($$select photos_reorder(%L, array[]::uuid[])$$, :'prop_a'),
                 '42501', null, 'seller_a: nor reorders its photos');
\set who anon
\ir _as.psql
select is((select count(*) from public_listing_photos(array[:'listing_a']::uuid[]))::int, 0,
          'anon: no photo of a suspended listing');

select * from finish();
rollback;
