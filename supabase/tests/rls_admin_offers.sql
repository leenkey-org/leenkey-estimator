-- L2-07: the offers in the back office (SPEC-V2 13 and 17). The team reads
-- every offer sent (never a draft), an offer past its validity as expired;
-- nobody else calls these reads. « Marquer comme analysée » ticks the task
-- of the sale once, for a property whose plan includes the analysis of its
-- offers, by the team only, and is written in the audit log. An offer
-- accepted on a property whose plan includes an adviser tells the team;
-- under the free plan it tells no one of the team. The team records the
-- avant-contrat of an accepted offer when the plan of its sale follows it to
-- its signature. Fixtures in postal code 99996: the
-- file passes on an empty and on a seeded database.
begin;
\ir _helpers.psql
select plan(39);
\ir _plan.psql

-- The plans and their rights (reference data, absent from a bare database).
insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Un conseiller.', 99000, 'Accompagné', '{Conseiller}', 2)
on conflict (code) do nothing;
insert into plan_entitlements (plan, feature) values
  ('accompagne', 'advisor'), ('accompagne', 'human_offer_analysis')
on conflict do nothing;
-- The task of the team, in a step of the test of Accompagné and of Autonomie.
insert into sale_steps (plan, code, position, title, description, owner)
values ('accompagne', 'rls_offers', 98, 'Étape de test', 'Test', 'both'),
       ('autonomie', 'rls_offers', 98, 'Étape de test', 'Test', 'seller')
on conflict (plan, code) do nothing;
insert into sale_step_tasks (step_id, code, title, auto_trigger, required, position, owner)
select s.id, 'offer_analysed', 'Offre analysée avec le conseiller', null, false, 1, 'leenkey'
  from sale_steps s
 where s.plan = 'accompagne' and s.code = 'rls_offers'
   and not exists (select 1 from sale_step_tasks t join sale_steps x on x.id = t.step_id
                    where x.plan = 'accompagne' and t.code = 'offer_analysed');

-- seller_a: a property under Accompagné; seller_b: one under Autonomie. Both online.
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '1 rue des Dossiers', '99996', 'Équipeville', 104, 5,
        extensions.st_setsrid(extensions.st_makepoint(2.3613, 48.7014), 4326)::extensions.geography)
returning id as prop_paid \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_paid', 'Maison accompagnée', 'Description.', 35000000)
returning id as listing_paid \gset
\o /dev/null
select tests.dpe(:'listing_paid');
select listing_submit(:'listing_paid');
\o
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_b'), 'appartement', '2 rue des Dossiers', '99996', 'Équipeville', 60, 3,
        extensions.st_setsrid(extensions.st_makepoint(2.3614, 48.7015), 4326)::extensions.geography)
returning id as prop_free \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_free', 'Appartement en autonomie', 'Description.', 20000000)
returning id as listing_free \gset
\o /dev/null
select tests.dpe(:'listing_free');
select listing_submit(:'listing_free');
\o
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing_paid');
select listing_publish(:'listing_free');
\o
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop_paid', tests.uid('seller_a'), 'accompagne', 99000, now());
update sale_progress set plan = 'accompagne' where property_id = :'prop_paid';
delete from notifications where type = 'offer.accepted_team';

-- buyer_c: an offer sent on each, and a draft; buyer_d: nothing.
\set who buyer_c
\ir _as.psql
update buyer_profiles
   set project = 'residence_principale', budget_max_cents = 40000000,
       down_payment_cents = 9000000, loan_needed = false
 where profile_id = tests.uid('buyer_c');
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_paid', tests.uid('buyer_c'), 33800000)
returning id as offer_paid \gset
insert into offers (listing_id, buyer_id, price_cents) values (:'listing_free', tests.uid('buyer_c'), 19000000)
returning id as offer_free \gset
update offers
   set buyer_identity = '{"last_name":"Martin","first_name":"Chloé","birth_date":"1990-04-12",
                          "address":{"line":"3 rue Verte","postal_code":"75011","city":"Paris"},
                          "email":"chloe@example.test","phone":"0600000000"}',
       financing_mode = 'no_loan',
       validity_until = now() + interval '5 days', visited = true,
       declarations = '{"accuracy":true,"price_and_financing_checked":true,
                        "legal_effects_understood":true,"info_read":true}'
 where id in (:'offer_paid', :'offer_free');

-- ===========================================================================
-- Who reads the offers of the back office
-- ===========================================================================
\set who admin
\ir _as.psql
select is((select count(*)::int from admin_offers(p_query => 'Équipeville')), 0,
          'admin: a draft is not an offer of the back office');
\set who buyer_c
\ir _as.psql
\o /dev/null
select offer_submit(:'offer_paid');
select offer_submit(:'offer_free');
\o
select throws_ok($$select * from admin_offers()$$, '42501', null, 'buyer_c: not the offers of the back office');
select throws_ok($$select * from admin_offer_counts()$$, '42501', null, 'nor their counts');
\set who seller_a
\ir _as.psql
select throws_ok($$select * from admin_offers()$$, '42501', null, 'seller_a: not the offers of the back office');
\set who anon
\ir _as.psql
select throws_ok($$select * from admin_offers()$$, '42501', null, 'anon: not the offers of the back office');
select throws_ok($$select * from admin_offer_counts()$$, '42501', null, 'anon: nor their counts');
select throws_ok(format($$select admin_offer_mark_analysed(%L)$$, :'offer_paid'), '42501', null,
                 'anon: does not tick the task of the team');

\set who admin
\ir _as.psql
select is((select array_agg(listing_reference is not null and status = 'submitted' and plan::text = p
                            order by price_cents)
             from (select o.*, case when o.id = :'offer_paid' then 'accompagne' else 'autonomie' end as p
                     from admin_offers(p_query => 'Équipeville') o) x),
          array[true, true],
          'admin: the two offers sent, with their listing, their status and the plan of their sale');
select is((select row(buyer_first_name is not null, seller_id, asking_price_cents)::text
             from admin_offers(p_query => 'Équipeville') where id = :'offer_paid'),
          row(true, tests.uid('seller_a'), 35000000::bigint)::text,
          'admin: its buyer, its seller, the price of the listing when it was sent');
select is((select count(*)::int from admin_offers(p_status => 'waiting', p_query => 'Équipeville')), 2,
          'admin: both wait for an answer');
select is((select count(*)::int from admin_offers(p_status => 'accepted', p_query => 'Équipeville')), 0,
          'admin: none accepted yet');
select is((select count(*)::int from admin_offers(p_account => tests.uid('seller_b'))
            where id in (:'offer_paid', :'offer_free')), 1,
          'admin: the offers of an account (received by seller_b)');
select is((select count(*)::int from admin_offers(p_query => '%'))
          + (select count(*)::int from admin_offers(p_query => '_'))
          + (select count(*)::int from admin_offers(p_query => E'\\')), 0,
          'admin: a search reads %, _ and \ as text, never as a pattern');
select is((select count(*)::int from admin_offers(p_query => 'Équipeville', p_limit => 0)), 1,
          'admin: a limit below one reads one offer');
select throws_ok($$select * from admin_offers(p_status => 'draft')$$, '22023', null,
                 'admin: a filter that is not one is refused');
select ok((select waiting >= 2 and total >= waiting + accepted + declined from admin_offer_counts()),
          'admin: the counts of the filters');

-- Past its validity: read as expired, before the cron writes it.
reset role;
alter table offers disable trigger user;
update offers set validity_until = now() - interval '1 hour' where id = :'offer_free';
alter table offers enable trigger user;
\set who admin
\ir _as.psql
select is((select status::text from admin_offers(p_status => 'ended', p_query => 'Équipeville')),
          'expired', 'admin: an offer past its validity reads expired');
select is((select count(*)::int from admin_offers(p_status => 'waiting', p_query => 'Équipeville')), 1,
          'admin: and no longer waits');

-- ===========================================================================
-- « Marquer comme analysée »
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$select admin_offer_mark_analysed(%L)$$, :'offer_paid'), '42501', null,
                 'seller_a: does not tick the task of the team');
\set who buyer_c
\ir _as.psql
select throws_ok(format($$select admin_offer_mark_analysed(%L)$$, :'offer_paid'), '42501', null,
                 'buyer_c: neither');
\set who admin
\ir _as.psql
select throws_ok(format($$select admin_offer_mark_analysed(%L)$$, :'offer_free'), 'P0002', null,
                 'admin: not for a property whose plan has no analysis of its offers');
select throws_ok(format($$select admin_offer_mark_analysed(%L)$$, gen_random_uuid()), '42501', null,
                 'admin: not an offer that does not exist');
select lives_ok(format($$select admin_offer_mark_analysed(%L)$$, :'offer_paid'),
                'admin: marks the offer of a plan with an adviser as analysed');
select is((select row(st.done_at is not null, st.done_by)::text
             from sale_task_status st join sale_step_tasks t on t.id = st.task_id
            where st.property_id = :'prop_paid' and t.code = 'offer_analysed'),
          row(true, tests.uid('admin'))::text,
          'the task « Offre analysée avec le conseiller » is ticked, by the admin');
select is((select count(*)::int from audit_log
            where action = 'offer.analysed' and entity_id = :'offer_paid'
              and actor_id = tests.uid('admin')), 1,
          'written in the audit log');
select throws_ok(format($$select admin_offer_mark_analysed(%L)$$, :'offer_paid'), '22023', null,
                 'admin: once only');
\set who seller_a
\ir _as.psql
select is((select st.done_at is not null
             from sale_task_status st join sale_step_tasks t on t.id = st.task_id
            where st.property_id = :'prop_paid' and t.code = 'offer_analysed'),
          true, 'seller_a: reads the task done on its sale');

-- ===========================================================================
-- An offer accepted: the team is told when the plan has an adviser
-- ===========================================================================
-- For this acceptance, the seller is also of the team, and buyer_d a
-- suspended admin: neither is told.
reset role;
alter table profiles disable trigger user;
update profiles set roles = array_append(roles, 'admin'::user_role) where id = tests.uid('seller_a');
update profiles set roles = array_append(roles, 'admin'::user_role), suspended_at = now()
 where id = tests.uid('buyer_d');
alter table profiles enable trigger user;
\set who seller_a
\ir _as.psql
\o /dev/null
select offer_mark_viewed(:'offer_paid');
select offer_answer(:'offer_paid', true, true);
\o
reset role;
select is((select count(*)::int from notifications n join profiles p on p.id = n.profile_id
            where n.type = 'offer.accepted_team' and n.data->>'offer_id' = :'offer_paid'
              and 'admin' = any(p.roles)),
          (select count(*)::int from profiles
            where 'admin' = any(roles) and deleted_at is null and suspended_at is null
              and id <> tests.uid('seller_a')),
          'accepted under a plan with an adviser: each active admin is told');
select is((select row(link, group_key, email_after is not null, data->>'plan')::text
             from notifications
            where type = 'offer.accepted_team' and data->>'offer_id' = :'offer_paid' limit 1),
          row('/admin/offres/' || :'offer_paid', 'offers:accepted', true, 'accompagne')::text,
          'with the sheet of the offer, by email too, grouped for the team');
select is((select count(*)::int from notifications
            where type = 'offer.accepted_team' and profile_id in (tests.uid('seller_a'), tests.uid('buyer_c'))),
          0, 'never to its seller, even of the team, nor to its buyer');
select is((select count(*)::int from notifications
            where type = 'offer.accepted_team' and profile_id = tests.uid('buyer_d')),
          0, 'nor to a suspended admin');
alter table profiles disable trigger user;
update profiles set roles = array_remove(roles, 'admin'::user_role) where id = tests.uid('seller_a');
update profiles set roles = array_remove(roles, 'admin'::user_role), suspended_at = null
 where id = tests.uid('buyer_d');
alter table profiles enable trigger user;

-- Under the free plan: its buyer is told, not the team.
alter table offers disable trigger user;
update offers set validity_until = now() + interval '3 days' where id = :'offer_free';
alter table offers enable trigger user;
\set who seller_b
\ir _as.psql
\o /dev/null
select offer_mark_viewed(:'offer_free');
select offer_answer(:'offer_free', true, true);
\o
reset role;
select is((select count(*)::int from notifications
            where type = 'offer.accepted_team' and data->>'offer_id' = :'offer_free'), 0,
          'accepted under the free plan: the team is not told');
select is((select count(*)::int from notifications
            where type = 'offer.answered' and data->>'offer_id' = :'offer_free'), 1,
          'its buyer is, as before');

-- ===========================================================================
-- The avant-contrat recorded by the team
-- ===========================================================================
\set who buyer_d
\ir _as.psql
select throws_ok(format($$select offer_record_precontract(%L, %L)$$, :'offer_paid',
                        (now() at time zone 'Europe/Paris')::date),
                 '42501', null, 'buyer_d: not the avant-contrat of an offer of others');
\set who admin
\ir _as.psql
select throws_ok(format($$select offer_record_precontract(%L, %L)$$, :'offer_paid',
                        (now() at time zone 'Europe/Paris')::date),
                 '42501', null,
                 'admin: not when the plan of the sale has no avant-contrat recorded by the team');
-- The right, as Sérénité has it in the reference data: a right, never a plan name.
reset role;
insert into plan_entitlements (plan, feature) values ('accompagne', 'notary_coordination')
on conflict do nothing;
\set who admin
\ir _as.psql
select lives_ok(format($$select offer_record_precontract(%L, %L, %L)$$, :'offer_paid',
                       (now() at time zone 'Europe/Paris')::date, (now() at time zone 'Europe/Paris')::date),
                'admin: records the avant-contrat of an accepted offer, with the right of the plan');
select is((select precontract_signed_at is not null and withdrawal_period_start is not null
             from offers where id = :'offer_paid'),
          true, 'its dates are on the offer');
select is((select count(*)::int from audit_log
            where action = 'offer.precontract' and entity_id = :'offer_paid'
              and actor_id = tests.uid('admin')), 1,
          'and the audit log says who typed them');
select is((select count(*)::int from admin_offers(p_status => 'accepted', p_query => 'Équipeville')), 2,
          'admin: the two offers read accepted');

select * from finish();
rollback;
