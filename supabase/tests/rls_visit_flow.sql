-- L3-02: what follows the acts on a visit (SPEC-V2 10, 14, 18). An invitation
-- posts a notice in the conversation and tells the buyer; a booking and a
-- cancelling tell the parties; the reminder leaves once, the day before from
-- 8 h in Paris; the address is in no notification. Fixtures in 99995.
begin;
\ir _helpers.psql
select plan(23);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '7 rue du Rappel', '99995', 'Rappelville', 90, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.39, 48.74), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison du rappel', 'Description.', 30000000)
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
select conversation_open(:'listing', 'Bonjour, une visite est-elle possible ?') as conv \gset

-- ===========================================================================
-- The invitation
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$select visit_invite(%L, %L)$$, :'prop', tests.uid('buyer_c')),
                 '22023', 'no free slot to offer', 'seller_a: no invitation without a free slot');
select visit_slot_add(:'prop', date_trunc('hour', now()) + interval '2 days', 30) as slot1 \gset
select token as token_c from visit_invite(:'prop', tests.uid('buyer_c')) \gset
select is((select token from visit_invite(:'prop', tests.uid('buyer_c'))), :'token_c'::text,
          'invited again within 10 minutes: the same link, nothing more');
reset role;
select is((select count(*)::int from messages where conversation_id = :'conv' and kind = 'visit_invite'
            and sender_id = tests.uid('seller_a')), 1,
          'an invitation posts its notice in the conversation, from the seller');
select is((select link from notifications where profile_id = tests.uid('buyer_c') and type = 'visit.invited'),
          '/visites/reserver/' || :'token_c', 'the buyer is told, with the link of the invitation');
select ok((select email_after is not null and data->>'title' = 'Maison du rappel'
             from notifications where profile_id = tests.uid('buyer_c') and type = 'visit.invited'),
          'by email too, with the title of the listing');
select is((select count(*)::int from notifications where profile_id = tests.uid('buyer_c')
            and type = 'message.new' and created_at >= now()), 0,
          'an invitation is not told as a new message');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from notifications where type like 'visit.%'), 0,
          'seller_b: reads no notification of a visit of others');
select throws_ok($$select visits_remind()$$, '42501', null, 'seller_b: the reminder is the cron''s');
select throws_ok(format($$select * from visit_email_facts(%L)$$, gen_random_uuid()), '42501', null,
                 'nor the facts of the email of a visit');
select is((select count(*)::int from visit_listing(:'prop')), 0, 'nor the listing of a visit of others');
\set who buyer_c
\ir _as.psql
select is((select title from visit_listing(:'prop')), 'Maison du rappel', 'buyer_c, invited: the title of the listing');
select throws_ok(format($$insert into messages (conversation_id, sender_id, body, kind) values (%L, %L, 'x', 'visit_invite')$$,
                        :'conv', tests.uid('buyer_c')),
                 '42501', null, 'buyer_c: never writes a notice itself');

-- ===========================================================================
-- Booking, cancelling
-- ===========================================================================
select visit_book(:'token_c', :'slot1') as visit1 \gset
reset role;
-- Booked more than 12 hours before the reminder (the simulated run is tomorrow morning).
update visits set created_at = now() - interval '1 day' where id = :'visit1';
select is((select count(*)::int from messages where conversation_id = :'conv' and kind = 'system'
            and body like 'Visite réservée pour le %'), 1, 'a booking posts its notice');
select is((select array_agg(data->>'role' order by data->>'role') from notifications
            where type = 'visit.booked' and data->>'visit_id' = :'visit1'),
          array['buyer', 'seller'], 'the seller and the buyer are told of the booking');
select is((select count(*)::int from notifications
            where type like 'visit.%' and data::text like '%rue du Rappel%'), 0,
          'the address is in no notification');
set local role service_role;
select is((select address_line from visit_email_facts(:'visit1')), '7 rue du Rappel',
          'the cron reads the address of a confirmed visit for the email of its buyer');
reset role;

-- The reminder (dates simulated).
select is(visits_remind((date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day 7 hours') at time zone 'Europe/Paris'), 0,
          'no reminder before 8 h in Paris');
select is(visits_remind((date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day 9 hours') at time zone 'Europe/Paris'), 1,
          'the day before, from 8 h: one visit reminded');
select is(visits_remind((date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day 10 hours') at time zone 'Europe/Paris'), 0,
          'once only');
select is((select count(*)::int from notifications where type = 'visit.reminder' and data->>'visit_id' = :'visit1'), 2,
          'to the seller and to the buyer');

\set who seller_a
\ir _as.psql
\o /dev/null
select visit_cancel(:'visit1');
\o
reset role;
select is((select array_agg(profile_id) from notifications
            where type = 'visit.cancelled' and data->>'visit_id' = :'visit1'),
          array[tests.uid('buyer_c')], 'a visit cancelled by the seller: the buyer is told, only them');
select is((select count(*)::int from messages where conversation_id = :'conv' and kind = 'system'
            and body like '%annulée par le vendeur.'), 1, 'and the conversation says who cancelled');
set local role service_role;
select is((select address_line from visit_email_facts(:'visit1')), null,
          'no address for a visit that is cancelled');
reset role;

select * from finish();
rollback;
