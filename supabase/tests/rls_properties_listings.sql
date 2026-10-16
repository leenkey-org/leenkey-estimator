-- L1-04: estimations, properties, listings, photos, listing_views, favorites,
-- public_listings, status transitions, audit_log.
begin;
\ir _helpers.psql
select plan(70);
\ir _plan.psql

-- ===========================================================================
-- seller_a: property and draft listing
-- ===========================================================================
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, location, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '12 rue de la Gare', '91600', 'Savigny-sur-Orge',
        extensions.st_setsrid(extensions.st_makepoint(2.3501, 48.6812), 4326)::extensions.geography, 68, 3)
returning id as prop_a \gset
select ok(exists (select 1 from properties where id = :'prop_a'), 'seller_a: creates and reads own property');
select ok((select extensions.st_distance(location, public_location) between 1 and 200
           from properties where id = :'prop_a'), 'public_location is blurred, less than 200 m away');
select throws_ok(format($$insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
                          values (%L, 'maison', '1 rue X', '91000', 'Evry', 90, 4)$$, tests.uid('seller_b')),
                 '42501', null, 'seller_a: cannot create a property for someone else');
select throws_ok($$insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, public_location)
                   values (tests.uid('seller_a'), 'maison', '1 rue X', '91000', 'Evry', 90, 4,
                           extensions.st_setsrid(extensions.st_makepoint(2.0, 48.0), 4326)::extensions.geography)$$,
                 '42501', null, 'seller_a: cannot write public_location');

insert into listings (property_id, title, description, price_cents)
values (:'prop_a', 'Appartement 3 pièces lumineux', 'Proche gare, 2 chambres.', 35000000)
returning id as listing_a, reference as ref_a, slug as slug_a \gset
select matches(:'ref_a'::text, '^LK-[0-9]{4,}$', 'listing reference is LK-NNNN');
select is(:'slug_a'::text, 'appartement-3-pieces-savigny-sur-orge-lk' || substr(:'ref_a'::text, 4), 'slug built from type, rooms, city and reference');
select is((select status from listings where id = :'listing_a'), 'draft'::listing_status, 'new listing is a draft');
select throws_ok(format($$update listings set status = 'published' where id = %L$$, :'listing_a'),
                 '42501', null, 'seller_a: cannot change the status directly');
select throws_ok(format($$update listings set views_count = 999, review = '{}' where id = %L$$, :'listing_a'),
                 '42501', null, 'seller_a: cannot write workflow columns');
select throws_ok(format($$select listing_pause(%L)$$, :'listing_a'), '22023', null, 'seller_a: cannot pause a draft');

-- ===========================================================================
-- seller_b: own draft, no access to seller_a
-- ===========================================================================
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as prop_b \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_b', 'Maison 5 pièces avec jardin', 'Jardin de 400 m².', 42000000)
returning id as listing_b \gset
select is((select count(*) from properties where id = :'prop_a')::int, 0, 'seller_b: cannot read seller_a property');
select is((select count(*) from listings where id = :'listing_a')::int, 0, 'seller_b: cannot read seller_a listing');
update listings set title = 'Annonce piratée' where id = :'listing_a';
select throws_ok(format($$select listing_submit(%L)$$, :'listing_a'), '42501', null, 'seller_b: cannot submit seller_a listing');
select throws_ok(format($$insert into photos (property_id, storage_path, position) values (%L, %L, 0)$$,
                        :'prop_a', :'prop_a' || '/x-800.webp'),
                 '42501', null, 'seller_b: cannot add a photo to seller_a property');

-- ===========================================================================
-- buyer_c and visitors: nothing published yet
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is((select count(*) from properties)::int, 0, 'buyer_c: reads no property');
select is((select count(*) from listings)::int, 0, 'buyer_c: reads no listing table row');

\set who anon
\ir _as.psql
select throws_ok('select count(*) from properties', '42501', null, 'anon: no access to properties');
select throws_ok('select count(*) from listings', '42501', null, 'anon: no access to listings');
select is((select count(*) from public_listings where id = :'listing_a')::int, 0, 'anon: a draft is not in public_listings');
select id as est_id, claim_token as est_token
  from estimation_record('{"type":"maison"}'::jsonb, '{"value":300000}'::jsonb, 30000000, 28000000, 32000000, 'x@example.com') \gset
select ok(char_length(:'est_token') = 48, 'anon: estimation_record returns a claim token');
select throws_ok('select count(*) from estimations', '42501', null, 'anon: cannot read estimations');
select throws_ok(format($$select listing_submit(%L)$$, :'listing_a'), '42501', null, 'anon: cannot call seller functions');

-- ===========================================================================
-- seller_a: estimation, photo, submission
-- ===========================================================================
\set who seller_a
\ir _as.psql
select is(estimation_claim(:'est_token'), :'est_id'::uuid, 'seller_a: claims the estimation');
select throws_ok(format($$select estimation_claim(%L)$$, :'est_token'), '22023', null, 'a claim token works once');
select is((select count(*) from estimations where id = :'est_id')::int, 1, 'seller_a: reads the claimed estimation');
select lives_ok(format($$update properties set estimation_id = %L where id = %L$$, :'est_id', :'prop_a'),
                'seller_a: links the estimation to the property');
select lives_ok(format($$insert into photos (property_id, storage_path, position, is_cover) values (%L, %L, 0, true)$$,
                       :'prop_a', :'prop_a' || '/p1-800.webp'),
                'seller_a: adds a photo');
select throws_ok(format($$insert into photos (property_id, storage_path, position) values (%L, 'elsewhere/p2.webp', 1)$$,
                        :'prop_a'),
                 '23514', null, 'photo path must live under the property folder');
select is(listing_submit(:'listing_a'), 'pending'::listing_status, 'seller_a: submits the listing');
select throws_ok(format($$select listing_publish(%L)$$, :'listing_a'), '42501', null, 'seller_a: cannot publish');

\set who seller_b
\ir _as.psql
select throws_ok(format($$update properties set estimation_id = %L where id = %L$$, :'est_id', :'prop_b'),
                 '42501', null, 'seller_b: cannot link someone else''s estimation');

-- ===========================================================================
-- admin: moderation
-- ===========================================================================
\set who admin
\ir _as.psql
select is((select count(*) from properties where id in (:'prop_a', :'prop_b'))::int, 2, 'admin: reads all properties');
select throws_ok(format($$select listing_publish(%L)$$, :'listing_b'), '22023', null, 'admin: cannot publish a draft');
select throws_ok(format($$select listing_reject(%L, '')$$, :'listing_a'), '22023', null, 'admin: a rejection needs a reason');
select is(listing_publish(:'listing_a'), 'published'::listing_status, 'admin: publishes the listing');
select is((select count(*) from audit_log where action = 'listing.publish' and entity_id = :'listing_a'
           and actor_id = tests.uid('admin'))::int, 1, 'audit_log records the publication');
select is((select title from listings where id = :'listing_a'), 'Appartement 3 pièces lumineux', 'seller_b update had no effect');

-- ===========================================================================
-- visitors on the published listing
-- ===========================================================================
\set who anon
\ir _as.psql
select is((select count(*) from public_listings where slug = :'slug_a')::int, 1, 'anon: sees the published listing');
select ok((select public_lat is not null and public_lng is not null from public_listings where id = :'listing_a'),
          'anon: approximate coordinates are exposed');
select is((select seller_first_name from public_listings where id = :'listing_a'), 'Alice', 'anon: seller first name only');
select hasnt_column('public', 'public_listings', 'address_line', 'public_listings has no address');
select hasnt_column('public', 'public_listings', 'location', 'public_listings has no exact location');
select hasnt_column('public', 'public_listings', 'owner_id', 'public_listings has no owner id');
select hasnt_column('public', 'public_listings', 'review', 'public_listings has no admin review');
select lives_ok(format($$select listing_view_increment(%L)$$, :'listing_a'), 'anon: a view is counted');

-- ===========================================================================
-- favorites
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select lives_ok(format($$insert into favorites (buyer_id, listing_id) values (tests.uid('buyer_c'), %L)$$, :'listing_a'),
                'buyer_c: saves a published listing');
select throws_ok(format($$insert into favorites (buyer_id, listing_id) values (tests.uid('buyer_c'), %L)$$, :'listing_b'),
                 '42501', null, 'buyer_c: cannot save an unpublished listing');
select is((select count(*) from favorites)::int, 1, 'buyer_c: reads own favorites');

\set who buyer_d
\ir _as.psql
select is((select count(*) from favorites)::int, 0, 'buyer_d: cannot read buyer_c favorites');
select is((select count(*) from audit_log)::int, 0, 'buyer_d: cannot read the audit log');
select throws_ok(format($$insert into favorites (buyer_id, listing_id) values (tests.uid('buyer_c'), %L)$$, :'listing_a'),
                 '42501', null, 'buyer_d: cannot write a favorite for buyer_c');

-- ===========================================================================
-- suspension: read-only for the seller, lifted by the admin only
-- ===========================================================================
\set who admin
\ir _as.psql
select throws_ok(format($$select listing_suspend(%L, ' ')$$, :'listing_a'), '22023', null, 'admin: a suspension needs a reason');
select is(listing_suspend(:'listing_a', 'Photos trompeuses'), 'suspended'::listing_status, 'admin: suspends the listing');

\set who seller_a
\ir _as.psql
select throws_ok(format($$select listing_pause(%L)$$, :'listing_a'), '42501', null, 'seller_a: cannot touch a suspended listing');
select throws_ok(format($$select listing_unsuspend(%L)$$, :'listing_a'), '42501', null, 'seller_a: cannot lift a suspension');
update listings set title = 'Titre modifié pendant la suspension' where id = :'listing_a';
select throws_ok(format($$insert into photos (property_id, storage_path, position) values (%L, %L, 1)$$,
                        :'prop_a', :'prop_a' || '/p2-800.webp'),
                 '42501', null, 'seller_a: cannot add photos while suspended');
select is((select suspension_reason from listings where id = :'listing_a'), 'Photos trompeuses', 'seller_a: reads the suspension reason');

\set who anon
\ir _as.psql
select is((select count(*) from public_listings where id = :'listing_a')::int, 0, 'anon: a suspended listing is hidden');

\set who admin
\ir _as.psql
select is(listing_unsuspend(:'listing_a'), 'published'::listing_status, 'admin: lifts the suspension');
select is((select title from listings where id = :'listing_a'), 'Appartement 3 pièces lumineux', 'seller edit during suspension had no effect');
select is((select count(*) from audit_log where entity_id = :'listing_a')::int, 3, 'audit_log: publish, suspend, unsuspend');

-- ===========================================================================
-- seller_a: pause, resume, sold, statistics, deletion rules
-- ===========================================================================
\set who seller_a
\ir _as.psql
select is(listing_pause(:'listing_a'), 'paused'::listing_status, 'seller_a: pauses the listing');
select is((select count(*) from public_listings_rows() where id = :'listing_a')::int, 0, 'a paused listing is hidden');
select is(listing_resume(:'listing_a'), 'published'::listing_status, 'seller_a: puts it back online');
select is((select count from listing_views where listing_id = :'listing_a'), 1, 'seller_a: reads the view statistics');
select is(listing_mark_sold(:'listing_a', 34500000), 'sold'::listing_status, 'seller_a: marks the listing sold');
select throws_ok(format($$select property_soft_delete(%L)$$, :'prop_a'), '22023', null, 'seller_a: only a draft can be deleted');
select ok(not is_admin(), 'seller_a: is_admin() is false');

\set who seller_b
\ir _as.psql
select lives_ok(format($$select property_soft_delete(%L)$$, :'prop_b'), 'seller_b: deletes own draft');
select ok((select deleted_at is not null from properties where id = :'prop_b'), 'the draft is soft-deleted');

select * from finish();
rollback;
