-- L3-07: what the assistant of a buyer answers from (SPEC-V2 12,
-- summarize_shared_documents). shared_document_answers(listing) gives the
-- caller the summaries meant for a buyer of the documents of a sale file
-- shared with them, read without a reserve, of one property or of all:
-- never a document that is not shared, never the summary of the seller,
-- never a financing document, nothing to another buyer, to a seller, to the
-- team or to a visitor. Fixtures in postal code 99988.
begin;
\ir _helpers.psql
select plan(27);
\ir _plan.psql

-- Two properties, one per seller, each with its listing online.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '5 rue des Sources', '99988', 'Sourceville', 60, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.41, 48.76), 4326)::extensions.geography)
returning id as prop1 \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop1', 'Appartement aux sources', 'Description.', 25000000)
returning id as listing1 \gset
\o /dev/null
select tests.dpe(:'listing1');
select listing_submit(:'listing1');
\o
select :'prop1' || '/sale/' || gen_random_uuid() || '.pdf' as path1,
       :'prop1' || '/sale/' || gen_random_uuid() || '.pdf' as path2,
       :'prop1' || '/sale/' || gen_random_uuid() || '.pdf' as path3 \gset
insert into storage.objects (bucket_id, name, owner, metadata) values
  ('documents', :'path1', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}'),
  ('documents', :'path2', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}'),
  ('documents', :'path3', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}');
select document_add(:'prop1', 'carrez', 'Mesurage 2025', :'path1') as doc1 \gset
select document_add(:'prop1', 'pv_ag', 'PV illisible', :'path2') as doc2 \gset
select document_add(:'prop1', 'erp', 'ERP gardé', :'path3') as doc3 \gset

\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_b'), 'maison', '9 rue des Sources', '99988', 'Sourceville', 110, 5,
        extensions.st_setsrid(extensions.st_makepoint(2.42, 48.76), 4326)::extensions.geography)
returning id as prop2 \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop2', 'Maison aux sources', 'Description.', 41000000)
returning id as listing2 \gset
\o /dev/null
select tests.dpe(:'listing2');
select listing_submit(:'listing2');
\o
select :'prop2' || '/sale/' || gen_random_uuid() || '.pdf' as path4 \gset
insert into storage.objects (bucket_id, name, owner, metadata) values
  ('documents', :'path4', tests.uid('seller_b'), '{"mimetype": "application/pdf", "size": 1000}');
select document_add(:'prop2', 'taxe_fonciere', 'Taxe foncière 2026', :'path4') as doc4 \gset

-- A financing document of buyer_c: a file of their account, not of a sale file.
reset role;
insert into financing_documents (buyer_id, type, document_date, storage_path, mime_type, size_bytes)
values (tests.uid('buyer_c'), 'accord_principe', current_date,
        tests.uid('buyer_c') || '/financing/' || gen_random_uuid() || '.pdf', 'application/pdf', 1000);
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing1');
select listing_publish(:'listing2');
\o
\set who buyer_c
\ir _as.psql
\o /dev/null
select conversation_open(:'listing1', 'Bonjour, puis-je voir le dossier ?');
select conversation_open(:'listing2', 'Bonjour, puis-je voir le dossier ?');
\o

-- The analyses, written by the scheduled task (service role).
select '{"type_detected": "carrez", "date": "2025-03-14",
         "key_facts": [{"label": "Surface Carrez", "value": "66,5 m²"}],
         "points_of_attention": [{"level": "info", "text": "Rien à signaler."}],
         "summary_seller": "Résumé pour le vendeur.", "summary_buyer": "Résumé pour l''acquéreur.",
         "public_facts": {"surface_carrez": 66.5},
         "quality": "ok", "quality_note": null}' as analysis_ok,
       '{"type_detected": "autre", "date": null, "key_facts": [], "points_of_attention": [],
         "summary_seller": "Document illisible.", "summary_buyer": "Document illisible.",
         "public_facts": {}, "quality": "illegible", "quality_note": "Pages floues."}' as analysis_bad \gset
reset role;
set local role service_role;
\o /dev/null
select document_analysis_record(:'doc1', :'analysis_ok'::jsonb);
select document_analysis_record(:'doc2', :'analysis_bad'::jsonb);
select document_analysis_record(:'doc3', :'analysis_ok'::jsonb);
select document_analysis_record(:'doc4', :'analysis_ok'::jsonb);
\o
reset role;

-- ===========================================================================
-- Nothing without a share, nothing to a visitor
-- ===========================================================================
\set who anon
\ir _as.psql
select throws_ok('select * from shared_document_answers()', '42501', null, 'anon: cannot execute it');
select throws_ok(format($$select * from shared_document_answers(%L)$$, :'listing1'), '42501', null,
                 'anon: nor about a listing online');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from shared_document_answers()), 0, 'buyer_c: nothing before a share');
select is((select count(*)::int from shared_document_answers(:'listing1')), 0,
          'buyer_c: a conversation with the seller gives no document');

\set who seller_a
\ir _as.psql
\o /dev/null
select document_share(array[:'doc1', :'doc2']::uuid[], tests.uid('buyer_c'));
\o
\set who seller_b
\ir _as.psql
\o /dev/null
select document_share(array[:'doc4']::uuid[], tests.uid('buyer_c'));
\o

-- ===========================================================================
-- buyer_c: the documents shared with them, read without a reserve
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is((select string_agg(title, ',' order by title) from shared_document_answers()),
          'Mesurage 2025,Taxe foncière 2026',
          'buyer_c: the documents shared with them, of every property');
select is((select document_id::text || '|' || property_id::text || '|' || listing_id::text || '|' || listing_title
                  || '|' || city || '|' || title || '|' || type || '|' || type_detected || '|' || document_date
                  || '|' || summary_buyer
             from shared_document_answers(:'listing1')),
          :'doc1' || '|' || :'prop1' || '|' || :'listing1'
            || '|Appartement aux sources|Sourceville|Mesurage 2025|carrez|carrez|2025-03-14|Résumé pour l''acquéreur.',
          'buyer_c: of one listing, its documents only, each with its id, its title and its property');
select is((select key_facts->0->>'value' || '|' || (points_of_attention->0->>'text')
             from shared_document_answers(:'listing1')),
          '66,5 m²|Rien à signaler.', 'with the facts and the points read in it');
select is((select string_agg(title, ',') from shared_document_answers(:'listing2')), 'Taxe foncière 2026',
          'buyer_c: the other listing, the other document');
select is((select count(*)::int from shared_document_answers() where document_id = :'doc3'), 0,
          'buyer_c: never a document that is not shared, even analysed');
select is((select count(*)::int from shared_document_answers() where document_id = :'doc2'), 0,
          'buyer_c: never a document « à vérifier », even shared');
select is((select count(*)::int from shared_document_answers() s where to_jsonb(s)::text like '%vendeur%'), 0,
          'buyer_c: never the summary of the seller');
select is(pg_get_function_result('public.shared_document_answers(uuid)'::regprocedure) like '%summary_seller%', false,
          'the function has no column for it');
select is(pg_get_function_result('public.shared_document_answers(uuid)'::regprocedure) ~ 'storage_path|address|owner', false,
          'nor for the file, the address or the owner');
select is((select count(*)::int from shared_document_answers(gen_random_uuid())), 0,
          'buyer_c: a listing that does not exist reads as one that shares nothing');
reset role;
select is((select count(*)::int from financing_documents f where f.buyer_id = tests.uid('buyer_c')) > 0, true,
          'buyer_c has a financing document');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from shared_document_answers() s
            where s.type::text = 'accord_principe' or s.title ilike '%financ%'), 0,
          'buyer_c: their financing document is never one of the documents read');
reset role;
select is((select count(*)::int from documents d
            join financing_documents f on f.id = d.id or f.storage_path = d.storage_path), 0,
          'a financing document is no row of the sale file, the only table the function reads');

-- ===========================================================================
-- Nobody else
-- ===========================================================================
\set who buyer_d
\ir _as.psql
select is((select count(*)::int from shared_document_answers()), 0, 'buyer_d: nothing, no share');
select is((select count(*)::int from shared_document_answers(:'listing1')), 0, 'buyer_d: nor by naming the listing');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from shared_document_answers(:'listing1')), 0, 'seller_b: nothing of the property of seller_a');
select is((select count(*)::int from shared_document_answers()), 0,
          'seller_b: the function gives what is shared with the caller, not what they own');
\set who seller_a
\ir _as.psql
select is((select count(*)::int from shared_document_answers(:'listing2')), 0, 'seller_a: nothing of the property of seller_b');
\set who admin
\ir _as.psql
select is((select count(*)::int from shared_document_answers()), 0, 'admin: nothing through the function of a buyer');

-- ===========================================================================
-- Lost with the share, with the document
-- ===========================================================================
\set who seller_a
\ir _as.psql
\o /dev/null
select document_unshare(:'doc1', tests.uid('buyer_c'));
\o
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from shared_document_answers(:'listing1')), 0, 'buyer_c: lost with the share');
select is((select string_agg(title, ',') from shared_document_answers()), 'Taxe foncière 2026',
          'buyer_c: the share of the other seller stays');
reset role;
update documents set deleted_at = now() where id = :'doc4';
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from shared_document_answers()), 0, 'buyer_c: lost with the document removed');
select is((select count(*)::int from shared_document_summaries()), 0, 'as the summaries of L3-05');

select * from finish();
rollback;
