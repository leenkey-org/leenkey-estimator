-- Named lists of favourites (DECISIONS.md 2026-11-26). A list is read,
-- renamed and deleted by its owner alone; the team reads it, never writes it;
-- a visitor sees nothing. A favourite is filed by its owner, into one of
-- their own lists or into none; 20 lists per account, one name per account;
-- deleting a list keeps its favourites. Fixtures in postal code 99993: the
-- file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(42);
\ir _plan.psql

-- A published listing of seller_a, to save.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '4 rue des Listes', '99993', 'Listeville', 68, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3613, 48.7014), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Appartement à ranger', 'Séjour lumineux, deux chambres.', 23900000)
returning id as listing \gset
\o /dev/null
select tests.dpe(:'listing');
select listing_submit(:'listing');
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing');
\o

-- ===========================================================================
-- Creating a list
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select lives_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_c'), 'Lyon')$$,
                'buyer_c: creates a list');
select id as list_c from favorite_lists where owner_id = tests.uid('buyer_c') and name = 'Lyon' \gset
select throws_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_c'), '  lyon ')$$,
                 '23505', null, 'buyer_c: not the same name twice, whatever its case and spaces');
select throws_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_c'), '   ')$$,
                 '23514', null, 'buyer_c: a name is required');
select throws_ok(format($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_c'), %L)$$,
                        repeat('a', 41)),
                 '23514', null, 'buyer_c: 40 characters at most');
select throws_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_d'), 'Pour David')$$,
                 '42501', null, 'buyer_c: never a list for buyer_d');
select throws_ok(format($$insert into favorite_lists (id, owner_id, name) values (%L, tests.uid('buyer_c'), 'Forgée')$$,
                        gen_random_uuid()),
                 '42501', null, 'buyer_c: only the owner and the name are written');

\set who buyer_d
\ir _as.psql
select lives_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_d'), 'Lyon')$$,
                'buyer_d: the same name in another account');
select id as list_d from favorite_lists where owner_id = tests.uid('buyer_d') and name = 'Lyon' \gset

-- Any signed-in account saves listings: a seller has lists too.
\set who seller_b
\ir _as.psql
select lives_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('seller_b'), 'À visiter')$$,
                'seller_b: a seller creates a list');
reset role;
update profiles set suspended_at = now(), suspension_reason = 'Test' where id = tests.uid('seller_b');
\set who seller_b
\ir _as.psql
select throws_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('seller_b'), 'Bordeaux')$$,
                 '42501', null, 'seller_b, suspended: no new list');
reset role;
update profiles set suspended_at = null, suspension_reason = null where id = tests.uid('seller_b');

-- ===========================================================================
-- Filing a favourite
-- ===========================================================================
\set who buyer_c
\ir _as.psql
insert into favorites (buyer_id, listing_id) values (tests.uid('buyer_c'), :'listing');
select throws_ok(format($$insert into favorites (buyer_id, listing_id, list_id) values (tests.uid('buyer_c'), %L, %L)$$,
                        :'listing', :'list_c'),
                 '42501', null, 'buyer_c: a favourite is saved first, filed after');
select lives_ok(format($$update favorites set list_id = %L where buyer_id = tests.uid('buyer_c') and listing_id = %L$$,
                       :'list_c', :'listing'),
                'buyer_c: files a favourite into their list');
select is((select list_id from favorites where buyer_id = tests.uid('buyer_c') and listing_id = :'listing'),
          :'list_c'::uuid, 'buyer_c: the favourite is in the list');
select throws_ok(format($$update favorites set list_id = %L where buyer_id = tests.uid('buyer_c') and listing_id = %L$$,
                        :'list_d', :'listing'),
                 '42501', null, 'buyer_c: never into the list of buyer_d');
select throws_ok(format($$update favorites set created_at = now() where buyer_id = tests.uid('buyer_c') and listing_id = %L$$,
                        :'listing'),
                 '42501', null, 'buyer_c: nothing else of a favourite is changed');
select throws_ok(format($$update favorites set buyer_id = tests.uid('buyer_d') where listing_id = %L$$, :'listing'),
                 '42501', null, 'buyer_c: a favourite is not given to another account');
select is((select count(*)::int from favorite_lists), 1, 'buyer_c: reads their own lists only');
select is(jsonb_array_length(account_export()->'favorite_lists'), 1, 'buyer_c: their lists are in the export');
select is((account_export()->'favorites'->0->>'list_id')::uuid, :'list_c'::uuid,
          'buyer_c: the export says which list a favourite is in');

-- ===========================================================================
-- Another account
-- ===========================================================================
\set who buyer_d
\ir _as.psql
select is((select count(*)::int from favorite_lists where owner_id = tests.uid('buyer_c')), 0,
          'buyer_d: never reads the lists of buyer_c');
update favorite_lists set name = 'Volée' where id = :'list_c';
delete from favorite_lists where id = :'list_c';
update favorites set list_id = null where buyer_id = tests.uid('buyer_c');
update favorites set list_id = :'list_d' where buyer_id = tests.uid('buyer_c');
reset role;
select is((select name from favorite_lists where id = :'list_c'), 'Lyon',
          'buyer_d: neither renames nor deletes the list of buyer_c');
select is((select list_id from favorites where buyer_id = tests.uid('buyer_c') and listing_id = :'listing'),
          :'list_c'::uuid, 'buyer_d: never files the favourite of buyer_c');
\set who buyer_d
\ir _as.psql
select throws_ok(format($$update favorite_lists set owner_id = tests.uid('buyer_c') where id = %L$$, :'list_d'),
                 '42501', null, 'buyer_d: a list is not given to another account');
select is(jsonb_array_length(account_export()->'favorite_lists'), 1, 'buyer_d: the export gives their own lists only');

-- ===========================================================================
-- Visitor, team
-- ===========================================================================
\set who anon
\ir _as.psql
select throws_ok('select count(*) from favorite_lists', '42501', null, 'anon: never reads a list');
select throws_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_c'), 'Anonyme')$$,
                 '42501', null, 'anon: never creates a list');
select throws_ok(format($$update favorite_lists set name = 'Anonyme' where id = %L$$, :'list_c'),
                 '42501', null, 'anon: never renames a list');
select throws_ok(format($$delete from favorite_lists where id = %L$$, :'list_c'),
                 '42501', null, 'anon: never deletes a list');
select throws_ok(format($$update favorites set list_id = %L$$, :'list_c'),
                 '42501', null, 'anon: never files a favourite');

\set who admin
\ir _as.psql
select is((select count(*)::int from favorite_lists
            where owner_id in (tests.uid('buyer_c'), tests.uid('buyer_d'), tests.uid('seller_b'))), 3,
          'admin: reads the lists of the accounts');
update favorite_lists set name = 'Équipe' where id = :'list_c';
delete from favorite_lists where id = :'list_c';
update favorites set list_id = null where buyer_id = tests.uid('buyer_c');
reset role;
select is((select name from favorite_lists where id = :'list_c'), 'Lyon',
          'admin: neither renames nor deletes the list of an account');
select is((select list_id from favorites where buyer_id = tests.uid('buyer_c') and listing_id = :'listing'),
          :'list_c'::uuid, 'admin: never files the favourite of an account');
\set who admin
\ir _as.psql
select throws_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_c'), 'Équipe')$$,
                 '42501', null, 'admin: never creates a list for an account');
insert into favorites (buyer_id, listing_id) values (tests.uid('admin'), :'listing');
select throws_ok(format($$update favorites set list_id = %L where buyer_id = tests.uid('admin')$$, :'list_c'),
                 '42501', null, 'admin: never files their own favourite into the list of an account');
select is(jsonb_array_length(account_export()->'favorite_lists'), 0,
          'admin: their export gives no list of another account');

-- ===========================================================================
-- 20 lists per account
-- ===========================================================================
\set who buyer_d
\ir _as.psql
select lives_ok($$insert into favorite_lists (owner_id, name)
                  select tests.uid('buyer_d'), 'Liste ' || n from generate_series(2, 20) n$$,
                'buyer_d: up to 20 lists');
select throws_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_d'), 'Liste 21')$$,
                 '54000', 'favorite_lists_per_account', 'buyer_d: not a 21st list');
\set who buyer_c
\ir _as.psql
select lives_ok($$insert into favorite_lists (owner_id, name) values (tests.uid('buyer_c'), 'Bordeaux')$$,
                'buyer_c: the limit of buyer_d is not theirs');

-- ===========================================================================
-- Renaming, deleting
-- ===========================================================================
select lives_ok(format($$update favorite_lists set name = 'Lyon 3e' where id = %L$$, :'list_c'),
                'buyer_c: renames their list');
select is((select name from favorite_lists where id = :'list_c'), 'Lyon 3e', 'buyer_c: the new name');
select ok((select updated_at is not null from favorite_lists where id = :'list_c'),
          'the change is dated');
select throws_ok(format($$update favorite_lists set name = 'BORDEAUX' where id = %L$$, :'list_c'),
                 '23505', null, 'buyer_c: not the name of another of their lists');
delete from favorite_lists where id = :'list_c';
select is((select row(count(*)::int, count(list_id)::int)::text from favorites
            where buyer_id = tests.uid('buyer_c') and listing_id = :'listing'),
          row(1, 0)::text, 'buyer_c: deleting a list keeps its favourite, without a list');

select * from finish();
rollback;
