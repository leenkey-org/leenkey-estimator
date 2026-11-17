-- L2-10: the export of an account (its own data only), closing it, then its
-- anonymisation 30 days later (date simulated). Only the person closes their own account, never during a
-- sale in progress nor an admin one; at once the offers they sent waiting
-- are withdrawn, those they received declined, their listings leave the
-- site, their conversations close. Only the cron (service role) reads the accounts due
-- and anonymises them: before 30 days nothing, after 30 days the names, the
-- phone, the buyer project, the assistant, the notifications, the favorites,
-- the drafts, the address of the properties and the files go; the orders,
-- the offers sent and the messages stay. Fixtures in postal code 99993: the
-- file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(62);
\ir _plan.psql
-- The ids, read here: the service role does not read the schema tests.
select tests.uid('buyer_c') as buyer_c, tests.uid('buyer_d') as buyer_d,
       tests.uid('seller_b') as seller_b \gset

-- seller_a: a listing online; seller_b: a listing online, to close.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '1 rue des Adieux', '99993', 'Effaceville', 100, 5,
        extensions.st_setsrid(extensions.st_makepoint(2.3813, 48.7214), 4326)::extensions.geography)
returning id as prop_a \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_a', 'Maison à quitter', 'Description.', 35000000)
returning id as listing_a \gset
\o /dev/null
select tests.dpe(:'listing_a');
select listing_submit(:'listing_a');
\o
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_b'), 'appartement', '2 rue des Adieux', '99993', 'Effaceville', 60, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3814, 48.7215), 4326)::extensions.geography)
returning id as prop_b \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_b', 'Appartement qui part', 'Description.', 20000000)
returning id as listing_b \gset
\o /dev/null
select tests.dpe(:'listing_b');
select listing_submit(:'listing_b');
\o
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing_a');
select listing_publish(:'listing_b');
\o
-- seller_b made its property from a valuation (the key that held a run back).
reset role;
insert into estimations (profile_id, input, result, value_cents)
values (tests.uid('seller_b'), '{}', '{}', 20000000) returning id as valuation_b \gset
update properties set estimation_id = :'valuation_b' where id = :'prop_b';
-- Lot 3 (written as the owner of the tables): a visit of buyer_d to come on
-- the property of seller_b, a document of its sale file shared with buyer_d,
-- a request of buyer_d waiting, an alert of buyer_c.
insert into visit_slots (property_id, starts_at, ends_at)
values (:'prop_b', now() + interval '3 days', now() + interval '3 days 30 minutes') returning id as slot_b \gset
insert into visits (slot_id, property_id, buyer_id) values (:'slot_b', :'prop_b', :'buyer_d') returning id as visit_b \gset
select :'prop_b' || '/sale/' || gen_random_uuid() || '.pdf' as sale_path \gset
insert into storage.objects (bucket_id, name) values ('documents', :'sale_path');
insert into documents (property_id, owner_id, type, title, storage_path, mime_type, size_bytes)
values (:'prop_b', :'seller_b', 'dpe', 'DPE', :'sale_path', 'application/pdf', 1000) returning id as sale_doc \gset
insert into document_shares (document_id, buyer_id) values (:'sale_doc', :'buyer_d');
insert into document_access_requests (property_id, buyer_id) values (:'prop_b', :'buyer_d') returning id as sale_req \gset
insert into alerts (buyer_id, name, criteria) values (:'buyer_c', 'Effaceville', '{"city": "Effaceville"}');

-- buyer_c: an offer sent to seller_a, a draft, a favorite, a conversation.
\set who buyer_c
\ir _as.psql
update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 40000000,
       down_payment_cents = 9000000, loan_needed = false
 where profile_id = tests.uid('buyer_c');
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_a', tests.uid('buyer_c'), 33800000)
returning id as offer1 \gset
-- A financing document the offer refers to, and one it does not.
reset role;
insert into financing_documents (buyer_id, type, document_date, storage_path, mime_type, size_bytes)
values (tests.uid('buyer_c'), 'accord_principe', current_date,
        tests.uid('buyer_c') || '/financing/' || gen_random_uuid() || '.pdf', 'application/pdf', 1000)
returning id as doc_kept \gset
insert into financing_documents (buyer_id, type, document_date, storage_path, mime_type, size_bytes)
values (tests.uid('buyer_c'), 'accord_principe', current_date,
        tests.uid('buyer_c') || '/financing/' || gen_random_uuid() || '.pdf', 'application/pdf', 1000)
returning id as doc_gone \gset
-- Its current document: the offer takes it when sent (offers_before_submit).
update buyer_profiles set current_financing_document_id = :'doc_kept' where profile_id = tests.uid('buyer_c');
\set who buyer_c
\ir _as.psql
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       financing_mode = 'no_loan',
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id = :'offer1';
\o /dev/null
select offer_submit(:'offer1');
\o
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_b', tests.uid('buyer_c'), 19000000)
returning id as draft \gset
insert into favorites (buyer_id, listing_id) values (tests.uid('buyer_c'), :'listing_b');
select conversation_start(:'listing_a') as conv \gset

-- buyer_d: an offer accepted by seller_a (a sale in progress), one waiting
-- for seller_b.
\set who buyer_d
\ir _as.psql
update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 40000000,
       down_payment_cents = 9000000, loan_needed = false
 where profile_id = tests.uid('buyer_d');
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_a', tests.uid('buyer_d'), 34000000)
returning id as offer2 \gset
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_b', tests.uid('buyer_d'), 19500000)
returning id as offer3 \gset
update offers
   set buyer_identity = '{"last_name":"Durand","first_name":"Léo","birth_date":"1988-02-01",
                          "address":{"line":"4 rue Bleue","postal_code":"75010","city":"Paris"},
                          "email":"leo@example.test","phone":"0600000001"}',
       financing_mode = 'no_loan',
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id in (:'offer2', :'offer3');
\o /dev/null
select offer_submit(:'offer2');
select offer_submit(:'offer3');
\o
\set who seller_a
\ir _as.psql
\o /dev/null
select offer_answer(:'offer2', true, true);
\o

-- ===========================================================================
-- The export: what the account holds, nothing of another account
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is((select jsonb_array_length(account_export()->'offers_sent')), 2,
          'buyer_c: its offers, the one sent and its draft');
select ok((select account_export()->'buyer_profile'->>'project' = 'residence_principale'),
          'buyer_c: its buyer project');
select is((select account_export()->'alerts'->0->>'name'), 'Effaceville', 'buyer_c: its alerts are in the export');
select ok(not (account_export()::text like '%rue des Adieux%'),
          'buyer_c: nothing of the properties of the sellers');
\set who seller_a
\ir _as.psql
select ok((select account_export()->'properties' @> jsonb_build_array(jsonb_build_object('id', :'prop_a'))),
          'seller_a: its property');
select ok((select account_export()->'offers_received' @> jsonb_build_array(jsonb_build_object('id', :'offer1'))),
          'seller_a: the offer it received');
select ok(not (account_export()::text like '%chloe@example.test%'),
          'seller_a: without the contact details of the buyer, as on its screen');
\set who anon
\ir _as.psql
select throws_ok($$select account_export()$$, '42501', null, 'anon: no export');

-- ===========================================================================
-- Closing: the person only, their own account
-- ===========================================================================
\set who anon
\ir _as.psql
select throws_ok($$select account_close()$$, '42501', null, 'anon: closes no account');
\set who buyer_c
\ir _as.psql
select throws_ok($$select accounts_due()$$, '42501', null, 'buyer_c: not the accounts due');
select throws_ok(format($$select account_anonymize(%L)$$, tests.uid('buyer_d')), '42501', null,
                 'buyer_c: anonymises no account');
select lives_ok($$select account_close()$$, 'buyer_c: closes its own account');
select throws_ok($$select account_close()$$, '42501', null, 'closed once: not twice');

reset role;
select ok((select deleted_at is not null and anonymized_at is null from profiles where id = tests.uid('buyer_c')),
          'the account is marked closed, not yet anonymised');
select is((select status::text from offers where id = :'offer1'), 'withdrawn',
          'its offer waiting for an answer is withdrawn');
select is((select count(*)::int from notifications
            where type = 'offer.withdrawn' and profile_id = tests.uid('seller_a')
              and data->>'offer_id' = :'offer1'), 1,
          'and its seller is told, as for a withdrawal');
select ok((select closed_at is not null from conversations where id = :'conv'),
          'its conversations are closed');
select is((select first_name from profiles where id = tests.uid('buyer_c')) is not null, true,
          'nothing is erased yet');

-- A sale in progress: neither party closes; nor an admin.
\set who seller_a
\ir _as.psql
select ok(account_sale_in_progress(), 'seller_a: the page knows its sale is in progress');
select throws_ok($$select account_close()$$, '55000', null, 'seller_a: not during a sale in progress');
\set who buyer_d
\ir _as.psql
select throws_ok($$select account_close()$$, '55000', null, 'buyer_d: nor the buyer of that sale');
\set who admin
\ir _as.psql
select throws_ok($$select account_close()$$, '42501', null, 'admin: an admin account is closed by the team');

-- seller_b closes: its listing leaves the site, the offer it received is declined.
\set who seller_b
\ir _as.psql
select lives_ok($$select account_close()$$, 'seller_b: closes its own account');
reset role;
select is((select status::text from offers where id = :'offer3'), 'declined',
          'the offer waiting for its answer is declined');
select is((select count(*)::int from notifications
            where type = 'offer.answered' and profile_id = tests.uid('buyer_d')
              and data->>'offer_id' = :'offer3' and data->>'message' like '%fermé son compte%'), 1,
          'and its buyer is told why');
select is((select status::text from visits where id = :'visit_b'), 'cancelled',
          'the visit to come on its property is cancelled');
select is((select status from document_access_requests where id = :'sale_req'), 'declined',
          'the request to its sale file is declined');
select is((select count(*)::int from alerts where buyer_id = :'buyer_c' and active), 0,
          'buyer_c, closed: its alerts stop');
\set who buyer_d
\ir _as.psql
select is((select count(*)::int from documents where id = :'sale_doc'), 0,
          'buyer_d no longer reads the sale file of seller_b');
\set who anon
\ir _as.psql
select is((select count(*)::int from public_listings where id = :'listing_b'), 0,
          'its listing is no longer on the site');
select is((select count(*)::int from public_listings where id = :'listing_a'), 1,
          'the listing of another seller still is');

-- ===========================================================================
-- 30 days later (date simulated): the cron only
-- ===========================================================================
reset role;
set local role service_role;
select ok(not exists (select 1 from accounts_due(now() + interval '29 days') d where d = :'buyer_c'),
          'after 29 days: not due');
select ok(exists (select 1 from accounts_due(now() + interval '31 days') d where d = :'buyer_c'),
          'after 31 days: due');
select throws_ok(format($$select account_anonymize(%L, now() + interval '29 days')$$, :'buyer_c'),
                 '22023', null, 'never before 30 days');
select throws_ok(format($$select account_anonymize(%L, now() + interval '31 days')$$, :'buyer_d'),
                 '22023', null, 'never an account that is open');
select is((select count(*)::int from account_files(:'buyer_c', now() + interval '31 days')
            where bucket = 'documents'), 2,
          'the cron lists the files of buyer_c first: its two financing documents');
select ok((select count(*) = 3 * (select count(*) from photos where property_id = :'prop_b')
             from account_files(:'seller_b', now() + interval '31 days') where bucket = 'photos'),
          'three widths of each photo of seller_b');
select is((select count(*)::int from account_files(:'seller_b', now() + interval '31 days')
            where bucket = 'documents' and path = :'sale_path'), 1,
          'and the files of its sale file');
select throws_ok(format($$select * from account_files(%L, now() + interval '29 days')$$, :'buyer_c'),
                 '22023', null, 'no files before 30 days');
select lives_ok(format($$select account_anonymize(%L, now() + interval '31 days')$$, :'buyer_c'),
                'the cron anonymises buyer_c');
select lives_ok(format($$select account_anonymize(%L, now() + interval '31 days')$$, :'seller_b'),
                'and seller_b');
reset role;
select is((select row(first_name, last_name, phone)::text from profiles where id = :'buyer_c'),
          row(null::text, null::text, null::text)::text, 'buyer_c: no name, no phone');
select is((select count(*)::int from buyer_profiles where profile_id = :'buyer_c'), 0,
          'no buyer project');
select is((select count(*)::int from favorites where buyer_id = :'buyer_c')
          + (select count(*)::int from notifications where profile_id = :'buyer_c')
          + (select count(*)::int from ai_conversations where profile_id = :'buyer_c'), 0,
          'no favorite, notification nor assistant conversation');
select is((select count(*)::int from offers where id = :'draft'), 0, 'its draft is erased');
select is((select storage_path from financing_documents where id = :'doc_kept'), '',
          'the document its offer refers to keeps its row, never its file');
select is((select count(*)::int from financing_documents where id = :'doc_gone'), 0,
          'the other document is erased');
select is((select status::text from offers where id = :'offer1'), 'withdrawn',
          'the offer it sent stays, the document of both parties');
select is((select row(address_line, location is null, dpe_number is null, estimation_id is null)::text
             from properties where id = :'prop_b'),
          row('Adresse effacée', true, true, true)::text,
          'seller_b: the address of its property is erased, and what finds it (DPE number)');
select is((select row(title, description)::text from listings where id = :'listing_b'),
          row('Annonce supprimée', '')::text, 'seller_b: the texts of its listing too');
select is((select count(*)::int from estimations where id = :'valuation_b'), 0,
          'seller_b: its valuation is erased, though its property came from it');
select is((select count(*)::int from documents where property_id = :'prop_b')
          + (select count(*)::int from alerts where buyer_id = :'buyer_c'), 0,
          'its sale file and the alerts of buyer_c are erased');
select is((select count(*)::int from properties where id = :'prop_a' and address_line = '1 rue des Adieux'), 1,
          'the property of seller_a is untouched');

-- Marked once the sign-in and the files are erased (the cron route).
set local role service_role;
select lives_ok(format($$select account_mark_anonymized(%L, now() + interval '31 days')$$, :'buyer_c'),
                'the cron marks buyer_c anonymised');
select ok(not exists (select 1 from accounts_due(now() + interval '31 days') d where d = :'buyer_c'),
          'no longer due');
select ok(exists (select 1 from accounts_due(now() + interval '31 days') d where d = :'seller_b'),
          'seller_b, not marked yet, stays due: a failed run is resumed');
-- A failed run: at the back of the queue, the team told once a day.
select lives_ok(format($$select account_anonymize_failed(%L, now() + interval '31 days')$$, :'seller_b'),
                'the cron records a failed run');
select lives_ok(format($$select account_anonymize_failed(%L, now() + interval '31 days 1 hour')$$, :'seller_b'),
                'and a second one the same day');
reset role;
select is((select count(*)::int from notifications
            where type = 'account.anonymize_failed' and profile_id = tests.uid('admin')
              and data->>'profile_id' = :'seller_b'), 1,
          'each admin is told in the bell, once a day');
set local role service_role;
reset role;
\set who admin
\ir _as.psql
select throws_ok($$select accounts_due()$$, '42501', null, 'admin: the cron only');
select throws_ok(format($$select account_anonymize_failed(%L)$$, :'seller_b'), '42501', null,
                 'admin: nor records a failed run');
select is((select count(*)::int from audit_log where action = 'account.closed'
            and entity_id in (tests.uid('buyer_c'), tests.uid('seller_b'))), 2,
          'each closing is in the audit log');

select * from finish();
rollback;
