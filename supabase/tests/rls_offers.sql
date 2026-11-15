-- L2-01: the purchase offer (SPEC-V2 4 and 13). A buyer whose financing is
-- declared drafts an offer on a listing online; sent, it is frozen (trigger
-- offers_freeze_after_submit), its history never rewritten, never deleted;
-- the price in words is written by the database; the seller reads it only
-- through offer_for_seller, its personal data hidden until acceptance; status
-- and dates change only through the functions. Fixtures in postal code 99991:
-- the file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(81);
\ir _plan.psql

-- ===========================================================================
-- The price in words (traditional spelling of the acts)
-- ===========================================================================
select is(array[number_in_words_fr(338000), number_in_words_fr(80), number_in_words_fr(80000),
                number_in_words_fr(200), number_in_words_fr(201000), number_in_words_fr(71),
                number_in_words_fr(91), number_in_words_fr(21), number_in_words_fr(81),
                number_in_words_fr(1000), number_in_words_fr(2200000),
                number_in_words_fr(200000000), number_in_words_fr(1999999)],
          array['trois cent trente-huit mille', 'quatre-vingts', 'quatre-vingt mille',
                'deux cents', 'deux cent un mille', 'soixante et onze',
                'quatre-vingt-onze', 'vingt et un', 'quatre-vingt-un',
                'mille', 'deux millions deux cent mille',
                'deux cents millions', 'un million neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf'],
          'numbers in words: et un, quatre-vingts, cents, mille invariable, millions');
select is(array[price_in_words_fr(33800000), price_in_words_fr(100), price_in_words_fr(100000000),
                price_in_words_fr(33800050)],
          array['trois cent trente-huit mille euros', 'un euro', 'un million d''euros', null],
          'prices in words: euros, un euro, d''euros after a million, whole euros only');

-- seller_a: a listing online, and a draft listing.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, has_parking, location)
values (tests.uid('seller_a'), 'maison', '9 rue des Offres', '99991', 'Offreville', 104, 5, true,
        extensions.st_setsrid(extensions.st_makepoint(2.3403, 48.6804), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison à vendre', 'Description.', 35000000)
returning id as listing \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '2 rue Brouillon', '99991', 'Offreville', 50, 2,
        extensions.st_setsrid(extensions.st_makepoint(2.3404, 48.6805), 4326)::extensions.geography)
returning id as prop_draft \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_draft', 'Appartement en brouillon', 'Description.', 20000000)
returning id as listing_draft \gset
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
select throws_ok(format($$insert into offers (listing_id, buyer_id) values (%L, %L)$$,
                        :'listing_draft', tests.uid('buyer_c')),
                 '42501', null, 'buyer_c: no offer on a listing that is not online');
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
                 '42501', null, 'nor its seller');
select throws_ok(format($$update offers set price_in_words = 'trois cent mille euros' where id = %L$$, :'offer1'),
                 '42501', null, 'nor the price in words (written by the database)');
select throws_ok(format($$insert into offer_events (offer_id, event) values (%L, 'accepted')$$, :'offer1'),
                 '42501', null, 'nor a line of the journal');

-- The form, step by step (the draft is saved each time).
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       co_buyers = '[{"last_name":"Martin","first_name":"Paul"}]',
       acquisition_mode = 'joint',
       price_cents = 33800000,
       financing_mode = 'loan', down_payment_cents = 9000000, loan_amount_cents = 27500000,
       loan_duration_years = 25, loan_rate_max_pct = 4.20, financing_progress = 'simulation_done',
       condition_prior_sale = true,
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true}'
 where id = :'offer1';
select throws_ok(format($$select offer_submit(%L)$$, :'offer1'), '22023', 'the offer is incomplete',
                 'buyer_c: not sent without its four declarations');
update offers
   set declarations = declarations || '{"info_read":true}'
 where id = :'offer1';
select throws_ok(format($$select offer_submit(%L)$$, :'offer1'), '22023', 'the offer is incomplete',
                 'nor with a co-buyer whose identity is incomplete');
update offers
   set co_buyers = '[{"last_name":"Martin","first_name":"Paul","birth_date":"1989-01-02",
                      "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                      "email":"paul@example.test","phone":"0600000001"}]',
       validity_until = now() + interval '11 days'
 where id = :'offer1';
select throws_ok(format($$select offer_submit(%L)$$, :'offer1'), '22023',
                 'the validity of the offer must be from 2 to 10 days',
                 'nor valid more than 10 days');
update offers set validity_until = now() + interval '5 days' where id = :'offer1';
select is((select offer_submit(:'offer1')), 'submitted'::offer_status, 'buyer_c: sends its offer');
select ok((select property_snapshot->>'listing_reference' is not null
                  and (property_snapshot->>'asking_price_cents')::bigint = 35000000
                  and property_snapshot->'annexes' = '["parking"]'::jsonb
                  and property_snapshot->'address' = '{"postal_code":"99991","city":"Offreville"}'::jsonb
                  and financing_status_at_submit = 'declared'
                  and declarations ? 'accepted_at' and submitted_at is not null
             from offers where id = :'offer1'),
          'sent: the property (its town, not its exact address) and the financing status photographed, the declarations dated');
select is((select price_in_words from offers where id = :'offer1'), 'trois cent trente-huit mille euros',
          'the price in words written by the database');

-- ===========================================================================
-- The freeze, and its history
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
select throws_ok(format($$delete from offer_events where offer_id = %L$$, :'offer1'),
                 '42501', null, 'nor its journal');
select lives_ok(format($$update offers set pdf_path = %L, synthesis = '{"analysis":[]}' where id = %L$$,
                       :'offer1' || '/v1.pdf', :'offer1'),
                'its PDF and its synthesis are written once');
select throws_ok(format($$update offers set pdf_path = 'x.pdf' where id = %L$$, :'offer1'),
                 '42501', null, 'the PDF never rewritten');
select throws_ok(format($$update offers set synthesis = '{}' where id = %L$$, :'offer1'),
                 '42501', null, 'nor the synthesis');

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
select throws_ok(format($$select offer_mark_viewed(%L)$$, :'offer1'), '42501', null,
                 'nor mark it read');
select throws_ok(format($$select offer_answer(%L, true, true)$$, :'offer1'), '42501', null,
                 'nor answer it');
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
select throws_ok('select count(*) from offer_events', '42501', null, 'nor the journals');
select throws_ok(format($$select offer_submit(%L)$$, :'offer1'), '42501', null, 'nor the functions');
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
select is((select offer_mark_viewed(:'offer1')), 'viewed'::offer_status, 'opening it again');
select is((select count(*) from offer_events where offer_id = :'offer1' and event = 'viewed')::int, 1,
          'read once only in its journal');
reset role;
select throws_ok(format($$update offers set viewed_at = now() - interval '1 day' where id = %L$$, :'offer1'),
                 '42501', null, 'the date of its reading is never rewritten, even by the owner');

\set who buyer_c
\ir _as.psql
insert into offers (listing_id, buyer_id, buyer_identity, co_buyers, acquisition_mode, price_cents,
                    financing_mode, down_payment_cents, loan_amount_cents, loan_duration_years,
                    loan_rate_max_pct, validity_until, visited, declarations)
select listing_id, buyer_id, buyer_identity, co_buyers, acquisition_mode, 34500000,
       financing_mode, down_payment_cents, loan_amount_cents, loan_duration_years, loan_rate_max_pct,
       now() + interval '3 days', visited,
       '{"accuracy":true,"price_and_financing_checked":true,"legal_effects_understood":true,"info_read":true}'
  from offers where id = :'offer1'
returning id as offer2 \gset
select is((select version from offers where id = :'offer2'), 2, 'a new offer: version 2');
\set who seller_a
\ir _as.psql
select is((select count(*) from offer_for_seller where id = :'offer2')::int
          + (select count(*) from offer_events where offer_id = :'offer2')::int, 0,
          'seller_a: neither a draft nor its journal');
\set who buyer_c
\ir _as.psql
select is((select offer_submit(:'offer2')), 'submitted'::offer_status, 'sent');
select is((select array[status::text, superseded_by::text] from offers where id = :'offer1'),
          array['superseded', :'offer2'], 'the first one superseded, pointing to the new one');

-- ===========================================================================
-- Accepted, then the avant-contrat
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$select offer_answer(%L, true, true)$$, :'offer1'), '22023',
                 'cannot accept an offer superseded', 'seller_a: not a superseded offer');
select throws_ok(format($$select offer_answer(%L, true)$$, :'offer2'), '22023',
                 'the seller must confirm having read the whole offer',
                 'never accepted without confirming having read it all');
select is((select offer_answer(:'offer2', true, true, null, 'hash-of-ip')), 'accepted'::offer_status,
          'seller_a: accepts, having confirmed');
select ok((select (seller_acceptance->>'confirmed_read')::boolean
                  and seller_acceptance->>'ip_hash' = 'hash-of-ip' and answered_at is not null
             from offer_for_seller where id = :'offer2'),
          'its confirmation recorded');
select is((select buyer_identity->>'phone' from offer_for_seller where id = :'offer2'), '0600000000',
          'accepted: the seller reads the contact of the buyer');
reset role;
select throws_ok(format($$update offers set status = 'submitted' where id = %L$$, :'offer2'),
                 '42501', null, 'an acceptance is never undone, even by the owner');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select offer_withdraw(%L)$$, :'offer2'), '22023', null,
                 'buyer_c: no withdrawal once accepted');
select throws_ok(format($$insert into offers (listing_id, buyer_id) values (%L, %L)$$,
                        :'listing', tests.uid('buyer_c')),
                 '42501', null, 'nor a new offer on the listing');
\set who buyer_d
\ir _as.psql
-- The day in Paris, as the function reads it (not current_date: UTC is a day behind for an hour or two).
select throws_ok(format($$select offer_record_precontract(%L, (now() at time zone 'Europe/Paris')::date)$$, :'offer2'), '42501', null,
                 'buyer_d: not the avant-contrat of another');
\set who seller_a
\ir _as.psql
select throws_ok(format($$select offer_record_precontract(%L, (now() at time zone 'Europe/Paris')::date + 3)$$, :'offer2'),
                 '22023', null, 'seller_a: no avant-contrat in the future');
select throws_ok(format($$select offer_record_precontract(%L, (now() at time zone 'Europe/Paris')::date - 30)$$, :'offer2'),
                 '22023', null, 'nor before the acceptance');
select lives_ok(format($$select offer_record_precontract(%L, (now() at time zone 'Europe/Paris')::date, (now() at time zone 'Europe/Paris')::date)$$, :'offer2'),
                'seller_a: records its avant-contrat');
select ok((select precontract_signed_at = (now() at time zone 'Europe/Paris')::date from offer_for_seller where id = :'offer2'),
          'its date recorded');
\set who admin
\ir _as.psql
select lives_ok(format($$select offer_record_precontract(%L, (now() at time zone 'Europe/Paris')::date, null)$$, :'offer2'),
                'admin: corrects it (Sérénité, Q7)');
select ok(exists (select 1 from audit_log where action = 'offer.precontract' and entity_id = :'offer2'
                     and actor_id = tests.uid('admin')),
          'in the audit log');

-- ===========================================================================
-- SCI, without visit, withdrawn, declined, expired
-- ===========================================================================
\set who buyer_d
\ir _as.psql
update buyer_profiles
   set project = 'investissement', budget_max_cents = 40000000,
       down_payment_cents = 40000000, loan_needed = false
 where profile_id = tests.uid('buyer_d');
insert into offers (listing_id, buyer_id, buyer_identity, acquisition_mode, sci_details, price_cents,
                    financing_mode, validity_until, visited, declarations)
values (:'listing', tests.uid('buyer_d'),
        '{"last_name":"Durand","first_name":"David","birth_date":"1980-05-05",
          "address":{"line":"1 rue Haute","postal_code":"91000","city":"Évry"},
          "email":"david@example.test","phone":"0600000002"}',
        'sci', '{"name":"SCI Durand","status":"registered","head_office_address":"1 rue Haute, Évry",
                 "representative":"David Durand"}',
        32000000, 'no_loan', now() + interval '2 days', false,
        '{"accuracy":true,"price_and_financing_checked":true,"legal_effects_understood":true,"info_read":true}')
returning id as offer3 \gset
select throws_ok(format($$select offer_submit(%L)$$, :'offer3'), '22023', 'the offer is incomplete',
                 'buyer_d: an SCI already registered needs its SIREN');
update offers set sci_details = sci_details || '{"siren":"123456789"}' where id = :'offer3';
select is((select offer_submit(:'offer3')), 'submitted'::offer_status,
          'buyer_d: sends an offer through its SCI, without visit');
\set who seller_a
\ir _as.psql
select is((select sci_details from offer_for_seller where id = :'offer3'),
          '{"name":"SCI Durand","status":"registered"}'::jsonb,
          'seller_a: the name and state of the SCI only before acceptance');
\set who buyer_d
\ir _as.psql
select is((select offer_withdraw(:'offer3')), 'withdrawn'::offer_status, 'buyer_d: withdraws it');
select ok((select withdrawn_at is not null from offers where id = :'offer3'), 'its date recorded');

insert into offers (listing_id, buyer_id, buyer_identity, price_cents, financing_mode,
                    validity_until, visited, declarations)
select listing_id, buyer_id, buyer_identity, 31000000, 'no_loan', now() + interval '2 days', visited, declarations
  from offers where id = :'offer3'
returning id as offer4 \gset
\o /dev/null
select offer_submit(:'offer4');
\o
\set who seller_a
\ir _as.psql
select is((select offer_answer(:'offer4', false, false, 'Prix trop bas pour nous.')), 'declined'::offer_status,
          'seller_a: declines, with a message');
select is((select meta->>'message' from offer_events where offer_id = :'offer4' and event = 'declined'),
          'Prix trop bas pour nous.', 'the message in the journal');

\set who buyer_d
\ir _as.psql
insert into offers (listing_id, buyer_id, buyer_identity, price_cents, financing_mode,
                    validity_until, visited, declarations)
select listing_id, buyer_id, buyer_identity, 31500000, 'no_loan', now() + interval '2 days', visited, declarations
  from offers where id = :'offer3'
returning id as offer5 \gset
\o /dev/null
select offer_submit(:'offer5');
\o
-- Its validity passes (the test moves it, the triggers set aside for it alone).
reset role;
set local session_replication_role = replica;
update offers set validity_until = now() - interval '1 minute' where id = :'offer5';
set local session_replication_role = origin;
\set who seller_a
\ir _as.psql
select is((select status from offer_for_seller where id = :'offer5'), 'expired'::offer_status,
          'its validity past: the seller reads it expired at once');
select throws_ok('select offers_expire_due()', '42501', null, 'seller_a: not the cron');
reset role;
set local role service_role;
select ok((select offers_expire_due() >= 1), 'the cron expires the offers due');
reset role;
select ok((select status = 'expired' and expired_at is not null from offers where id = :'offer5')
          and exists (select 1 from offer_events where offer_id = :'offer5' and event = 'expired'),
          'expired, dated, in its journal');
\set who seller_a
\ir _as.psql
select is((select offer_answer(:'offer5', true, true)), 'expired'::offer_status,
          'an expired offer cannot be accepted: it stays expired');

-- A suspended buyer: no new offer, but it may still withdraw.
\set who buyer_d
\ir _as.psql
insert into offers (listing_id, buyer_id, buyer_identity, price_cents, financing_mode,
                    validity_until, visited, declarations)
select listing_id, buyer_id, buyer_identity, 31800000, 'no_loan', now() + interval '2 days', visited, declarations
  from offers where id = :'offer3'
returning id as offer6 \gset
\o /dev/null
select offer_submit(:'offer6');
\o
reset role;
update profiles set suspended_at = now() where id = tests.uid('buyer_d');
\set who buyer_d
\ir _as.psql
select throws_ok(format($$insert into offers (listing_id, buyer_id) values (%L, %L)$$,
                        :'listing', tests.uid('buyer_d')),
                 '42501', null, 'buyer_d suspended: no new draft');
select is((select offer_withdraw(:'offer6')), 'withdrawn'::offer_status,
          'buyer_d suspended: still withdraws its offer');

select * from finish();
rollback;
