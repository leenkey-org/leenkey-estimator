-- L2-04a: an offer received by its seller (SPEC-V2 10 and 13). The seller is
-- told when an offer comes (bell and email), the buyer when it is read (bell)
-- and answered (bell and email, with the message of the seller); their
-- listing conversation says it, created with the offer when there was none,
-- and never stops an offer; a buyer who sent an offer is in relation with
-- the seller; the view of the seller says the type of the proof of financing
-- and the date of its check, never to another seller. Fixtures in postal code
-- 99992: the file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(34);
\ir _plan.psql

-- seller_a: a listing online.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, has_parking, location)
values (tests.uid('seller_a'), 'maison', '4 rue des Réponses', '99992', 'Offrebourg', 104, 5, true,
        extensions.st_setsrid(extensions.st_makepoint(2.3413, 48.6814), 4326)::extensions.geography)
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

-- buyer_c: a project declared, a proof of financing checked by the team.
\set who buyer_c
\ir _as.psql
update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 40000000,
       down_payment_cents = 9000000, loan_needed = true, loan_amount_cents = 27500000
 where profile_id = tests.uid('buyer_c');
reset role;
insert into financing_documents (buyer_id, type, document_date, storage_path, mime_type, size_bytes,
                                 checked_at, checked_by)
values (tests.uid('buyer_c'), 'accord_principe', current_date,
        tests.uid('buyer_c') || '/financing/11111111-1111-4111-8111-111111111111.pdf',
        'application/pdf', 1000, now(), tests.uid('admin'))
returning id as doc \gset
update buyer_profiles set current_financing_document_id = :'doc' where profile_id = tests.uid('buyer_c');

\set who seller_a
\ir _as.psql
select is(has_buyer_relation(:'prop', tests.uid('buyer_c')), false,
          'seller_a: buyer_c is not in relation before an offer');

-- ===========================================================================
-- An offer sent
-- ===========================================================================
\set who buyer_c
\ir _as.psql
insert into offers (listing_id, buyer_id) values (:'listing', tests.uid('buyer_c'))
returning id as offer1 \gset
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       price_cents = 33800000,
       financing_mode = 'loan', down_payment_cents = 9000000, loan_amount_cents = 27500000,
       loan_duration_years = 25, loan_rate_max_pct = 4.20, financing_progress = 'simulation_done',
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id = :'offer1';
select is((select count(*)::int from notifications where data->>'offer_id' = :'offer1'), 0,
          'buyer_c: a draft tells no one');
select is((select offer_submit(:'offer1')), 'submitted'::offer_status, 'buyer_c: sends its offer');
select throws_ok($$select offer_amount_label(100)$$, '42501', null,
                 'buyer_c: not the functions of the notices');
select throws_ok(format($$insert into notifications (profile_id, type) values (%L, 'offer.answered')$$,
                        tests.uid('buyer_c')),
                 '42501', null, 'nor a notification written by hand');
select is((select count(*)::int from notifications where data->>'offer_id' = :'offer1'), 0,
          'buyer_c: does not read the notification of the seller');
select is((select array_agg(m.kind || ':' || m.body order by m.created_at)
             from messages m join conversations c on c.id = m.conversation_id
            where c.listing_id = :'listing' and c.buyer_id = tests.uid('buyer_c')),
          array['offer_notice:Offre d''achat ' || (select reference from offers where id = :'offer1')
                || ' envoyée au vendeur : 338' || chr(160) || '000' || chr(160) || '€.'],
          'buyer_c: the conversation with the seller is created, with the notice of the offer');

\set who seller_a
\ir _as.psql
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_a') and type = 'offer.received'
              and data->>'offer_id' = :'offer1' and link = '/offres/' || :'offer1'
              and 'email' = any(channels) and email_after is not null),
          1, 'seller_a: told of the offer, in the bell and by email');
select is((select (data->>'price_cents')::bigint = 33800000
                  and (data->>'asking_price_cents')::bigint = 35000000
                  and data->>'buyer_first_name' = 'Chloé'
                  and data->>'title' = 'Maison à vendre'
                  and data ? 'validity_until'
                  and not data ? 'email' and not data ? 'phone'
             from notifications where type = 'offer.received' and data->>'offer_id' = :'offer1'),
          true, 'with the amount, the asking price, the first name; no contact detail');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_a') and type = 'message.new'
              and created_at >= now()),
          0, 'the notice of the conversation is not a new message');
select is(has_buyer_relation(:'prop', tests.uid('buyer_c')), true,
          'seller_a: buyer_c is in relation once the offer is sent');
select is((select count(*)::int from buyer_summary_for_seller(:'prop')
            where buyer_id = tests.uid('buyer_c')),
          1, 'and reads the financing status of buyer_c');
select is((select financing_document_type::text || ':' || (financing_checked_at is not null)::text
                  || ':' || (property_id = :'prop')::text
             from offer_for_seller where id = :'offer1'),
          'accord_principe:true:true',
          'seller_a: the view says the type of the proof, the date of its check, the property');
select is((select count(*)::int from sale_step_tasks t
             join sale_steps s on s.id = t.step_id
             join sale_progress sp on sp.plan = s.plan and sp.property_id = :'prop'
            where t.auto_trigger = 'offer.submitted'
              and not exists (select 1 from sale_task_status st
                               where st.property_id = :'prop' and st.task_id = t.id
                                 and st.done_at is not null)),
          0, 'the task « Offre reçue » of the sale is ticked (when the steps are loaded)');

\set who seller_b
\ir _as.psql
select is((select count(*)::int from offer_for_seller where id = :'offer1'), 0,
          'seller_b: nothing of the offer in the view');
select is((select count(*)::int from notifications where data->>'offer_id' = :'offer1'), 0,
          'nor its notifications');
select is(has_buyer_relation(:'prop', tests.uid('buyer_c')), true,
          'has_buyer_relation says a fact, the summary checks the owner');
select is((select count(*)::int from buyer_summary_for_seller(:'prop')), 0,
          'seller_b: no summary of the buyers of another seller');

-- ===========================================================================
-- Read, then declined with a message
-- ===========================================================================
\set who seller_a
\ir _as.psql
select is((select offer_mark_viewed(:'offer1')), 'viewed'::offer_status, 'seller_a: opens the offer');
select is((select offer_answer(:'offer1', false, false, 'Trop éloigné du prix demandé.')),
          'declined'::offer_status, 'seller_a: declines it, with a message');

\set who buyer_c
\ir _as.psql
select is((select count(*)::int from notifications
            where profile_id = tests.uid('buyer_c') and type = 'offer.viewed'
              and data->>'offer_id' = :'offer1' and email_after is null
              and channels = '{in_app}'::notification_channel[]),
          1, 'buyer_c: told the offer was read, in the bell only');
select is((select (data->>'accepted')::boolean = false
                  and data->>'message' = 'Trop éloigné du prix demandé.'
                  and email_after is not null and link = '/offres/' || :'offer1'
             from notifications
            where profile_id = tests.uid('buyer_c') and type = 'offer.answered'
              and data->>'offer_id' = :'offer1'),
          true, 'buyer_c: told of the refusal, with the message, in the bell and by email');
select is((select array_agg(m.kind || ':' || (m.sender_id = c.seller_id)::text
                           order by (m.sender_id = c.seller_id))
             from messages m join conversations c on c.id = m.conversation_id
            where c.listing_id = :'listing' and c.buyer_id = tests.uid('buyer_c')),
          array['offer_notice:false', 'offer_notice:true'],
          'the conversation says the refusal, by the seller');

-- ===========================================================================
-- A second offer, accepted
-- ===========================================================================
insert into offers (listing_id, buyer_id) values (:'listing', tests.uid('buyer_c'))
returning id as offer2 \gset
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       price_cents = 34500000, financing_mode = 'no_loan',
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id = :'offer2';
\o /dev/null
select offer_submit(:'offer2');
\o
\set who seller_a
\ir _as.psql
select is((select offer_answer(:'offer2', true, true)), 'accepted'::offer_status,
          'seller_a: accepts the second offer');
\set who buyer_c
\ir _as.psql
select is((select (data->>'accepted')::boolean and not data ? 'message'
             from notifications
            where profile_id = tests.uid('buyer_c') and type = 'offer.answered'
              and data->>'offer_id' = :'offer2'),
          true, 'buyer_c: told of the acceptance, without a message');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('buyer_c') and type = 'offer.viewed'
              and data->>'offer_id' = :'offer2'),
          0, 'an offer answered without being opened first: no « read » notice');
select is((select count(distinct c.id)::int || ':' || count(m.id)::int
             from messages m join conversations c on c.id = m.conversation_id
            where c.listing_id = :'listing' and c.buyer_id = tests.uid('buyer_c')),
          '1:4', 'one conversation, its four notices');
select is((select count(*)::int from messages m join conversations c on c.id = m.conversation_id
            where c.listing_id = :'listing' and c.buyer_id = tests.uid('buyer_c')
              and m.sender_id = tests.uid('seller_a')
              and m.body = 'Offre d''achat ' || (select reference from offers where id = :'offer2')
                           || ' acceptée par le vendeur.'),
          1, 'one of them says the acceptance, by the seller');
\set who seller_a
\ir _as.psql
select is((select count(*)::int from sale_step_tasks t
             join sale_steps s on s.id = t.step_id
             join sale_progress sp on sp.plan = s.plan and sp.property_id = :'prop'
            where t.auto_trigger = 'offer.accepted'
              and not exists (select 1 from sale_task_status st
                               where st.property_id = :'prop' and st.task_id = t.id
                                 and st.done_at is not null)),
          0, 'the task « Offre acceptée » of the sale is ticked (when the steps are loaded)');

-- ===========================================================================
-- The notices never stop an offer
-- ===========================================================================
-- seller_b: another listing online.
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_b'), 'appartement', '6 rue des Limites', '99992', 'Offrebourg', 60, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3414, 48.6815), 4326)::extensions.geography)
returning id as prop_b \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_b', 'Appartement à vendre', 'Description.', 20000000)
returning id as listing_b \gset
\o /dev/null
select tests.dpe(:'listing_b');
select listing_submit(:'listing_b');
\o
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing_b');
\o
-- buyer_c wrote twenty messages within the hour (two notices, « Bonjour » and
-- seventeen more): the messaging takes no more.
\set who buyer_c
\ir _as.psql
select conversation_open(:'listing_b', 'Bonjour') as conv_b \gset
insert into messages (conversation_id, sender_id, body)
select :'conv_b', tests.uid('buyer_c'), 'Message ' || n from generate_series(1, 17) n;
select throws_ok(format($$insert into messages (conversation_id, sender_id, body) values (%L, %L, 'De trop')$$,
                        :'conv_b', tests.uid('buyer_c')),
                 '54000', null, 'buyer_c: the hourly limit of the messaging is reached');
insert into offers (listing_id, buyer_id) values (:'listing_b', tests.uid('buyer_c'))
returning id as offer3 \gset
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       price_cents = 19000000, financing_mode = 'no_loan',
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id = :'offer3';
select is((select offer_submit(:'offer3')), 'submitted'::offer_status,
          'buyer_c: the offer is sent all the same');
select is((select count(*)::int from messages where conversation_id = :'conv_b' and kind = 'offer_notice'),
          0, 'its notice is skipped');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_b') and type = 'offer.received'
              and data->>'offer_id' = :'offer3'),
          1, 'seller_b: told of the offer');
select is((select status::text from offer_for_seller where id = :'offer3'), 'submitted',
          'and reads it in the view');

select * from finish();
rollback;
