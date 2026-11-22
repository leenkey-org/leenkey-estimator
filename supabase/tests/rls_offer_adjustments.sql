-- Adjustments of the offer asked by Cédric (DECISIONS.md 2026-11-21). The
-- exact address of the property is frozen with the offer: read by the team,
-- by the seller, and by the buyer only once one of their visits of the
-- property is confirmed or done; never by anyone else, never from the row of
-- the offer. « Autorisation particulière » asks for its details. The team is
-- told when an offer is received on a sale with an adviser, never under the
-- free plan. A proof of financing checked: its buyer is told, the team alone
-- deletes its file, once checked only. A report closed: its author is told.
-- An acquisition by an SCI keeps no start of a withdrawal period. The frozen
-- address is never changed, and goes only with the closed account of its
-- seller (account_anonymize).
-- Fixtures in postal code 99988: the file passes on an empty and on a seeded
-- database.
begin;
\ir _helpers.psql
select plan(76);
\ir _plan.psql
-- The storage service deletes a file this way (storage.protect_delete): as
-- the user, under the RLS.
select set_config('storage.allow_delete_query', 'true', false) \gset

select tests.uid('buyer_c')::text || '/financing/' || gen_random_uuid()::text || '.pdf' as path_c \gset
select tests.uid('buyer_d')::text || '/financing/' || gen_random_uuid()::text || '.pdf' as path_d \gset

-- The plans and their rights (reference data, absent from a bare database).
insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Un conseiller.', 99000, 'Accompagné', '{Conseiller}', 2)
on conflict (code) do nothing;
insert into plan_entitlements (plan, feature) values ('accompagne', 'advisor')
on conflict do nothing;

-- seller_a: a property under Accompagné; seller_b: one under Autonomie. Both online.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '12 rue des Ajustements', '99988', 'Ajusteville', 104, 5,
        extensions.st_setsrid(extensions.st_makepoint(2.3713, 48.7114), 4326)::extensions.geography)
returning id as prop_paid \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_paid', 'Maison accompagnée', 'Description.', 35000000)
returning id as listing_paid \gset
\o /dev/null
select tests.dpe(:'listing_paid');
select listing_submit(:'listing_paid');
\o
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_b'), 'appartement', '7 rue des Ajustements', '99988', 'Ajusteville', 60, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3714, 48.7115), 4326)::extensions.geography)
returning id as prop_free \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_free', 'Appartement en autonomie', 'Description.', 20000000)
returning id as listing_free \gset
\o /dev/null
select tests.dpe(:'listing_free');
select listing_submit(:'listing_free');
\o
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing_paid');
select listing_publish(:'listing_free');
\o
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop_paid', tests.uid('seller_a'), 'accompagne', 99000, now());
update sale_progress set plan = 'accompagne' where property_id = :'prop_paid';

-- buyer_c and buyer_d: a project declared; buyer_c drafts an offer on each
-- listing, buyer_d one on the listing of seller_a.
update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 40000000,
       down_payment_cents = 9000000, loan_needed = false
 where profile_id in (tests.uid('buyer_c'), tests.uid('buyer_d'));
\set who buyer_c
\ir _as.psql
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_paid', tests.uid('buyer_c'), 33800000)
returning id as offer_paid \gset
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_free', tests.uid('buyer_c'), 19000000)
returning id as offer_free \gset
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       financing_mode = 'no_loan',
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id in (:'offer_paid', :'offer_free');
\set who buyer_d
\ir _as.psql
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_paid', tests.uid('buyer_d'), 34000000)
returning id as draft_d \gset
\set who buyer_c
\ir _as.psql
-- The offer on the listing of seller_b is made by an SCI.
update offers
   set acquisition_mode = 'sci',
       sci_details = '{"name":"SCI des Ajustements","status":"in_formation","representative":"Chloé Martin"}'
 where id = :'offer_free';

-- ===========================================================================
-- The details of « autorisation particulière »
-- ===========================================================================
update offers set condition_authorization = true where id = :'offer_paid';
select throws_ok(format($$select offer_submit(%L)$$, :'offer_paid'), '22023', null,
                 'buyer_c: « autorisation particulière » without its details is not sent');
update offers set conditions_details = '   ' where id = :'offer_paid';
select throws_ok(format($$select offer_submit(%L)$$, :'offer_paid'), '22023', null,
                 'nor with blank details');
update offers set condition_authorization = false, condition_other = true, conditions_details = null
 where id = :'offer_paid';
select throws_ok(format($$select offer_submit(%L)$$, :'offer_paid'), '22023', null,
                 'nor « autre situation » without its details');
update offers set condition_authorization = true, condition_other = false,
                  conditions_details = 'Accord de la copropriété pour les travaux.'
 where id = :'offer_paid';

-- ===========================================================================
-- The exact address: a draft
-- ===========================================================================
select is(offer_property_address(:'offer_paid'), null,
          'buyer_c: no address of the property of its draft before a visit');
\set who seller_a
\ir _as.psql
select is(offer_property_address(:'offer_paid'), null,
          'seller_a: nothing of a draft');
\set who anon
\ir _as.psql
select throws_ok(format($$select offer_property_address(%L)$$, :'offer_paid'), '42501', null,
                 'anon: does not call the function');
select throws_ok($$select count(*) from offer_property_addresses$$, '42501', null,
                 'anon: does not read the table of the frozen addresses');
\set who admin
\ir _as.psql
select is(offer_property_address(:'offer_paid'), '12 rue des Ajustements',
          'admin: the address of the property of a draft, as it is');

-- ===========================================================================
-- Sent: the address is frozen; the team is told under a plan with an adviser
-- ===========================================================================
reset role;
delete from notifications where type = 'offer.received_team';
-- For this sending, the seller is also of the team, and buyer_d a suspended
-- admin: neither is told.
alter table profiles disable trigger user;
update profiles set roles = array_append(roles, 'admin'::user_role) where id = tests.uid('seller_a');
update profiles set roles = array_append(roles, 'admin'::user_role), suspended_at = now()
 where id = tests.uid('buyer_d');
alter table profiles enable trigger user;
\set who buyer_c
\ir _as.psql
select lives_ok(format($$select offer_submit(%L)$$, :'offer_paid'),
                'buyer_c: sends the offer with the details of the authorization');
\o /dev/null
select offer_submit(:'offer_free');
\o
reset role;
alter table profiles disable trigger user;
update profiles set roles = array_remove(roles, 'admin'::user_role) where id = tests.uid('seller_a');
update profiles set roles = array_remove(roles, 'admin'::user_role), suspended_at = null
 where id = tests.uid('buyer_d');
alter table profiles enable trigger user;
select is((select address_line from offer_property_addresses where offer_id = :'offer_paid'),
          '12 rue des Ajustements', 'the exact address is frozen with the offer sent');
select is((select property_snapshot->'address' ? 'line' from offers where id = :'offer_paid'), false,
          'never in the row of the offer, which its buyer reads');
select is((select count(*)::int from notifications n join profiles p on p.id = n.profile_id
            where n.type = 'offer.received_team' and n.data->>'offer_id' = :'offer_paid'),
          (select count(*)::int from profiles
            where 'admin' = any(roles) and deleted_at is null and suspended_at is null),
          'received under a plan with an adviser: each active admin is told');
select is((select row(link, group_key, email_after is not null, data->>'plan',
                      data ? 'buyer_first_name')::text
             from notifications
            where type = 'offer.received_team' and data->>'offer_id' = :'offer_paid' limit 1),
          row('/admin/offres/' || :'offer_paid', 'offers:received', true, 'accompagne', false)::text,
          'with the sheet of the offer, by email too, grouped, without the name of the buyer');
select is((select count(*)::int from notifications
            where type = 'offer.received_team'
              and profile_id in (tests.uid('seller_a'), tests.uid('buyer_c'), tests.uid('buyer_d'))),
          0, 'never to its seller, its buyer, nor to a suspended admin');
select is((select count(*)::int from notifications
            where type = 'offer.received_team' and data->>'offer_id' = :'offer_free'), 0,
          'received under the free plan: the team is not told');
select is((select count(*)::int from notifications
            where type = 'offer.received' and data->>'offer_id' in (:'offer_paid', :'offer_free')), 2,
          'each seller is, as before');

-- The address changes afterwards: the offer keeps the one it was sent with.
alter table properties disable trigger user;
update properties set address_line = '99 avenue Nouvelle' where id = :'prop_paid';
alter table properties enable trigger user;

-- ===========================================================================
-- Who reads the exact address of an offer sent
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is(offer_property_address(:'offer_paid'), null,
          'buyer_c: not the address of an offer sent before a visit');
select is((select count(*)::int from offer_property_addresses), 0,
          'nor from the table');
select throws_ok(format($$insert into offer_property_addresses (offer_id, address_line) values (%L, 'x')$$,
                        :'offer_free'),
                 '42501', null, 'which it never writes');
\set who buyer_d
\ir _as.psql
select is(offer_property_address(:'offer_paid'), null, 'buyer_d: not the address of an offer of others');
\set who seller_b
\ir _as.psql
select is(offer_property_address(:'offer_paid'), null, 'seller_b: not the address of an offer of others');
select is((select count(*)::int from offer_property_addresses), 0, 'nor from the table');
\set who seller_a
\ir _as.psql
select is(offer_property_address(:'offer_paid'), '12 rue des Ajustements',
          'seller_a: the address frozen with the offer received');
select is((select property_address_line from offer_for_seller where id = :'offer_paid'),
          '12 rue des Ajustements', 'and in its view of the offer');
select is((select count(*)::int from offer_for_seller where id = :'offer_free'), 0,
          'never the offer of another seller');
select throws_ok(format($$update offer_property_addresses set address_line = 'x' where offer_id = %L$$,
                        :'offer_paid'),
                 '42501', null, 'seller_a: never changes the frozen address');
\set who admin
\ir _as.psql
select is(offer_property_address(:'offer_paid'), '12 rue des Ajustements', 'admin: reads it');
select is((select count(*)::int from offer_property_addresses
            where offer_id in (:'offer_paid', :'offer_free')), 2, 'and from the table');
select throws_ok(format($$delete from offer_property_addresses where offer_id = %L$$, :'offer_paid'),
                 '42501', null, 'admin: never deletes it');

-- A visit of buyer_c: cancelled, nothing; confirmed, the address; done, still.
reset role;
insert into visit_slots (property_id, starts_at, ends_at) values
  (:'prop_paid', now() + interval '2 days', now() + interval '2 days 30 minutes')
returning id as slot \gset
insert into visits (slot_id, property_id, buyer_id, status, cancelled_at)
values (:'slot', :'prop_paid', tests.uid('buyer_c'), 'cancelled', now())
returning id as visit \gset
\set who buyer_c
\ir _as.psql
select is(offer_property_address(:'offer_paid'), null, 'buyer_c: a cancelled visit gives no address');
reset role;
alter table visits disable trigger user;
update visits set status = 'confirmed', cancelled_at = null where id = :'visit';
alter table visits enable trigger user;
\set who buyer_c
\ir _as.psql
select is(offer_property_address(:'offer_paid'), '12 rue des Ajustements',
          'buyer_c: a confirmed visit gives the address frozen with its offer');
select is(offer_property_address(:'offer_free'), null,
          'not that of a property it did not visit');
reset role;
alter table visits disable trigger user;
update visits set status = 'done' where id = :'visit';
alter table visits enable trigger user;
\set who buyer_c
\ir _as.psql
select is(offer_property_address(:'offer_paid'), '12 rue des Ajustements',
          'buyer_c: a visit done too');

-- A draft: the address of the property as it is, once a visit is confirmed.
\set who buyer_d
\ir _as.psql
select is(offer_property_address(:'draft_d'), null,
          'buyer_d: no address of the property of its draft before a visit');
reset role;
insert into visit_slots (property_id, starts_at, ends_at) values
  (:'prop_paid', now() + interval '3 days', now() + interval '3 days 30 minutes')
returning id as slot_d \gset
insert into visits (slot_id, property_id, buyer_id) values (:'slot_d', :'prop_paid', tests.uid('buyer_d'));
\set who buyer_d
\ir _as.psql
select is(offer_property_address(:'draft_d'), '99 avenue Nouvelle',
          'buyer_d: a confirmed visit gives the address of the property of its draft, as it is today');
select is(offer_property_address(:'offer_paid'), null,
          'never the address of the offer of another buyer');

-- The freeze of an offer sent still holds, even for the owner of the table.
reset role;
select throws_ok(format($$update offers set conditions_details = 'Autre' where id = %L$$, :'offer_paid'),
                 '42501', null, 'an offer sent is still frozen');

-- ===========================================================================
-- A new offer replaces the one in progress: its own address, the team told
-- ===========================================================================
\set who buyer_c
\ir _as.psql
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_paid', tests.uid('buyer_c'), 34500000)
returning id as offer_new \gset
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       financing_mode = 'no_loan',
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id = :'offer_new';
select lives_ok(format($$select offer_submit(%L)$$, :'offer_new'),
                'buyer_c: sends a new offer on the same listing');
select is(offer_property_address(:'offer_new'), '99 avenue Nouvelle',
          'the new offer is frozen with the address of the property when it is sent');
select is(offer_property_address(:'offer_paid'), '12 rue des Ajustements',
          'the offer it replaces keeps the address it was sent with');
reset role;
select is((select row(status, superseded_by)::text from offers where id = :'offer_paid'),
          row('superseded', :'offer_new')::text, 'the offer in progress is superseded');
select is((select count(*)::int from notifications
            where type = 'offer.received_team' and data->>'offer_id' = :'offer_new'),
          (select count(*)::int from profiles
            where 'admin' = any(roles) and deleted_at is null and suspended_at is null),
          'the team is told of the new offer too');

-- ===========================================================================
-- The frozen address is never changed, even by the owner of the table
-- ===========================================================================
select throws_ok(format($$update offer_property_addresses set address_line = 'x' where offer_id = %L$$,
                        :'offer_paid'),
                 '42501', null, 'the frozen address is never updated');
select throws_ok(format($$delete from offer_property_addresses where offer_id = %L$$, :'offer_paid'),
                 '42501', null, 'nor deleted while the account of its seller is open');

-- An offer sent before the address was kept (none frozen): the town only,
-- until the migration gives it the address of its property (its statement,
-- played again here).
alter table offer_property_addresses disable trigger user;
delete from offer_property_addresses where offer_id = :'offer_paid';
alter table offer_property_addresses enable trigger user;
\set who seller_a
\ir _as.psql
select is(offer_property_address(:'offer_paid'), '',
          'seller_a: an offer without a frozen address reads none, never the one of today');
reset role;
insert into public.offer_property_addresses (offer_id, address_line)
select o.id, p.address_line
  from public.offers o
  join public.listings l on l.id = o.listing_id
  join public.properties p on p.id = l.property_id
 where o.submitted_at is not null
on conflict (offer_id) do nothing;
select is((select address_line from offer_property_addresses where offer_id = :'offer_paid'),
          '99 avenue Nouvelle', 'the backfill gives it the address of its property as it is');
select is((select count(*)::int from offer_property_addresses
            where offer_id in (:'offer_paid', :'offer_new', :'offer_free', :'draft_d')), 3,
          'one address per offer sent, none for a draft');
\set who buyer_c
\ir _as.psql

-- ===========================================================================
-- A proof of financing checked: its buyer told, its file deleted by the team
-- ===========================================================================
insert into storage.objects (bucket_id, name, owner) values ('documents', :'path_c', tests.uid('buyer_c'));
select financing_document_add('accord_principe', current_date - 10, :'path_c', 'application/pdf', 250000) as doc \gset
\set who admin
\ir _as.psql
delete from storage.objects where bucket_id = 'documents' and name = :'path_c';
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path_c'), 1,
          'admin: does not delete the file of a proof not yet checked');
select throws_ok(format($$select financing_document_file_removed(%L)$$, :'doc'), '22023', null,
                 'nor says it deleted');
\o /dev/null
select financing_document_check(:'doc');
\o
select throws_ok(format($$select financing_document_file_removed(%L)$$, :'doc'), '22023', null,
                 'admin: a file still stored is not said deleted');
\set who buyer_d
\ir _as.psql
delete from storage.objects where bucket_id = 'documents' and name = :'path_c';
\set who seller_a
\ir _as.psql
delete from storage.objects where bucket_id = 'documents' and name = :'path_c';
\set who buyer_c
\ir _as.psql
delete from storage.objects where bucket_id = 'documents' and name = :'path_c';
select is(financing_file_checked(:'path_c'), false,
          'buyer_c: the function that opens the deletion says no to who is not of the team');
\set who anon
\ir _as.psql
select set_config('tests.path', :'path_c', true) \gset
-- With or without the right to delete in the bucket, the file stays.
do $$
begin
  delete from storage.objects where bucket_id = 'documents' and name = current_setting('tests.path');
exception when insufficient_privilege then null;
end;
$$;
select throws_ok(format($$select financing_file_checked(%L)$$, :'path_c'), '42501', null,
                 'anon: does not ask whether a proof is checked');
select throws_ok(format($$select financing_document_file_removed(%L)$$, :'doc'), '42501', null,
                 'anon: does not say a file deleted');
reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path_c'), 1,
          'its buyer, another buyer, a seller and a visitor never delete the file of a checked proof');
\set who admin
\ir _as.psql
select is(financing_file_checked(:'path_c'), true, 'admin: the proof is checked, its file may go');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select financing_document_file_removed(%L)$$, :'doc'), '42501', null,
                 'buyer_c: does not say its file deleted');
\set who admin
\ir _as.psql
delete from storage.objects where bucket_id = 'documents' and name = :'path_c';
reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name = :'path_c'), 0,
          'admin: deletes the file of a checked proof');
\set who admin
\ir _as.psql
select lives_ok(format($$select financing_document_file_removed(%L)$$, :'doc'),
                'admin: the document says its file is deleted');
select file_deleted_at as deleted_at from financing_documents where id = :'doc' \gset
select lives_ok(format($$select financing_document_file_removed(%L)$$, :'doc'),
                'admin: said again (« Supprimer le fichier » tried twice), nothing breaks');
select is((select file_deleted_at from financing_documents where id = :'doc'), :'deleted_at'::timestamptz,
          'the date of the deletion is written once');
\set who buyer_c
\ir _as.psql
select is((select row(checked_at is not null, file_deleted_at is not null)::text
             from financing_documents where id = :'doc'),
          row(true, true)::text, 'buyer_c: reads its proof checked, its file deleted');
select is((select financing_status::text from buyer_profiles where profile_id = tests.uid('buyer_c')),
          'document_checked', 'its status stays « Justificatif vérifié »');
reset role;
select is((select row(profile_id, link, email_after is not null, data->>'document_type')::text
             from notifications where type = 'financing.checked' and data->>'document_id' = :'doc'),
          row(tests.uid('buyer_c'), '/acquereur/profil', true, 'accord_principe')::text,
          'its buyer is told the proof is checked, by email too');
select is((select count(*)::int from audit_log
            where action = 'financing.file_deleted' and entity_id = :'doc'
              and actor_id = tests.uid('admin')), 1,
          'and the audit log says who deleted the file, once');
\set who admin
\ir _as.psql
select is((select file_deleted_at is not null from admin_financing_documents(tests.uid('buyer_c'))
            where id = :'doc'), true, 'admin: the sheet of the buyer says the file is deleted');

-- ===========================================================================
-- A report handled: its author is told
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select id as conv from conversations
 where listing_id = :'listing_paid' and buyer_id = tests.uid('buyer_c') \gset
insert into reports (conversation_id, reporter_id, reason)
values (:'conv', tests.uid('buyer_c'), 'Messages insistants du vendeur.');
reset role;
select id as report from reports where conversation_id = :'conv' \gset
select is((select count(*)::int from notifications where type = 'report.handled'
            and data->>'report_id' = :'report'), 0, 'a report open tells its author nothing');
\set who admin
\ir _as.psql
\o /dev/null
select admin_report_resolve(:'report', 'Vendeur averti par téléphone.');
\o
reset role;
select is((select row(profile_id, link, email_after is not null, data ? 'reason')::text
             from notifications where type = 'report.handled' and data->>'report_id' = :'report'),
          row(tests.uid('buyer_c'), '/messages/' || :'conv', true, false)::text,
          'closed: its author is told, by email too, never the note of the team');
select is((select count(*)::int from notifications
            where type = 'report.handled' and profile_id <> tests.uid('buyer_c')
              and data->>'report_id' = :'report'), 0,
          'nobody else is');

-- ===========================================================================
-- The avant-contrat: no start of a withdrawal period kept for an SCI
-- ===========================================================================
\set who seller_a
\ir _as.psql
\o /dev/null
select offer_answer(:'offer_new', true, true);
select offer_record_precontract(:'offer_new', (now() at time zone 'Europe/Paris')::date,
                                (now() at time zone 'Europe/Paris')::date);
\o
\set who seller_b
\ir _as.psql
\o /dev/null
select offer_answer(:'offer_free', true, true);
\o
select lives_ok(format($$select offer_record_precontract(%L, %L, %L)$$, :'offer_free',
                       (now() at time zone 'Europe/Paris')::date, (now() at time zone 'Europe/Paris')::date),
                'seller_b: records the avant-contrat of an offer made by an SCI');
reset role;
select is((select row(precontract_signed_at is not null, withdrawal_period_start is null)::text
             from offers where id = :'offer_free'),
          row(true, true)::text, 'an SCI: the avant-contrat is dated, no start of a withdrawal period is kept');
select is((select withdrawal_period_start is not null from offers where id = :'offer_new'),
          true, 'a buyer in their own name: the start of the period is kept, as before');

-- ===========================================================================
-- A seller closes their account: the frozen address goes with the others
-- ===========================================================================
-- Its sale is over (an account is not closed during a sale in progress):
-- the listing is sold, written here as the owner of the table.
reset role;
alter table listings disable trigger user;
update listings set status = 'sold', sold_at = now() where id = :'listing_free';
alter table listings enable trigger user;
\set who seller_b
\ir _as.psql
\o /dev/null
select account_close();
\o
-- 30 days later (date simulated), the scheduled task, which has no session.
\set who anon
\ir _as.psql
reset role;
select tests.uid('seller_b') as seller_b \gset
set local role service_role;
select lives_ok(format($$select account_anonymize(%L, now() + interval '31 days')$$, :'seller_b'),
                'the account of seller_b, closed 30 days ago, is anonymised');
reset role;
select is((select row(p.address_line,
                      (select count(*) from offer_property_addresses a where a.offer_id = :'offer_free'))::text
             from properties p where p.id = :'prop_free'),
          row('Adresse effacée', 0)::text,
          'the address of its property is erased, and the one frozen with the offer it received');
select is((select count(*)::int from offers where id = :'offer_free' and status = 'accepted'), 1,
          'the offer itself stays');
select is((select count(*)::int from offer_property_addresses
            where offer_id in (:'offer_paid', :'offer_new')), 2,
          'the addresses of the offers of another seller are untouched');
\set who admin
\ir _as.psql
select is(offer_property_address(:'offer_free'), '',
          'admin: the offer of the closed seller reads no address any more');

select * from finish();
rollback;
