-- L1-15 / L1-17: search_listings (published listings only, public columns,
-- filters, sorts, pages of 20), public_listings additions, view counter.
-- Fixtures live in postal codes 99997 to 99999, around (44.0, 4.0), far from
-- the launch zone: every assertion is scoped to them, so the file passes on an
-- empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(69);
\ir _plan.psql

-- ===========================================================================
-- Fixtures, written as the superuser (the transitions are tested elsewhere)
-- ===========================================================================
\set p1 '00000000-0000-4000-b000-000000000001'
\set p2 '00000000-0000-4000-b000-000000000002'
\set p3 '00000000-0000-4000-b000-000000000003'
\set p4 '00000000-0000-4000-b000-000000000004'
\set p5 '00000000-0000-4000-b000-000000000005'
\set l1 '00000000-0000-4000-c000-000000000001'
\set l2 '00000000-0000-4000-c000-000000000002'
\set l3 '00000000-0000-4000-c000-000000000003'
\set l4 '00000000-0000-4000-c000-000000000004'
\set l5 '00000000-0000-4000-c000-000000000005'

create temporary table fx (
  n int, prop uuid, listing uuid, owner text, type property_type, city text, postal_code text,
  lat double precision, lng double precision, surface numeric, rooms int, bedrooms int,
  elevator boolean, balcony boolean, terrace boolean, garden boolean, parking boolean,
  dpe char(1), price bigint, status listing_status, days_ago int, deleted text
);
insert into fx values
  -- published
  (1, :'p1', :'l1', 'seller_a', 'appartement', 'Testville-sur-Orge', '99999', 44.0000, 4.0000,  50, 2, 1, true,  true,  false, false, false, 'C', 15000000, 'published', 1, null),
  (2, :'p2', :'l2', 'seller_a', 'appartement', 'Testville-sur-Orge', '99999', 44.0050, 4.0050,  80, 4, 3, false, false, true,  false, true,  'E', 30000000, 'published', 2, null),
  (3, :'p3', :'l3', 'seller_b', 'maison',      'Testbourg',          '99999', 44.0500, 4.0000, 120, 5, 4, null,  false, false, true,  true,  'B', 45000000, 'published', 3, null),
  (4, :'p4', :'l4', 'seller_b', 'terrain',     'Testbourg',          '99999', 44.1500, 4.0000, 600, 0, null, null, null, null, null,  null,  null,  9000000, 'published', 4, null),
  (5, :'p5', :'l5', 'seller_b', 'appartement', 'Autreville',         '99998', 44.0100, 4.0000,  30, 1, 0, false, false, false, false, false, null, 10000000, 'published', 5, null),
  -- never in the results
  (11, '00000000-0000-4000-b000-000000000011', '00000000-0000-4000-c000-000000000011', 'seller_a', 'appartement', 'Testville-sur-Orge', '99999', 44.0, 4.0, 60, 3, 2, true, true, true, true, true, 'A', 20000000, 'draft', 1, null),
  (12, '00000000-0000-4000-b000-000000000012', '00000000-0000-4000-c000-000000000012', 'seller_a', 'appartement', 'Testville-sur-Orge', '99999', 44.0, 4.0, 60, 3, 2, true, true, true, true, true, 'A', 20000000, 'pending', 1, null),
  (13, '00000000-0000-4000-b000-000000000013', '00000000-0000-4000-c000-000000000013', 'seller_a', 'appartement', 'Testville-sur-Orge', '99999', 44.0, 4.0, 60, 3, 2, true, true, true, true, true, 'A', 20000000, 'paused', 1, null),
  (14, '00000000-0000-4000-b000-000000000014', '00000000-0000-4000-c000-000000000014', 'seller_b', 'appartement', 'Testville-sur-Orge', '99999', 44.0, 4.0, 60, 3, 2, true, true, true, true, true, 'A', 20000000, 'suspended', 1, null),
  (15, '00000000-0000-4000-b000-000000000015', '00000000-0000-4000-c000-000000000015', 'seller_b', 'appartement', 'Testville-sur-Orge', '99999', 44.0, 4.0, 60, 3, 2, true, true, true, true, true, 'A', 20000000, 'sold', 1, null),
  (16, '00000000-0000-4000-b000-000000000016', '00000000-0000-4000-c000-000000000016', 'seller_b', 'appartement', 'Testville-sur-Orge', '99999', 44.0, 4.0, 60, 3, 2, true, true, true, true, true, 'A', 20000000, 'rejected', 1, null),
  (17, '00000000-0000-4000-b000-000000000017', '00000000-0000-4000-c000-000000000017', 'seller_b', 'appartement', 'Testville-sur-Orge', '99999', 44.0, 4.0, 60, 3, 2, true, true, true, true, true, 'A', 20000000, 'published', 1, 'listing'),
  (18, '00000000-0000-4000-b000-000000000018', '00000000-0000-4000-c000-000000000018', 'seller_b', 'appartement', 'Testville-sur-Orge', '99999', 44.0, 4.0, 60, 3, 2, true, true, true, true, true, 'A', 20000000, 'published', 1, 'property');

-- Pagination: 21 published listings in postal code 99997.
insert into fx
select 100 + i, ('00000000-0000-4000-b000-' || lpad((100 + i)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-c000-' || lpad((100 + i)::text, 12, '0'))::uuid,
       'seller_a', 'maison', 'Pageville', '99997', 43.5, 3.5, 90 + i, 4, 3,
       null, null, null, true, null, 'D', 25000000 + i * 100000, 'published', i, null
from generate_series(1, 21) as i;

insert into properties (id, owner_id, type, address_line, postal_code, city, location, surface_m2,
                        rooms, bedrooms, has_elevator, has_balcony, has_terrace, has_garden,
                        has_parking, dpe_class, floors_total, carrez_m2, heating, copro_lots, is_new_build)
select prop, tests.uid(owner), type, n || ' rue des Tests', postal_code, city,
       extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
       surface, rooms, bedrooms, elevator, balcony, terrace, garden, parking, dpe,
       case when n = 1 then 5 end, case when n = 1 then 48.5 end,
       case when n = 1 then 'Collectif gaz' end, case when n = 1 then 24 end, n = 1
from fx;

insert into listings (id, property_id, title, description, price_cents)
select listing, prop, 'Annonce de test ' || n, 'Description de test.', price from fx;

update listings l
   set status = fx.status,
       published_at = case when fx.status in ('published', 'paused', 'suspended', 'sold')
                            then now() - make_interval(days => fx.days_ago) end,
       deleted_at = case when fx.deleted = 'listing' then now() end
  from fx where l.id = fx.listing;
update properties p set deleted_at = now() from fx where p.id = fx.prop and fx.deleted = 'property';

-- Plan of the sale: Sérénité for l1, Autonomie (default) for l2.
update sale_progress set plan = 'serenite' where property_id = :'p1';

-- ===========================================================================
-- Contract: signature, privileges, public columns only
-- ===========================================================================
select has_function('public', 'search_listings', array['jsonb', 'double precision[]', 'text', 'integer'],
                    'search_listings(filters, bbox, sort, page) exists');
select ok(has_function_privilege('anon', 'public.search_listings(jsonb, double precision[], text, integer)', 'execute')
          and has_function_privilege('authenticated', 'public.search_listings(jsonb, double precision[], text, integer)', 'execute'),
          'anon and authenticated may search');
select ok((select prosecdef from pg_proc where oid = 'public.search_listings(jsonb, double precision[], text, integer)'::regprocedure)
          and (select proconfig @> array['search_path=""']
               from pg_proc where oid = 'public.search_listings(jsonb, double precision[], text, integer)'::regprocedure),
          'search_listings is security definer with an empty search_path');
select ok(pg_get_function_result('public.search_listings(jsonb, double precision[], text, integer)'::regprocedure)
          !~ '\m(address_line|location|owner_id|review|rejection_reason|views_count|estimation_\w+|suspension_reason|description)\M',
          'search_listings returns no private column');
select has_column('public', 'public_listings', 'floors_total', 'public_listings exposes floors_total');
select has_column('public', 'public_listings', 'carrez_m2', 'public_listings exposes carrez_m2');
select has_column('public', 'public_listings', 'heating', 'public_listings exposes heating');
select has_column('public', 'public_listings', 'copro_lots', 'public_listings exposes copro_lots');
select has_column('public', 'public_listings', 'is_new_build', 'public_listings exposes is_new_build');
select hasnt_column('public', 'public_listings', 'address_line', 'public_listings still has no address');
select hasnt_column('public', 'public_listings', 'location', 'public_listings still has no exact location');
select hasnt_column('public', 'public_listings', 'owner_id', 'public_listings still has no owner id');

-- ===========================================================================
-- Visitors: published listings only
-- ===========================================================================
\set who anon
\ir _as.psql
select set_eq($$select id from search_listings('{"postal_code":"99999"}')$$,
              array[:'l1', :'l2', :'l3', :'l4']::uuid[],
              'anon: published listings only (draft, pending, paused, suspended, sold, rejected and deleted excluded)');
select is((select count(*) from search_listings('{}'))::int <= 20, true, 'anon: a page holds 20 listings at most');
select is((select max(total_count) from search_listings('{}')),
          (select count(*) from public_listings),
          'anon: without filters, the total is the number of rows of public_listings');
select ok((select bool_and(total_count = 4) from search_listings('{"postal_code":"99999"}')),
          'anon: every row carries the total number of matches');
select is((select seller_first_name from public_listings where id = :'l1'), 'Alice', 'anon: public_listings still gives the seller first name');
select is((select plan::text from public_listings where id = :'l1'), 'serenite', 'public_listings: still the plan of the sale');
select is((select plan::text from public_listings where id = :'l2'), 'autonomie', 'public_listings: Autonomie by default');
select is((select heating || ' · ' || copro_lots || ' lots · ' || carrez_m2 || ' m² · étage sur ' || floors_total
           from public_listings where id = :'l1'),
          'Collectif gaz · 24 lots · 48.50 m² · étage sur 5', 'anon: reads the new public characteristics');

-- ===========================================================================
-- Filters
-- ===========================================================================
select set_eq($$select id from search_listings('{"city":"testville-sur-orge"}')$$,
              array[:'l1', :'l2']::uuid[], 'city: by slug of the commune');
select set_eq($$select id from search_listings('{"postal_code":"99999","type":"maison"}')$$,
              array[:'l3']::uuid[], 'type');
select set_eq($$select id from search_listings('{"postal_code":"99999","price_min_cents":10000000,"price_max_cents":30000000}')$$,
              array[:'l1', :'l2']::uuid[], 'budget min and max, bounds included');
select set_eq($$select id from search_listings('{"postal_code":"99999","surface_min":50,"surface_max":120}')$$,
              array[:'l1', :'l2', :'l3']::uuid[], 'surface min and max, bounds included');
select set_eq($$select id from search_listings('{"postal_code":"99999","rooms_min":4}')$$,
              array[:'l2', :'l3']::uuid[], 'rooms min');
select set_eq($$select id from search_listings('{"postal_code":"99999","bedrooms_min":3}')$$,
              array[:'l2', :'l3']::uuid[], 'bedrooms min');
select set_eq($$select id from search_listings('{"postal_code":"99999","outdoor":["balcony"]}')$$,
              array[:'l1']::uuid[], 'outdoor: balcony');
select set_eq($$select id from search_listings('{"postal_code":"99999","outdoor":["terrace","garden"]}')$$,
              array[:'l2', :'l3']::uuid[], 'outdoor: at least one of terrace or garden');
select set_eq($$select id from search_listings('{"postal_code":"99999","parking":true}')$$,
              array[:'l2', :'l3']::uuid[], 'parking required');
select set_eq($$select id from search_listings('{"postal_code":"99999","elevator":true}')$$,
              array[:'l1']::uuid[], 'elevator required');
select set_eq($$select id from search_listings('{"postal_code":"99999","parking":false,"elevator":false}')$$,
              array[:'l1', :'l2', :'l3', :'l4']::uuid[], 'parking or elevator false: no filter');
select set_eq($$select id from search_listings('{"postal_code":"99999","dpe_max":"C"}')$$,
              array[:'l1', :'l3']::uuid[], 'DPE C or better, unknown DPE excluded');
select set_eq($$select id from search_listings('{"radius_km":2,"center_lat":44.0,"center_lng":4.0}')$$,
              array[:'l1', :'l2', :'l5']::uuid[], 'radius of 2 km around a centre');
select set_eq($$select id from search_listings('{"radius_km":10,"center_lat":44.0,"center_lng":4.0}')$$,
              array[:'l1', :'l2', :'l3', :'l5']::uuid[], 'radius of 10 km');
select set_eq($$select id from search_listings('{"city":"testbourg","radius_km":2,"center_lat":44.0,"center_lng":4.0}')$$,
              array[:'l1', :'l2', :'l3', :'l4', :'l5']::uuid[], 'commune or within the radius');
select set_eq($$select id from search_listings('{}', array[3.99, 43.99, 4.02, 44.02])$$,
              array[:'l1', :'l2', :'l5']::uuid[], 'bbox [west, south, east, north]');
select set_eq($$select id from search_listings('{"postal_code":"99999","type":"appartement","price_max_cents":20000000,"outdoor":["balcony"],"dpe_max":"D"}')$$,
              array[:'l1']::uuid[], 'combined filters');

-- ===========================================================================
-- Sorts (ties: most recent first)
-- ===========================================================================
select results_eq($$select id from search_listings('{"postal_code":"99999"}')$$,
                  array[:'l1', :'l2', :'l3', :'l4']::uuid[], 'sort: most recent first by default');
select results_eq($$select id from search_listings('{"postal_code":"99999"}', null, 'price_asc')$$,
                  array[:'l4', :'l1', :'l2', :'l3']::uuid[], 'sort: price ascending');
select results_eq($$select id from search_listings('{"postal_code":"99999"}', null, 'price_desc')$$,
                  array[:'l3', :'l2', :'l1', :'l4']::uuid[], 'sort: price descending');
select results_eq($$select id from search_listings('{"postal_code":"99999"}', null, 'surface_desc')$$,
                  array[:'l4', :'l3', :'l2', :'l1']::uuid[], 'sort: largest surface first');
select results_eq($$select id from search_listings('{"postal_code":"99999"}', null, 'price_m2_asc')$$,
                  array[:'l4', :'l1', :'l2', :'l3']::uuid[], 'sort: price per m² ascending, tie broken by date');

-- ===========================================================================
-- Pages of 20
-- ===========================================================================
select is((select count(*) from search_listings('{"postal_code":"99997"}', null, 'recent', 1))::int, 20, 'page 1: 20 listings');
select is((select count(*) from search_listings('{"postal_code":"99997"}', null, 'recent', 2))::int, 1, 'page 2: the 21st');
select is((select max(total_count) from search_listings('{"postal_code":"99997"}', null, 'recent', 2))::int, 21, 'page 2: same total');
select is((select count(*) from search_listings('{"postal_code":"99997"}', null, 'recent', 3))::int, 0, 'page 3: empty');
select is((select count(distinct id) from (
             select id from search_listings('{"postal_code":"99997"}', null, 'price_asc', 1)
             union all
             select id from search_listings('{"postal_code":"99997"}', null, 'price_asc', 2)) pages)::int,
          21, 'pages do not overlap');

-- ===========================================================================
-- Invalid input
-- ===========================================================================
select throws_ok($$select * from search_listings('{"price_max":1}')$$, '22023', null, 'unknown filter key refused');
select throws_ok($$select * from search_listings('[]')$$, '22023', null, 'filters must be an object');
select throws_ok($$select * from search_listings('{}', null, 'cheapest')$$, '22023', null, 'unknown sort refused');
select throws_ok($$select * from search_listings('{}', null, 'recent', 0)$$, '22023', null, 'page 0 refused');
select throws_ok($$select * from search_listings('{}', array[1.0, 2.0, 3.0])$$, '22023', null, 'bbox needs 4 values');
select throws_ok($$select * from search_listings('{"radius_km":5}')$$, '22023', null, 'radius without centre refused');
select throws_ok($$select * from search_listings('{"outdoor":["pool"]}')$$, '22023', null, 'unknown outdoor refused');
select throws_ok($$select * from search_listings('{"dpe_max":"H"}')$$, '22023', null, 'unknown DPE class refused');
select throws_ok($$select * from search_listings('{"type":"chateau"}')$$, '22P02', null, 'unknown property type refused');
select throws_ok($$select * from search_listings('{"price_min_cents":-1}')$$, '22023', null, 'negative value refused');

-- ===========================================================================
-- Signed-in users see the same results (published only, even their own drafts)
-- ===========================================================================
\set who seller_a
\ir _as.psql
select set_eq($$select id from search_listings('{"postal_code":"99999"}')$$,
              array[:'l1', :'l2', :'l3', :'l4']::uuid[], 'seller_a: own drafts never in the search');
\set who buyer_c
\ir _as.psql
select set_eq($$select id from search_listings('{"postal_code":"99999"}')$$,
              array[:'l1', :'l2', :'l3', :'l4']::uuid[], 'buyer_c: same results as a visitor');
\set who admin
\ir _as.psql
select set_eq($$select id from search_listings('{"postal_code":"99999"}')$$,
              array[:'l1', :'l2', :'l3', :'l4']::uuid[], 'admin: the search only shows published listings');

-- ===========================================================================
-- View counter: never the seller nor an admin
-- ===========================================================================
\set who anon
\ir _as.psql
select lives_ok(format($$select listing_view_increment(%L)$$, :'l1'), 'anon: a view is counted');
\set who buyer_c
\ir _as.psql
select lives_ok(format($$select listing_view_increment(%L)$$, :'l1'), 'buyer_c: a view is counted');
\set who seller_a
\ir _as.psql
select lives_ok(format($$select listing_view_increment(%L)$$, :'l1'), 'seller_a: calls the counter on own listing');
\set who admin
\ir _as.psql
select lives_ok(format($$select listing_view_increment(%L)$$, :'l1'), 'admin: calls the counter');
\set who seller_b
\ir _as.psql
select lives_ok(format($$select listing_view_increment(%L)$$, :'l1'), 'seller_b: a view on someone else''s listing is counted');
select lives_ok(format($$select listing_view_increment(%L)$$, '00000000-0000-4000-c000-000000000011'),
                'seller_b: calls the counter on a draft');

reset role;
select is((select count from listing_views where listing_id = :'l1'
           and day = (now() at time zone 'Europe/Paris')::date), 3,
          'views of the day: anon, buyer_c and seller_b, not the seller nor the admin');
select is((select views_count from listings where id = :'l1'), 3, 'views_count follows the daily counter');
select is((select count(*) from listing_views where listing_id = '00000000-0000-4000-c000-000000000011')::int, 0,
          'a draft is never counted');

select * from finish();
rollback;
