-- L2-02: the proof of financing (SPEC-V2 4, 13 « Qualification »). A buyer
-- files a document: « Justificatif fourni »; the team checks it: « Justificatif
-- vérifié », dated and audited. Its file and its amounts are never read by a
-- seller, who sees the status, the type and the date of the check. The note of
-- the team is read by the team only. Fixtures in postal code 99990.
begin;
\ir _helpers.psql
select plan(43);
\ir _plan.psql

select tests.uid('buyer_c')::text || '/financing/' || gen_random_uuid()::text || '.pdf' as path1 \gset
select tests.uid('buyer_c')::text || '/financing/' || gen_random_uuid()::text || '.jpg' as path2 \gset
select tests.uid('buyer_d')::text || '/financing/' || gen_random_uuid()::text || '.pdf' as path_d \gset

-- seller_a: a listing online; buyer_c writes about it (the relation a seller needs).
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '6 rue du Justificatif', '99990', 'Preuveville', 90, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.3405, 48.6806), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison à vendre', 'Description.', 30000000)
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
\set who buyer_c
\ir _as.psql
update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 35000000,
       down_payment_cents = 8000000, loan_needed = true
 where profile_id = tests.uid('buyer_c');
\o /dev/null
select conversation_open(:'listing', 'Bonjour, le bien est-il toujours disponible ?');
\o

-- ===========================================================================
-- The file
-- ===========================================================================
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('documents', %L, %L)$$,
                        :'path_d', tests.uid('buyer_c')),
                 '42501', null, 'buyer_c: no file in the folder of another buyer');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('documents', %L, %L)$$,
                        tests.uid('buyer_c')::text || '/financing/x.exe', tests.uid('buyer_c')),
                 '42501', null, 'nor a file that is not a PDF or a JPEG of a document');
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('documents', %L, %L)$$,
                       :'path1', tests.uid('buyer_c')),
                'buyer_c: sends the file of its document');
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 1,
          'and reads it');

-- ===========================================================================
-- Filing
-- ===========================================================================
select throws_ok(format($$insert into financing_documents (buyer_id, type, document_date, storage_path, mime_type, size_bytes)
                          values (%L, 'accord_principe', current_date, %L, 'application/pdf', 1000)$$,
                        tests.uid('buyer_c'), :'path1'),
                 '42501', null, 'buyer_c: never writes the table itself');
select throws_ok(format($$select financing_document_add('accord_principe', current_date, %L, 'application/pdf', 1000)$$, :'path_d'),
                 '42501', null, 'nor files the file of another buyer');
select throws_ok(format($$select financing_document_add('accord_principe', current_date, %L, 'application/pdf', 1000)$$, :'path2'),
                 '22023', 'the file of the document is missing', 'nor a file that was not sent');
select throws_ok(format($$select financing_document_add('accord_principe', current_date + 2, %L, 'application/pdf', 1000)$$, :'path1'),
                 '22023', null, 'nor a document dated in the future');
select financing_document_add('simulation_bancaire', current_date - 120, :'path1', 'application/pdf', 250000) as doc1 \gset
select is((select array[financing_status::text, current_financing_document_id::text, financing_checked_at::text]
             from buyer_profiles where profile_id = tests.uid('buyer_c')),
          array['document_provided', :'doc1', null],
          'buyer_c: files its document: « Justificatif fourni », the one in force');
select throws_ok(format($$update financing_documents set checked_at = now() where id = %L$$, :'doc1'),
                 '42501', null, 'buyer_c: does not check it itself');
select throws_ok(format($$select financing_document_check(%L)$$, :'doc1'),
                 '42501', null, 'nor through the function of the team');
select throws_ok($$update buyer_profiles set financing_status = 'document_checked' where profile_id = tests.uid('buyer_c')$$,
                 '42501', null, 'nor its status');
select throws_ok(format($$select check_note from financing_documents where id = %L$$, :'doc1'),
                 '42501', null, 'the note of the team is not readable by a buyer');
select is((select count(*) from financing_documents where id = :'doc1')::int, 1, 'buyer_c: reads its document');
delete from storage.objects where bucket_id = 'documents' and name = :'path1';
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 1,
          'the file of a document in force cannot be removed');
-- Changing the project keeps the status of the document.
update buyer_profiles set budget_max_cents = 36000000 where profile_id = tests.uid('buyer_c');
select is((select financing_status from buyer_profiles where profile_id = tests.uid('buyer_c')),
          'document_provided'::financing_status, 'saving the project keeps « Justificatif fourni »');

-- ===========================================================================
-- Who reads it
-- ===========================================================================
\set who buyer_d
\ir _as.psql
select is((select count(*) from financing_documents where id = :'doc1')::int, 0,
          'buyer_d: not the document of another buyer');
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 0,
          'nor its file');
select throws_ok(format($$select financing_document_remove(%L)$$, :'doc1'), '42501', null,
                 'nor remove it');
\set who seller_a
\ir _as.psql
select is((select count(*) from financing_documents where id = :'doc1')::int, 0,
          'seller_a: never the document of a buyer, even one who wrote to it');
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 0,
          'nor its file');
select is((select array[financing_status::text, financing_document_type::text, financing_checked_at::text]
             from buyer_summary_for_seller(:'prop') where buyer_id = tests.uid('buyer_c')),
          array['document_provided', 'simulation_bancaire', null],
          'seller_a: the status and the type of the document, through buyer_summary_for_seller');
select throws_ok(format($$select * from admin_financing_documents(%L)$$, tests.uid('buyer_c')),
                 '42501', null, 'not the view of the team');
\set who seller_b
\ir _as.psql
select is((select count(*) from buyer_summary_for_seller(:'prop'))::int, 0,
          'seller_b: nothing about the buyers of another seller');
\set who anon
\ir _as.psql
select throws_ok('select count(*) from financing_documents', '42501', null, 'a visitor: no documents');
select is((select count(*) from storage.objects where bucket_id = 'documents')::int, 0, 'nor their files');

-- ===========================================================================
-- The check of the team
-- ===========================================================================
\set who admin
\ir _as.psql
select is((select count(*) from financing_documents where id = :'doc1')::int, 1, 'admin: reads the document');
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 1,
          'and its file');
select lives_ok(format($$select financing_document_check(%L, 'Simulation au nom de l''acquéreur, cohérente.')$$, :'doc1'),
                'admin: marks the document as checked, with a note');
select ok((select financing_status = 'document_checked' and financing_checked_at is not null
             from buyer_profiles where profile_id = tests.uid('buyer_c')),
          '« Justificatif vérifié », dated');
select ok(exists (select 1 from audit_log where action = 'financing.check' and entity_id = :'doc1'
                     and actor_id = tests.uid('admin')),
          'in the audit log');
select is((select array[check_note, checked_by_name, is_current::text]
             from admin_financing_documents(tests.uid('buyer_c')) where id = :'doc1'),
          array['Simulation au nom de l''acquéreur, cohérente.', 'Cédric', 'true'],
          'admin: its note and who checked, through its function');
select throws_ok(format($$select financing_document_check(%L)$$, :'doc1'), '22023', null,
                 'a document is checked once');
\set who seller_a
\ir _as.psql
select ok((select financing_status = 'document_checked' and financing_checked_at is not null
             from buyer_summary_for_seller(:'prop') where buyer_id = tests.uid('buyer_c')),
          'seller_a: « Justificatif vérifié » and the date of the check');

-- ===========================================================================
-- An offer sent takes the document in force
-- ===========================================================================
\set who buyer_c
\ir _as.psql
insert into offers (listing_id, buyer_id, buyer_identity, price_cents, financing_mode, down_payment_cents,
                    loan_amount_cents, loan_duration_years, loan_rate_max_pct, validity_until, visited, declarations)
values (:'listing', tests.uid('buyer_c'),
        '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
          "email":"chloe@example.test","phone":"0600000000"}',
        29000000, 'loan', 8000000, 21000000, 20, 4.00, now() + interval '5 days', true,
        '{"accuracy":true,"price_and_financing_checked":true,"legal_effects_understood":true,"info_read":true}')
returning id as offer1 \gset
\o /dev/null
select offer_submit(:'offer1');
\o
select is((select array[financing_document_id::text, financing_status_at_submit::text] from offers where id = :'offer1'),
          array[:'doc1', 'document_checked'],
          'the offer sent carries the document in force and its status');

-- ===========================================================================
-- A new document, then removed
-- ===========================================================================
insert into storage.objects (bucket_id, name, owner) values ('documents', :'path2', tests.uid('buyer_c'));
select financing_document_add('accord_principe', current_date - 5, :'path2', 'image/jpeg', 900000) as doc2 \gset
select is((select array[financing_status::text, current_financing_document_id::text, financing_checked_at::text]
             from buyer_profiles where profile_id = tests.uid('buyer_c')),
          array['document_provided', :'doc2', null],
          'a new document replaces the one in force: to check again');
select lives_ok(format($$select financing_document_remove(%L)$$, :'doc2'), 'buyer_c: removes it');
select is((select array[financing_status::text, current_financing_document_id::text]
             from buyer_profiles where profile_id = tests.uid('buyer_c')),
          array['declared', null], 'back to « Informations déclarées », no document in force');
delete from storage.objects where bucket_id = 'documents' and name = :'path2';
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path2')::int, 0,
          'the file of a document removed goes with it');
select lives_ok(format($$select financing_document_remove(%L)$$, :'doc1'), 'buyer_c: removes the first one too');
delete from storage.objects where bucket_id = 'documents' and name = :'path1';
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 1,
          'but the file of a document carried by an offer sent is kept');
\set who admin
\ir _as.psql
select throws_ok(format($$select financing_document_check(%L)$$, :'doc2'), '22023', null,
                 'admin: a document removed is no longer to check');
select is((select count(*) from admin_financing_documents(tests.uid('buyer_c')))::int, 2,
          'admin: the history of the documents of the buyer, removed ones included');

select * from finish();
rollback;
