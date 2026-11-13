-- L2-01: the purchase offer (SPEC-V2 4 and 13). A buyer whose financing is
-- declared drafts an offer on a listing online; sent, it is frozen (trigger
-- offers_freeze_after_submit) and never deleted; the seller reads it only
-- through offer_for_seller, its personal data hidden until acceptance; status
-- and dates change only through the functions. Fixtures in postal code 99991:
-- the file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(52);
\ir _plan.psql

-- seller_a: a listing online.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, has_parking, location)
values (tests.uid('seller_a'), 'maison', '9 rue des Offres', '99991', 'Offreville', 104, 5, true,
        extensions.st_setsrid(extensions.st_makepoint(2.3403, 48.6804), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison à vendre', 'Description.', 35000000)
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

-- ===========================================================================
-- Drafting
-- ===========================================================================
\set who buyer_c
\ir _as.psql
update buyer_profiles set project = null where profile_id = tests.uid('buyer_c');
select throws_ok(format($$insert into offers (listing_id, buyer_id) values (%L, %L)$$,
                        :'listing', tests.uid('buyer_c')),
                 '42501', null, 'buyer_c: no offer before its financing is declared');
update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 40000000,
       down_payment_cents = 9000000, loan_needed = true
 where profile_id = tests.uid('buyer_c');
insert into offers (listing_id, buyer_id) values (:'listing', tests.uid('buyer_c'))
returning id as offer1 \gset
select ok((select reference ~ '^LK-[0-9]{4}-[0-9]{5,}$' and version = 1 and status = 'draft'
                  and seller_id = tests.uid('seller_a')
             from offers where id = :'offer1'),
          'buyer_c: a draft, its reference LK-AAAA-NNNNN, version 1, its seller set by the database');
select is((select array_agg(event) from offer_events where offer_id = :'offer1'), array['created'],
          'its journal: created');
select throws_ok(format($$insert into offers (listing_id, buyer_id) values (%L, %L)$$,
                        :'listing', tests.uid('buyer_c')),
                 '23505', null, 'one draft per buyer and listing');
select throws_ok(format($$insert into offers (listing_id, buyer_id) values (%L, %L)$$,
                        :'listing', tests.uid('buyer_d')),
                 '42501', null, 'buyer_c: not an offer in the name of another');
select throws_ok(format($$update offers set status = 'submitted' where id = %L$$, :'offer1'),
                 '42501', null, 'buyer_c: not its status directly');
select throws_ok(format($$update offers set seller_id = %L where id = %L$$, tests.uid('seller_b'), :'offer1'),
                 '42501', null, 'buyer_c: nor its seller');

-- The form, step by step (the draft is saved each time).
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       co_buyers = '[{"last_name":"Martin","first_name":"Paul","birth_date":"1989-01-02",
                      "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                      "email":"paul@example.test","phone":"0600000001"}]',
       acquisition_mode = 'joint',
       price_cents = 33800000, price_in_words = 'trois cent trente-huit mille euros',
       financing_mode = 'loan', down_payment_cents = 9000000, loan_amount_cents = 27500000,
       loan_duration_years = 25, financing_progress = 'simulation_done',
       condition_prior_sale = true,
       validity_until = now() + interval '5 days', visited = true
 where id = :'offer1';
select throws_ok(format($$select offer_submit(%L)$$, :'offer1'), '22023', null,
                 'buyer_c: not sent without its four declarations');
update offers
   set declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id = :'offer1';
select is((select offer_submit(:'offer1')), 'submitted'::offer_status, 'buyer_c: sends its offer');
select ok((select property_snapshot->>'listing_reference' is not null
                  and (property_snapshot->>'asking_price_cents')::bigint = 35000000
                  and property_snapshot->'annexes' = '["parking"]'::jsonb
                  and financing_status_at_submit = 'declared'
                  and declarations ? 'accepted_at' and submitted_at is not null
             from offers where id = :'offer1'),
          'sent: the property and the financing status photographed, the declarations dated');

-- ===========================================================================
-- The freeze
-- ===========================================================================
update offers set price_cents = 30000000 where id = :'offer1';
select is((select price_cents from offers where id = :'offer1'), 33800000::bigint,
          'buyer_c: its offer sent no longer changes');
reset role;
select throws_ok(format($$update offers set price_cents = 30000000 where id = %L$$, :'offer1'),
                 '42501', null, 'even for the database owner: the content of an offer sent is frozen');
select throws_ok(format($$update offers set status = 'draft' where id = %L$$, :'offer1'),
                 '42501', null, 'never back to a draft');
select throws_ok(format($$delete from offers where id = %L$$, :'offer1'),
                 '42501', null, 'an offer sent is never deleted');
select lives_ok(format($$update offers set pdf_path = %L where id = %L$$, :'offer1' || '/v1.pdf', :'offer1'),
                'its PDF is written once');
select throws_ok(format($$update offers set pdf_path = 'x.pdf' where id = %L$$, :'offer1'),
                 '42501', null, 'and never rewritten');

-- ===========================================================================
-- Who reads it
-- ===========================================================================
\set who seller_a
\ir _as.psql
select is((select count(*) from offers where id = :'offer1')::int, 0,
          'seller_a: never the table itself');
select is((select count(*) from offer_for_seller where id = :'offer1')::int, 1,
          'seller_a: the offer through offer_for_seller');
select is((select buyer_identity from offer_for_seller where id = :'offer1'),
          '{"last_name":"Martin","first_name":"Chloé","city":"Paris"}'::jsonb,
          'before acceptance: names and town of the buyer only');
select is((select co_buyers from offer_for_seller where id = :'offer1'),
          '[{"last_name":"Martin","first_name":"Paul","city":"Paris"}]'::jsonb,
          'the same for a co-buyer');
select is((select pdf_path from offer_for_seller where id = :'offer1'), null,
          'and no PDF before acceptance');
select ok((select count(*) > 0 from offer_events where offer_id = :'offer1'),
          'seller_a: reads the journal of the offer');
\set who seller_b
\ir _as.psql
select is((select count(*) from offer_for_seller where id = :'offer1')::int, 0,
          'seller_b: not the offer on another seller''s listing');
select is((select count(*) from offer_events where offer_id = :'offer1')::int, 0,
          'nor its journal');
\set who buyer_d
\ir _as.psql
select is((select count(*) from offers where id = :'offer1')::int
          + (select count(*) from offer_for_seller where id = :'offer1')::int, 0,
          'buyer_d: not the offer of another buyer');
select throws_ok(format($$select offer_withdraw(%L)$$, :'offer1'), '42501', null,
                 'buyer_d: nor withdraw it');
\set who anon
\ir _as.psql
select throws_ok('select count(*) from offers', '42501', null, 'a visitor: no offers');
select throws_ok('select count(*) from offer_for_seller', '42501', null, 'nor the view of the seller');
\set who admin
\ir _as.psql
select is((select count(*) from offers where id = :'offer1')::int, 1, 'admin: reads the offer');

-- ===========================================================================
-- Read, then replaced by a new version
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select offer_mark_viewed(%L)$$, :'offer1'), '42501', null,
                 'buyer_c: does not mark its own offer read');
\set who seller_a
\ir _as.psql
select is((select offer_mark_viewed(:'offer1')), 'viewed'::offer_status,
          'seller_a: opening it marks it « Consultée »');
select is((select offer_mark_viewed(:'offer1')), 'viewed'::offer_status, 'once only');

\set who buyer_c
\ir _as.psql
insert into offers (listing_id, buyer_id, buyer_identity, co_buyers, acquisition_mode, price_cents,
                    price_in_words, financing_mode, down_payment_cents, loan_amount_cents,
                    validity_until, visited, declarations)
select listing_id, buyer_id, buyer_identity, co_buyers, acquisition_mode, 34500000,
       'trois cent quarante-cinq mille euros', financing_mode, down_payment_cents, loan_amount_cents,
       now() + interval '3 days', visited,
       '{"accuracy":true,"price_and_financing_checked":true,"legal_effects_understood":true,"info_read":true}'
  from offers where id = :'offer1'
returning id as offer2 \gset
select is((select version from offers where id = :'offer2'), 2, 'a new offer: version 2');
select is((select offer_submit(:'offer2')), 'submitted'::offer_status, 'sent');
select is((select array[status::text, superseded_by::text] from offers where id = :'offer1'),
          array['superseded', :'offer2'], 'the first one superseded, pointing to the new one');

-- ===========================================================================
-- Accepted, then the avant-contrat
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$select offer_answer(%L, true)$$, :'offer1'), '22023', null,
                 'seller_a: not a superseded offer');
select throws_ok(format($$select offer_answer(%L, true)$$, :'offer2'), '22023', null,
                 'never accepted without confirming having read it all');
select is((select offer_answer(:'offer2', true, true)), 'accepted'::offer_status,
          'seller_a: accepts, having confirmed');
select ok((select (seller_acceptance->>'confirmed_read')::boolean and answered_at is not null
             from offer_for_seller where id = :'offer2'),
          'its confirmation recorded');
select is((select buyer_identity->>'phone' from offer_for_seller where id = :'offer2'), '0600000000',
          'accepted: the seller reads the contact of the buyer');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select offer_withdraw(%L)$$, :'offer2'), '22023', null,
                 'buyer_c: no withdrawal once accepted');
\set who seller_a
\ir _as.psql
select throws_ok(format($$select offer_record_precontract(%L, current_date + 3)$$, :'offer2'),
                 '22023', null, 'seller_a: no avant-contrat in the future');
select lives_ok(format($$select offer_record_precontract(%L, current_date, current_date)$$, :'offer2'),
                'seller_a: records its avant-contrat');
select ok((select precontract_signed_at = current_date from offer_for_seller where id = :'offer2'),
          'its date recorded');

-- ===========================================================================
-- Withdrawn, expired
-- ===========================================================================
\set who buyer_d
\ir _as.psql
update buyer_profiles
   set project = 'investissement', budget_max_cents = 40000000,
       down_payment_cents = 40000000, loan_needed = false
 where profile_id = tests.uid('buyer_d');
insert into offers (listing_id, buyer_id, buyer_identity, price_cents, price_in_words, financing_mode,
                    validity_until, visited, declarations)
values (:'listing', tests.uid('buyer_d'),
        '{"last_name":"Durand","first_name":"David","birth_date":"1980-05-05",
          "address":{"line":"1 rue Haute","postal_code":"91000","city":"Évry"},
          "email":"david@example.test","phone":"0600000002"}',
        32000000, 'trois cent vingt mille euros', 'no_loan', now() + interval '2 days', false,
        '{"accuracy":true,"price_and_financing_checked":true,"legal_effects_understood":true,"info_read":true}')
returning id as offer3 \gset
select is((select offer_submit(:'offer3')), 'submitted'::offer_status, 'buyer_d: sends an offer without visit');
select is((select offer_withdraw(:'offer3')), 'withdrawn'::offer_status, 'buyer_d: withdraws it');
select ok((select withdrawn_at is not null from offers where id = :'offer3'), 'its date recorded');

insert into offers (listing_id, buyer_id, buyer_identity, price_cents, price_in_words, financing_mode,
                    validity_until, visited, declarations)
select listing_id, buyer_id, buyer_identity, price_cents, price_in_words, financing_mode,
       now() + interval '2 days', visited, declarations
  from offers where id = :'offer3'
returning id as offer4 \gset
\o /dev/null
select offer_submit(:'offer4');
\o
-- Its validity passes (the test moves it, the freeze set aside for it alone).
reset role;
set local session_replication_role = replica;
update offers set validity_until = now() - interval '1 minute' where id = :'offer4';
set local session_replication_role = origin;
\set who seller_a
\ir _as.psql
select is((select status from offer_for_seller where id = :'offer4'), 'expired'::offer_status,
          'its validity past: the seller reads it expired at once');
select throws_ok(format($$select offer_answer(%L, true, true)$$, :'offer4'), '22023', null,
                 'and cannot accept it');
select throws_ok('select offers_expire_due()', '42501', null, 'seller_a: not the cron');
reset role;
set local role service_role;
select ok((select offers_expire_due() >= 1), 'the cron expires the offers due');
reset role;
select ok((select status = 'expired' and expired_at is not null from offers where id = :'offer4')
          and exists (select 1 from offer_events where offer_id = :'offer4' and event = 'expired'),
          'expired, dated, in its journal');

select * from finish();
rollback;
