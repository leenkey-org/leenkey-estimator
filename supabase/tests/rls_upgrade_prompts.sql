-- L2-09: the upgrade prompts (SPEC-V2 11 bis). A seller records what they
-- saw, opened or hid on their own properties only; a prompt hidden stays
-- hidden and a click stays recorded; the prompts of an offer come back for a
-- new offer, the others once per property; only the codes of the SPEC. The
-- measure of the back office is for the team only, with the conversion of a
-- click into a plan within 7 days. Fixtures in postal code 99994: the file
-- passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(28);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '1 rue des Formules', '99994', 'Gammeville', 100, 5,
        extensions.st_setsrid(extensions.st_makepoint(2.3713, 48.7114), 4326)::extensions.geography)
returning id as prop \gset
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_b'), 'appartement', '2 rue des Formules', '99994', 'Gammeville', 60, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3714, 48.7115), 4326)::extensions.geography)
returning id as prop_b \gset

-- ===========================================================================
-- The seller of the property records what they see
-- ===========================================================================
\set who seller_a
\ir _as.psql
select lives_ok(format($$select upgrade_prompt_record(%L, 'low_contacts', 'accompagne', 'shown', null)$$, :'prop'),
                'seller_a: records a prompt shown on its property');
select lives_ok(format($$select upgrade_prompt_record(%L, 'low_contacts', 'accompagne', 'shown', null)$$, :'prop'),
                'shown again: nothing new');
select is((select count(*)::int from upgrade_prompts where property_id = :'prop'), 1,
          'one row per property and trigger');
select lives_ok(format($$select upgrade_prompt_record(%L, 'low_contacts', 'accompagne', 'clicked', null)$$, :'prop'),
                'seller_a: records its click');
select ok((select clicked_at is not null and dismissed_at is null from upgrade_prompts
            where property_id = :'prop' and trigger_code = 'low_contacts'),
          'the click is written, the prompt is not hidden');

-- Hidden for good: the date of the first time stays.
select lives_ok(format($$select upgrade_prompt_record(%L, 'listing_ready', 'accompagne', 'dismissed', null)$$, :'prop'),
                'seller_a: hides a prompt never recorded as shown');
select dismissed_at as first_dismissed from upgrade_prompts
 where property_id = :'prop' and trigger_code = 'listing_ready' \gset
update upgrade_prompts set dismissed_at = null, clicked_at = null
 where property_id = :'prop' and trigger_code = 'listing_ready';
select throws_ok(format($$update upgrade_prompts set shown_at = now() + interval '1 day' where property_id = %L$$, :'prop'),
                 '42501', null, 'seller_a: never changes when a prompt was shown');
-- Not even with every right on the table: the trigger keeps the dates.
reset role;
update upgrade_prompts set dismissed_at = null, shown_at = now() + interval '1 day'
 where property_id = :'prop' and trigger_code = 'listing_ready';
\set who seller_a
\ir _as.psql
select is((select row(dismissed_at, shown_at <= now())::text from upgrade_prompts
            where property_id = :'prop' and trigger_code = 'listing_ready'),
          row(:'first_dismissed'::timestamptz, true)::text,
          'a prompt hidden stays hidden: no update brings it back, nor changes when it was shown');
select lives_ok(format($$select upgrade_prompt_record(%L, 'listing_ready', 'accompagne', 'dismissed', null)$$, :'prop'),
                'hidden twice: nothing changes');
select is((select dismissed_at from upgrade_prompts
            where property_id = :'prop' and trigger_code = 'listing_ready'),
          :'first_dismissed'::timestamptz, 'the first date stays');

-- The prompts of an offer: one per offer.
select lives_ok(format($$select upgrade_prompt_record(%L, 'offer_received', 'accompagne', 'dismissed', %L)$$,
                       :'prop', gen_random_uuid()),
                'seller_a: hides the prompt of an offer');
select lives_ok(format($$select upgrade_prompt_record(%L, 'offer_received', 'accompagne', 'shown', %L)$$,
                       :'prop', gen_random_uuid()),
                'a new offer: its own prompt');
select is((select count(*)::int from upgrade_prompts
            where property_id = :'prop' and trigger_code = 'offer_received' and dismissed_at is null), 1,
          'the prompt of the new offer is not hidden');

-- What the table takes.
select throws_ok(format($$select upgrade_prompt_record(%L, 'buy_now', 'accompagne', 'shown', null)$$, :'prop'),
                 '23514', null, 'a code that is not one of the SPEC is refused');
select throws_ok(format($$select upgrade_prompt_record(%L, 'offer_received', 'accompagne', 'shown', null)$$, :'prop'),
                 '23514', null, 'the prompt of an offer has its offer');
select throws_ok(format($$select upgrade_prompt_record(%L, 'low_contacts', 'accompagne', 'shown', %L)$$,
                        :'prop', gen_random_uuid()),
                 '23514', null, 'the others have no subject');
select throws_ok(format($$select upgrade_prompt_record(%L, 'low_contacts', 'accompagne', 'bought', null)$$, :'prop'),
                 '22023', null, 'an event that is not one is refused');

-- ===========================================================================
-- Nobody else
-- ===========================================================================
\set who seller_b
\ir _as.psql
select throws_ok(format($$select upgrade_prompt_record(%L, 'valuation_done', 'accompagne', 'shown', null)$$, :'prop'),
                 '42501', null, 'seller_b: not on the property of another seller');
select is((select count(*)::int from upgrade_prompts where property_id = :'prop'), 0,
          'seller_b: reads none of its prompts');
select throws_ok(format($$select upgrade_prompt_record(%L, 'low_contacts', 'accompagne', 'dismissed', null)$$, :'prop'),
                 '42501', null, 'seller_b: does not hide a prompt of another property');
reset role;
select is((select dismissed_at from upgrade_prompts where property_id = :'prop' and trigger_code = 'low_contacts'),
          null, 'the prompt of seller_a is not hidden by seller_b');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select upgrade_prompt_record(%L, 'low_contacts', 'accompagne', 'shown', null)$$, :'prop'),
                 '42501', null, 'buyer_c: neither');
\set who anon
\ir _as.psql
select throws_ok(format($$select upgrade_prompt_record(%L, 'low_contacts', 'accompagne', 'shown', null)$$, :'prop'),
                 '42501', null, 'anon: not the function');
select throws_ok($$select * from admin_upgrade_prompt_stats()$$, '42501', null, 'anon: not the measure');

-- ===========================================================================
-- The measure of the back office
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok($$select * from admin_upgrade_prompt_stats()$$, '42501', null,
                 'seller_a: not the measure of the back office');
-- A plan ordered on the property the day after the click.
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
select :'prop', tests.uid('seller_a'), 'accompagne', 99000, clicked_at + interval '1 day'
  from upgrade_prompts where property_id = :'prop' and trigger_code = 'low_contacts';
\set who admin
\ir _as.psql
select ok((select shown >= 1 and clicked >= 1 and converted >= 1
             from admin_upgrade_prompt_stats() where trigger_code = 'low_contacts'),
          'admin: shown, opened and converted within 7 days');
select ok((select dismissed >= 1 from admin_upgrade_prompt_stats() where trigger_code = 'listing_ready'),
          'admin: and hidden');
select is((select count(*)::int from admin_upgrade_prompt_stats(0)
            where trigger_code not in ('offer_accepted', 'offer_received', 'visits_no_offer',
                                       'contacts_no_visit', 'low_contacts', 'file_incomplete',
                                       'listing_ready', 'valuation_done')), 0,
          'admin: one line per code of the SPEC, with a window of one day at least');

select * from finish();
rollback;
