-- L3-05: the analysis of the documents of a sale file (SPEC-V2 15). It is
-- written by the scheduled task alone (service role): a client never writes
-- an analysis, its date nor the display of its facts on the listing, and
-- never claims a document. The seller reads the analyses of their property,
-- a buyer the summary of the documents shared with them (lost when the share
-- or the document goes), anyone the facts a seller shows on a listing online.
-- Only the sale file is queued, never a financing document. Fixtures in
-- postal code 99989.
begin;
\ir _helpers.psql
select plan(48);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '3 rue de la Lecture', '99989', 'Lectureville', 60, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.41, 48.76), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Appartement lu', 'Description.', 25000000)
returning id as listing \gset
\o /dev/null
select tests.dpe(:'listing');
select listing_submit(:'listing');
\o
select :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path1,
       :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path2,
       :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path3 \gset
insert into storage.objects (bucket_id, name, owner, metadata) values
  ('documents', :'path1', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}'),
  ('documents', :'path2', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}'),
  ('documents', :'path3', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}');
select document_add(:'prop', 'dpe', 'DPE 2025', :'path1') as doc1 \gset
select document_add(:'prop', 'pv_ag', 'PV illisible', :'path2') as doc2 \gset
select document_add(:'prop', 'erp', 'ERP', :'path3') as doc3 \gset
-- A financing document of a buyer: never in the queue of the analyses.
reset role;
insert into financing_documents (buyer_id, type, document_date, storage_path, mime_type, size_bytes)
values (tests.uid('buyer_c'), 'accord_principe', current_date,
        tests.uid('buyer_c') || '/financing/' || gen_random_uuid() || '.pdf', 'application/pdf', 1000);
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing');
\o
\set who buyer_c
\ir _as.psql
\o /dev/null
select conversation_open(:'listing', 'Bonjour, puis-je voir le dossier ?');
\o
-- The documents filed before this test (a seeded database) are not its matter.
reset role;
update documents set analysis_attempts = 3 where property_id <> :'prop' and analyzed_at is null;

select '{"type_detected": "dpe", "date": "2025-03-14",
         "key_facts": [{"label": "Classe énergie", "value": "C"}],
         "points_of_attention": [{"level": "info", "text": "Rien à signaler."}],
         "summary_seller": "Résumé pour le vendeur.", "summary_buyer": "Résumé pour l''acquéreur.",
         "public_facts": {"classe_energie": "C", "classe_ges": "D"},
         "quality": "ok", "quality_note": null}' as analysis_ok,
       '{"type_detected": "autre", "date": null, "key_facts": [], "points_of_attention": [],
         "summary_seller": "Document illisible.", "summary_buyer": "Document illisible.",
         "public_facts": {}, "quality": "illegible", "quality_note": "Pages floues."}' as analysis_bad \gset

-- ===========================================================================
-- A client never writes an analysis, never takes the queue
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$update documents set analysis = '{"quality":"ok"}' where id = %L$$, :'doc1'),
                 '42501', null, 'seller_a: never writes the analysis');
select throws_ok(format($$update documents set analyzed_at = now() where id = %L$$, :'doc1'),
                 '42501', null, 'seller_a: nor its date');
select throws_ok(format($$update documents set public_facts_approved_at = now() where id = %L$$, :'doc1'),
                 '42501', null, 'seller_a: nor the display of its facts, by a direct update');
select throws_ok(format($$update documents set analysis_attempts = 0, analysis_error = null where id = %L$$, :'doc1'),
                 '42501', null, 'seller_a: nor the state of the queue');
select throws_ok(format($$select analysis, analysis_error from documents where id = %L$$, :'doc1'),
                 '42501', null, 'seller_a: the analysis is not a readable column');
select throws_ok('select * from document_analysis_claim(5)', '42501', null, 'seller_a: does not claim documents');
select throws_ok(format($$select document_analysis_record(%L, %L::jsonb)$$, :'doc1', :'analysis_ok'),
                 '42501', null, 'seller_a: does not record an analysis');
select throws_ok(format($$select document_analysis_fail(%L, 'invalid', true)$$, :'doc1'),
                 '42501', null, 'seller_a: nor a failure');
select throws_ok(format($$insert into ai_conversations (profile_id, context, kind, property_id) values (%L, 'seller', 'document_analysis', %L)$$,
                        tests.uid('seller_a'), :'prop'),
                 '42501', null, 'seller_a: logs no analysis of their own');
\set who anon
\ir _as.psql
select throws_ok('select * from document_analysis_claim(5)', '42501', null, 'anon: does not claim documents');
select throws_ok(format($$select * from document_analyses(%L)$$, :'prop'), '42501', null, 'anon: reads no analysis');
select throws_ok('select * from shared_document_summaries()', '42501', null, 'anon: reads no summary');

-- ===========================================================================
-- The queue (service role): the sale file only, each document once
-- ===========================================================================
reset role;
set local role service_role;
create temp table claimed as select * from document_analysis_claim(10);
reset role;
grant all on claimed to authenticated, anon, service_role;
select is((select array_agg(document_id order by document_id) from claimed),
          (select array_agg(id order by id) from documents where property_id = :'prop'),
          'the queue gives the documents of the sale file that wait');
select is((select count(*)::int from claimed c where not exists (select 1 from documents d where d.id = c.document_id)), 0,
          'and nothing else: every row is a document of a sale file');
select is((select count(*)::int from claimed c
            join financing_documents f on f.id = c.document_id or f.storage_path = c.storage_path), 0,
          'never a financing document');
select is((select bool_and(storage_path like property_id || '/sale/%') from claimed), true,
          'their files are those of the sale file of their property');
select is((select min(owner_id::text) || '|' || min(attempt) from claimed), tests.uid('seller_a') || '|1',
          'with the owner of the property and the attempt');
set local role service_role;
select is((select count(*)::int from document_analysis_claim(10)), 0, 'a document claimed is not claimed again');
select is(document_analysis_record(:'doc1', :'analysis_ok'::jsonb), true, 'the task records an analysis');
select is(document_analysis_record(:'doc1', :'analysis_bad'::jsonb), false, 'once: a second one changes nothing');
select throws_ok(format($$select document_analysis_record(%L, '{"quality": "parfait"}'::jsonb)$$, :'doc2'),
                 '22023', null, 'what is not an analysis is refused');
select is(document_analysis_record(:'doc2', :'analysis_bad'::jsonb), true, 'a document read as illegible');
select lives_ok(format($$select document_analysis_fail(%L, 'too_long', true)$$, :'doc3'), 'a document the model cannot read');
reset role;
select is((select data->>'document_title' || '|' || (data->>'quality') || '|' || link || '|' || (email_after is not null)::text
             from notifications where profile_id = tests.uid('seller_a') and type = 'document.needs_attention'),
          'PV illisible|illegible|/vendeur/biens/' || :'prop' || '/documents|true',
          'a document to check tells its seller, by email too');
select is((select count(*)::int from notifications where type = 'document.needs_attention'
            and profile_id = tests.uid('seller_a')), 1, 'a document read without trouble tells nobody');

-- ===========================================================================
-- The seller reads the analyses of their property, and asks again
-- ===========================================================================
\set who seller_a
\ir _as.psql
select is((select string_agg(status || ':' || coalesce(error, '-'), ',' order by status) from document_analyses(:'prop')),
          'done:-,done:-,failed:too_long', 'seller_a: where each analysis stands');
select is((select analysis->>'summary_seller' from document_analyses(:'prop') where document_id = :'doc1'),
          'Résumé pour le vendeur.', 'seller_a: reads the analysis of their document');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from document_analyses(:'prop')), 0, 'seller_b: reads no analysis of seller_a');
select throws_ok(format($$select document_analysis_retry(%L)$$, :'doc3'), '42501', null, 'seller_b: asks for none again');
select throws_ok(format($$select document_public_facts_set(%L, true)$$, :'doc1'), '42501', null,
                 'seller_b: shows nothing on the listing of seller_a');
\set who admin
\ir _as.psql
select is((select count(*)::int from document_analyses(:'prop')), 3, 'admin: reads the analyses');
\set who seller_a
\ir _as.psql
select throws_ok(format($$select document_analysis_retry(%L)$$, :'doc1'), '22023', null,
                 'seller_a: an analysis written is not asked again');
select lives_ok(format($$select document_analysis_retry(%L)$$, :'doc3'), 'seller_a: asks again for one that failed');
select is((select status || '|' || retries_left from document_analyses(:'prop') where document_id = :'doc3'),
          'pending|2', 'it waits again, two retries left today');
reset role;
update documents set analysis_attempts = 3, analysis_retried_at = array[now(), now(), now()] where id = :'doc3';
\set who seller_a
\ir _as.psql
select throws_ok(format($$select document_analysis_retry(%L)$$, :'doc3'), '54000', null,
                 'seller_a: three retries a day per document');

-- ===========================================================================
-- The facts on the listing: shown by the seller, read by anyone
-- ===========================================================================
\set who anon
\ir _as.psql
select is((select count(*)::int from public_document_facts(:'listing')), 0, 'anon: nothing before the seller says so');
\set who seller_a
\ir _as.psql
select throws_ok(format($$select document_public_facts_set(%L, true)$$, :'doc2'), '22023', null,
                 'seller_a: a document to check shows nothing');
select lives_ok(format($$select document_public_facts_set(%L, true)$$, :'doc1'), 'seller_a: shows the facts of the DPE');
\set who anon
\ir _as.psql
select is((select type || '|' || (facts->>'classe_energie') || '|' || (facts->>'classe_ges') from public_document_facts(:'listing')),
          'dpe|C|D', 'anon: reads the facts shown, with the type of their document');
select is(pg_get_function_result('public.public_document_facts(uuid)'::regprocedure),
          'TABLE(type document_type, facts jsonb)', 'never a title, never a file: a type and its facts');
\set who seller_a
\ir _as.psql
\o /dev/null
select listing_pause(:'listing');
\o
\set who anon
\ir _as.psql
select is((select count(*)::int from public_document_facts(:'listing')), 0, 'anon: nothing of a listing that is not online');
\set who seller_a
\ir _as.psql
\o /dev/null
select listing_resume(:'listing');
\o
select lives_ok(format($$select document_public_facts_set(%L, false)$$, :'doc1'), 'seller_a: takes them off');
\set who anon
\ir _as.psql
select is((select count(*)::int from public_document_facts(:'listing')), 0, 'anon: nothing once taken off');

-- ===========================================================================
-- A buyer: the summary of the documents shared with them only
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from shared_document_summaries()), 0, 'buyer_c: no summary of a document not shared');
\set who seller_a
\ir _as.psql
\o /dev/null
select document_share(array[:'doc1', :'doc3']::uuid[], tests.uid('buyer_c'));
\o
\set who buyer_c
\ir _as.psql
select is((select string_agg(title || '|' || summary_buyer || '|' || type_detected || '|' || document_date, ',') from shared_document_summaries()),
          'DPE 2025|Résumé pour l''acquéreur.|dpe|2025-03-14',
          'buyer_c: the summary meant for a buyer, of the analysed document shared with them');
\set who buyer_d
\ir _as.psql
select is((select count(*)::int from shared_document_summaries()), 0, 'buyer_d: none');
\set who seller_a
\ir _as.psql
\o /dev/null
select document_unshare(:'doc1', tests.uid('buyer_c'));
\o
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from shared_document_summaries()), 0, 'buyer_c: lost with the share');
\set who seller_a
\ir _as.psql
\o /dev/null
select document_share(array[:'doc1']::uuid[], tests.uid('buyer_c'));
\o
update documents set deleted_at = now() where id = :'doc1';
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from shared_document_summaries()), 0, 'buyer_c: lost with the document removed');

select * from finish();
rollback;
