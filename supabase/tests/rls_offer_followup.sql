-- L2-04b: what follows an offer for its buyer (SPEC-V2 10 and 13). A
-- withdrawal is told to the seller (bell and email) and said in their
-- conversation; an expiry is told to the buyer and to the seller, whoever
-- writes it (the cron, or the first act on an offer past its validity); a new
-- offer copies the content of the previous one, with the next version; the
-- avant-contrat recorded ticks the task of the sale, and its dates are read
-- by the buyer; an accepted offer is not withdrawn. Fixtures in postal code
-- 99993: the file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(30);
\ir _plan.psql

-- seller_a: a listing online.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '9 rue des Suites', '99993', 'Suivibourg', 98, 5,
        extensions.st_setsrid(extensions.st_makepoint(2.3513, 48.6914), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison à suivre', 'Description.', 30000000)
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

-- buyer_c: a project declared.
\set who buyer_c
\ir _as.psql
update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 35000000,
       down_payment_cents = 30000000, loan_needed = false
 where profile_id = tests.uid('buyer_c');

-- ===========================================================================
-- An offer sent, then withdrawn by its buyer
-- ===========================================================================
insert into offers (listing_id, buyer_id) values (:'listing', tests.uid('buyer_c'))
returning id as offer1 \gset
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       price_cents = 28000000, financing_mode = 'no_loan',
       condition_prior_sale = true, conditions_details = 'Vente de notre appartement.',
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id = :'offer1';
\o /dev/null
select offer_submit(:'offer1');
\o
select is((select offer_withdraw(:'offer1')), 'withdrawn'::offer_status, 'buyer_c: withdraws its offer');
select is((select count(*)::int from notifications where data->>'offer_id' = :'offer1'), 0,
          'buyer_c: does not read the notifications of the seller');

\set who seller_a
\ir _as.psql
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_a') and type = 'offer.withdrawn'
              and data->>'offer_id' = :'offer1' and link = '/offres/' || :'offer1'
              and 'email' = any(channels) and email_after is not null),
          1, 'seller_a: told of the withdrawal, in the bell and by email');
select is((select (data->>'withdrawn_at')::timestamptz = (select withdrawn_at from offer_for_seller where id = :'offer1')
                  and data->>'buyer_first_name' = 'Chloé' and data->>'title' = 'Maison à suivre'
             from notifications where type = 'offer.withdrawn' and data->>'offer_id' = :'offer1'),
          true, 'with the date and the time of the withdrawal, the first name, the listing');
\set hidden '(example\.test|0600000000|rue Verte|1990-04-12|75011)'
select is((select count(*)::int from notifications
            where data->>'offer_id' = :'offer1' and data::text ~ :'hidden'),
          0, 'no contact detail, address or birth date in it');
select is((select array_agg(m.body order by m.id)
             from messages m join conversations c on c.id = m.conversation_id
            where c.listing_id = :'listing' and c.buyer_id = tests.uid('buyer_c')
              and m.kind = 'offer_notice' and m.sender_id = tests.uid('buyer_c')),
          array['Offre d''achat ' || (select reference from offer_for_seller where id = :'offer1')
                  || ' envoyée au vendeur : 280' || chr(160) || '000' || chr(160) || '€.',
                'Offre d''achat ' || (select reference from offer_for_seller where id = :'offer1')
                  || ' retirée par l''acquéreur.'],
          'the conversation says the withdrawal, by the buyer');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_a') and type = 'message.new' and created_at >= now()),
          0, 'a notice is not a new message');
select throws_ok(format($$select offer_answer(%L, true, true)$$, :'offer1'), '22023', null,
                 'seller_a: a withdrawn offer takes no answer');

\set who seller_b
\ir _as.psql
select is((select count(*)::int from notifications where data->>'offer_id' = :'offer1'), 0,
          'seller_b: nothing of the withdrawal');

-- ===========================================================================
-- A new offer: the content of the previous one, the next version
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select lives_ok(format($$
  insert into offers (listing_id, buyer_id, buyer_identity, co_buyers, acquisition_mode,
                      acquisition_mode_other, sci_details, price_cents, financing_mode,
                      down_payment_cents, loan_amount_cents, loan_duration_years, loan_rate_max_pct,
                      lender_name, financing_progress, financing_progress_other,
                      condition_prior_sale, condition_authorization, condition_other,
                      conditions_details, visited)
  select listing_id, buyer_id, buyer_identity, co_buyers, acquisition_mode,
         acquisition_mode_other, sci_details, price_cents, financing_mode,
         down_payment_cents, loan_amount_cents, loan_duration_years, loan_rate_max_pct,
         lender_name, financing_progress, financing_progress_other,
         condition_prior_sale, condition_authorization, condition_other,
         conditions_details, visited
    from offers where id = %L$$, :'offer1'),
  'buyer_c: a new draft with the content of its previous offer');
select id as offer2 from offers
 where listing_id = :'listing' and buyer_id = tests.uid('buyer_c') and status = 'draft' \gset
select is((select version || ':' || status || ':' || price_cents || ':' || (reference <> (select reference from offers where id = :'offer1'))::text
                  || ':' || (validity_until is null)::text || ':' || (declarations = '{}'::jsonb)::text
             from offers where id = :'offer2'),
          '2:draft:28000000:true:true:true',
          'version 2, its own reference, a draft: neither the validity nor the declarations are copied');
select throws_ok(format($$select offer_submit(%L)$$, :'offer2'), '22023', null,
                 'not sent before its validity and its declarations are given again');
update offers
   set price_cents = 29000000, validity_until = now() + interval '2 days',
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id = :'offer2';
select is((select offer_submit(:'offer2')), 'submitted'::offer_status, 'buyer_c: sends the new offer');

-- ===========================================================================
-- Expired by the cron: its buyer and its seller are told
-- ===========================================================================
reset role;
set local session_replication_role = replica;
update offers set validity_until = now() - interval '1 minute' where id = :'offer2';
set local session_replication_role = origin;
set local role service_role;
select ok((select offers_expire_due() >= 1), 'the cron expires the offers due');
reset role;
select is((select array_agg(data->>'role' order by data->>'role')
             from notifications
            where type = 'offer.expired' and data->>'offer_id' = :'offer2'
              and 'email' = any(channels) and email_after is not null
              and data->>'expired_at' is not null and link = '/offres/' || :'offer2'
              and profile_id = case data->>'role' when 'buyer' then tests.uid('buyer_c')
                                                  else tests.uid('seller_a') end),
          array['buyer', 'seller'], 'the buyer and the seller are told of the expiry, in the bell and by email');
select is((select count(*)::int from notifications
            where data->>'offer_id' = :'offer2' and data::text ~ :'hidden'),
          0, 'no contact detail in them');
select is((select count(*)::int from messages m join conversations c on c.id = m.conversation_id
            where c.listing_id = :'listing' and c.buyer_id = tests.uid('buyer_c')),
          3, 'an expiry writes no notice: sent, withdrawn, sent');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from notifications
            where type = 'offer.expired' and data->>'offer_id' = :'offer2'),
          1, 'buyer_c: reads its notification, not the one of the seller');

-- ===========================================================================
-- Expired by the first act on an offer past its validity
-- ===========================================================================
insert into offers (listing_id, buyer_id, buyer_identity, price_cents, financing_mode,
                    validity_until, visited, declarations)
select listing_id, buyer_id, buyer_identity, 29500000, 'no_loan', now() + interval '2 days', visited,
       '{"accuracy":true,"price_and_financing_checked":true,
         "legal_effects_understood":true,"info_read":true}'
  from offers where id = :'offer1'
returning id as offer3 \gset
\o /dev/null
select offer_submit(:'offer3');
\o
reset role;
set local session_replication_role = replica;
update offers set validity_until = now() - interval '1 minute' where id = :'offer3';
set local session_replication_role = origin;
\set who seller_a
\ir _as.psql
select is((select offer_answer(:'offer3', true, true)), 'expired'::offer_status,
          'seller_a: accepts too late, the offer is expired');
reset role;
select is((select count(*)::int from notifications
            where type = 'offer.expired' and data->>'offer_id' = :'offer3'),
          2, 'and the two are told, once each');
set local role service_role;
\o /dev/null
select offers_expire_due();
\o
reset role;
select is((select count(*)::int from notifications
            where type = 'offer.expired' and data->>'offer_id' in (:'offer2', :'offer3')),
          4, 'the cron does not tell it again');

-- ===========================================================================
-- Accepted: no withdrawal; the avant-contrat, by the seller
-- ===========================================================================
\set who buyer_c
\ir _as.psql
insert into offers (listing_id, buyer_id, buyer_identity, price_cents, financing_mode,
                    validity_until, visited, declarations)
select listing_id, buyer_id, buyer_identity, 29800000, 'no_loan', now() + interval '3 days', visited,
       '{"accuracy":true,"price_and_financing_checked":true,
         "legal_effects_understood":true,"info_read":true}'
  from offers where id = :'offer1'
returning id as offer4 \gset
\o /dev/null
select offer_submit(:'offer4');
\o
\set who seller_a
\ir _as.psql
\o /dev/null
select offer_answer(:'offer4', true, true);
\o
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select offer_withdraw(%L)$$, :'offer4'), '22023', null,
                 'buyer_c: an accepted offer is not withdrawn');
select throws_ok(format($$select offer_record_precontract(%L, current_date)$$, :'offer4'), '42501', null,
                 'buyer_c: does not record the avant-contrat');
select is((select precontract_signed_at is null and withdrawal_period_start is null
             from offers where id = :'offer4'),
          true, 'no avant-contrat yet');
\set who seller_a
\ir _as.psql
select lives_ok(format($$select offer_record_precontract(%L, current_date, current_date)$$, :'offer4'),
                'seller_a: records the avant-contrat and the start of the withdrawal period');
select is((select count(*)::int from sale_step_tasks t
             join sale_steps s on s.id = t.step_id
             join sale_progress sp on sp.plan = s.plan and sp.property_id = :'prop'
            where t.code = 'precontract_signed'
              and not exists (select 1 from sale_task_status st
                               where st.property_id = :'prop' and st.task_id = t.id
                                 and st.done_at is not null)),
          0, 'the task « Avant-contrat signé » of the sale is ticked (when the steps are loaded)');
select lives_ok(format($$select offer_record_precontract(%L, current_date, null)$$, :'offer4'),
                'seller_a: corrects it (the start of the period unknown after all)');
\set who buyer_c
\ir _as.psql
select is((select precontract_signed_at = current_date and withdrawal_period_start is null
             from offers where id = :'offer4'),
          true, 'buyer_c: reads the avant-contrat of its offer, as last recorded');
select is((select count(*)::int from offer_events
            where offer_id = :'offer4' and event = 'precontract_recorded'),
          2, 'and its journal says the two recordings');
reset role;
select is((select count(*)::int from notifications
            where data->>'offer_id' = :'offer4' and type not in ('offer.received', 'offer.answered')),
          0, 'the avant-contrat tells no one: its buyer signed it');

select * from finish();
rollback;
