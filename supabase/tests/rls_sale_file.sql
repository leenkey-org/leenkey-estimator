-- L3-04: the sale file (SPEC-V2 15). « Non concerné » is the seller's, with
-- a reason; a file sent and not filed is taken back, a filed one is not; a
-- share and a request tell the other party once; a declined request waits 7
-- days; a buyer lists what is shared with them. Fixtures in 99996.
begin;
\ir _helpers.psql
select plan(20);
\ir _plan.psql
-- The storage service deletes a file this way (storage.protect_delete): as
-- the user, under the RLS.
select set_config('storage.allow_delete_query', 'true', false) \gset

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '9 rue des Pièces', '99996', 'Pièceville', 90, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.40, 48.75), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison au dossier', 'Description.', 30000000)
returning id as listing \gset
\o /dev/null
select tests.dpe(:'listing');
select listing_submit(:'listing');
\o
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing');
\o
select :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path1,
       :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path2,
       :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path_orphan \gset

-- « Non concerné »
\set who seller_a
\ir _as.psql
select lives_ok(format($$insert into document_exemptions (property_id, type, reason) values (%L, 'termites', 'Commune hors zone')$$, :'prop'),
                'seller_a: a document that does not apply, with its reason');
select throws_ok(format($$insert into document_exemptions (property_id, type, reason) values (%L, 'plomb', ' ')$$, :'prop'),
                 '23514', null, 'seller_a: a reason is asked');
select lives_ok(format($$insert into document_exemptions (property_id, type, reason) values (%L, 'assainissement', 'Tout-à-l''égout')$$, :'prop'),
                'the types added for the mandatory lists are known');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from document_exemptions where property_id = :'prop'), 0, 'seller_b: reads no exemption of seller_a');
select throws_ok(format($$insert into document_exemptions (property_id, type, reason) values (%L, 'gaz', 'Pas de gaz')$$, :'prop'),
                 '42501', null, 'seller_b: writes none on the property of seller_a');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from document_exemptions), 0, 'buyer_c: reads no exemption');

-- Files: an orphan is taken back, a filed one stays.
\set who seller_a
\ir _as.psql
insert into storage.objects (bucket_id, name, owner, metadata) values
  ('documents', :'path1', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}'),
  ('documents', :'path2', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}'),
  ('documents', :'path_orphan', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}');
select document_add(:'prop', 'dpe', 'DPE', :'path1') as doc1 \gset
select document_add(:'prop', 'erp', 'ERP', :'path2') as doc2 \gset
delete from storage.objects where bucket_id = 'documents' and name in (:'path1', :'path_orphan');
select is((select array_agg(name order by name) from storage.objects where bucket_id = 'documents' and name like :'prop' || '/sale/%'),
          (select array_agg(n order by n) from unnest(array[:'path1', :'path2']) n),
          'seller_a: a file never filed is taken back, a filed one stays');
-- Its task is ticked where the sale steps are loaded (seed): true or false.
select lives_ok(format($$select sale_declare_event(%L, 'documents.notary_ready')$$, :'prop'),
                'seller_a: declares the notary file complete');
\set who seller_b
\ir _as.psql
select throws_ok(format($$select sale_declare_event(%L, 'documents.notary_ready')$$, :'prop'), '42501', null,
                 'seller_b: not on the property of seller_a');

-- Requests and shares
\set who buyer_c
\ir _as.psql
\o /dev/null
select conversation_open(:'listing', 'Bonjour, puis-je voir le dossier ?');
\o
select document_access_request(:'prop') as req \gset
reset role;
select is((select data->>'buyer_first_name' || '|' || (email_after is not null)::text from notifications
            where profile_id = tests.uid('seller_a') and type = 'document.access_requested'), 'Chloé|true',
          'a request tells the seller, by email too');
\set who seller_a
\ir _as.psql
select is(document_access_answer(:'req', false), 0, 'seller_a: declines');
\set who buyer_c
\ir _as.psql
select is(document_access_request(:'prop'), :'req'::uuid, 'buyer_c: asks again at once');
select is((select status from document_access_requests where id = :'req'), 'declined', 'the request stays declined for 7 days');
reset role;
update document_access_requests set answered_at = now() - interval '8 days' where id = :'req';
\set who buyer_c
\ir _as.psql
\o /dev/null
select document_access_request(:'prop');
\o
select is((select status from document_access_requests where id = :'req'), 'pending', 'after 7 days: pending again');
reset role;
select is((select count(*)::int from notifications where profile_id = tests.uid('seller_a') and type = 'document.access_requested'), 2,
          'the seller is told of the new request, not of the one refused meanwhile');
\set who seller_a
\ir _as.psql
select is(document_access_answer(:'req', true), 2, 'seller_a: grants, both documents shared');
reset role;
select is((select (data->>'count') || '|' || link from notifications
            where profile_id = tests.uid('buyer_c') and type = 'document.shared'), '2|/acquereur/documents',
          'one notification for the documents shared together');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int || '|' || min(listing_title) || '|' || min(city) from shared_documents()),
          '2|Maison au dossier|Pièceville', 'buyer_c: lists what is shared with them, and what it is about');
\set who buyer_d
\ir _as.psql
select is((select count(*)::int from shared_documents()), 0, 'buyer_d: nothing shared');
\set who anon
\ir _as.psql
select throws_ok('select * from shared_documents()', '42501', null, 'anon: no access');

select * from finish();
rollback;
