-- L2-05: the summary of a listing by the assistant (SPEC-V2 8.4 point 8). It
-- is asked for when a listing goes online and when a listing online changes
-- what it says (title, description, price, its property), the summary of
-- before removed at once; a view counted asks for nothing; its seller cannot
-- write it nor ask for it; the public reads it for an online listing only;
-- the log of the assistant takes its kind. Fixtures in postal code 99994:
-- the file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(32);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'appartement', '2 rue des Résumés', '99994', 'Résumeville', 68, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3613, 48.7014), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Appartement à résumer', 'Séjour lumineux, deux chambres.', 23900000)
returning id as listing \gset
\o /dev/null
select tests.dpe(:'listing');
select listing_submit(:'listing');
\o
reset role;
select is((select summary_requested_at is null and summary is null from listings where id = :'listing'),
          true, 'a listing waiting for its review asks for no summary');

\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing');
\o
reset role;
select is((select summary_requested_at is not null and summary is null from listings where id = :'listing'),
          true, 'published: a summary is asked for');

-- The scheduled task writes it (service role) and clears the request.
set local role service_role;
update listings set summary = 'Appartement de 3 pièces de 68 m² à Résumeville. Séjour lumineux.',
                    summary_requested_at = null
 where id = :'listing';
reset role;
select is((select summary is not null and summary_requested_at is null from listings where id = :'listing'),
          true, 'the task writes the summary: no new request from its own writing');

-- ===========================================================================
-- Who reads it
-- ===========================================================================
\set who anon
\ir _as.psql
select is((select public_listing_summary(:'listing')),
          'Appartement de 3 pièces de 68 m² à Résumeville. Séjour lumineux.',
          'anon: reads the summary of a listing online');
select throws_ok(format($$select summary from listings where id = %L$$, :'listing'), '42501', null,
                 'anon: not the table');
\set who buyer_c
\ir _as.psql
select is((select public_listing_summary(:'listing')) is not null, true,
          'buyer_c: reads it too');

-- ===========================================================================
-- Its seller cannot write it
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$update listings set summary = 'Le meilleur bien de la ville.' where id = %L$$, :'listing'),
                 '42501', null, 'seller_a: does not write the summary of the assistant');
select throws_ok(format($$update listings set summary_requested_at = null where id = %L$$, :'listing'),
                 '42501', null, 'nor its request');

-- ===========================================================================
-- What asks for a new one
-- ===========================================================================
\set who buyer_c
\ir _as.psql
\o /dev/null
select listing_view_increment(:'listing');
\o
reset role;
select is((select summary is not null and summary_requested_at is null from listings where id = :'listing'),
          true, 'a view counted asks for nothing');

\set who seller_a
\ir _as.psql
update listings set description = 'Séjour lumineux, deux chambres, cave.' where id = :'listing';
reset role;
select is((select summary is null and summary_requested_at is not null from listings where id = :'listing'),
          true, 'the description changed: the summary of before is removed, a new one asked for');
\set who anon
\ir _as.psql
select is((select public_listing_summary(:'listing')), null,
          'anon: no summary of what the listing no longer says');

-- Written again, then the price, the title, the property.
reset role;
update listings set summary = 'Résumé 2.', summary_requested_at = null where id = :'listing';
\set who seller_a
\ir _as.psql
update listings set price_cents = 23500000 where id = :'listing';
reset role;
select is((select summary is null and summary_requested_at is not null from listings where id = :'listing'),
          true, 'the price changed: asked for again');
update listings set summary = 'Résumé 3.', summary_requested_at = null where id = :'listing';
\set who seller_a
\ir _as.psql
update listings set title = 'Appartement résumé' where id = :'listing';
reset role;
select is((select summary is null and summary_requested_at is not null from listings where id = :'listing'),
          true, 'the title changed: asked for again');
update listings set summary = 'Résumé 4.', summary_requested_at = null where id = :'listing';
\set who seller_a
\ir _as.psql
update properties set bedrooms = 2 where id = :'prop';
reset role;
select is((select summary is null and summary_requested_at is not null from listings where id = :'listing'),
          true, 'its property changed: asked for again');
update listings set summary = 'Résumé 5.', summary_requested_at = null where id = :'listing';
\set who seller_a
\ir _as.psql
update properties set rooms = rooms where id = :'prop';
update listings set description = description where id = :'listing';
reset role;
select is((select summary = 'Résumé 5.' and summary_requested_at is null from listings where id = :'listing'),
          true, 'a save that changes nothing: no new summary');
-- What the summary is not written from: the same summary would be billed again.
\set who seller_a
\ir _as.psql
update properties set charges_monthly_cents = 18000, property_tax_yearly_cents = 115000 where id = :'prop';
reset role;
update properties set estimation_value_cents = 24000000 where id = :'prop';
select is((select summary = 'Résumé 5.' and summary_requested_at is null from listings where id = :'listing'),
          true, 'its charges, its tax, its analysis of value: no new summary');

-- The task answers late: the listing changed again while the model wrote.
-- Each change has its own request (the moment of the change), even here in
-- one transaction: the write of the task, bound to the request it read,
-- finds nothing to write.
\set who seller_a
\ir _as.psql
update listings set price_cents = 23000000 where id = :'listing';
reset role;
select summary_requested_at as asked from listings where id = :'listing' \gset
\set who seller_a
\ir _as.psql
update listings set price_cents = 22900000 where id = :'listing';
reset role;
select isnt((select summary_requested_at from listings where id = :'listing'), :'asked'::timestamptz,
            'a second change is a new request');
with written as (
  update listings set summary = 'En retard.', summary_requested_at = null
   where id = :'listing' and summary_requested_at = :'asked'::timestamptz
  returning id)
select is((select count(*)::int from written), 0,
          'the summary of the older request is not written');
select is((select summary is null and summary_requested_at is not null from listings where id = :'listing'),
          true, 'the newer request stays');

-- ===========================================================================
-- Off line: kept, not shown; back online: a new one
-- ===========================================================================
update listings set summary = 'Résumé 6.', summary_requested_at = null where id = :'listing';
\set who seller_a
\ir _as.psql
\o /dev/null
select listing_pause(:'listing');
\o
reset role;
select is((select summary = 'Résumé 6.' and summary_requested_at is null from listings where id = :'listing'),
          true, 'paused: nothing asked for');
\set who anon
\ir _as.psql
select is((select public_listing_summary(:'listing')), null, 'anon: no summary of a listing off line');
\set who seller_a
\ir _as.psql
update listings set description = 'En pause, retouchée.' where id = :'listing';
update properties set bedrooms = 3 where id = :'prop';
reset role;
select is((select summary = 'Résumé 6.' and summary_requested_at is null from listings where id = :'listing'),
          true, 'the listing or its property changed while paused: nothing asked for');
\set who seller_a
\ir _as.psql
\o /dev/null
select listing_resume(:'listing');
\o
reset role;
select is((select summary is null and summary_requested_at is not null from listings where id = :'listing'),
          true, 'back online: a summary of what it now says is asked for');

-- Suspended by the team, then back online.
update listings set summary = 'Résumé 7.', summary_requested_at = null where id = :'listing';
\set who admin
\ir _as.psql
\o /dev/null
select listing_suspend(:'listing', 'Contrôle en cours.');
\o
reset role;
select is((select summary_requested_at is null from listings where id = :'listing'),
          true, 'suspended: nothing asked for');
\set who anon
\ir _as.psql
select is((select public_listing_summary(:'listing')), null, 'anon: no summary of a suspended listing');
\set who admin
\ir _as.psql
\o /dev/null
select listing_unsuspend(:'listing');
\o
reset role;
select is((select summary is null and summary_requested_at is not null from listings where id = :'listing'),
          true, 'the suspension lifted: asked for again');

-- ===========================================================================
-- The log of the assistant
-- ===========================================================================
select lives_ok(format($$insert into ai_conversations (profile_id, context, kind, property_id)
                         values (%L, 'seller', 'listing_summary', %L)$$, tests.uid('seller_a'), :'prop'),
                'the log takes the kind listing_summary, for the owner and the property');
select throws_ok(format($$insert into ai_conversations (profile_id, context, kind)
                          values (%L, 'seller', 'listing_summary')$$, tests.uid('seller_a')),
                 '23514', null, 'never without its property');
\set who seller_a
\ir _as.psql
select throws_ok(format($$insert into ai_conversations (profile_id, context, kind, property_id)
                          values (%L, 'seller', 'listing_summary', %L)$$, tests.uid('seller_a'), :'prop'),
                 '42501', null, 'seller_a: does not log a summary of its own (the task only)');
select lives_ok(format($$insert into ai_conversations (profile_id, context, kind, property_id)
                         values (%L, 'seller', 'chat', %L)$$, tests.uid('seller_a'), :'prop'),
                'seller_a: its conversations with the assistant are logged as before');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from ai_conversations where kind = 'listing_summary' and property_id = :'prop'),
          0, 'seller_b: not the log of the summaries of another seller');
\set who admin
\ir _as.psql
select is((select count(*)::int from ai_conversations where kind = 'listing_summary' and property_id = :'prop'),
          1, 'admin: reads it');

select * from finish();
rollback;
