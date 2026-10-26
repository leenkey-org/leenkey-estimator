-- L1-23: the sale steps engine (SPEC-V2 section 9). The tasks ticked by the
-- events of « parcours 1 » (CLAUDE.md section 10: a property, its listing
-- written, sent, validated by Leenkey, a buyer's contact), the current step
-- and step.advanced; what a seller may tick or declare; the plan switch.
begin;
\ir _helpers.psql
select plan(57);
\ir _plan.psql

-- The templates of Autonomie and Accompagné as the seed loads them (codes,
-- events, owners), when missing: the file runs on an empty or a seeded
-- database. Leenkey tasks never block a step (required = false).
insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils pour vendre vous-même.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Vous vendez. Nous vous accompagnons.', 99000, 'Accompagné', '{}', 2)
on conflict (code) do nothing;
insert into sale_steps (plan, code, position, title, description, owner)
select pl.plan, s.code, s.position, s.title, s.title, 'seller'
from (values ('autonomie'::plan_code), ('accompagne')) as pl(plan)
cross join (values ('prepare', 1, 'Préparer ma vente'), ('publish', 2, 'Créer et publier mon annonce'),
                   ('contacts_visits', 3, 'Gérer mes contacts et mes visites'),
                   ('offers', 4, 'Recevoir et négocier mes offres'),
                   ('notary', 5, 'Préparer ma vente avec le notaire'), ('closing', 6, 'Finaliser ma vente'))
     as s(code, position, title)
on conflict (plan, code) do nothing;
insert into sale_step_tasks (step_id, code, title, auto_trigger, required, position, owner)
select st.id, t.code, t.code, t.event, t.owner <> 'leenkey', t.position, t.owner
from sale_steps st
join (values
  ('prepare', 'estimation_linked', 'estimation.linked', 'seller', 1, 'A,C'),
  ('prepare', 'property_complete', 'property.complete', 'seller', 2, 'A,C'),
  ('prepare', 'photos_min6', 'photos.min6', 'seller', 3, 'A,C'),
  ('prepare', 'checklist_viewed', 'documents.checklist_viewed', 'seller', 4, 'A,C'),
  ('prepare', 'price_strategy', null, 'leenkey', 6, 'C'),
  ('publish', 'listing_written', 'listing.draft_complete', 'seller', 1, 'A,C'),
  ('publish', 'listing_submitted', 'listing.submitted', 'seller', 2, 'A,C'),
  ('publish', 'listing_published', 'listing.published', 'seller', 3, 'A,C'),
  ('contacts_visits', 'first_contact', 'conversation.created', 'seller', 1, 'A,C'),
  ('contacts_visits', 'first_visit_done', 'visit.done', 'seller', 3, 'A,C'),
  ('offers', 'offer_received', 'offer.submitted', 'seller', 1, 'A,C'),
  ('notary', 'notary_chosen', null, 'seller', 1, 'A,C'),
  ('closing', 'conditions_lifted', null, 'both', 1, 'A,C'),
  ('closing', 'deed_signed', 'listing.sold', 'both', 2, 'A,C'))
  as t(step_code, code, event, owner, position, plans)
  on t.step_code = st.code
 and (st.plan = 'autonomie' and t.plans like '%A%' or st.plan = 'accompagne' and t.plans like '%C%')
on conflict (step_id, code) do nothing;

create function tests.done(p_property uuid, p_code text) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from sale_task_status st
                   join sale_step_tasks t on t.id = st.task_id
                   join sale_steps s on s.id = t.step_id
                   join sale_progress sp on sp.property_id = st.property_id and sp.plan = s.plan
                  where st.property_id = p_property and t.code = p_code and st.done_at is not null);
$$;
create function tests.step(p_property uuid) returns text
language sql security definer set search_path = public as $$
  select current_step_code from sale_progress where property_id = p_property;
$$;
create function tests.advanced(p_profile uuid) returns text
language sql security definer set search_path = public as $$
  select coalesce(string_agg(data->>'step_code', ',' order by created_at, data->>'step_position'), '')
    from notifications where profile_id = p_profile and type = 'step.advanced';
$$;
grant execute on function tests.done(uuid, text), tests.step(uuid), tests.advanced(uuid) to authenticated;
select id as task_first_visit from sale_step_tasks t
 where t.code = 'first_visit_done'
   and t.step_id = (select id from sale_steps where plan = 'autonomie' and code = 'contacts_visits') \gset
select id as task_notary from sale_step_tasks t
 where t.code = 'notary_chosen'
   and t.step_id = (select id from sale_steps where plan = 'autonomie' and code = 'notary') \gset
select id as task_notary_c from sale_step_tasks t
 where t.code = 'notary_chosen'
   and t.step_id = (select id from sale_steps where plan = 'accompagne' and code = 'notary') \gset
select id as task_published from sale_step_tasks t
 where t.code = 'listing_published'
   and t.step_id = (select id from sale_steps where plan = 'autonomie' and code = 'publish') \gset

-- ===========================================================================
-- Parcours 1: seller_a writes the property and its listing, sends it
-- ===========================================================================
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '12 rue de la Gare', '91600', 'Savigny-sur-Orge', 68, 3)
returning id as prop_a \gset
select ok(tests.done(:'prop_a', 'property_complete'), 'characteristics complete: « Fiche du bien complète » ticked');
select ok(not tests.done(:'prop_a', 'estimation_linked'), 'no analysis of value linked: not ticked');
select is(tests.step(:'prop_a'), 'prepare', 'the sale starts at « Préparer ma vente »');

reset role;
insert into photos (property_id, storage_path, width, height)
select :'prop_a', :'prop_a' || '/' || gen_random_uuid(), 1600, 1200 from generate_series(1, 5);
select ok(not tests.done(:'prop_a', 'photos_min6'), 'five photos: not yet « 6 minimum »');
insert into photos (property_id, storage_path, width, height)
values (:'prop_a', :'prop_a' || '/' || gen_random_uuid(), 1600, 1200);
select ok(tests.done(:'prop_a', 'photos_min6'), 'the sixth photo ticks « Photos ajoutées, 6 minimum »');

\set who seller_a
\ir _as.psql
insert into listings (property_id, title, description, price_cents)
values (:'prop_a', 'Appartement 3 pièces', '', 35000000)
returning id as listing_a \gset
select ok(not tests.done(:'prop_a', 'listing_written'), 'a price without description: not written yet');
update listings set description = 'Proche gare, au calme.' where id = :'listing_a';
select ok(tests.done(:'prop_a', 'listing_written'), 'a price and a description: « Annonce rédigée » ticked');
select is(tests.step(:'prop_a'), 'publish',
          'an event of step 2 brings the sale there, the documents of step 1 still to do');
select ok(not tests.done(:'prop_a', 'checklist_viewed'), 'the task skipped stays to do');
select lives_ok(format($$select listing_submit(%L)$$, :'listing_a'), 'seller_a sends the listing');
select ok(tests.done(:'prop_a', 'listing_submitted'), '« Annonce envoyée » ticked');
select is(tests.step(:'prop_a'), 'publish', 'sent, waiting for Leenkey: still step 2');

-- ===========================================================================
-- Leenkey validates it, a buyer writes
-- ===========================================================================
\set who admin
\ir _as.psql
select lives_ok(format($$select listing_publish(%L)$$, :'listing_a'), 'admin publishes the listing');
select ok(tests.done(:'prop_a', 'listing_published'), '« Annonce en ligne » ticked');
select is(tests.step(:'prop_a'), 'contacts_visits', 'step 2 done: the sale is at step 3');

\set who buyer_d
\ir _as.psql
select lives_ok(format($$select conversation_start(%L)$$, :'listing_a'),
                'buyer_d opens a conversation without a word');
select ok(not tests.done(:'prop_a', 'first_contact'), 'no message: not a first contact');

\set who buyer_c
\ir _as.psql
select lives_ok(format($$select conversation_open(%L, 'Bonjour, est-il toujours disponible ?')$$, :'listing_a'),
                'buyer_c writes to the seller');
select ok(tests.done(:'prop_a', 'first_contact'), '« Premier contact reçu » ticked');
select is(tests.step(:'prop_a'), 'contacts_visits', 'the visits still to come: step 3');

reset role;
select is(tests.advanced(tests.uid('seller_a')), 'publish,contacts_visits',
          'step.advanced to the seller for each step reached, never for the first');
select is((select link || ' ' || (data->>'step_position') || '/' || (data->>'steps_total')
                  || ' ' || (data->>'title') from notifications
            where profile_id = tests.uid('seller_a') and type = 'step.advanced'
              and data->>'step_code' = 'contacts_visits'),
          '/vendeur?bien=' || :'prop_a' || ' 3/6 Appartement 3 pièces',
          'its link (the dashboard of the property), its position and the title of the listing');
select ok((select channels = '{in_app}' and email_after is null from notifications
            where profile_id = tests.uid('seller_a') and type = 'step.advanced' limit 1),
          'in the app only (SPEC-V2 section 10)');
select is(sale_emit_event(:'prop_a', 'listing.published'), 0, 'an event again ticks nothing more');
select is((select count(*) from sale_task_status st join sale_step_tasks t on t.id = st.task_id
            where st.property_id = :'prop_a' and t.code = 'listing_published')::int, 1,
          'one status per task');

-- ===========================================================================
-- What a seller may tick or declare
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$insert into sale_task_status (property_id, task_id, done_at)
                          values (%L, %L, now())$$, :'prop_a', :'task_first_visit'),
                 '42501', null, 'seller_a cannot tick by hand a task an event ticks');
select lives_ok(format($$insert into sale_task_status (property_id, task_id, done_at, done_by)
                         values (%L, %L, now(), tests.uid('seller_a'))$$, :'prop_a', :'task_notary'),
                'seller_a ticks a task without event of a seller step');
select is(tests.step(:'prop_a'), 'contacts_visits', 'a task done by hand further on does not move the sale');
select is(sale_declare_event(:'prop_a', 'documents.checklist_viewed'), true,
          'seller_a declares the documents to prepare seen: a task ticked');
select ok(tests.done(:'prop_a', 'checklist_viewed'), '« Documents à préparer identifiés » ticked');
select is(sale_declare_event(:'prop_a', 'documents.checklist_viewed'), false,
          'declared again: nothing more ticked');
with u as (update sale_task_status set done_at = null
            where property_id = :'prop_a' and task_id = :'task_published' returning 1)
select is((select count(*) from u)::int, 0, 'seller_a cannot untick « Annonce en ligne »');
select ok(tests.done(:'prop_a', 'listing_published'), '« Annonce en ligne » still ticked');
select throws_ok(format($$insert into sale_task_status (property_id, task_id, done_at)
                          values (%L, %L, now())$$, :'prop_a', :'task_notary_c'),
                 '42501', null, 'seller_a cannot tick a task of the template of another plan');
select throws_ok(format($$select sale_declare_event(%L, 'listing.published')$$, :'prop_a'),
                 '22023', null, 'an event of the database is never declared by a seller');
select throws_ok(format($$select sale_emit_event(%L, 'listing.sold')$$, :'prop_a'),
                 '42501', null, 'seller_a cannot emit an event');
select throws_ok(format($$select sale_refresh_progress(%L)$$, :'prop_a'),
                 '42501', null, 'seller_a cannot move the sale');
with u as (update sale_progress set current_step_code = 'closing' where property_id = :'prop_a' returning 1)
select is((select count(*) from u)::int, 0, 'seller_a cannot set the step of the sale');

\set who seller_b
\ir _as.psql
select throws_ok(format($$select sale_declare_event(%L, 'documents.checklist_viewed')$$, :'prop_a'),
                 '42501', null, 'seller_b cannot declare an event for seller_a');
select is((select count(*) from sale_task_status where property_id = :'prop_a')::int, 0,
          'seller_b cannot read the tasks of seller_a');

\set who buyer_c
\ir _as.psql
select is((select count(*) from sale_progress where property_id = :'prop_a')::int, 0,
          'buyer_c cannot read the sale of seller_a');

\set who anon
\ir _as.psql
select throws_ok(format($$select sale_declare_event(%L, 'documents.checklist_viewed')$$, :'prop_a'),
                 '42501', null, 'anon cannot declare an event');

-- A suspended account acts on its sale no more.
reset role;
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'appartement', '5 rue Pasteur', '91200', 'Athis-Mons', 45, 2)
returning id as prop_s \gset
update profiles set suspended_at = now() where id = tests.uid('seller_b');
\set who seller_b
\ir _as.psql
select throws_ok(format($$select sale_declare_event(%L, 'documents.checklist_viewed')$$, :'prop_s'),
                 '42501', null, 'a suspended seller cannot declare an event');
select throws_ok(format($$insert into sale_task_status (property_id, task_id, done_at)
                          values (%L, %L, now())$$, :'prop_s', :'task_notary'),
                 '42501', null, 'a suspended seller cannot tick a task by hand');
reset role;
update profiles set suspended_at = null where id = tests.uid('seller_b');

-- ===========================================================================
-- A paid plan, then refunded: the template follows, the tasks done kept
-- ===========================================================================
reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents)
values (:'prop_a', tests.uid('seller_a'), 'accompagne', 99000)
returning id as sub_a \gset
select is((select plan::text from sale_progress where property_id = :'prop_a'), 'accompagne',
          'a subscription activated: the sale is in Accompagné');
select ok(tests.done(:'prop_a', 'listing_published') and tests.done(:'prop_a', 'first_contact')
          and tests.done(:'prop_a', 'notary_chosen'),
          'the tasks done kept by their code, by hand too');
select ok(not tests.done(:'prop_a', 'price_strategy'), 'the Leenkey task of the plan to do');
select is(tests.step(:'prop_a'), 'contacts_visits', 'a Leenkey task never blocks: same step');
update subscriptions set refunded_at = now() where id = :'sub_a';
select is((select plan::text from sale_progress where property_id = :'prop_a'), 'autonomie',
          'refunded: back to Autonomie');
select ok(tests.done(:'prop_a', 'first_contact'), 'with the tasks done');

-- ===========================================================================
-- Sold; the seed and the migrations replay the past without notifying
-- ===========================================================================
\set who seller_a
\ir _as.psql
select lives_ok(format($$select listing_mark_sold(%L, 34000000)$$, :'listing_a'), 'seller_a marks it sold');
select ok(tests.done(:'prop_a', 'deed_signed'), '« Acte authentique signé » ticked');
select is(tests.step(:'prop_a'), 'closing', 'the sale is at « Finaliser ma vente »');
reset role;
select is(tests.advanced(tests.uid('seller_a')), 'publish,contacts_visits',
          'sold: no step.advanced, the seller marked it');

reset role;
\o /dev/null
select set_config('leenkey.sale_quiet', 'on', true);
\o
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as prop_b \gset
insert into listings (property_id, title, description, price_cents, status, submitted_at, published_at)
values (:'prop_b', 'Maison 5 pièces', 'Jardin.', 42000000, 'published', now(), now());
select is(tests.step(:'prop_b'), 'contacts_visits', 'quiet: the sale moves');
select is(tests.advanced(tests.uid('seller_b')), '', 'quiet: no step.advanced');

-- Positions with gaps (steps moved by Leenkey): the next step all the same.
update sale_steps set position = position * 10 where plan = 'autonomie';
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '9 rue Victor Hugo', '91200', 'Athis-Mons', 95, 4)
returning id as prop_g \gset
insert into listings (property_id, title, description, price_cents, status, submitted_at, published_at)
values (:'prop_g', 'Maison 4 pièces', 'Jardin.', 39000000, 'published', now(), now());
select is(tests.step(:'prop_g'), 'contacts_visits', 'positions 10, 20, 30: step 2 done, the sale at step 3');

select * from finish();
rollback;
