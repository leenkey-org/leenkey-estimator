-- L1-05: plans, subscriptions (12-month term), sale steps, messaging, reports,
-- cases, notifications, knowledge base, assistant logs, admin account functions.
begin;
\ir _helpers.psql
select plan(83);
\ir _plan.psql

-- Reference data: loaded by the seed in real environments, inserted here when
-- missing so the file runs on an empty or a seeded database. Test tasks: one
-- owned by the seller, one by Leenkey in the same seller step (the task owner
-- wins), one without owner in a Leenkey step (the step owner applies).
insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils pour vendre vous-même.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Vous vendez. On vous accompagne à chaque étape.', 99000, 'Accompagné', '{}', 2),
  ('serenite', 'Sérénité', 'On pilote avec vous jusqu''à la signature.', 150000, 'Sérénité', '{}', 3)
on conflict (code) do nothing;
insert into sale_steps (plan, code, position, title, description, owner) values
  ('autonomie', 'prepare', 1, 'Préparer', 'Préparer la vente', 'seller'),
  ('autonomie', 'publish', 2, 'Publier', 'Validation Leenkey', 'leenkey')
on conflict (plan, code) do update set owner = excluded.owner;
insert into sale_step_tasks (step_id, code, title, position, owner)
select id, 'rls_seller_task', 'Ajouter des photos', 99, 'seller' from sale_steps where plan = 'autonomie' and code = 'prepare'
returning id as task_seller \gset
insert into sale_step_tasks (step_id, code, title, position, owner)
select id, 'rls_leenkey_task', 'Stratégie de prix', 98, 'leenkey' from sale_steps where plan = 'autonomie' and code = 'prepare'
returning id as task_leenkey \gset
insert into sale_step_tasks (step_id, code, title, position)
select id, 'rls_step_owned_task', 'Relecture Leenkey', 99 from sale_steps where plan = 'autonomie' and code = 'publish'
returning id as task_step_owned \gset

-- ===========================================================================
-- seller_a: property, steps
-- ===========================================================================
\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_a'), 'appartement', '12 rue de la Gare', '91600', 'Savigny-sur-Orge', 68, 3)
returning id as prop_a \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_a', 'Appartement 3 pièces', 'Proche gare.', 35000000)
returning id as listing_a \gset
select is((select plan::text || '/' || current_step_code from sale_progress where property_id = :'prop_a'),
          'autonomie/prepare', 'sale_progress created with the property (Autonomie, first step)');
select lives_ok(format($$insert into sale_task_status (property_id, task_id, done_at, done_by)
                         values (%L, %L, now(), tests.uid('seller_a'))$$, :'prop_a', :'task_seller'),
                'seller_a: ticks a seller task');
select throws_ok(format($$insert into sale_task_status (property_id, task_id, done_at)
                          values (%L, %L, now())$$, :'prop_a', :'task_leenkey'),
                 '42501', null, 'seller_a: cannot tick a Leenkey task, even in a seller step');
select throws_ok(format($$insert into sale_task_status (property_id, task_id, done_at)
                          values (%L, %L, now())$$, :'prop_a', :'task_step_owned'),
                 '42501', null, 'seller_a: cannot tick a task without owner in a Leenkey step');
select throws_ok(format($$update sale_task_status set done_by = tests.uid('seller_b')
                          where property_id = %L$$, :'prop_a'),
                 '42501', null, 'seller_a: cannot attribute a task to someone else');
with u as (update sale_progress set plan = 'serenite' where property_id = :'prop_a' returning 1)
select is((select count(*) from u)::int, 0, 'seller_a: cannot change the plan of the sale');
select lives_ok(format($$select listing_submit(%L)$$, :'listing_a'), 'seller_a: submits the listing');

\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as prop_b \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop_b', 'Maison 5 pièces', 'Jardin.', 42000000)
returning id as listing_b \gset
select throws_ok(format($$insert into sale_task_status (property_id, task_id, done_at)
                          values (%L, %L, now())$$, :'prop_a', :'task_seller'),
                 '42501', null, 'seller_b: cannot tick seller_a tasks');
select is((select count(*) from sale_progress where property_id = :'prop_a')::int, 0, 'seller_b: cannot read seller_a progress');

-- ===========================================================================
-- plans and subscriptions
-- ===========================================================================
\set who anon
\ir _as.psql
select is((select count(*) from plans)::int, 3, 'anon: reads the plans');
select throws_ok($$insert into plans (code, name, tagline, price_cents, description, features, position)
                   values ('autonomie', 'x', 'x', 0, 'x', '{}', 9)$$, '42501', null, 'anon: cannot write plans');
select throws_ok('select count(*) from stripe_events', '42501', null, 'anon: no access to stripe_events');
select throws_ok(format($$select owns_property(%L)$$, :'prop_a'), '42501', null, 'anon: helper functions are not callable');

\set who seller_a
\ir _as.psql
with u as (update plans set price_cents = 0 where code = 'serenite' returning 1)
select is((select count(*) from u)::int, 0, 'seller_a: cannot change a plan');
select throws_ok(format($$insert into subscriptions (property_id, owner_id, plan) values (%L, tests.uid('seller_a'), 'serenite')$$, :'prop_a'),
                 '42501', null, 'seller_a: cannot create a subscription');
select throws_ok('select count(*) from stripe_events', '42501', null, 'seller_a: no access to stripe_events');

reset role;
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'prop_a', tests.uid('seller_a'), 'accompagne', 99000, '2026-10-15 10:00:00+00')
returning id as sub_a \gset

\set who seller_a
\ir _as.psql
select is((select ends_at from subscriptions where id = :'sub_a'), '2027-10-15 10:00:00+00'::timestamptz,
          'a plan lasts 12 months from its activation');
select is(property_current_plan(:'prop_a'), 'accompagne'::plan_code, 'current plan is the active subscription');

\set who seller_b
\ir _as.psql
select is((select count(*) from subscriptions)::int, 0, 'seller_b: cannot read seller_a subscription');

reset role;
update subscriptions set ends_at = now() - interval '1 day' where id = :'sub_a';
\set who seller_a
\ir _as.psql
select is(property_current_plan(:'prop_a'), 'autonomie'::plan_code, 'an expired plan goes back to Autonomie');

-- ===========================================================================
-- admin publishes; public view carries the plan of the sale
-- ===========================================================================
\set who admin
\ir _as.psql
select lives_ok(format($$select listing_publish(%L)$$, :'listing_a'), 'admin: publishes listing_a');

\set who anon
\ir _as.psql
select is((select plan from public_listings where id = :'listing_a'), 'autonomie'::plan_code, 'public_listings shows the plan of the sale');

\set who admin
\ir _as.psql
select lives_ok(format($$update sale_progress set plan = 'serenite' where property_id = %L$$, :'prop_a'), 'admin: updates the plan of the sale');

\set who anon
\ir _as.psql
select is((select plan from public_listings where id = :'listing_a'), 'serenite'::plan_code, 'public_listings follows sale_progress');
select is((select count(*) from public_listings where id = :'listing_a')::int, 1, 'anon: still reads public_listings');

-- ===========================================================================
-- messaging: listing conversation
-- ===========================================================================
\set who buyer_c
\ir _as.psql
select conversation_start(:'listing_a') as conv \gset
select ok(:'conv' <> '', 'buyer_c: starts a conversation on a published listing');
select is(conversation_start(:'listing_a'), :'conv'::uuid, 'starting again returns the same conversation');
select throws_ok(format($$select conversation_start(%L)$$, :'listing_b'), '22023', null, 'buyer_c: no conversation on an unpublished listing');
select lives_ok(format($$insert into messages (conversation_id, sender_id, body) values (%L, tests.uid('buyer_c'), 'Bonjour, est-il disponible ?')$$, :'conv'),
                'buyer_c: sends a message');
select throws_ok(format($$insert into messages (conversation_id, sender_id, body) values (%L, tests.uid('seller_a'), 'Faux message')$$, :'conv'),
                 '42501', null, 'buyer_c: cannot send as the seller');
select throws_ok(format($$insert into messages (conversation_id, sender_id, body, kind) values (%L, tests.uid('buyer_c'), 'x', 'system')$$, :'conv'),
                 '42501', null, 'buyer_c: cannot send a system message');
select lives_ok(format($$select conversation_mark_read(%L)$$, :'conv'), 'buyer_c: marks the conversation read');

\set who seller_a
\ir _as.psql
select throws_ok(format($$select conversation_start(%L)$$, :'listing_a'), '22023', null, 'seller_a: cannot contact themselves');
select is((select count(*) from messages where conversation_id = :'conv')::int, 1, 'seller_a: reads the buyer message');
select lives_ok(format($$insert into messages (conversation_id, sender_id, body) values (%L, tests.uid('seller_a'), 'Oui, toujours disponible.')$$, :'conv'),
                'seller_a: replies');
select ok((select last_message_at is not null and seller_last_read_at = last_message_at from conversations where id = :'conv'),
          'the conversation tracks the last message and the sender read state');

\set who buyer_d
\ir _as.psql
select is((select count(*) from conversations where id = :'conv')::int, 0, 'buyer_d: cannot read the conversation');
select is((select count(*) from messages where conversation_id = :'conv')::int, 0, 'buyer_d: cannot read its messages');
select throws_ok(format($$insert into messages (conversation_id, sender_id, body) values (%L, tests.uid('buyer_d'), 'Intrusion')$$, :'conv'),
                 '42501', null, 'buyer_d: cannot post in it');
select throws_ok(format($$select conversation_mark_read(%L)$$, :'conv'), '42501', null, 'buyer_d: cannot mark it read');
select throws_ok(format($$insert into reports (conversation_id, reporter_id, reason) values (%L, tests.uid('buyer_d'), 'Spam')$$, :'conv'),
                 '42501', null, 'buyer_d: cannot report a conversation they are not in');

\set who seller_b
\ir _as.psql
select is((select count(*) from conversations where id = :'conv')::int, 0, 'seller_b: cannot read the conversation');

\set who buyer_c
\ir _as.psql
select lives_ok(format($$insert into reports (conversation_id, reporter_id, reason) values (%L, tests.uid('buyer_c'), 'Message déplacé')$$, :'conv'),
                'buyer_c: reports the conversation with a reason');
select is((select count(*) from reports)::int, 0, 'buyer_c: does not read reports');

\set who admin
\ir _as.psql
select is((select count(*) from messages where conversation_id = :'conv')::int, 2, 'admin: reads all messages');
select throws_ok(format($$insert into messages (conversation_id, sender_id, body) values (%L, tests.uid('admin'), 'Intervention')$$, :'conv'),
                 '42501', null, 'admin: does not write in a listing conversation');
select is((select count(*) from reports where conversation_id = :'conv')::int, 1, 'admin: reads reports');

-- ===========================================================================
-- messaging: advisor conversation (created by the payment webhook)
-- ===========================================================================
reset role;
insert into conversations (kind, property_id, seller_id) values ('advisor', :'prop_a', tests.uid('seller_a'))
returning id as advisor_conv \gset

\set who admin
\ir _as.psql
select lives_ok(format($$insert into messages (conversation_id, sender_id, body) values (%L, tests.uid('admin'), 'Bonjour, je suis votre conseiller.')$$, :'advisor_conv'),
                'admin: writes in the advisor conversation');

\set who seller_a
\ir _as.psql
select is((select count(*) from messages where conversation_id = :'advisor_conv')::int, 1, 'seller_a: reads the advisor message');

\set who buyer_c
\ir _as.psql
select is((select count(*) from conversations where id = :'advisor_conv')::int, 0, 'buyer_c: cannot read the advisor conversation');

-- ===========================================================================
-- buyer summary for sellers (Q5)
-- ===========================================================================
update buyer_profiles set project = 'residence_principale', budget_max_cents = 35000000,
       down_payment_cents = 7000000, loan_needed = true where profile_id = tests.uid('buyer_c');

\set who seller_a
\ir _as.psql
select is((select count(*) from buyer_summary_for_seller(:'prop_a'))::int, 1, 'seller_a: one buyer in contact');
select is((select financing_status from buyer_summary_for_seller(:'prop_a')), 'declared'::financing_status,
          'seller_a: sees the financing status');
select ok(has_buyer_relation(:'prop_a', tests.uid('buyer_c')), 'buyer_c has a relation with prop_a');
select ok(not has_buyer_relation(:'prop_a', tests.uid('buyer_d')), 'buyer_d has no relation with prop_a');
select is((select count(*) from buyer_profiles where profile_id = tests.uid('buyer_c'))::int, 0,
          'seller_a: never reads the buyer profile itself (amounts)');

\set who seller_b
\ir _as.psql
select is((select count(*) from buyer_summary_for_seller(:'prop_a'))::int, 0, 'seller_b: no summary for someone else''s property');

-- ===========================================================================
-- cases and internal notes
-- ===========================================================================
reset role;
insert into cases (property_id, profile_id, source, plan, subject)
values (:'prop_a', tests.uid('seller_a'), 'plan_purchase', 'accompagne', 'Achat de la formule Accompagné')
returning id as case_a \gset
insert into case_notes (case_id, author_id, body) values (:'case_a', tests.uid('admin'), 'Note interne : rappeler mardi.');

\set who seller_a
\ir _as.psql
select is((select count(*) from cases)::int, 1, 'seller_a: reads own case');
select is((select count(*) from case_notes)::int, 0, 'seller_a: never reads internal notes');
with u as (update cases set status = 'closed' where id = :'case_a' returning 1)
select is((select count(*) from u)::int, 0, 'seller_a: cannot change the case');

\set who buyer_c
\ir _as.psql
select is((select count(*) from cases)::int, 0, 'buyer_c: reads no case of others');

\set who admin
\ir _as.psql
select is((select count(*) from case_notes where case_id = :'case_a')::int, 1, 'admin: reads internal notes');

-- ===========================================================================
-- notifications
-- ===========================================================================
reset role;
insert into notifications (profile_id, type, title) values (tests.uid('seller_a'), 'listing.published', 'Votre annonce est en ligne');

\set who seller_a
\ir _as.psql
-- Scoped to this row: the messages above notify too, since L1-22.
select is((select count(*) from notifications where title = 'Votre annonce est en ligne')::int, 1,
          'seller_a: reads own notification');
select lives_ok($$update notifications set read_at = now()$$, 'seller_a: marks it read');
select throws_ok($$update notifications set title = 'Modifié'$$, '42501', null, 'seller_a: cannot rewrite a notification');

\set who buyer_c
\ir _as.psql
select is((select count(*) from notifications where profile_id = tests.uid('seller_a'))::int, 0,
          'buyer_c: cannot read seller_a notifications');

-- ===========================================================================
-- knowledge base and assistant logs
-- ===========================================================================
\set who anon
\ir _as.psql
select throws_ok('select count(*) from knowledge_base', '42501', null, 'anon: no access to the knowledge base');

\set who seller_a
\ir _as.psql
select is((select count(*) from knowledge_base)::int, 0, 'seller_a: does not read the knowledge base directly');
insert into ai_conversations (profile_id, context, property_id) values (tests.uid('seller_a'), 'seller', :'prop_a')
returning id as ai_conv \gset
select ok(:'ai_conv' <> '', 'seller_a: opens an assistant conversation');
select throws_ok($$insert into ai_conversations (profile_id, context) values (tests.uid('seller_a'), 'admin')$$,
                 '42501', null, 'seller_a: cannot open an admin assistant conversation');
select lives_ok(format($$insert into ai_messages (conversation_id, role, content) values (%L, 'user', '{"text":"Bonjour"}')$$, :'ai_conv'),
                'seller_a: logs a message');

\set who buyer_c
\ir _as.psql
select is((select count(*) from ai_messages)::int, 0, 'buyer_c: cannot read seller_a assistant logs');
select throws_ok(format($$insert into ai_messages (conversation_id, role, content) values (%L, 'user', '{}')$$, :'ai_conv'),
                 '42501', null, 'buyer_c: cannot write in seller_a assistant conversation');

\set who admin
\ir _as.psql
select lives_ok($$insert into knowledge_base (audience, category, question, answer) values ('seller', 'prix', 'Comment fixer le prix ?', 'Partez de l''analyse de valeur.')$$,
                'admin: writes the knowledge base');
select is((select count(*) from ai_messages where conversation_id = :'ai_conv')::int, 1, 'admin: reads assistant logs');

-- ===========================================================================
-- admin account functions
-- ===========================================================================
\set who seller_a
\ir _as.psql
select throws_ok(format($$select admin_set_roles(%L, '{admin}')$$, tests.uid('seller_a')), '42501', null, 'seller_a: cannot set roles');

\set who admin
\ir _as.psql
select is(admin_set_roles(tests.uid('seller_b'), '{seller,buyer}'), '{seller,buyer}'::user_role[], 'admin: sets seller_b roles');
select is((select count(*) from audit_log where action = 'user.set_roles' and entity_id = tests.uid('seller_b'))::int, 1,
          'audit_log records the role change');
select throws_ok(format($$select admin_set_roles(%L, '{seller}')$$, tests.uid('admin')), '22023', null,
                 'admin: cannot remove their own admin role');
select lives_ok(format($$select admin_suspend_user(%L, 'Messages abusifs')$$, tests.uid('buyer_d')), 'admin: suspends buyer_d');

\set who buyer_d
\ir _as.psql
select throws_ok(format($$select conversation_start(%L)$$, :'listing_a'), '42501', null, 'suspended buyer_d: cannot contact a seller');
select throws_ok($$insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
                   values (tests.uid('buyer_d'), 'maison', '1 rue X', '91000', 'Evry', 90, 4)$$,
                 '42501', null, 'suspended buyer_d: cannot create a property');

\set who admin
\ir _as.psql
select lives_ok(format($$select admin_unsuspend_user(%L)$$, tests.uid('buyer_d')), 'admin: lifts the suspension');

\set who buyer_d
\ir _as.psql
select lives_ok(format($$select conversation_start(%L)$$, :'listing_a'), 'buyer_d: can contact again after the suspension');

select * from finish();
rollback;
