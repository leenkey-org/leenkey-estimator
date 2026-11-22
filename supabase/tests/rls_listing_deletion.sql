-- Deleting a listing (DECISIONS.md 2026-11-22): by its seller (listing_delete),
-- or by the team after a request to bring it into line left unanswered past
-- its deadline (listing_compliance_request, listings_compliance_remind,
-- listing_admin_delete). Nobody else deletes; a deleted listing is read by
-- nobody but its owner's history (the team); a suspended listing stays with
-- the team; offers waiting or accepted block the deletion; the visits to come
-- are cancelled and their buyers told. Fixtures in postal code 99987: the
-- file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(48);
\ir _plan.psql

-- Listings online: one of seller_a to delete (L1), one of seller_a for the
-- request (L2), one of seller_b changed after the request (L4), one of
-- seller_b suspended (L3).
create function tests.online(p_owner text, p_title text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_prop uuid;
  v_listing uuid;
begin
  insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
  values (tests.uid(p_owner), 'maison', '1 rue des Suppressions', '99987', 'Effaceville', 90, 4,
          st_setsrid(st_makepoint(2.35, 48.69), 4326)::geography)
  returning id into v_prop;
  insert into listings (property_id, title, description, price_cents)
  values (v_prop, p_title, 'Description.', 30000000)
  returning id into v_listing;
  -- Online at once (the review is tested elsewhere).
  update listings set status = 'published', submitted_at = now(), published_at = now()
   where id = v_listing;
  return v_listing;
end;
$$;
select tests.online('seller_a', 'Maison à supprimer') as l1 \gset
select tests.online('seller_a', 'Maison à mettre en conformité') as l2 \gset
select tests.online('seller_b', 'Maison suspendue') as l3 \gset
select tests.online('seller_b', 'Maison corrigée') as l4 \gset
select property_id as p1, slug as slug1 from listings where id = :'l1' \gset

-- ===========================================================================
-- Nobody but its seller deletes it
-- ===========================================================================
\set who anon
\ir _as.psql
select is((select count(*)::int from public_listings where id = :'l1'), 1, 'anon: sees L1 online');
select throws_ok(format($$select listing_delete(%L)$$, :'l1'), '42501', null, 'anon: cannot delete a listing');
select throws_ok(format($$select listing_admin_delete(%L)$$, :'l2'), '42501', null, 'anon: cannot delete as the team');

\set who seller_b
\ir _as.psql
select throws_ok(format($$select listing_delete(%L)$$, :'l1'), '42501', null, 'seller_b: cannot delete the listing of seller_a');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select listing_delete(%L)$$, :'l1'), '42501', null, 'buyer_c: cannot delete a listing');
\set who seller_a
\ir _as.psql
select throws_ok(format($$update listings set deleted_at = now() where id = %L$$, :'l1'),
                 '42501', null, 'seller_a: cannot write deleted_at directly');
reset role;
select is((select deleted_at from listings where id = :'l1'), null, 'nobody deleted L1 so far');

-- ===========================================================================
-- Offers: waiting, then accepted, block the deletion
-- ===========================================================================
reset role;
insert into offers (listing_id, buyer_id) values (:'l1', tests.uid('buyer_c')) returning id as offer \gset
set local session_replication_role = replica;
update offers
   set status = 'submitted', price_cents = 28000000, price_in_words = 'vingt-huit millions',
       financing_mode = 'no_loan', validity_until = now() + interval '5 days', visited = true,
       submitted_at = now()
 where id = :'offer';
set local session_replication_role = origin;
\set who seller_a
\ir _as.psql
select throws_like(format($$select listing_delete(%L)$$, :'l1'), '%offers wait for an answer%',
                   'seller_a: refused while an offer waits for an answer');
reset role;
set local session_replication_role = replica;
update offers set status = 'accepted' where id = :'offer';
set local session_replication_role = origin;
\set who seller_a
\ir _as.psql
select throws_like(format($$select listing_delete(%L)$$, :'l1'), '%offer is accepted%',
                   'seller_a: refused while an offer is accepted');
reset role;
set local session_replication_role = replica;
update offers set status = 'declined' where id = :'offer';
set local session_replication_role = origin;

-- A visit to come (buyer_d) and one that took place (buyer_c).
insert into visit_slots (property_id, starts_at, ends_at)
values (:'p1', now() + interval '3 days', now() + interval '3 days 30 minutes') returning id as slot_next \gset
insert into visits (slot_id, property_id, buyer_id) values (:'slot_next', :'p1', tests.uid('buyer_d'))
returning id as visit_next \gset
set local session_replication_role = replica;
insert into visit_slots (property_id, starts_at, ends_at)
values (:'p1', now() - interval '3 days', now() - interval '3 days' + interval '30 minutes') returning id as slot_past \gset
insert into visits (slot_id, property_id, buyer_id) values (:'slot_past', :'p1', tests.uid('buyer_c'))
returning id as visit_past \gset
set local session_replication_role = origin;

-- ===========================================================================
-- seller_a deletes L1
-- ===========================================================================
\set who seller_a
\ir _as.psql
select lives_ok(format($$select listing_delete(%L)$$, :'l1'), 'seller_a: deletes its listing online');
select is((select count(*)::int from listings where id = :'l1' and deleted_at is null), 0, 'seller_a: L1 is deleted');
select is((select count(*)::int from properties where id = :'p1' and deleted_at is null), 0, 'seller_a: its property too');
select throws_ok(format($$select listing_delete(%L)$$, :'l1'), '42501', null, 'seller_a: a deleted listing is not deleted twice');

\set who anon
\ir _as.psql
select is((select count(*)::int from public_listings where id = :'l1'), 0, 'anon: L1 left the listings online');
select is((select count(*)::int from public_listings where slug = :'slug1'), 0, 'anon: nor by its address');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from public_listings where id = :'l1'), 0, 'buyer_c: no longer reads L1');
\set who buyer_d
\ir _as.psql
select is((select status from visits where id = :'visit_next'), 'cancelled'::visit_status,
          'buyer_d: its visit to come is cancelled');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('buyer_d') and type = 'visit.cancelled'
              and data->>'visit_id' = :'visit_next' and email_after is not null),
          1, 'buyer_d: told of the cancellation, in the bell and by email');
reset role;
select is((select status from visits where id = :'visit_past'), 'confirmed'::visit_status,
          'the visit that took place is left as it was');
select is((select meta->>'by' from audit_log where action = 'listing.delete' and entity_id = :'l1'),
          'seller', 'the deletion is written in audit_log');

-- ===========================================================================
-- A suspended listing stays with the team
-- ===========================================================================
\set who admin
\ir _as.psql
\o /dev/null
select listing_suspend(:'l3', 'Photos à remplacer');
\o
\set who seller_b
\ir _as.psql
select throws_like(format($$select listing_delete(%L)$$, :'l3'), '%suspended%',
                   'seller_b: cannot delete a listing suspended by the team');

-- ===========================================================================
-- The request to bring L2 into line
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$select listing_compliance_request(%L, 'Photos floues')$$, :'l2'),
                 '42501', null, 'seller_a: cannot make a request of the team');
\set who admin
\ir _as.psql
select throws_ok(format($$select listing_compliance_request(%L, 'x')$$, :'l2'),
                 '22023', null, 'admin: a request needs a reason');
select is((select listing_compliance_request(:'l2', '  Photos floues : à remplacer  ')),
          now() + interval '7 days', 'admin: asks seller_a, deadline in 7 days');
select throws_like(format($$select listing_admin_delete(%L)$$, :'l2'), '%deadline%',
                   'admin: cannot delete before the deadline');
select is(listing_compliance_changed(:'l2'), false, 'admin: L2 has not changed since the request');
select is((select meta->>'reason' from audit_log where action = 'listing.compliance_request' and entity_id = :'l2'),
          'Photos floues : à remplacer', 'the request is written in audit_log, with its reason');

\set who seller_a
\ir _as.psql
select is((select compliance_reason from listings where id = :'l2'), 'Photos floues : à remplacer',
          'seller_a: reads the reason of the request');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_a') and type = 'listing.compliance_requested'
              and data->>'listing_id' = :'l2' and email_after is not null),
          1, 'seller_a: told of the request, in the bell and by email');
select throws_ok(format($$update listings set compliance_due_at = now() + interval '1 year' where id = %L$$, :'l2'),
                 '42501', null, 'seller_a: cannot move the deadline');
select throws_ok(format($$select listing_compliance_changed(%L)$$, :'l2'), '42501', null,
                 'seller_a: does not read what the team reads');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from listings where id = :'l2'), 0, 'buyer_c: does not read the request');

-- The reminder, 2 days before: once; nothing to a listing changed (L4).
\set who admin
\ir _as.psql
\o /dev/null
select listing_compliance_request(:'l4', 'Description à compléter');
\o
\set who seller_b
\ir _as.psql
update listings set price_cents = 29000000 where id = :'l4';
reset role;
select is(public.listings_compliance_remind(
            ((date_trunc('day', (now() + interval '6 days') at time zone 'Europe/Paris')
              + interval '12 hours') at time zone 'Europe/Paris')),
          1, 'the reminder leaves 2 days before the deadline, for L2 only');
select is(public.listings_compliance_remind(
            ((date_trunc('day', (now() + interval '6 days') at time zone 'Europe/Paris')
              + interval '13 hours') at time zone 'Europe/Paris')),
          0, 'and once');
select is((select count(*)::int from notifications
            where type = 'listing.compliance_reminder' and data->>'listing_id' = :'l2'
              and profile_id = tests.uid('seller_a')),
          1, 'seller_a: reminded once');
select is((select count(*)::int from notifications
            where type = 'listing.compliance_reminder' and data->>'listing_id' = :'l4'),
          0, 'seller_b: not reminded, its listing changed');

-- The deadline passed (moved back as the owner of the tables).
update listings set compliance_due_at = now() - interval '1 minute' where id in (:'l2', :'l4');

\set who seller_a
\ir _as.psql
select throws_ok(format($$select listing_admin_delete(%L)$$, :'l2'), '42501', null,
                 'seller_a: cannot delete as the team');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select listing_admin_delete(%L)$$, :'l2'), '42501', null,
                 'buyer_c: cannot delete as the team');
\set who admin
\ir _as.psql
select throws_like(format($$select listing_admin_delete(%L)$$, :'l4'), '%changed since the request%',
                   'admin: cannot delete a listing changed since the request');
select is(listing_compliance_changed(:'l4'), true, 'admin: reads that L4 changed');
select lives_ok(format($$select listing_admin_delete(%L)$$, :'l2'),
                'admin: deletes L2, unchanged past its deadline');
select is((select count(*)::int from listings where id = :'l2' and deleted_at is null), 0, 'L2 is deleted');
select is((select meta->>'by' from audit_log where action = 'listing.delete' and entity_id = :'l2'),
          'admin', 'the deletion by the team is written in audit_log');
select lives_ok(format($$select listing_compliance_clear(%L)$$, :'l4'), 'admin: lifts the request on L4');
select is((select compliance_due_at from listings where id = :'l4'), null, 'L4 has no request any more');
select throws_ok(format($$select listing_compliance_request((select id from listings where id = %L), 'Motif')$$, :'l3'),
                 '22023', null, 'admin: no request on a suspended listing');

\set who seller_a
\ir _as.psql
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_a') and type = 'listing.deleted'
              and data->>'listing_id' = :'l2' and email_after is not null),
          1, 'seller_a: gets the final notice, in the bell and by email');
\set who anon
\ir _as.psql
select is((select count(*)::int from public_listings where id = :'l2'), 0, 'anon: L2 left the listings online');

select * from finish();
rollback;
