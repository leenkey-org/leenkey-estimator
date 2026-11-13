-- L1-35: the history of a listing online (SPEC-V2 8.3): its price, title,
-- description and photos changed once online or paused are written by the
-- database, read by its seller and the team only, never written by a client;
-- the team is told once per listing in the bell (listing.revised, no email).
-- Fixtures in postal code 99992: the file passes on an empty and on a seeded
-- database.
begin;
\ir _helpers.psql
select plan(33);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '4 rue du Registre', '99992', 'Revisionville', 58, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3402, 48.6803), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Appartement suivi', 'Description.', 25000000)
returning id as listing \gset
select gen_random_uuid() as f1 \gset
insert into storage.objects (bucket_id, name, owner)
values ('photos', :'prop' || '/' || :'f1' || '-400.webp', tests.uid('seller_a'));
insert into photos (property_id, storage_path, position, caption)
values (:'prop', :'prop' || '/' || :'f1', 0, 'Séjour')
returning id as photo1 \gset

-- ===========================================================================
-- Draft and review: not followed
-- ===========================================================================
update listings set price_cents = 24900000 where id = :'listing';
select tests.dpe(:'listing');
select listing_submit(:'listing') \gset
update listings set description = 'Description revue.' where id = :'listing';
reset role;
select is((select array[description, status::text] from listings where id = :'listing'),
          array['Description revue.', 'pending'], 'the change in review is saved');
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, 0,
          'a draft or a listing in review: no history (it is reviewed anyway)');

-- ===========================================================================
-- Online: price, title, description, photos
-- ===========================================================================
\set who admin
\ir _as.psql
select listing_publish(:'listing') \gset
\set who seller_a
\ir _as.psql
update listings set price_cents = 23900000, title = 'Appartement suivi, prix revu' where id = :'listing';
reset role;
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, 2,
          'online: the price and the title changed, two lines');
select is((select array[old_value::text, new_value::text, changed_by::text] from listing_revisions
            where listing_id = :'listing' and field = 'price'),
          array['24900000', '23900000', tests.uid('seller_a')::text],
          'the price: old and new value in cents, changed by the seller');
select is((select new_value #>> '{}' from listing_revisions
            where listing_id = :'listing' and field = 'title'),
          'Appartement suivi, prix revu', 'the title: the new one as written');

\set who seller_a
\ir _as.psql
update listings set price_cents = 23900000 where id = :'listing';
update properties set rooms = 4 where id = :'prop';
reset role;
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, 2,
          'the same price again, or a characteristic: nothing written');

\set who seller_a
\ir _as.psql
select gen_random_uuid() as f2 \gset
insert into storage.objects (bucket_id, name, owner)
values ('photos', :'prop' || '/' || :'f2' || '-400.webp', tests.uid('seller_a'));
insert into photos (property_id, storage_path, position)
values (:'prop', :'prop' || '/' || :'f2', 1)
returning id as photo2 \gset
update photos set caption = 'Séjour lumineux' where id = :'photo1';
\o /dev/null
select photos_reorder(:'prop', array[:'photo2', :'photo1']::uuid[]);
\o
delete from photos where id = :'photo1';
reset role;
select is((select count(*) from listing_revisions where listing_id = :'listing' and field = 'photo')::int, 3,
          'a photo added, a caption changed, a photo removed: three lines (not the order)');
select ok((select old_value is null and new_value->>'id' = :'photo2' from listing_revisions
            where listing_id = :'listing' and field = 'photo' and old_value is null),
          'a photo added: no old value, the new photo');
select ok(exists (select 1 from listing_revisions
                   where listing_id = :'listing' and field = 'photo'
                     and old_value->>'caption' = 'Séjour' and new_value->>'caption' = 'Séjour lumineux'),
          'a caption changed: old and new caption');
select ok(exists (select 1 from listing_revisions
                   where listing_id = :'listing' and field = 'photo' and new_value is null
                     and old_value->>'id' = :'photo1'),
          'a photo removed: no new value');

-- Without a session (the seed loading its photos, a script): not followed.
reset role;
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
select count(*)::int as before_seed from listing_revisions where listing_id = :'listing' \gset
update listings set price_cents = 23800000 where id = :'listing';
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, :before_seed,
          'a change without a session (seed, script): not followed');
update listings set price_cents = 23900000 where id = :'listing';

-- Paused: it goes back online without review, so it is followed.
\set who seller_a
\ir _as.psql
select listing_pause(:'listing') \gset
update listings set description = 'Description pendant la pause.' where id = :'listing';
reset role;
select is((select new_value #>> '{}' from listing_revisions
            where listing_id = :'listing' and field = 'description'),
          'Description pendant la pause.', 'paused: the description is followed too');

-- ===========================================================================
-- The team is told: one unread notification per listing, in the app
-- ===========================================================================
select is((select count(*) from notifications
            where profile_id = tests.uid('admin') and type = 'listing.revised'
              and data->>'listing_id' = :'listing')::int, 1,
          'the team: one notification for all the changes of the listing');
select ok((select channels = '{in_app}' and email_after is null and read_at is null
             from notifications
            where profile_id = tests.uid('admin') and type = 'listing.revised'
              and data->>'listing_id' = :'listing'),
          'in the app only, no email (SPEC 10)');
select is((select array(select jsonb_array_elements_text(data->'fields') order by 1)
             from notifications
            where profile_id = tests.uid('admin') and type = 'listing.revised'
              and data->>'listing_id' = :'listing'),
          array['description', 'photo', 'price', 'title'],
          'it gathers the fields changed');
select is((select array[data->>'old_price_cents', data->>'price_cents', link] from notifications
            where profile_id = tests.uid('admin') and type = 'listing.revised'
              and data->>'listing_id' = :'listing'),
          array['24900000', '23900000', '/admin/annonces/' || :'listing' || '#modifications'],
          'the price before the first change and now, the link to the history');
select is((select count(*) from notifications
            where profile_id = tests.uid('seller_a') and type = 'listing.revised')::int, 0,
          'the seller is not told of its own changes');

-- Read: the next change writes a new one.
update notifications set read_at = now()
 where profile_id = tests.uid('admin') and type = 'listing.revised' and data->>'listing_id' = :'listing';
\set who seller_a
\ir _as.psql
update listings set title = 'Appartement suivi, titre revu' where id = :'listing';
reset role;
select is((select count(*) from notifications
            where profile_id = tests.uid('admin') and type = 'listing.revised'
              and data->>'listing_id' = :'listing' and read_at is null)::int, 1,
          'once read, the next change tells the team again');
select is((select data->'fields' from notifications
            where profile_id = tests.uid('admin') and type = 'listing.revised'
              and data->>'listing_id' = :'listing' and read_at is null),
          '["title"]'::jsonb, 'with only what changed since');

-- A change of the description first, then of the price: the price before and after.
update notifications set read_at = now()
 where profile_id = tests.uid('admin') and type = 'listing.revised' and data->>'listing_id' = :'listing';
\set who seller_a
\ir _as.psql
update listings set description = 'Description, encore.' where id = :'listing';
update listings set price_cents = 23500000 where id = :'listing';
reset role;
select is((select array[data->>'old_price_cents', data->>'price_cents'] from notifications
            where profile_id = tests.uid('admin') and type = 'listing.revised'
              and data->>'listing_id' = :'listing' and read_at is null),
          array['23900000', '23500000'],
          'the price changed after another field: its value before the first price change');

-- A change made by the team: written, no one told (every admin of the
-- database, two in the seed).
update notifications set read_at = now()
 where type = 'listing.revised' and data->>'listing_id' = :'listing';
\set who admin
\ir _as.psql
update listings set title = 'Titre corrigé par l''équipe' where id = :'listing';
reset role;
select is((select changed_by from listing_revisions
            where listing_id = :'listing' and field = 'title' order by created_at desc limit 1),
          tests.uid('admin'), 'a change by the team: written, by the admin');
select is((select count(*) from notifications
            where type = 'listing.revised' and data->>'listing_id' = :'listing' and read_at is null)::int, 0,
          'and no one is told');

-- Suspended by the team: no longer followed.
\set who admin
\ir _as.psql
\o /dev/null
select listing_suspend(:'listing', 'Contrôle d''une modification (test).');
\o
reset role;
select count(*)::int as before_suspended from listing_revisions where listing_id = :'listing' \gset
\set who admin
\ir _as.psql
update listings set title = 'Titre pendant la suspension' where id = :'listing';
reset role;
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, :before_suspended,
          'a suspended listing: not followed');

-- ===========================================================================
-- Who reads it
-- ===========================================================================
reset role;
select count(*)::int as total from listing_revisions where listing_id = :'listing' \gset
\set who seller_a
\ir _as.psql
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, :total,
          'seller_a: reads the whole history of its listing');
\set who seller_b
\ir _as.psql
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, 0,
          'seller_b: not the history of another seller');
\set who buyer_c
\ir _as.psql
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, 0,
          'buyer_c: no history, even of a listing online');
\set who buyer_d
\ir _as.psql
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, 0,
          'buyer_d: no history');
\set who anon
\ir _as.psql
select throws_ok(format($$select count(*) from listing_revisions where listing_id = %L$$, :'listing'),
                 '42501', null, 'a visitor: no access to the table');
\set who admin
\ir _as.psql
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, :total,
          'admin: reads the whole history');

-- ===========================================================================
-- Never written by a client
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$insert into listing_revisions (listing_id, changed_by, field, new_value)
                          values (%L, %L, 'price', '1')$$, :'listing', tests.uid('seller_a')),
                 '42501', null, 'seller_a: cannot write a line of history');
select throws_ok(format($$delete from listing_revisions where listing_id = %L$$, :'listing'),
                 '42501', null, 'seller_a: nor erase its history');
\set who admin
\ir _as.psql
select throws_ok(format($$update listing_revisions set new_value = '1' where listing_id = %L$$, :'listing'),
                 '42501', null, 'admin: nor rewrite it');
select throws_ok($$select public.listing_revision_add(null::public.listings, 'price', null, '1')$$,
                 '42501', null, 'the function that writes it is closed to the users');

select * from finish();
rollback;
