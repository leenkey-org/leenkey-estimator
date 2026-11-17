-- L3-01: the sale file (SPEC-V2 15, CLAUDE.md 7). The seller files the
-- documents of their property; a buyer reads a document, and its file, only
-- when it is shared with them; the extracted text, the analysis and the note
-- of the review are never readable by a client; access requests. Fixtures in
-- postal code 99994.
begin;
\ir _helpers.psql
select plan(45);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '5 rue du Dossier', '99994', 'Dossierville', 60, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.37, 48.72), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Appartement avec dossier', 'Description.', 25000000)
returning id as listing \gset
\o /dev/null
select tests.dpe(:'listing');
select listing_submit(:'listing');
\o
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_b'), 'maison', '6 rue Voisine', '99994', 'Dossierville', 80, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.38, 48.73), 4326)::extensions.geography)
returning id as prop_b \gset
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing');
\o

select :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path1,
       :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path2,
       :'prop' || '/sale/' || gen_random_uuid() || '.jpg' as path3,
       :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path_fake,
       :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path_big \gset

-- ===========================================================================
-- The files
-- ===========================================================================
\set who seller_b
\ir _as.psql
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('documents', %L, %L)$$,
                        :'path1', tests.uid('seller_b')),
                 '42501', null, 'seller_b: no file in the folder of the property of seller_a');
\set who seller_a
\ir _as.psql
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('documents', %L, %L)$$,
                        :'prop' || '/sale/' || gen_random_uuid() || '.exe', tests.uid('seller_a')),
                 '42501', null, 'seller_a: nor a file that is not a PDF, a JPEG or a PNG');
-- The type and the size Storage records for a file it receives.
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner, metadata) values
                         ('documents', %L, %L, '{"mimetype": "application/pdf", "size": 1000}'),
                         ('documents', %L, %L, '{"mimetype": "application/pdf", "size": 2000}'),
                         ('documents', %L, %L, '{"mimetype": "image/jpeg", "size": 3000}'),
                         ('documents', %L, %L, '{"mimetype": "image/webp", "size": 1000}'),
                         ('documents', %L, %L, '{"mimetype": "application/pdf", "size": 22020096}')$$,
                       :'path1', tests.uid('seller_a'), :'path2', tests.uid('seller_a'), :'path3', tests.uid('seller_a'),
                       :'path_fake', tests.uid('seller_a'), :'path_big', tests.uid('seller_a')),
                'seller_a: sends the files of its documents');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name like :'prop' || '/sale/%'), 5,
          'seller_a: reads them');

-- ===========================================================================
-- Filing
-- ===========================================================================
select throws_ok(format($$insert into documents (property_id, owner_id, type, title, storage_path, mime_type, size_bytes)
                          values (%L, %L, 'dpe', 'DPE', %L, 'application/pdf', 1000)$$,
                        :'prop', tests.uid('seller_a'), :'path1'),
                 '42501', null, 'seller_a: never writes the table itself');
select throws_ok(format($$select document_add(%L, 'dpe', 'DPE', %L)$$,
                        :'prop', :'prop' || '/sale/' || gen_random_uuid() || '.pdf'),
                 '22023', null, 'seller_a: no document without its file');
select throws_ok(format($$select document_add(%L, 'dpe', 'DPE', %L)$$, :'prop_b', :'path1'),
                 '42501', null, 'seller_a: no document on the property of seller_b');
select throws_ok(format($$select document_add(%L, 'dpe', 'DPE', %L)$$, :'prop', :'path_fake'),
                 '23514', null, 'seller_a: the file recorded by Storage is a PDF, a JPEG or a PNG of the type of its name');
select throws_ok(format($$select document_add(%L, 'dpe', 'DPE', %L)$$, :'prop', :'path_big'),
                 '23514', null, 'seller_a: 20 MB at most');
select document_add(:'prop', 'dpe', ' DPE 2025 ', :'path1') as doc1 \gset
select document_add(:'prop', 'pv_ag', 'PV AG 2025', :'path2') as doc2 \gset
select document_add(:'prop', 'taxe_fonciere', 'Taxe foncière', :'path3') as doc3 \gset
select is((select title || '|' || mime_type || '|' || size_bytes from documents where id = :'doc3'),
          'Taxe foncière|image/jpeg|3000', 'seller_a: the document is filed with the type and the size of its file');
select throws_ok(format($$select document_add(%L, 'dpe', 'DPE', %L)$$, :'prop', :'path1'),
                 '23505', null, 'seller_a: one document per file');
select lives_ok(format($$update documents set title = 'DPE du 12 mars', type = 'dpe' where id = %L$$, :'doc1'),
                'seller_a: renames its document');
select throws_ok(format($$update documents set analysis = '{}' where id = %L$$, :'doc1'),
                 '42501', null, 'seller_a: never writes the analysis');
select throws_ok(format($$update documents set reviewed_at = now() where id = %L$$, :'doc1'),
                 '42501', null, 'seller_a: nor the review of Leenkey');
select throws_ok(format($$select extracted_text from documents where id = %L$$, :'doc1'),
                 '42501', null, 'seller_a: the extracted text is never read by a client');
select throws_ok(format($$select review_note from documents where id = %L$$, :'doc1'),
                 '42501', null, 'nor the note of the review');

\set who seller_b
\ir _as.psql
select is((select count(*)::int from documents where property_id = :'prop'), 0, 'seller_b: reads no document of seller_a');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name like :'prop' || '/sale/%'), 0,
          'seller_b: nor their files');
update documents set title = 'x' where id = :'doc1';
\set who anon
\ir _as.psql
select throws_ok('select count(*) from documents', '42501', null, 'anon: no access to the documents');

-- ===========================================================================
-- Sharing
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from documents where property_id = :'prop'), 0, 'buyer_c: reads no document before a share');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path1'), 0,
          'buyer_c: nor its file');
select throws_ok(format($$select document_access_request(%L)$$, :'prop'),
                 '22023', null, 'buyer_c: asks for the documents once in contact with the seller');
\o /dev/null
select conversation_open(:'listing', 'Bonjour, puis-je voir les diagnostics ?');
\o

\set who seller_a
\ir _as.psql
select throws_ok(format($$select document_share(array[%L]::uuid[], %L)$$, :'doc1', tests.uid('buyer_d')),
                 '22023', null, 'seller_a: shares nothing with a buyer without relation with the property');
select is(document_share(array[:'doc1', :'doc2', :'doc1']::uuid[], tests.uid('buyer_c')), 2,
          'seller_a: shares two documents with buyer_c');
select is(document_share(array[:'doc1']::uuid[], tests.uid('buyer_c')), 0, 'shared again: nothing changes');
select is((select count(*)::int from document_shares where buyer_id = tests.uid('buyer_c')), 2,
          'seller_a: reads the shares of its documents');
\set who seller_b
\ir _as.psql
select throws_ok(format($$select document_share(array[%L]::uuid[], %L)$$, :'doc3', tests.uid('buyer_c')),
                 '42501', null, 'seller_b: shares no document of seller_a');
select is((select count(*)::int from document_shares where document_id = :'doc1'), 0, 'seller_b: reads no share of seller_a');
-- A document of seller_b, shared together with one of seller_a.
reset role;
select :'prop_b' || '/sale/' || gen_random_uuid() || '.pdf' as path_b \gset
insert into storage.objects (bucket_id, name, metadata) values ('documents', :'path_b', '{"mimetype": "application/pdf", "size": 10}');
insert into documents (property_id, owner_id, type, title, storage_path, mime_type, size_bytes)
values (:'prop_b', tests.uid('seller_b'), 'dpe', 'DPE B', :'path_b', 'application/pdf', 10) returning id as doc_b \gset
\set who seller_b
\ir _as.psql
select throws_ok(format($$select document_share(array[%L, %L]::uuid[], %L)$$, :'doc_b', :'doc1', tests.uid('buyer_c')),
                 '42501', null, 'seller_b: never a document of seller_a slipped among its own');

\set who buyer_c
\ir _as.psql
select is((select array_agg(title order by title) from documents where property_id = :'prop'),
          array['DPE du 12 mars', 'PV AG 2025'], 'buyer_c: reads the two documents shared with them');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name like :'prop' || '/sale/%'), 2,
          'buyer_c: and their files only');
select throws_ok(format($$select analysis from documents where id = %L$$, :'doc1'),
                 '42501', null, 'buyer_c: never the full analysis');
update documents set title = 'x' where id = :'doc1';

\set who buyer_d
\ir _as.psql
select is((select count(*)::int from documents where property_id = :'prop'), 0, 'buyer_d: reads nothing shared with buyer_c');
select is((select count(*)::int from document_shares), 0, 'buyer_d: nor the shares of buyer_c');

-- ===========================================================================
-- Access requests
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select document_access_request(:'prop') as req \gset
select is(document_access_request(:'prop'), :'req'::uuid, 'buyer_c: asked again, the same request');
\set who seller_a
\ir _as.psql
select throws_ok(format($$select document_access_request(%L)$$, :'prop'),
                 '42501', null, 'seller_a: asks nothing on its own property');
select is((select status from document_access_requests where id = :'req'), 'pending', 'seller_a: reads the request');
\set who seller_b
\ir _as.psql
select throws_ok(format($$select document_access_answer(%L, true)$$, :'req'),
                 '42501', null, 'seller_b: answers no request of seller_a');
\set who seller_a
\ir _as.psql
select is(document_access_answer(:'req', true), 1, 'seller_a: grants, the documents not yet shared are shared');
select throws_ok(format($$select document_access_answer(%L, false)$$, :'req'),
                 '22023', null, 'seller_a: a request is answered once');

-- A document removed is no longer read by the buyer, nor its file.
update documents set deleted_at = now() where id = :'doc3';
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from documents where property_id = :'prop'), 2, 'buyer_c: a removed document disappears');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path3'), 0,
          'buyer_c: and its file');

\set who seller_a
\ir _as.psql
select lives_ok(format($$select document_unshare(%L, %L)$$, :'doc2', tests.uid('buyer_c')), 'seller_a: stops sharing a document');
\set who admin
\ir _as.psql
select is((select count(*)::int from documents where property_id = :'prop'), 3, 'admin: reads every document, removed ones too');
select is((select title from documents where id = :'doc1'), 'DPE du 12 mars', 'seller_b and buyer_c changed no document');

select * from finish();
rollback;
