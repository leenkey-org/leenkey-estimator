-- L3-03: the feedback after a visit (SPEC-V2 14, 18, 19). The buyer of a
-- visit that took place gives an interest and a comment, the seller of the
-- property a note for themselves, for 7 days; nobody else writes; the buyer
-- never reads the note of the seller; the daily request leaves once.
-- Fixtures in postal code 99989.
begin;
\ir _helpers.psql
select plan(50);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '5 rue du Retour', '99989', 'Retourville', 90, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.41, 48.76), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison du retour', 'Description.', 30000000)
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

-- Visits written as the owner of the tables (no booking is in the past):
-- one ended 20 hours ago (buyer_c), one ended 30 hours ago whose buyer
-- already answered (buyer_d), one to come, one ended 8 days ago, one
-- cancelled (buyer_d).
reset role;
insert into visit_slots (property_id, starts_at, ends_at) values
  (:'prop', now() - interval '20 hours 30 minutes', now() - interval '20 hours')
returning id as slot_past \gset
insert into visit_slots (property_id, starts_at, ends_at) values
  (:'prop', now() - interval '30 hours 30 minutes', now() - interval '30 hours')
returning id as slot_given \gset
insert into visit_slots (property_id, starts_at, ends_at) values
  (:'prop', now() + interval '2 days', now() + interval '2 days 30 minutes')
returning id as slot_future \gset
insert into visit_slots (property_id, starts_at, ends_at) values
  (:'prop', now() - interval '8 days 30 minutes', now() - interval '8 days')
returning id as slot_old \gset
insert into visit_slots (property_id, starts_at, ends_at) values
  (:'prop', now() - interval '22 hours 30 minutes', now() - interval '22 hours')
returning id as slot_cancelled \gset
insert into visits (slot_id, property_id, buyer_id) values (:'slot_past', :'prop', tests.uid('buyer_c'))
returning id as visit_past \gset
insert into visits (slot_id, property_id, buyer_id, buyer_interest)
values (:'slot_given', :'prop', tests.uid('buyer_d'), 3)
returning id as visit_given \gset
insert into visits (slot_id, property_id, buyer_id) values (:'slot_future', :'prop', tests.uid('buyer_d'))
returning id as visit_future \gset
insert into visits (slot_id, property_id, buyer_id) values (:'slot_old', :'prop', tests.uid('buyer_d'))
returning id as visit_old \gset
insert into visits (slot_id, property_id, buyer_id, status, cancelled_at)
values (:'slot_cancelled', :'prop', tests.uid('buyer_d'), 'cancelled', now() - interval '2 days')
returning id as visit_cancelled \gset

-- ===========================================================================
-- The request, the day after
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok($$select visits_ask_feedback()$$, '42501', null, 'seller_a: the daily request is the cron''s');
reset role;
-- At least: the local base may hold other visits of yesterday.
select cmp_ok(visits_ask_feedback(), '>=', 2, 'the visits ended between 12 and 60 hours ago are asked about');
select is((select array_agg(id order by id) from visits where property_id = :'prop' and feedback_requested_at is not null),
          (select array_agg(id order by id) from visits where id in (:'visit_past', :'visit_given')),
          'not a visit to come, older or cancelled');
select is((select array_agg(data->>'role' order by data->>'role') from notifications
            where type = 'visit.feedback_requested' and data->>'visit_id' = :'visit_past'),
          array['buyer', 'seller'], 'the buyer and the seller of the visit are asked');
select is((select array_agg(distinct link) from notifications
            where type = 'visit.feedback_requested' and data->>'visit_id' = :'visit_past'),
          array['/visites/' || :'visit_past'], 'with the link of the page of the visit');
select is((select array_agg(profile_id) from notifications
            where type = 'visit.feedback_requested' and data->>'visit_id' = :'visit_given'),
          array[tests.uid('seller_a')], 'a buyer who already answered is not asked');
select is((select count(*)::int from notifications
            where type = 'visit.feedback_requested' and data->>'property_id' = :'prop'
              and email_after is not null), 3,
          'each request has its email');
select is((select count(*)::int from notifications
            where type = 'visit.feedback_requested' and data::text like '%rue du Retour%'), 0,
          'the address is in no request');
select is(visits_ask_feedback(), 0, 'asked again: nothing more');
select is((select count(*)::int from notifications
            where type = 'visit.feedback_requested' and data->>'property_id' = :'prop'), 3,
          'one request per visit and party, never two');

-- ===========================================================================
-- Who writes, and when
-- ===========================================================================
\set who anon
\ir _as.psql
select throws_ok(format($$select visit_feedback_buyer(%L, 4, null)$$, :'visit_past'),
                 '42501', null, 'anon: no feedback');
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select visit_feedback_buyer(%L, 4, null)$$, :'visit_past'),
                 '42501', null, 'buyer_d: no feedback on the visit of buyer_c');
select is((select count(*)::int from visits where id = :'visit_past'), 0, 'buyer_d: reads nothing of the visit of buyer_c');
select throws_ok(format($$select visit_feedback_buyer(%L, 4, null)$$, :'visit_future'),
                 '22023', null, 'buyer_d: no feedback before the visit ended');
select throws_ok(format($$select visit_feedback_buyer(%L, 4, null)$$, :'visit_old'),
                 '22023', null, 'buyer_d: no feedback more than 7 days after the visit');
select throws_ok(format($$select visit_feedback_buyer(%L, 4, null)$$, :'visit_cancelled'),
                 '22023', null, 'buyer_d: no feedback on a cancelled visit');
\set who seller_b
\ir _as.psql
select throws_ok(format($$select visit_feedback_seller(%L, 'Note')$$, :'visit_past'),
                 '42501', null, 'seller_b: no note on a visit of the property of seller_a');
select is((select count(*)::int from visits where property_id = :'prop'), 0, 'seller_b: reads no visit of seller_a');
select is(visit_seller_note(:'visit_past'), null, 'seller_b: nor a note');
\set who admin
\ir _as.psql
select throws_ok(format($$select visit_feedback_buyer(%L, 4, null)$$, :'visit_past'),
                 '42501', null, 'admin: gives no feedback for a buyer');
select throws_ok(format($$select visit_feedback_seller(%L, 'Note')$$, :'visit_past'),
                 '42501', null, 'admin: nor a note for a seller');

\set who buyer_c
\ir _as.psql
select throws_ok(format($$select visit_feedback_seller(%L, 'Note')$$, :'visit_past'),
                 '42501', null, 'buyer_c: no note of the seller');
select throws_ok(format($$select visit_feedback_buyer(%L, 0, null)$$, :'visit_past'),
                 '22023', null, 'buyer_c: an interest from 1');
select throws_ok(format($$select visit_feedback_buyer(%L, 6, null)$$, :'visit_past'),
                 '22023', null, 'buyer_c: to 5');
select throws_ok(format($$select visit_feedback_buyer(%L, null, 'Bien')$$, :'visit_past'),
                 '22023', null, 'buyer_c: no feedback without an interest');
select throws_ok(format($$select visit_feedback_buyer(%L, 4, %L)$$, :'visit_past', repeat('a', 2001)),
                 '22023', null, 'buyer_c: a comment of 2000 characters at most');
select throws_ok(format($$update visits set buyer_interest = 4 where id = %L$$, :'visit_past'),
                 '42501', null, 'buyer_c: no direct write in visits');
select lives_ok(format($$select visit_feedback_buyer(%L, 4, '  Belle maison, lumineuse.  ')$$, :'visit_past'),
                'buyer_c: gives feedback on its visit that took place');
select is((select buyer_interest::text || ' ' || buyer_feedback from visits where id = :'visit_past'),
          '4 Belle maison, lumineuse.', 'buyer_c: reads its feedback, the comment trimmed');
select is((select read_at is not null from notifications
            where type = 'visit.feedback_requested' and profile_id = tests.uid('buyer_c')
              and data->>'visit_id' = :'visit_past'), true,
          'buyer_c: the request answered is read');
select lives_ok(format($$select visit_feedback_buyer(%L, 5, '')$$, :'visit_past'),
                'buyer_c: changes its feedback within 7 days');
select is((select buyer_interest from visits where id = :'visit_past'), 5, 'the interest is changed');
select is((select buyer_feedback from visits where id = :'visit_past'), null, 'an empty comment is none');

\set who seller_a
\ir _as.psql
select throws_ok(format($$select visit_feedback_buyer(%L, 4, null)$$, :'visit_past'),
                 '42501', null, 'seller_a: no feedback of the buyer');
select throws_ok(format($$select visit_feedback_seller(%L, 'Note')$$, :'visit_future'),
                 '22023', null, 'seller_a: no note before the visit ended');
select throws_ok(format($$select visit_feedback_seller(%L, 'Note')$$, :'visit_old'),
                 '22023', null, 'seller_a: no note more than 7 days after the visit');
select throws_ok(format($$select visit_feedback_seller(%L, 'Note')$$, :'visit_cancelled'),
                 '22023', null, 'seller_a: no note on a cancelled visit');
select throws_ok(format($$select visit_feedback_seller(%L, '   ')$$, :'visit_past'),
                 '22023', null, 'seller_a: no empty first note');
select lives_ok(format($$select visit_feedback_seller(%L, 'Acquéreur ponctuel, question sur la toiture.')$$, :'visit_past'),
                'seller_a: writes a note on a visit of its property');
select is((select buyer_interest from visits where id = :'visit_past'), 5, 'seller_a: reads the interest of the buyer');
select is(visit_seller_note(:'visit_past'), 'Acquéreur ponctuel, question sur la toiture.', 'seller_a: reads its note');
select is((select read_at is not null from notifications
            where type = 'visit.feedback_requested' and profile_id = tests.uid('seller_a')
              and data->>'visit_id' = :'visit_past'), true,
          'seller_a: the request answered is read');
select is((select v->>'seller_feedback' from jsonb_array_elements(account_export()->'visits') v
            where v->>'id' = :'visit_past'),
          'Acquéreur ponctuel, question sur la toiture.', 'seller_a: its note is in its export');

-- ===========================================================================
-- The note of the seller stays with the seller and the team
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select seller_feedback from visits where id = %L$$, :'visit_past'),
                 '42501', null, 'buyer_c: never the note of the seller');
select throws_ok(format($$select * from visits where id = %L$$, :'visit_past'),
                 '42501', null, 'buyer_c: nor through a read of every column');
select is(visit_seller_note(:'visit_past'), null, 'buyer_c: nor through the function of the seller');
select is((select v->>'seller_feedback' from jsonb_array_elements(account_export()->'visits') v
            where v->>'id' = :'visit_past'), null, 'buyer_c: nor in its export');
select is((select (v->>'buyer_interest')::int from jsonb_array_elements(account_export()->'visits') v
            where v->>'id' = :'visit_past'), 5, 'buyer_c: its own feedback is in its export');
\set who admin
\ir _as.psql
select is(visit_seller_note(:'visit_past'), 'Acquéreur ponctuel, question sur la toiture.', 'admin: reads the note of the seller');

-- The account of the buyer anonymised: the interest goes with the comment.
reset role;
update visits set buyer_feedback = 'À effacer' where id = :'visit_given';
update profiles set deleted_at = now() - interval '31 days' where id = tests.uid('buyer_d');
\o /dev/null
select account_anonymize(tests.uid('buyer_d'));
\o
select is((select count(*)::int from visits where buyer_id = tests.uid('buyer_d')
            and (buyer_interest is not null or buyer_feedback is not null)), 0,
          'an account anonymised: its interest and its comment are erased');

select * from finish();
rollback;
