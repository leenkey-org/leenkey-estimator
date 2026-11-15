-- L2-06: prefill_offer, the tool of the assistant of the buyer. Confirmed, it
-- writes the price of the draft of the buyer on a listing online (created
-- when there is none) and its result in the log of the assistant, in one
-- transaction, with the rights of the buyer: nothing for a buyer whose
-- financing is not declared, for a listing off line, for someone else's
-- conversation; a call answered once; never an offer sent. Fixtures in postal
-- code 99995: the file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(22);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '4 rue du Brouillon', '99995', 'Préparville', 62, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3511, 48.6911), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Appartement à préparer', 'Description.', 30000000)
returning id as listing \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '6 rue du Brouillon', '99995', 'Préparville', 90, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.3512, 48.6912), 4326)::extensions.geography)
returning id as prop_off \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_off', 'Maison hors ligne', 'Description.', 40000000)
returning id as listing_off \gset
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
-- A buyer whose financing is not declared
-- ===========================================================================
\set who buyer_c
\ir _as.psql
update buyer_profiles set project = null where profile_id = tests.uid('buyer_c');
insert into ai_conversations (profile_id, context) values (tests.uid('buyer_c'), 'buyer')
returning id as conv_c \gset
select throws_ok(format($$select ai_prefill_offer(%L, 'toolu_1', 'prefill_offer', %L, 28500000)$$,
                        :'conv_c', :'listing'),
                 '42501', null, 'buyer_c: no draft before its financing is declared');
select is((select count(*)::int from ai_messages where conversation_id = :'conv_c'), 0,
          'a draft refused writes no result in the log');

update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 40000000,
       down_payment_cents = 9000000, loan_needed = true
 where profile_id = tests.uid('buyer_c');

-- ===========================================================================
-- What it takes
-- ===========================================================================
select throws_ok(format($$select ai_prefill_offer(%L, 'toolu_1', 'update_listing_price', %L, 28500000)$$,
                        :'conv_c', :'listing'),
                 '22023', null, 'only as the tool prefill_offer');
select throws_ok(format($$select ai_prefill_offer(%L, 'toolu_1', 'prefill_offer', %L, 28500050)$$,
                        :'conv_c', :'listing'),
                 '22023', null, 'a price in whole euros');
select throws_ok(format($$select ai_prefill_offer(%L, 'toolu_1', 'prefill_offer', %L, 0)$$,
                        :'conv_c', :'listing'),
                 '22023', null, 'a price above zero');
select throws_ok(format($$select ai_prefill_offer(%L, 'toolu_1', 'prefill_offer', %L, 30000000)$$,
                        :'conv_c', :'listing_off'),
                 '42501', null, 'buyer_c: no draft on a listing that is not online');
select is((select count(*)::int from ai_messages where conversation_id = :'conv_c'), 0,
          'nothing logged so far');

-- ===========================================================================
-- The draft is created, then changed
-- ===========================================================================
select ai_prefill_offer(:'conv_c', 'toolu_1', 'prefill_offer', :'listing', 28500000) as offer1 \gset
select is((select row(status, price_cents, buyer_id, seller_id, version)::text from offers where id = :'offer1'),
          row('draft'::offer_status, 28500000::bigint, tests.uid('buyer_c'), tests.uid('seller_a'), 1)::text,
          'buyer_c: a draft with the price, its seller and its version set by the database');
select is((select buyer_identity::text || ' ' || coalesce(financing_mode::text, 'none')
                  || ' ' || coalesce(validity_until::text, 'none') from offers where id = :'offer1'),
          '{} none none', 'nothing else is filled: the buyer fills the steps of the form');
select is((select content->'result'->>'prefilled' || ' ' || (content->>'status') from ai_messages
            where conversation_id = :'conv_c' and content->>'tool_use_id' = 'toolu_1'),
          'true confirmed', 'its result in the log of the assistant');
select throws_ok(format($$select ai_prefill_offer(%L, 'toolu_1', 'prefill_offer', %L, 10000000)$$,
                        :'conv_c', :'listing'),
                 '23505', null, 'a call already answered changes nothing');
select is((select price_cents from offers where id = :'offer1'), 28500000::bigint,
          'the draft kept its price');

-- The buyer went on in the form, then asks the assistant for another price.
update offers
   set declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}',
       visited = true
 where id = :'offer1';
select is((select ai_prefill_offer(:'conv_c', 'toolu_2', 'prefill_offer', :'listing', 29000000)),
          :'offer1'::uuid, 'a second price changes the same draft');
select is((select row(price_cents, declarations::text)::text from offers where id = :'offer1'),
          row(29000000::bigint, '{}')::text,
          'its price changed, its declarations unticked');
select is((select count(*)::int from offers where buyer_id = tests.uid('buyer_c') and listing_id = :'listing'),
          1, 'one draft only');
select is((select count(*)::int from offers
            where listing_id = :'listing' and status <> 'draft'), 0,
          'never an offer sent');

-- ===========================================================================
-- The others
-- ===========================================================================
\set who buyer_d
\ir _as.psql
update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 40000000,
       down_payment_cents = 9000000, loan_needed = true
 where profile_id = tests.uid('buyer_d');
select throws_ok(format($$select ai_prefill_offer(%L, 'toolu_3', 'prefill_offer', %L, 27000000)$$,
                        :'conv_c', :'listing'),
                 '42501', null, 'buyer_d: not in the conversation of another buyer');
select is((select count(*)::int from offers where listing_id = :'listing'), 0,
          'buyer_d: no draft written, and none of buyer_c read');

\set who seller_a
\ir _as.psql
insert into ai_conversations (profile_id, context) values (tests.uid('seller_a'), 'seller')
returning id as conv_a \gset
select throws_ok(format($$select ai_prefill_offer(%L, 'toolu_4', 'prefill_offer', %L, 27000000)$$,
                        :'conv_a', :'listing'),
                 '42501', null, 'seller_a: no offer on its own listing');
select is((select count(*)::int from ai_messages where conversation_id = :'conv_a'), 0,
          'seller_a: nothing logged');

\set who anon
\ir _as.psql
select throws_ok(format($$select ai_prefill_offer(%L, 'toolu_5', 'prefill_offer', %L, 27000000)$$,
                        :'conv_c', :'listing'),
                 '42501', null, 'anon: not the function');

reset role;
select is((select price_cents from offers where id = :'offer1'), 29000000::bigint,
          'the draft of buyer_c is as it left it');

select * from finish();
rollback;
