-- Deleting a listing (DECISIONS.md 2026-11-22): by its seller (listing_delete),
-- or by the team after a request to bring it into line left unanswered past
-- its deadline (listing_compliance_request, listings_compliance_remind,
-- listing_admin_delete). Nobody else deletes; a deleted listing is read by
-- nobody but its owner's history (the team); a suspended listing stays with
-- the team; offers waiting or accepted block the deletion; the visits to come
-- are cancelled and their buyers told; the documents shared are no longer
-- shared. Fixtures in postal code 99987: the file passes on an empty and on a
-- seeded database.
begin;
\ir _helpers.psql
select plan(72);
\ir _plan.psql

-- Listings online at once (the review is tested elsewhere), then in the
-- status a case needs, as the owner of the tables.
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
  update listings set status = 'published', submitted_at = now(), published_at = now()
   where id = v_listing;
  return v_listing;
end;
$$;
select tests.online('seller_a', 'Maison à supprimer') as l1 \gset
select tests.online('seller_a', 'Maison à mettre en conformité') as l2 \gset
select tests.online('seller_b', 'Maison suspendue') as l3 \gset
select tests.online('seller_b', 'Maison corrigée') as l4 \gset
select tests.online('seller_a', 'Maison en relecture') as l5 \gset
select tests.online('seller_a', 'Maison en pause') as l6 \gset
select tests.online('seller_a', 'Maison à corriger') as l7 \gset
select tests.online('seller_a', 'Maison vendue') as l8 \gset
select tests.online('seller_b', 'Maison avec une offre') as l9 \gset
select tests.online('seller_b', 'Maison renvoyée') as l10 \gset
select tests.online('seller_b', 'Maison aux caractéristiques changées') as l11 \gset
update listings set status = 'pending' where id = :'l5';
update listings set status = 'paused' where id = :'l6';
update listings set status = 'rejected', rejection_reason = 'Photos' where id = :'l7';
update listings set status = 'sold', sold_at = now() where id = :'l8';
select property_id as p1, slug as slug1 from listings where id = :'l1' \gset
select property_id as p9 from listings where id = :'l9' \gset
select property_id as p11 from listings where id = :'l11' \gset

-- ===========================================================================
-- Nobody but its seller deletes it
-- ===========================================================================
\set who anon
\ir _as.psql
select is((select count(*)::int from public_listings where id = :'l1'), 1, 'anon: sees L1 online');
select is((select count(*)::int from search_listings('{"postal_code":"99987"}') where id = :'l1'), 1,
          'anon: finds L1 in the search');
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
-- Offers: waiting, then accepted, block the deletion; past their validity, not
-- ===========================================================================
reset role;
insert into offers (listing_id, buyer_id) values (:'l1', tests.uid('buyer_c')) returning id as offer \gset
insert into offers (listing_id, buyer_id) values (:'l1', tests.uid('buyer_d')) returning id as offer_old \gset
set local session_replication_role = replica;
update offers
   set status = 'submitted', price_cents = 28000000, price_in_words = 'vingt-huit millions',
       financing_mode = 'no_loan', validity_until = now() + interval '5 days', visited = true,
       submitted_at = now()
 where id = :'offer';
-- Past its validity, not yet marked expired by the hourly job.
update offers
   set status = 'submitted', price_cents = 27000000, price_in_words = 'vingt-sept millions',
       financing_mode = 'no_loan', validity_until = now() - interval '1 hour', visited = true,
       submitted_at = now() - interval '3 days'
 where id = :'offer_old';
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

-- The sale file: a document shared with buyer_c, a request of buyer_d waiting.
insert into documents (property_id, owner_id, type, title, storage_path, mime_type, size_bytes)
values (:'p1', tests.uid('seller_a'), 'dpe', 'DPE', :'p1' || '/sale/' || gen_random_uuid() || '.pdf',
        'application/pdf', 1000)
returning id as doc1 \gset
insert into document_shares (document_id, buyer_id) values (:'doc1', tests.uid('buyer_c'));
insert into document_access_requests (property_id, buyer_id) values (:'p1', tests.uid('buyer_d'));

-- ===========================================================================
-- seller_a deletes L1
-- ===========================================================================
\set who seller_a
\ir _as.psql
select lives_ok(format($$select listing_delete(%L)$$, :'l1'),
                'seller_a: deletes its listing online (an offer past its validity does not block)');
select is((select count(*)::int from listings where id = :'l1' and deleted_at is null), 0, 'seller_a: L1 is deleted');
select is((select count(*)::int from properties where id = :'p1' and deleted_at is null), 0, 'seller_a: its property too');
select throws_ok(format($$select listing_delete(%L)$$, :'l1'), '42501', null, 'seller_a: a deleted listing is not deleted twice');

\set who anon
\ir _as.psql
select is((select count(*)::int from public_listings where id = :'l1'), 0, 'anon: L1 left the listings online');
select is((select count(*)::int from public_listings where slug = :'slug1'), 0, 'anon: nor by its address');
select is((select count(*)::int from search_listings('{"postal_code":"99987"}') where id = :'l1'), 0,
          'anon: L1 left the search');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from public_listings where id = :'l1'), 0, 'buyer_c: no longer reads L1');
select is((select count(*)::int from search_listings('{"postal_code":"99987"}') where id = :'l1'), 0,
          'buyer_c: nor finds it in the search');
select is((select count(*)::int from document_shares where document_id = :'doc1'), 0,
          'buyer_c: the document shared is no longer shared');
\set who buyer_d
\ir _as.psql
select is((select status from visits where id = :'visit_next'), 'cancelled'::visit_status,
          'buyer_d: its visit to come is cancelled');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('buyer_d') and type = 'visit.cancelled'
              and data->>'visit_id' = :'visit_next' and email_after is not null),
          1, 'buyer_d: told of the cancellation, in the bell and by email');
reset role;
select is((select count(*)::int from document_access_requests where property_id = :'p1'), 0,
          'the request of buyer_d still waiting is dropped');
select is((select status from visits where id = :'visit_past'), 'confirmed'::visit_status,
          'the visit that took place is left as it was');
select is((select meta->>'by' from audit_log where action = 'listing.delete' and entity_id = :'l1'),
          'seller', 'the deletion is written in audit_log');

-- ===========================================================================
-- By status: sent, paused, to correct are deleted; sold and suspended not
-- ===========================================================================
\set who seller_a
\ir _as.psql
select lives_ok(format($$select listing_delete(%L)$$, :'l5'), 'seller_a: deletes a listing sent for review');
select lives_ok(format($$select listing_delete(%L)$$, :'l6'), 'seller_a: deletes a paused listing');
select lives_ok(format($$select listing_delete(%L)$$, :'l7'), 'seller_a: deletes a listing to correct');
select throws_ok(format($$select listing_delete(%L)$$, :'l8'), '22023', null, 'seller_a: a sold listing is not deleted');
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
select is(listing_compliance_changed(:'l2'), false, 'seller_a: reads whether its listing changed since');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('seller_a') and type = 'listing.compliance_requested'
              and data->>'listing_id' = :'l2' and email_after is not null),
          1, 'seller_a: told of the request, in the bell and by email');
select throws_ok(format($$update listings set compliance_due_at = now() + interval '1 year' where id = %L$$, :'l2'),
                 '42501', null, 'seller_a: cannot move the deadline');
select throws_ok(format($$select listing_compliance_clear(%L)$$, :'l2'), '42501', null,
                 'seller_a: cannot lift the request');
select throws_ok($$select listings_compliance_remind()$$, '42501', null,
                 'seller_a: cannot run the reminders');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from listings where id = :'l2' and compliance_reason is not null), 0,
          'seller_b: does not read the reason of the request on the listing of seller_a');
select throws_ok(format($$select listing_compliance_changed(%L)$$, :'l2'), '42501', null,
                 'seller_b: does not read whether the listing of seller_a changed');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from listings where id = :'l2'), 0, 'buyer_c: does not read the request');
select throws_ok(format($$select listing_compliance_clear(%L)$$, :'l2'), '42501', null,
                 'buyer_c: cannot lift the request');

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
select isnt((select compliance_reminded_at from listings where id = :'l2'), null, 'the reminder of L2 is noted');

-- A renewal starts the clock again, reminder included.
\set who admin
\ir _as.psql
\o /dev/null
select listing_compliance_request(:'l2', 'Photos floues : à remplacer');
\o
select is((select compliance_reminded_at from listings where id = :'l2'), null,
          'admin: a renewed request resets the reminder');

-- The deadline passed (moved back as the owner of the tables).
reset role;
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
                   'admin: cannot delete a listing changed since the request (an edit online)');
select is(listing_compliance_changed(:'l4'), true, 'admin: reads that L4 changed');
select lives_ok(format($$select listing_admin_delete(%L)$$, :'l2'),
                'admin: deletes L2, unchanged past its deadline');
select is((select count(*)::int from listings where id = :'l2' and deleted_at is null), 0, 'L2 is deleted');
select is((select meta->>'by' from audit_log where action = 'listing.delete' and entity_id = :'l2'),
          'admin', 'the deletion by the team is written in audit_log');
select lives_ok(format($$select listing_compliance_clear(%L)$$, :'l4'), 'admin: lifts the request on L4');
select is((select compliance_due_at from listings where id = :'l4'), null, 'L4 has no request any more');
select throws_ok(format($$select listing_compliance_request(%L, 'Motif')$$, :'l3'),
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

-- ===========================================================================
-- Changes seen through a new sending and through the property
-- ===========================================================================
\set who admin
\ir _as.psql
\o /dev/null
select listing_compliance_request(:'l10', 'Prix à justifier');
select listing_compliance_request(:'l11', 'Surface à vérifier');
\o
-- The request made an hour ago (the clock of a transaction does not move).
reset role;
update listings set compliance_requested_at = now() - interval '1 hour', compliance_due_at = now() - interval '1 minute'
 where id in (:'l10', :'l11');
update listings set submitted_at = now() where id = :'l10';
\set who seller_b
\ir _as.psql
update properties set surface_m2 = 91 where id = :'p11';
\set who admin
\ir _as.psql
select is(listing_compliance_changed(:'l10'), true, 'admin: a new sending for review is a change');
select is(listing_compliance_changed(:'l11'), true, 'admin: a change of the property is a change');
select throws_like(format($$select listing_admin_delete(%L)$$, :'l11'), '%changed since the request%',
                   'admin: L11 is not deleted');

-- ===========================================================================
-- The team: a waiting offer blocks, the visits to come are cancelled
-- ===========================================================================
\o /dev/null
select listing_compliance_request(:'l9', 'Photos à remplacer');
\o
reset role;
update listings set compliance_due_at = now() - interval '1 minute' where id = :'l9';
insert into offers (listing_id, buyer_id) values (:'l9', tests.uid('buyer_c')) returning id as offer9 \gset
set local session_replication_role = replica;
update offers
   set status = 'viewed', price_cents = 28000000, price_in_words = 'vingt-huit millions',
       financing_mode = 'no_loan', validity_until = now() + interval '5 days', visited = true,
       submitted_at = now()
 where id = :'offer9';
set local session_replication_role = origin;
insert into visit_slots (property_id, starts_at, ends_at)
values (:'p9', now() + interval '2 days', now() + interval '2 days 30 minutes') returning id as slot9 \gset
insert into visits (slot_id, property_id, buyer_id) values (:'slot9', :'p9', tests.uid('buyer_d'))
returning id as visit9 \gset
\set who admin
\ir _as.psql
select throws_like(format($$select listing_admin_delete(%L)$$, :'l9'), '%offers wait for an answer%',
                   'admin: refused while an offer waits for an answer');
reset role;
set local session_replication_role = replica;
update offers set status = 'declined' where id = :'offer9';
set local session_replication_role = origin;
\set who admin
\ir _as.psql
select lives_ok(format($$select listing_admin_delete(%L)$$, :'l9'), 'admin: deletes L9 once the offer answered');
reset role;
select is((select status from visits where id = :'visit9'), 'cancelled'::visit_status,
          'the visit to come of buyer_d is cancelled');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('buyer_d') and type = 'visit.cancelled'
              and data->>'visit_id' = :'visit9'),
          1, 'buyer_d: told of the cancellation');

-- A suspended listing: deleted by the team once its request is past.
reset role;
update listings
   set compliance_requested_at = now() - interval '8 days', compliance_due_at = now() - interval '1 day',
       compliance_reason = 'Photos à remplacer', submitted_at = now() - interval '9 days'
 where id = :'l3';
\set who admin
\ir _as.psql
select lives_ok(format($$select listing_admin_delete(%L)$$, :'l3'),
                'admin: deletes a suspended listing past the deadline of its request');

select * from finish();
rollback;
