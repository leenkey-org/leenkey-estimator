-- L1-30e: « Modifier » a listing from the back office (SPEC-V2 17,
-- DECISIONS.md 2026-11-24). Only the team calls listing_admin_edit; each
-- change is written in listing_revisions with its reason (as a change of the
-- seller, by the admin), in audit_log, and the seller is told (bell and
-- email). Fixtures in postal code 99993: the file passes on an empty and on a
-- seeded database.
begin;
\ir _helpers.psql
select plan(34);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '9 rue de l''Équipe', '99993', 'Editville', 92, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.3502, 48.6903), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison à relire', 'Description du vendeur.', 30000000)
returning id as listing \gset
-- A second listing, left as a draft.
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '11 rue de l''Équipe', '99993', 'Editville', 40, 2,
        extensions.st_setsrid(extensions.st_makepoint(2.3503, 48.6904), 4326)::extensions.geography)
returning id as prop_draft \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_draft', 'Brouillon', 'Brouillon du vendeur.', 20000000)
returning id as draft \gset
select tests.dpe(:'listing');
select listing_submit(:'listing') \gset

-- ===========================================================================
-- Who may call it: the team only
-- ===========================================================================
\set who anon
\ir _as.psql
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Titre', 'Texte.', 1)$$, :'listing'),
                 '42501', null, 'anon: cannot edit a listing as the team');
\set who seller_a
\ir _as.psql
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Titre', 'Texte.', 1)$$, :'listing'),
                 '42501', null, 'seller_a: not even its own listing, through this function');
\set who seller_b
\ir _as.psql
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Titre', 'Texte.', 1)$$, :'listing'),
                 '42501', null, 'seller_b: cannot');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Titre', 'Texte.', 1)$$, :'listing'),
                 '42501', null, 'buyer_c: cannot');
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Titre', 'Texte.', 1)$$, :'listing'),
                 '42501', null, 'buyer_d: cannot');
reset role;
select is((select array[title, description, price_cents::text] from listings where id = :'listing'),
          array['Maison à relire', 'Description du vendeur.', '30000000'],
          'nothing changed by the refused calls');

-- ===========================================================================
-- What it refuses
-- ===========================================================================
\set who admin
\ir _as.psql
select throws_ok(format($$select listing_admin_edit(%L, ' a ', 'Titre', 'Texte.', 1)$$, :'listing'),
                 '22023', null, 'admin: a reason is required (3 characters)');
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Ti', 'Texte.', 1)$$, :'listing'),
                 '22023', null, 'admin: a title of 3 characters at least');
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Titre', '  ', 1)$$, :'listing'),
                 '22023', null, 'admin: a description');
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Titre', 'Texte.', 0)$$, :'listing'),
                 '22023', null, 'admin: a price above zero');
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Titre', 'Texte.', 1)$$, :'draft'),
                 '22023', null, 'admin: never a draft (the seller has it in hand)');
select throws_ok(format($$select listing_admin_edit(%L, 'Motif', 'Titre', 'Texte.', 1)$$, gen_random_uuid()),
                 'P0002', null, 'admin: a listing that does not exist');
select throws_ok(format($$select listing_admin_edit(%L, 'Motif')$$, :'listing'),
                 '22023', null, 'admin: at least one field (title, description or price)');

-- ===========================================================================
-- In review: the price and the title
-- ===========================================================================
select is(listing_admin_edit(:'listing', p_reason => 'Prix arrondi, titre plus précis.',
                             p_title => '  Maison relue  ', p_price_cents => 29000000),
          array['price', 'title'], 'admin: in review, the fields changed are returned');
reset role;
select is((select array[title, price_cents::text, status::text] from listings where id = :'listing'),
          array['Maison relue', '29000000', 'pending'], 'written (trimmed), still in review');
select is((select count(*) from listing_revisions
            where listing_id = :'listing' and changed_by = tests.uid('admin')
              and reason = 'Prix arrondi, titre plus précis.')::int, 2,
          'in review too: two lines of history, by the admin, with the reason');
select is((select array[old_value::text, new_value::text] from listing_revisions
            where listing_id = :'listing' and field = 'price'),
          array['30000000', '29000000'], 'the price: old and new value, as for a seller');
select is((select meta->>'reason' from audit_log
            where entity_id = :'listing' and action = 'listing.admin_edit' and actor_id = tests.uid('admin')),
          'Prix arrondi, titre plus précis.', 'audit_log: the change, its reason, by the admin');
select ok((select channels @> '{in_app,email}' and email_after is not null
                  and data->>'reason' = 'Prix arrondi, titre plus précis.'
                  and data->>'old_price_cents' = '30000000'
                  and link = '/vendeur/biens/' || :'prop' || '/annonce#historique'
             from notifications
            where profile_id = tests.uid('seller_a') and type = 'listing.team_edited'
              and data->>'listing_id' = :'listing'),
          'the seller is told: bell and email, with the reason and the price before');
select is((select count(*) from notifications
            where type = 'listing.revised' and data->>'listing_id' = :'listing')::int, 0,
          'the team is not told of its own change');

-- The same values again: nothing written.
\set who admin
\ir _as.psql
select is(listing_admin_edit(:'listing', p_reason => 'Motif', p_title => 'Maison relue',
                             p_description => 'Description du vendeur.', p_price_cents => 29000000),
          '{}'::text[], 'admin: nothing changed, nothing returned');
reset role;
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, 2,
          'and nothing written');

-- ===========================================================================
-- Online: the trigger of L1-35 writes the line, the reason is added, once
-- ===========================================================================
\set who admin
\ir _as.psql
select listing_publish(:'listing') \gset
-- The seller changes the price while the form of the team is open: the team
-- sends only the description, the price of the seller stays.
\set who seller_a
\ir _as.psql
update listings set price_cents = 28900000 where id = :'listing';
\set who admin
\ir _as.psql
select is(listing_admin_edit(:'listing', p_reason => 'Coordonnées retirées de la description.',
                             p_description => 'Description corrigée par l''équipe.'),
          array['description'], 'admin: online, the description only');
reset role;
select is((select price_cents from listings where id = :'listing'), 28900000::bigint,
          'a field not sent is left as it is: the newer price of the seller stays');
select is((select count(*) from listing_revisions
            where listing_id = :'listing' and field = 'description')::int, 1,
          'one line for the description, not two');
select is((select reason from listing_revisions where listing_id = :'listing' and field = 'description'),
          'Coordonnées retirées de la description.', 'with the reason');
select is((select status::text from listings where id = :'listing'), 'published', 'still online');

-- A change of the seller: no reason.
\set who seller_a
\ir _as.psql
update listings set price_cents = 28500000 where id = :'listing';
reset role;
select ok((select bool_and(reason is null) from listing_revisions
            where listing_id = :'listing' and changed_by = tests.uid('seller_a')),
          'a change of the seller has no reason');

-- ===========================================================================
-- Suspended: written by the function
-- ===========================================================================
\set who admin
\ir _as.psql
\o /dev/null
select listing_suspend(:'listing', 'Contrôle (test).');
\o
select is(listing_admin_edit(:'listing', p_reason => 'Titre trompeur.',
                             p_title => 'Maison relue, titre suspendu'),
          array['title'], 'admin: suspended, the title');
reset role;
select is((select count(*) from listing_revisions
            where listing_id = :'listing' and field = 'title' and reason = 'Titre trompeur.')::int, 1,
          'suspended: the line is written, with the reason');

-- ===========================================================================
-- Who reads the reason
-- ===========================================================================
\set who seller_a
\ir _as.psql
select is((select count(*) from listing_revisions where listing_id = :'listing' and reason is not null)::int, 4,
          'seller_a: reads the reasons of the team in its history');
select throws_ok(format($$update listing_revisions set reason = 'Autre' where listing_id = %L$$, :'listing'),
                 '42501', null, 'seller_a: cannot change a reason');
\set who seller_b
\ir _as.psql
select is((select count(*) from listing_revisions where listing_id = :'listing')::int, 0,
          'seller_b: not the history of another seller');
\set who buyer_c
\ir _as.psql
select is((select count(*) from notifications where type = 'listing.team_edited'
             and data->>'listing_id' = :'listing')::int, 0,
          'buyer_c: not the notice of the seller');

select * from finish();
rollback;
