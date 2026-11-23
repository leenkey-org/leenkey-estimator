-- The identity check of a buyer before a visit (DECISIONS.md 2026-11-23). A
-- buyer deposits ONE identity document: « Pièce d'identité déposée »; the
-- team marks it as checked or refuses it with a reason the buyer reads, both
-- audited, the buyer told. Its file is read by its buyer and the team only,
-- and deleted once the document is checked or refused. Booking a visit asks
-- for a document deposited, never for the check of the team. A seller reads a
-- status only, for the buyers they invited or who booked. The note of the
-- team and who decided are read by the team only. The account: export
-- (metadata), closure, anonymisation. Fixtures in postal code 99988.
begin;
\ir _helpers.psql
select plan(121);
\ir _plan.psql
-- The storage service deletes a file this way (storage.protect_delete): as
-- the user, under the RLS.
select set_config('storage.allow_delete_query', 'true', false) \gset

select tests.uid('buyer_c')::text || '/identity/' || gen_random_uuid()::text || '.pdf' as path1 \gset
select tests.uid('buyer_c')::text || '/identity/' || gen_random_uuid()::text || '.jpg' as path2 \gset
select tests.uid('buyer_c')::text || '/identity/' || gen_random_uuid()::text || '.pdf' as path3 \gset
select tests.uid('buyer_d')::text || '/identity/' || gen_random_uuid()::text || '.pdf' as path_d \gset
select tests.uid('buyer_c') as buyer_c, tests.uid('buyer_d') as buyer_d \gset

-- seller_a: a listing online, two slots; seller_b: a listing online. buyer_c
-- and buyer_d write to seller_a (the relation an invitation needs).
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '8 rue de l''Identité', '99988', 'Pièceville', 90, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.3405, 48.6806), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison à visiter', 'Description.', 30000000)
returning id as listing \gset
\o /dev/null
select tests.dpe(:'listing');
select listing_submit(:'listing');
\o
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_b'), 'appartement', '9 rue de l''Identité', '99988', 'Pièceville', 50, 2,
        extensions.st_setsrid(extensions.st_makepoint(2.3406, 48.6807), 4326)::extensions.geography)
returning id as prop_b \gset
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing');
\o
\set who buyer_c
\ir _as.psql
\o /dev/null
select conversation_open(:'listing', 'Bonjour, une visite est-elle possible ?');
\o
\set who buyer_d
\ir _as.psql
\o /dev/null
select conversation_open(:'listing', 'Bonjour, je souhaite visiter.');
\o
\set who seller_a
\ir _as.psql
select visit_slot_add(:'prop', now() + interval '2 days', 30) as slot1 \gset
select visit_slot_add(:'prop', now() + interval '3 days', 30) as slot2 \gset
select token as token_c from visit_invite(:'prop', tests.uid('buyer_c')) \gset

-- ===========================================================================
-- Without a document: no booking
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from visit_open_slots(:'token_c')), 2,
          'buyer_c, invited, without a document: reads the free slots');
select throws_ok(format($$select visit_book(%L, %L)$$, :'token_c', :'slot1'),
                 '55000', 'the identity document is missing',
                 'but books none before an identity document is deposited');
select throws_ok(format($$select identity_status_of(%L)$$, tests.uid('buyer_c')), '42501', null,
                 'the status function is not callable by a client');

-- ===========================================================================
-- The file
-- ===========================================================================
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('documents', %L, %L)$$,
                        :'path_d', tests.uid('buyer_c')),
                 '42501', null, 'buyer_c: no file in the folder of another buyer');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('documents', %L, %L)$$,
                        tests.uid('buyer_c')::text || '/identity/' || gen_random_uuid()::text || '.exe', tests.uid('buyer_c')),
                 '42501', null, 'nor a file that is not a PDF or a JPEG');
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner, metadata)
                          values ('documents', %L, %L, '{"mimetype":"application/pdf","size":250000}')$$,
                       :'path1', tests.uid('buyer_c')),
                'buyer_c: sends the file of its document');
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 1,
          'and reads it');

-- ===========================================================================
-- Depositing
-- ===========================================================================
select throws_ok(format($$insert into identity_documents (buyer_id, type, storage_path, mime_type, size_bytes)
                          values (%L, 'passeport', %L, 'application/pdf', 1000)$$,
                        tests.uid('buyer_c'), :'path1'),
                 '42501', null, 'buyer_c: never writes the table itself');
select throws_ok(format($$select identity_document_add('passeport', %L, 'application/pdf', 1000)$$, :'path_d'),
                 '42501', null, 'nor deposits the file of another buyer');
select throws_ok(format($$select identity_document_add('passeport', %L, 'image/jpeg', 1000)$$, :'path2'),
                 '22023', 'the file of the document is missing', 'nor a file that was not sent');
select throws_ok(format($$select identity_document_add('permis', %L, 'application/pdf', 1000)$$, :'path1'),
                 '22P02', null, 'nor a document of a type out of the list');
select identity_document_add('passeport', :'path1', 'application/pdf', 250000) as doc1 \gset
select is((select array[type::text, (checked_at is null)::text, (refused_at is null)::text, (withdrawn_at is null)::text]
             from identity_documents where id = :'doc1'),
          array['passeport', 'true', 'true', 'true'],
          'buyer_c: deposits its document, and reads it');
select throws_ok(format($$update identity_documents set checked_at = now() where id = %L$$, :'doc1'),
                 '42501', null, 'buyer_c: does not check it itself');
select throws_ok(format($$select identity_document_check(%L)$$, :'doc1'),
                 '42501', null, 'nor through the function of the team');
select throws_ok(format($$select identity_document_refuse(%L, 'Illisible.')$$, :'doc1'),
                 '42501', null, 'nor refuses it');
select throws_ok(format($$select team_note from identity_documents where id = %L$$, :'doc1'),
                 '42501', null, 'the note of the team is not readable by a buyer');
select throws_ok(format($$select decided_by from identity_documents where id = %L$$, :'doc1'),
                 '42501', null, 'nor who decided');
select throws_ok('select * from identity_documents', '42501', null, 'nor every column at once');
update storage.objects set name = :'path2' where bucket_id = 'documents' and name = :'path1';
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 1,
          'a file is never replaced nor renamed');
delete from storage.objects where bucket_id = 'documents' and name = :'path1';
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 1,
          'the file of a document that waits for its check cannot be removed');
select throws_ok(format($$select identity_document_file_removed(%L)$$, :'doc1'), '22023', null,
                 'nor said removed');

-- A file whose type, as the storage knows it, is not the one of its name.
select tests.uid('buyer_c')::text || '/identity/' || gen_random_uuid()::text || '.jpg' as path_png \gset
insert into storage.objects (bucket_id, name, owner, metadata)
values ('documents', :'path_png', tests.uid('buyer_c'), '{"mimetype":"image/png","size":1200}');
select throws_ok(format($$select identity_document_add('carte_identite', %L, 'image/jpeg', 1200)$$, :'path_png'),
                 '22023', 'the file of the document is not accepted',
                 'a file sent directly under another type than its name is refused');
delete from storage.objects where bucket_id = 'documents' and name = :'path_png';
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path_png')::int, 0,
          'a file never declared is taken back by its buyer');
-- A file whose type and size the storage does not know: nothing declared is trusted.
select tests.uid('buyer_c')::text || '/identity/' || gen_random_uuid()::text || '.pdf' as path_bare \gset
insert into storage.objects (bucket_id, name, owner) values ('documents', :'path_bare', tests.uid('buyer_c'));
select throws_ok(format($$select identity_document_add('carte_identite', %L, 'application/pdf', 1200)$$, :'path_bare'),
                 '22023', 'the file of the document is not accepted',
                 'a file whose type and size the storage does not know is refused');
delete from storage.objects where bucket_id = 'documents' and name = :'path_bare';

-- ===========================================================================
-- Deposited, not checked: the booking goes through
-- ===========================================================================
select lives_ok(format($$select visit_book(%L, %L)$$, :'token_c', :'slot1'),
                'buyer_c: books a slot once the document is deposited, before any check of the team');

-- ===========================================================================
-- Who reads it
-- ===========================================================================
\set who buyer_d
\ir _as.psql
select is((select count(*) from identity_documents)::int, 0, 'buyer_d: not the document of another buyer');
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 0,
          'nor its file');
select throws_ok(format($$select identity_document_remove(%L)$$, :'doc1'), '42501', null, 'nor withdraws it');
select throws_ok(format($$select identity_document_file_removed(%L)$$, :'doc1'), '42501', null,
                 'nor says its file removed');
select is((select count(*) from buyer_identity_for_seller(:'prop'))::int, 0,
          'nor the status of the buyers of a property not theirs');
\set who seller_a
\ir _as.psql
select is((select count(*) from identity_documents)::int, 0,
          'seller_a: never the document of a buyer, even one who booked a visit');
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 0,
          'nor its file');
select is((select identity_status::text from buyer_identity_for_seller(:'prop') where buyer_id = tests.uid('buyer_c')),
          'provided', 'seller_a: the status of the buyer they invited: deposited');
select is((select count(*) from buyer_identity_for_seller(:'prop') where buyer_id = tests.uid('buyer_d'))::int, 0,
          'nothing about a buyer who wrote but was neither invited nor booked');
select throws_ok(format($$select * from admin_identity_documents(%L)$$, tests.uid('buyer_c')),
                 '42501', null, 'not the view of the team');
select throws_ok(format($$select identity_document_check(%L)$$, :'doc1'), '42501', null,
                 'seller_a: checks no document');
select throws_ok(format($$select identity_document_opened(%L)$$, :'doc1'), '42501', null,
                 'nor records the opening of a file');
\o /dev/null
select visit_invite(:'prop', tests.uid('buyer_d'));
\o
select is((select identity_status::text from buyer_identity_for_seller(:'prop') where buyer_id = tests.uid('buyer_d')),
          'not_provided', 'seller_a: a buyer invited who deposited nothing: not provided');
\set who seller_b
\ir _as.psql
select is((select count(*) from buyer_identity_for_seller(:'prop'))::int, 0,
          'seller_b: nothing about the buyers of another seller');
select is((select count(*) from buyer_identity_for_seller(:'prop_b'))::int, 0,
          'nor about buyers they never invited, on their own property');
\set who anon
\ir _as.psql
select throws_ok('select count(*) from identity_documents', '42501', null, 'a visitor: no documents');
select throws_ok(format($$select identity_document_remove(%L)$$, :'doc1'), '42501', null, 'nor their functions');
select throws_ok(format($$select * from buyer_identity_for_seller(%L)$$, :'prop'), '42501', null,
                 'nor the status of a buyer');
select throws_ok(format($$select identity_file_ended(%L)$$, :'path1'), '42501', null,
                 'nor whether a document reached its end');
select is((select count(*) from storage.objects where bucket_id = 'documents')::int, 0, 'nor their files');

-- ===========================================================================
-- Replaced by its buyer
-- ===========================================================================
\set who buyer_c
\ir _as.psql
insert into storage.objects (bucket_id, name, owner, metadata)
values ('documents', :'path2', tests.uid('buyer_c'), '{"mimetype":"image/jpeg","size":900000}');
select identity_document_add('carte_identite', :'path2', 'image/jpeg', 900000) as doc2 \gset
select ok((select withdrawn_at is not null from identity_documents where id = :'doc1'),
          'a new document replaces the one that waited: withdrawn');
select is((select count(*)::int from identity_documents
            where buyer_id = tests.uid('buyer_c') and refused_at is null and withdrawn_at is null), 1,
          'ONE document per buyer');
delete from storage.objects where bucket_id = 'documents' and name = :'path1';
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path1')::int, 0,
          'the file of the document replaced goes with it');
select lives_ok(format($$select identity_document_file_removed(%L)$$, :'doc1'),
                'and its buyer says it removed');
select ok((select file_deleted_at is not null from identity_documents where id = :'doc1'),
          'the document says its file is deleted');

-- ===========================================================================
-- The check of the team
-- ===========================================================================
\set who admin
\ir _as.psql
select is((select count(*) from identity_documents where id = :'doc2')::int, 1, 'admin: reads the document');
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path2')::int, 1,
          'and its file');
delete from storage.objects where bucket_id = 'documents' and name = :'path2';
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path2')::int, 1,
          'admin: does not delete the file of a document not yet decided');
select lives_ok(format($$select identity_document_opened(%L)$$, :'doc2'),
                'admin: the opening of the file is recorded');
select throws_ok(format($$select identity_document_opened(%L)$$, gen_random_uuid()), '42501', null,
                 'not of a document that does not exist');
reset role;
select is((select array[actor_id::text, meta->>'buyer_id'] from audit_log
            where action = 'identity.opened' and entity_id = :'doc2'),
          array[tests.uid('admin')::text, tests.uid('buyer_c')::text],
          'in the audit log, with who opened it');
\set who admin
\ir _as.psql
select throws_ok(format($$select identity_document_refuse(%L, 'x')$$, :'doc2'), '22023', null,
                 'a refusal asks for a reason');
select throws_ok(format($$select identity_document_check(%L)$$, :'doc1'), '22023', null,
                 'a document withdrawn is no longer to check');
select lives_ok(format($$select identity_document_check(%L, 'Carte lisible, au nom du compte.')$$, :'doc2'),
                'admin: marks the document as checked, with a note');
select throws_ok(format($$select identity_document_check(%L)$$, :'doc2'), '22023', null,
                 'a document is decided once');
select throws_ok(format($$select identity_document_refuse(%L, 'Illisible.')$$, :'doc2'), '22023', null,
                 'checked, it is no longer refused');
select is((select array[team_note, decided_by_name, (checked_at is not null)::text]
             from admin_identity_documents(tests.uid('buyer_c')) where id = :'doc2'),
          array['Carte lisible, au nom du compte.', 'Cédric', 'true'],
          'admin: its note and who decided, through its function');
select is((select count(*)::int from admin_identity_documents(tests.uid('buyer_c'))), 2,
          'admin: the history of the documents of the buyer');
select throws_ok(format($$select identity_document_file_removed(%L)$$, :'doc2'), '22023', null,
                 'admin: a file still stored is not said deleted');
reset role;
select is((select array[actor_id::text, meta->>'buyer_id', (meta ? 'type')::text] from audit_log
            where action = 'identity.check' and entity_id = :'doc2'),
          array[tests.uid('admin')::text, tests.uid('buyer_c')::text, 'false'],
          'the check is in the audit log, without the type of the document');
select is((select row(profile_id, link, email_after is not null)::text
             from notifications where type = 'identity.checked' and data->>'document_id' = :'doc2'),
          row(tests.uid('buyer_c'), '/acquereur/profil#identite', true)::text,
          'its buyer is told the identity is checked, by email too');
select is((select count(*)::int from notifications where type like 'identity.%' and profile_id <> tests.uid('buyer_c')), 0,
          'and nobody else');

-- The file of a checked document: the team alone deletes it.
\set who buyer_d
\ir _as.psql
delete from storage.objects where bucket_id = 'documents' and name = :'path2';
\set who seller_a
\ir _as.psql
delete from storage.objects where bucket_id = 'documents' and name = :'path2';
select is(identity_file_ended(:'path2'), false,
          'seller_a: the function that opens the deletion says no to who is not of the team');
reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path2'), 1,
          'another buyer and a seller never delete the file of a checked document');
\set who admin
\ir _as.psql
delete from storage.objects where bucket_id = 'documents' and name = :'path2';
reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path2'), 0,
          'admin: deletes the file of a checked document');
\set who admin
\ir _as.psql
select lives_ok(format($$select identity_document_file_removed(%L)$$, :'doc2'),
                'admin: the document says its file is deleted');
select file_deleted_at as deleted_at from identity_documents where id = :'doc2' \gset
select lives_ok(format($$select identity_document_file_removed(%L)$$, :'doc2'),
                'said again (« Supprimer le fichier » tried twice), nothing breaks');
select is((select file_deleted_at from identity_documents where id = :'doc2'), :'deleted_at'::timestamptz,
          'the date of the deletion is written once');
reset role;
select is((select count(*)::int from audit_log where action = 'identity.file_deleted' and entity_id = :'doc2'
              and actor_id = tests.uid('admin')), 1,
          'and the audit log says who deleted the file, once');
select is((select count(*)::int from audit_log where action = 'identity.file_deleted' and entity_id = :'doc1'), 0,
          'a file removed by its buyer is not an act of the team');

\set who seller_a
\ir _as.psql
select is((select identity_status::text from buyer_identity_for_seller(:'prop') where buyer_id = tests.uid('buyer_c')),
          'checked', 'seller_a: « Identité vérifiée par Leenkey »');
select is((select string_agg(a.name, ',' order by a.ord)
             from pg_proc p, unnest(p.proargnames, p.proargmodes) with ordinality as a(name, mode, ord)
            where p.proname = 'buyer_identity_for_seller' and a.mode = 't'),
          'buyer_id,identity_status', 'a status only: never the type, a date nor a file');
\set who buyer_c
\ir _as.psql
select is((select row(checked_at is not null, file_deleted_at is not null)::text
             from identity_documents where id = :'doc2'),
          row(true, true)::text, 'buyer_c: reads its identity checked, its file deleted');
select throws_ok(format($$select identity_document_remove(%L)$$, :'doc2'), '42501', null,
                 'a checked identity is not withdrawn');
insert into storage.objects (bucket_id, name, owner, metadata)
values ('documents', :'path3', tests.uid('buyer_c'), '{"mimetype":"application/pdf","size":250000}');
select throws_ok(format($$select identity_document_add('passeport', %L, 'application/pdf', 1000)$$, :'path3'),
                 '22023', 'the identity is already checked', 'nor deposited again');
delete from storage.objects where bucket_id = 'documents' and name = :'path3';

-- ===========================================================================
-- A refusal
-- ===========================================================================
\set who buyer_d
\ir _as.psql
select token as token_d from visit_invitations where property_id = :'prop' and buyer_id = tests.uid('buyer_d') \gset
insert into storage.objects (bucket_id, name, owner, metadata)
values ('documents', :'path_d', tests.uid('buyer_d'), '{"mimetype":"application/pdf","size":250000}');
select identity_document_add('titre_sejour', :'path_d', 'application/pdf', 1000) as doc_d \gset
\set who admin
\ir _as.psql
select lives_ok(format($$select identity_document_refuse(%L, 'Le document est illisible : envoyez une photo nette.', 'Flou.')$$, :'doc_d'),
                'admin: refuses a document, with a reason for its buyer and a note for the team');
delete from storage.objects where bucket_id = 'documents' and name = :'path_d';
\o /dev/null
select identity_document_file_removed(:'doc_d');
\o
reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path_d'), 0,
          'the file of a refused document is deleted by the team');
select is((select array[actor_id::text, coalesce(meta::text, '')] from audit_log
            where action = 'identity.refuse' and entity_id = :'doc_d'),
          array[tests.uid('admin')::text, ''],
          'the refusal is in the audit log: the document only, never its reason');
select ok(not exists (select 1 from audit_log
                       where entity_id = :'doc_d' and meta::text like '%illisible%'),
          'the reason of a refusal is nowhere in the audit log');
select is((select row(profile_id, data->>'reason', email_after is not null)::text
             from notifications where type = 'identity.refused' and data->>'document_id' = :'doc_d'),
          row(tests.uid('buyer_d'), 'Le document est illisible : envoyez une photo nette.', true)::text,
          'its buyer is told, with the reason, by email too');
\set who buyer_d
\ir _as.psql
select is((select refusal_reason from identity_documents where id = :'doc_d'),
          'Le document est illisible : envoyez une photo nette.', 'buyer_d: reads the reason of the refusal');
select throws_ok(format($$select team_note from identity_documents where id = %L$$, :'doc_d'),
                 '42501', null, 'never the note of the team');
select throws_ok(format($$select visit_book(%L, %L)$$, :'token_d', :'slot2'),
                 '55000', null, 'a refused document is not a document deposited: no booking');
\set who seller_a
\ir _as.psql
select is((select identity_status::text from buyer_identity_for_seller(:'prop') where buyer_id = tests.uid('buyer_d')),
          'not_provided', 'seller_a: not provided again, never « refused » nor its reason');
\set who buyer_d
\ir _as.psql
select tests.uid('buyer_d')::text || '/identity/' || gen_random_uuid()::text || '.jpg' as path_d2 \gset
insert into storage.objects (bucket_id, name, owner, metadata)
values ('documents', :'path_d2', tests.uid('buyer_d'), '{"mimetype":"image/jpeg","size":900000}');
select lives_ok(format($$select identity_document_add('titre_sejour', %L, 'image/jpeg', 1000)$$, :'path_d2'),
                'buyer_d: deposits another document after a refusal');
select lives_ok(format($$select visit_book(%L, %L)$$, :'token_d', :'slot2'), 'and books');
select id as doc_d2 from identity_documents where storage_path = :'path_d2' \gset
-- Withdrawn by its buyer: the visit booked stays, the next booking asks again.
select lives_ok(format($$select identity_document_remove(%L)$$, :'doc_d2'), 'buyer_d: withdraws its document');
select is((select status::text from visits where property_id = :'prop' and buyer_id = tests.uid('buyer_d')),
          'confirmed', 'the visit already booked is not cancelled');
delete from storage.objects where bucket_id = 'documents' and name = :'path_d2';
select is((select count(*) from storage.objects where bucket_id = 'documents' and name = :'path_d2')::int, 0,
          'the file of a document withdrawn goes with it');
\set who admin
\ir _as.psql
select throws_ok(format($$select identity_document_check(%L)$$, :'doc_d2'), '22023', null,
                 'admin: a document withdrawn is no longer to check');

-- Suspended: its document stays as it is.
\set who buyer_d
\ir _as.psql
select tests.uid('buyer_d')::text || '/identity/' || gen_random_uuid()::text || '.pdf' as path_d3 \gset
insert into storage.objects (bucket_id, name, owner, metadata)
values ('documents', :'path_d3', tests.uid('buyer_d'), '{"mimetype":"application/pdf","size":250000}');
select identity_document_add('passeport', :'path_d3', 'application/pdf', 1000) as doc_d3 \gset
reset role;
update profiles set suspended_at = now() where id = tests.uid('buyer_d');
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select identity_document_remove(%L)$$, :'doc_d3'), '42501', null,
                 'buyer_d suspended: no longer withdraws a document');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('documents', %L, %L)$$,
                        tests.uid('buyer_d')::text || '/identity/' || gen_random_uuid()::text || '.pdf', tests.uid('buyer_d')),
                 '42501', null, 'nor sends a file');
delete from storage.objects where bucket_id = 'documents' and name = :'path_d3';
reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path_d3'), 1,
          'nor removes the file of its document that waits');
update profiles set suspended_at = null where id = tests.uid('buyer_d');

-- ===========================================================================
-- What a seller no longer reads: an invitation expired, a visit cancelled
-- ===========================================================================
update visit_invitations set expires_at = now() - interval '1 day'
 where property_id = :'prop' and buyer_id = tests.uid('buyer_c');
\set who seller_a
\ir _as.psql
select is((select identity_status::text from buyer_identity_for_seller(:'prop') where buyer_id = tests.uid('buyer_c')),
          'checked', 'seller_a: an invitation expired, a visit still booked: the status is read');
reset role;
update visits set status = 'cancelled', cancelled_at = now(), cancelled_by = tests.uid('buyer_c')
 where property_id = :'prop' and buyer_id = tests.uid('buyer_c');
\set who seller_a
\ir _as.psql
select is((select count(*)::int from buyer_identity_for_seller(:'prop') where buyer_id = tests.uid('buyer_c')), 0,
          'seller_a: the invitation expired and the visit cancelled: nothing more about this buyer');
select is((select count(*)::int from buyer_identity_for_seller(:'prop') where buyer_id = tests.uid('buyer_d')), 1,
          'a buyer whose invitation is valid is still read');

-- ===========================================================================
-- The account: export, closure, anonymisation
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is((select jsonb_array_length(account_export()->'identity_documents')), 2,
          'buyer_c: its identity documents are in the export');
select is((select array(select jsonb_object_keys(account_export()->'identity_documents'->0) order by 1)),
          array['checked_at', 'created_at', 'file_deleted_at', 'id', 'mime_type', 'refusal_reason',
                'refused_at', 'size_bytes', 'type', 'withdrawn_at'],
          'their metadata only: no path of a file, no note of the team, nobody named');
select ok(not (account_export()::text like '%/identity/%'), 'never the path of a file');
\set who buyer_d
\ir _as.psql
-- Its visit to come is cancelled by the closure; its document that waits is withdrawn.
\o /dev/null
select account_close();
\o
reset role;
select ok((select withdrawn_at is not null from identity_documents where id = :'doc_d3'),
          'an account closed: its document that waited for its check is withdrawn');
\set who admin
\ir _as.psql
select throws_ok(format($$select identity_document_check(%L)$$, :'doc_d3'), '22023', null,
                 'the team no longer has it to check');
reset role;
set local role service_role;
select is((select array_agg(path) from account_files(:'buyer_d', now() + interval '31 days')
            where bucket = 'documents'),
          array[:'path_d3'], 'the anonymisation would list the identity file, were it still stored then');
-- The closing action removes the file at once, with the session of the
-- account it has just closed; the document then says so.
\set who buyer_d
\ir _as.psql
delete from storage.objects where bucket_id = 'documents' and name = :'path_d3';
select lives_ok(format($$select identity_document_file_removed(%L)$$, :'doc_d3'),
                'buyer_d, account closed: says the file of its withdrawn document removed');
reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path_d3'), 0,
          'the file of the document goes at the closure');
select ok((select file_deleted_at is not null from identity_documents where id = :'doc_d3'),
          'and the document says so');

-- ===========================================================================
-- The scheduled task: no file stays behind
-- ===========================================================================
-- A document of buyer_c that reached its end with its file still stored (a
-- deletion that failed), a file never declared for two hours, one just sent.
select tests.uid('buyer_c')::text || '/identity/' || gen_random_uuid()::text || '.pdf' as path_old \gset
select tests.uid('buyer_c')::text || '/identity/' || gen_random_uuid()::text || '.pdf' as path_new \gset
insert into storage.objects (bucket_id, name, owner)
values ('documents', :'path3', tests.uid('buyer_c')), ('documents', :'path_old', tests.uid('buyer_c')),
       ('documents', :'path_new', tests.uid('buyer_c'));
update storage.objects set created_at = now() - interval '2 hours' where name = :'path_old';
insert into identity_documents (buyer_id, type, storage_path, mime_type, size_bytes, withdrawn_at)
values (tests.uid('buyer_c'), 'passeport', :'path3', 'application/pdf', 1000, now())
returning id as doc_left \gset
-- A document that waits, its file stored: never swept.
select tests.uid('seller_b')::text || '/identity/' || gen_random_uuid()::text || '.pdf' as path_wait \gset
insert into storage.objects (bucket_id, name, owner) values ('documents', :'path_wait', tests.uid('seller_b'));
insert into identity_documents (buyer_id, type, storage_path, mime_type, size_bytes)
values (tests.uid('seller_b'), 'passeport', :'path_wait', 'application/pdf', 1000);
\set who admin
\ir _as.psql
select throws_ok('select * from identity_files_to_sweep()', '42501', null,
                 'admin: the sweep is the scheduled task''s');
select throws_ok('select identity_files_mark_swept()', '42501', null, 'nor its marking');
reset role;
-- The scheduled task: the service role, nobody signed in.
\o /dev/null
select set_config('request.jwt.claims', '{"role":"service_role"}', true),
       set_config('request.jwt.claim.sub', '', true);
\o
set local role service_role;
select is((select array_agg(path order by path) from identity_files_to_sweep()
            where path in (:'path3', :'path_old', :'path_new', :'path_wait', :'path2')),
          (select array_agg(x order by x) from unnest(array[:'path3', :'path_old']) as x),
          'the task lists the file of an ended document and a file never declared for an hour, never a waiting file nor one just sent');
select is(identity_files_mark_swept(), 1,
          'before the files are removed, it marks only the document whose file is already gone (withdrawn by buyer_d earlier)');
delete from storage.objects where bucket_id = 'documents' and name in (:'path3', :'path_old');
select is(identity_files_mark_swept(), 1, 'the files removed, the ended document is marked');
select is(identity_files_mark_swept(), 0, 'once');
reset role;
select is((select array[(file_deleted_at is not null)::text,
                        (select count(*)::text from audit_log a
                          where a.action = 'identity.file_deleted' and a.entity_id = d.id
                            and a.actor_id is null and a.meta->>'by' = 'sweep')]
             from identity_documents d where d.id = :'doc_left'),
          array['true', '1'], 'the document says its file deleted, the audit log says the task did it');
select is((select count(*)::int from storage.objects where bucket_id = 'documents'
            and name in (:'path_new', :'path_wait')), 2,
          'the waiting file and the file just sent are still there');

set local role service_role;
select lives_ok(format($$select account_anonymize(%L, now() + interval '31 days')$$, :'buyer_d'),
                'the cron anonymises buyer_d');
reset role;
select is((select count(*)::int from identity_documents where buyer_id = tests.uid('buyer_d')), 0,
          'its identity documents are deleted with the account');
select is((select count(*)::int from identity_documents where buyer_id = tests.uid('buyer_c')), 3,
          'those of another account stay');

select * from finish();
rollback;
