-- L3-01: visits on invitation (SPEC-V2 14, CLAUDE.md 7). The seller opens
-- slots and invites a buyer who has a relation with the property; the invited
-- buyer books with the token; nobody else books; the exact address only to
-- the buyer of a confirmed visit. Fixtures in postal code 99993.
begin;
\ir _helpers.psql
select plan(53);
\ir _plan.psql

-- seller_a: a listing online, and a draft listing.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '3 rue des Visites', '99993', 'Visiteville', 90, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.35, 48.70), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison à visiter', 'Description.', 30000000)
returning id as listing \gset
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '4 rue Brouillon', '99993', 'Visiteville', 40, 2,
        extensions.st_setsrid(extensions.st_makepoint(2.36, 48.71), 4326)::extensions.geography)
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

-- buyer_c writes to the seller: a relation with the property. buyer_d has none.
\set who buyer_c
\ir _as.psql
\o /dev/null
select conversation_open(:'listing', 'Bonjour, une visite est-elle possible ?');
\o

-- ===========================================================================
-- Slots
-- ===========================================================================
\set who seller_b
\ir _as.psql
select throws_ok(format($$select visit_slot_add(%L, now() + interval '2 days', 30)$$, :'prop'),
                 '42501', null, 'seller_b: no slot on the property of another seller');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select visit_slot_add(%L, now() + interval '2 days', 30)$$, :'prop'),
                 '42501', null, 'buyer_c: no slot on a property not theirs');
select throws_ok(format($$insert into visit_slots (property_id, starts_at, ends_at) values (%L, now() + interval '2 days', now() + interval '2 days 30 minutes')$$, :'prop'),
                 '42501', null, 'no direct write in visit_slots');

\set who seller_a
\ir _as.psql
select throws_ok(format($$select visit_slot_add(%L, now() + interval '2 days', 30)$$, :'prop_draft'),
                 '22023', null, 'seller_a: no slot while the listing is not online');
select throws_ok(format($$select visit_slot_add(%L, now() + interval '2 days', 20)$$, :'prop'),
                 '22023', null, 'seller_a: a slot lasts 30, 45 or 60 minutes');
select throws_ok(format($$select visit_slot_add(%L, now() + interval '30 minutes', 30)$$, :'prop'),
                 '22023', null, 'seller_a: a slot starts in one hour at the earliest');
select throws_ok(format($$select visit_slot_add(%L, now() + interval '100 days', 30)$$, :'prop'),
                 '22023', null, 'seller_a: and within 90 days');
select visit_slot_add(:'prop', date_trunc('hour', now()) + interval '2 days', 45) as slot1 \gset
select visit_slot_add(:'prop', date_trunc('hour', now()) + interval '3 days', 60) as slot2 \gset
select visit_slot_add(:'prop', now() + interval '90 minutes', 30) as slot_soon \gset
select throws_ok(format($$select visit_slot_add(%L, date_trunc('hour', now()) + interval '2 days 30 minutes', 30)$$, :'prop'),
                 '23P01', null, 'seller_a: no slot overlapping another one');
select is((select ends_at - starts_at from visit_slots where id = :'slot1'), interval '45 minutes',
          'seller_a: the slot ends after its duration');
select is((select count(*)::int from visit_slots where property_id = :'prop'), 3, 'seller_a: reads its slots');
select throws_ok(format($$update visit_slots set capacity = 5 where id = %L$$, :'slot1'),
                 '42501', null, 'seller_a: no direct update of a slot');

\set who seller_b
\ir _as.psql
select is((select count(*)::int from visit_slots where property_id = :'prop'), 0, 'seller_b: reads no slot of seller_a');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from visit_slots where property_id = :'prop'), 0, 'buyer_c: reads no slot before booking');
\set who anon
\ir _as.psql
select throws_ok('select count(*) from visit_slots', '42501', null, 'anon: no access to the slots');

-- ===========================================================================
-- Invitations
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$select visit_invite(%L, %L)$$, :'prop', tests.uid('buyer_d')),
                 '22023', null, 'seller_a: no invitation for a buyer without relation with the property');
select token as old_token from visit_invite(:'prop', tests.uid('buyer_c')) \gset
select token as token_c, expires_at from visit_invite(:'prop', tests.uid('buyer_c')) \gset
select isnt(:'token_c'::text, :'old_token'::text, 'seller_a: invited again, a new token');
select is((select count(*)::int from visit_invitations where property_id = :'prop'), 1,
          'seller_a: one invitation per buyer and property');
select ok(:'expires_at'::timestamptz between now() + interval '7 days' - interval '1 minute' and now() + interval '7 days',
          'seller_a: the invitation is valid 7 days');
\set who seller_b
\ir _as.psql
select throws_ok(format($$select visit_invite(%L, %L)$$, :'prop', tests.uid('buyer_c')),
                 '42501', null, 'seller_b: no invitation on the property of another seller');
select is((select count(*)::int from visit_invitations where property_id = :'prop'), 0, 'seller_b: reads no invitation of seller_a');

-- ===========================================================================
-- Booking
-- ===========================================================================
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select * from visit_open_slots(%L)$$, :'token_c'),
                 '42501', null, 'buyer_d: the token of buyer_c opens nothing');
select throws_ok(format($$select visit_book(%L, %L)$$, :'token_c', :'slot1'),
                 '42501', null, 'buyer_d: books nothing with the token of buyer_c');
select is((select count(*)::int from visit_invitations), 0, 'buyer_d: reads no invitation of buyer_c');

\set who buyer_c
\ir _as.psql
select throws_ok(format($$select * from visit_open_slots(%L)$$, :'old_token'),
                 '42501', null, 'buyer_c: the old token no longer works');
select is((select count(*)::int from visit_open_slots(:'token_c')), 2,
          'buyer_c: the free slots of the invitation, 2 hours ahead at least');
select throws_ok(format($$select visit_book(%L, %L)$$, :'token_c', :'slot_soon'),
                 '22023', null, 'buyer_c: no booking less than 2 hours before (it could not be cancelled)');
select is((select count(*)::int from visit_invitations), 1, 'buyer_c: reads its invitation');
select throws_ok(format($$insert into visits (slot_id, property_id, buyer_id) values (%L, %L, %L)$$, :'slot1', :'prop', tests.uid('buyer_c')),
                 '42501', null, 'buyer_c: no direct write in visits');
select visit_book(:'token_c', :'slot1') as visit1 \gset
select is((select status::text from visits where id = :'visit1'), 'confirmed', 'buyer_c: the visit is confirmed');
select throws_ok(format($$select visit_book(%L, %L)$$, :'token_c', :'slot2'),
                 '23505', null, 'buyer_c: one visit to come per property');
select is((select count(*)::int from visit_open_slots(:'token_c')), 1, 'buyer_c: a full slot is no longer offered');
select is((select count(*)::int from visit_slots), 1, 'buyer_c: reads the slot of its visit only');
select is((select city from visit_address(:'visit1')), 'Visiteville', 'buyer_c: the address of its confirmed visit');

\set who buyer_d
\ir _as.psql
select is((select count(*)::int from visits where property_id = :'prop'), 0, 'buyer_d: reads no visit of buyer_c');
select throws_ok(format($$select * from visit_address(%L)$$, :'visit1'),
                 '42501', null, 'buyer_d: never the address of the visit of buyer_c');
select throws_ok(format($$select visit_cancel(%L)$$, :'visit1'),
                 '42501', null, 'buyer_d: cancels no visit of buyer_c');

-- A second buyer, related through a conversation, on the full slot.
\set who buyer_d
\ir _as.psql
\o /dev/null
select conversation_open(:'listing', 'Bonjour, je souhaite visiter.');
\o
\set who seller_a
\ir _as.psql
select token as token_d from visit_invite(:'prop', tests.uid('buyer_d')) \gset
select is((select count(*)::int from visits where property_id = :'prop'), 1, 'seller_a: reads the visits of its property');
select is((select address_line from visit_address(:'visit1')), '3 rue des Visites', 'seller_a: the address of its property');
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select visit_book(%L, %L)$$, :'token_d', :'slot1'),
                 '23P01', null, 'buyer_d: a full slot cannot be booked');

-- ===========================================================================
-- Cancelling
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select is(visit_cancel(:'visit1')::text, 'cancelled', 'buyer_c: cancels its visit more than 2 hours before');
select throws_ok(format($$select * from visit_address(%L)$$, :'visit1'),
                 '42501', null, 'buyer_c: no address once the visit is cancelled');
-- A visit within 2 hours (written as the owner of the tables: no booking is that late).
reset role;
insert into visits (slot_id, property_id, buyer_id) values (:'slot_soon', :'prop', tests.uid('buyer_c'))
returning id as visit_soon \gset
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select visit_cancel(%L)$$, :'visit_soon'),
                 '22023', null, 'buyer_c: too late to cancel less than 2 hours before');
\set who seller_a
\ir _as.psql
select throws_ok(format($$select visit_slot_remove(%L)$$, :'slot_soon'),
                 '22023', null, 'seller_a: a slot with a visit booked stays');
select is(visit_cancel(:'visit_soon')::text, 'cancelled', 'seller_a: cancels a visit until it starts');
select lives_ok(format($$select visit_slot_remove(%L)$$, :'slot2'), 'seller_a: removes a free slot');
select is((select count(*)::int from visit_slots where id = :'slot2'), 0, 'a slot never booked is deleted');
select lives_ok(format($$select visit_slot_remove(%L)$$, :'slot1'), 'seller_a: removes a slot whose visit was cancelled');
select is((select removed_at is not null from visit_slots where id = :'slot1'), true,
          'a slot with visits in its history is marked removed, the history keeps its date');
select lives_ok(format($$select visit_slot_add(%L, date_trunc('hour', now()) + interval '2 days', 45)$$, :'prop'),
                'seller_a: a new slot at the time of a removed one');
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select visit_book(%L, %L)$$, :'token_d', :'slot1'),
                 '22023', null, 'buyer_d: a removed slot cannot be booked');
\set who seller_a
\ir _as.psql

-- A slot of another property, with the token of this one.
reset role;
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '8 rue Ailleurs', '99993', 'Visiteville', 70, 3)
returning id as prop_b \gset
insert into visit_slots (property_id, starts_at, ends_at)
values (:'prop_b', now() + interval '4 days', now() + interval '4 days 30 minutes')
returning id as slot_b \gset
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select visit_book(%L, %L)$$, :'token_d', :'slot_b'),
                 '22023', null, 'buyer_d: the token of a property books no slot of another one');

-- A slot that has passed (written as the owner of the tables).
reset role;
insert into visit_slots (property_id, starts_at, ends_at)
values (:'prop', now() - interval '1 day', now() - interval '1 day' + interval '30 minutes')
returning id as slot_past \gset
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select visit_book(%L, %L)$$, :'token_d', :'slot_past'),
                 '22023', null, 'buyer_d: a slot that has passed cannot be booked');

\set who admin
\ir _as.psql
select is((select count(*)::int from visits where property_id = :'prop'), 2, 'admin: reads every visit');

select * from finish();
rollback;
