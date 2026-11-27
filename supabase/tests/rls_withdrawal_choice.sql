-- Withdrawal rules of the paid plans (Cédric, 2026-11-26; DECISIONS.md
-- 2026-11-26). A plan renounced gives no right from the request on, whatever
-- the order of the refunds. After a passage (Accompagné, then Sérénité) the
-- seller renounces everything (back to Autonomie) or the passage alone (back
-- to Accompagné, its term and its history kept); past the period of
-- Accompagné, the passage alone. The case of the plan follows the plan in
-- force and closes by itself once the refund is complete; nothing else of
-- the sale is touched. Only the owner renounces, once; the team reads the
-- refunds.
begin;
\ir _helpers.psql
select plan(135);
\ir _plan.psql

insert into plans (code, name, tagline, price_cents, description, features, position) values
  ('autonomie', 'Autonomie', 'Tous les outils pour vendre vous-même.', 0, 'Gratuit', '{}', 1),
  ('accompagne', 'Accompagné', 'Vous vendez. Nous vous accompagnons.', 99000, 'Accompagné', '{Conseiller}', 2),
  ('serenite', 'Sérénité', 'Nous pilotons avec vous.', 150000, 'Sérénité', '{Conseiller,Visites}', 3)
on conflict (code) do nothing;
update plans set advisor_interventions = 4 where code = 'accompagne';
update plans set advisor_interventions = 6 where code = 'serenite';
insert into plan_entitlements (plan, feature) values
  ('accompagne', 'advisor'), ('serenite', 'advisor'), ('serenite', 'notary_coordination')
on conflict do nothing;

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
select tests.uid('seller_a'), 'appartement', lpad(n::text, 2, '0') || ' rue du Retrait', '91600',
       'Ville' || n, 50, 2
  from generate_series(1, 16) n;
select (array_agg(id order by address_line))[1] as p1, (array_agg(id order by address_line))[2] as p2,
       (array_agg(id order by address_line))[3] as p3, (array_agg(id order by address_line))[4] as p4,
       (array_agg(id order by address_line))[5] as p5, (array_agg(id order by address_line))[6] as p6,
       (array_agg(id order by address_line))[7] as p7, (array_agg(id order by address_line))[8] as p8,
       (array_agg(id order by address_line))[9] as p9, (array_agg(id order by address_line))[10] as p10,
       (array_agg(id order by address_line))[11] as p11, (array_agg(id order by address_line))[12] as p12,
       (array_agg(id order by address_line))[13] as p13, (array_agg(id order by address_line))[14] as p14,
       (array_agg(id order by address_line))[15] as p15, (array_agg(id order by address_line))[16] as p16
  from properties where owner_id = tests.uid('seller_a') and address_line like '% rue du Retrait' \gset
\set who seller_b
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
values (tests.uid('seller_b'), 'maison', '3 allée des Tilleuls', '91200', 'Athis-Mons', 110, 5)
returning id as pb \gset

-- The plans, paid through the webhook (service role), then set back in time.
reset role;
grant usage on schema tests to service_role;
grant execute on function tests.uid(text) to service_role;
create function tests.pay(p_key text, p_property uuid, p_owner uuid, p_plan public.plan_code,
                          p_upgrade boolean, p_amount int, p_days_ago int) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  perform public.stripe_checkout_complete('evt_w_' || p_key, 'cs_w_' || p_key, 'pi_w_' || p_key,
                                          p_property, p_owner, p_plan, p_upgrade, p_amount, 0,
                                          false, now(), '2026-11-09', '2026-11-26');
  update public.subscriptions
     set activated_at = now() - make_interval(days => p_days_ago),
         ends_at = now() - make_interval(days => p_days_ago) + interval '12 months'
   where stripe_checkout_session_id = 'cs_w_' || p_key
  returning id into v_id;
  return v_id;
end;
$$;
-- p1: Accompagné alone, 3 days ago. p6: Sérénité bought directly, 2 days ago.
select tests.pay('1', :'p1', tests.uid('seller_a'), 'accompagne', false, 99000, 3) as s1 \gset
select tests.pay('6', :'p6', tests.uid('seller_a'), 'serenite', false, 150000, 2) as s6 \gset
-- p2, p3, p4, p7: Accompagné 5 days ago, the passage to Sérénité yesterday.
select tests.pay('2a', :'p2', tests.uid('seller_a'), 'accompagne', false, 99000, 5) as s2a \gset
select tests.pay('2s', :'p2', tests.uid('seller_a'), 'serenite', true, 51000, 1) as s2s \gset
select tests.pay('3a', :'p3', tests.uid('seller_a'), 'accompagne', false, 99000, 5) as s3a \gset
select tests.pay('3s', :'p3', tests.uid('seller_a'), 'serenite', true, 51000, 1) as s3s \gset
select tests.pay('4a', :'p4', tests.uid('seller_a'), 'accompagne', false, 99000, 5) as s4a \gset
select tests.pay('4s', :'p4', tests.uid('seller_a'), 'serenite', true, 51000, 1) as s4s \gset
select tests.pay('7a', :'p7', tests.uid('seller_a'), 'accompagne', false, 99000, 5) as s7a \gset
select tests.pay('7s', :'p7', tests.uid('seller_a'), 'serenite', true, 51000, 1) as s7s \gset
-- p5: Accompagné 30 days ago (its period over), the passage 2 days ago.
select tests.pay('5a', :'p5', tests.uid('seller_a'), 'accompagne', false, 99000, 30) as s5a \gset
select tests.pay('5s', :'p5', tests.uid('seller_a'), 'serenite', true, 51000, 2) as s5s \gset
select tests.pay('b', :'pb', tests.uid('seller_b'), 'accompagne', false, 99000, 2) as sb \gset
-- p8, p9: a passage, for the calls of the code deployed before the migration.
-- p10: a single plan, for the same. p13: a single plan, then a payment held.
select tests.pay('8a', :'p8', tests.uid('seller_a'), 'accompagne', false, 99000, 5) as s8a \gset
select tests.pay('8s', :'p8', tests.uid('seller_a'), 'serenite', true, 51000, 1) as s8s \gset
select tests.pay('9a', :'p9', tests.uid('seller_a'), 'accompagne', false, 99000, 5) as s9a \gset
select tests.pay('9s', :'p9', tests.uid('seller_a'), 'serenite', true, 51000, 1) as s9s \gset
select tests.pay('10', :'p10', tests.uid('seller_a'), 'accompagne', false, 99000, 3) as s10 \gset
select tests.pay('13', :'p13', tests.uid('seller_a'), 'accompagne', false, 99000, 3) as s13 \gset
-- p11, p12: single plans at the edge of their period, whatever the day the
-- tests run: the latest order whose last day is over, the earliest still open.
select min(n) as days_over, min(n) - 1 as days_open
  from generate_series(14, 25) n where not withdrawal_open(now() - make_interval(days => n)) \gset
select tests.pay('11', :'p11', tests.uid('seller_a'), 'accompagne', false, 99000, :days_over) as s11 \gset
select tests.pay('12', :'p12', tests.uid('seller_a'), 'accompagne', false, 99000, :days_open) as s12 \gset
-- p14, p15, p16: withdrawals as the old function recorded them (before the
-- migration). p14: the passage renounced alone, not refunded: Accompagné is
-- still marked replaced. p15: the same, refunded (the refund cleared
-- replaced_by). p16: both renounced together, the passage refunded.
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'p14', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '5 days') returning id as s14a \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, plan_snapshot,
                           withdrawal_requested_at)
values (:'p14', tests.uid('seller_a'), 'serenite', 51000, now() - interval '1 day', '{"upgrade": true}',
        now() - interval '1 hour') returning id as s14s \gset
update subscriptions set replaced_by = :'s14s' where id = :'s14a';
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at)
values (:'p15', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '10 days') returning id as s15a \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, plan_snapshot,
                           withdrawal_requested_at, refunded_at)
values (:'p15', tests.uid('seller_a'), 'serenite', 51000, now() - interval '3 days', '{"upgrade": true}',
        now() - interval '2 days', now() - interval '1 day') returning id as s15s \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at,
                           withdrawal_requested_at)
values (:'p16', tests.uid('seller_a'), 'accompagne', 99000, now() - interval '10 days',
        now() - interval '2 days') returning id as s16a \gset
insert into subscriptions (property_id, owner_id, plan, amount_paid_cents, activated_at, plan_snapshot,
                           withdrawal_requested_at, refunded_at)
values (:'p16', tests.uid('seller_a'), 'serenite', 51000, now() - interval '3 days', '{"upgrade": true}',
        (select withdrawal_requested_at from subscriptions where id = :'s16a'), now() - interval '1 day')
returning id as s16s \gset
select ends_at as s4a_ends from subscriptions where id = :'s4a' \gset
select ends_at as s5a_ends from subscriptions where id = :'s5a' \gset
-- One intervention of the adviser done on p4 under Sérénité, one still asked.
insert into advisor_interventions (property_id, requested_by, reason, message, status, requested_at, done_at)
values (:'p4', tests.uid('seller_a'), 'listing', 'Relire mon annonce avant publication.', 'done',
        now() - interval '12 hours', now() - interval '6 hours'),
       (:'p4', tests.uid('seller_a'), 'visits', 'Préparer les premières visites du bien.', 'requested',
        now() - interval '2 hours', null);
-- What a withdrawal must never touch: a listing, a document, a conversation.
insert into listings (property_id, title, description, price_cents)
values (:'p1', 'Appartement 2 pièces', 'Proche de la gare.', 20000000);
select row(status, title)::text as listing_before from listings where property_id = :'p1' \gset
select count(*)::int as documents_before from documents \gset
select count(*)::int as conversations_before from conversations \gset
-- The tasks done, by their code: going back to the free plan carries each one
-- over to the task of the same code of that plan (a row more on a seeded base),
-- and loses none.
select coalesce(string_agg(distinct k.code, ',' order by k.code), '') as tasks_before
  from sale_task_status t join sale_step_tasks k on k.id = t.task_id
 where t.property_id = :'p1' \gset

select is((select subject from cases where property_id = :'p2' and source = 'plan_purchase'),
          'Formule Sérénité souscrite · Ville2',
          'passage: the subject of the case follows the plan (it was « Accompagné »)');
select is((select count(*)::int from cases where property_id = :'p2' and source = 'plan_purchase'), 1,
          'passage: one case for the plan and its passage');

-- Nobody but the owner ----------------------------------------------------------
\set who anon
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L)', :'s1'), '42501', null,
                 'anon: never withdraws');
select throws_ok(format('select subscription_withdraw(%L, %L)', :'s4s', 'upgrade'), '42501', null,
                 'anon: never withdraws a passage');
select throws_ok('select * from admin_refunds()', '42501', null, 'anon: never reads the refunds');
\set who seller_b
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L)', :'s1'), '42501', null,
                 'seller_b: never withdraws the plan of another seller');
select throws_ok(format('select subscription_withdraw(%L, %L)', :'s4s', 'upgrade'), '42501', null,
                 'seller_b: never withdraws the passage of another seller');
\set who buyer_c
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L)', :'s1'), '42501', null,
                 'buyer_c: never withdraws a plan');
\set who buyer_d
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L, %L)', :'s2s', 'full'), '42501', null,
                 'buyer_d: never withdraws a plan');
\set who admin
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L)', :'s1'), '42501', null,
                 'admin: never withdraws in the name of a seller');
\set who seller_a
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L)', :'sb'), '42501', null,
                 'seller_a: never withdraws the plan of seller_b');
select throws_ok('select * from admin_refunds()', '42501', null, 'seller_a: never reads the refunds');
select throws_ok(format('update subscriptions set withdrawal_requested_at = now(), withdrawal_reverts_to = %L where id = %L',
                        :'s4a', :'s4s'),
                 '42501', null, 'seller_a: never writes a withdrawal straight');

-- A. A single plan: the rights stop at the request ------------------------------
select is(has_entitlement(:'p1', 'advisor'), true, 'p1: Accompagné has the adviser before the request');
select throws_ok(format('select subscription_withdraw(%L, %L)', :'s1', 'upgrade'), '0A000', null,
                 'p1: no passage, nothing to go back to: « upgrade » is not offered');
select throws_ok(format('select subscription_withdraw(%L, %L)', :'s1', 'half'), '22023', null,
                 'p1: an unknown choice is refused');
select is((select row(r->>'status', r->>'scope', r->>'refund_due_cents', r->>'back_to_plan')::text
             from subscription_withdraw(:'s1') r),
          '(recorded,full,99000,autonomie)', 'p1: a single plan is renounced in full, as before');
select is(property_current_plan(:'p1')::text, 'autonomie', 'p1: on Autonomie from the request, before any refund');
select is(has_entitlement(:'p1', 'advisor'), false, 'p1: the paid rights stop at the request');
select is((select row(r->>'status', r->>'scope')::text from subscription_withdraw(:'s1', 'upgrade') r),
          '(already,full)', 'p1: asked again, the first request and its choice stand');
reset role;
select is((select plan::text from sale_progress where property_id = :'p1'), 'autonomie',
          'p1: the sale follows at the request');
select is((select row(status, plan, subject)::text from cases where property_id = :'p1' and source = 'plan_purchase'),
          format('(new,autonomie,"Rétractation · formule Accompagné · %s")',
                 (select reference from listings where property_id = :'p1')),
          'p1: the case says the withdrawal, and stays open until the refund');
select is((select count(*)::int from audit_log where action = 'plan.withdraw' and entity_id = :'s1'
              and actor_id = tests.uid('seller_a') and meta->>'scope' = 'full'), 1,
          'p1: the request is written to audit_log, once');
select is((select count(*)::int from notifications where profile_id = tests.uid('admin')
              and type = 'plan.withdrawn' and data->>'entity_id' = :'s1'
              and data->>'refund_due_cents' = '99000'), 1, 'p1: the team is told once, with the amount due');
set local role service_role;
select is((select row(r->>'status', r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r1a', 'pi_w_1', 40000, false) r),
          '(processed,59000,false)', 'p1: a partial refund says what is left');
reset role;
select is(property_current_plan(:'p1')::text, 'autonomie', 'p1: a partial refund never brings the plan back');
\set who seller_a
\ir _as.psql
select is((select row(due_cents, refunded_cents)::text from withdrawal_refunds(:'p1')), '(99000,40000)',
          'seller_a: reads what is refunded of their withdrawal (590 € left)');
\set who seller_b
\ir _as.psql
select is((select count(*)::int from withdrawal_refunds(:'p1')), 0,
          'seller_b: reads nothing of the withdrawal of another seller');
\set who anon
\ir _as.psql
select throws_ok(format('select * from withdrawal_refunds(%L)', :'p1'), '42501', null,
                 'anon: never reads the refunds of a withdrawal');
reset role;
set local role service_role;
select is((select row(r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r1b', 'pi_w_1', 99000, true) r),
          '(0,true)', 'p1: the full refund closes the case');
reset role;
select is((select row(status, plan)::text from cases where property_id = :'p1' and source = 'plan_purchase'),
          '(closed,autonomie)', 'p1: the case of the plan is closed once refunded in full');
select ok(exists (select 1 from case_notes n join cases c on c.id = n.case_id
                   where c.property_id = :'p1' and n.author_id is null
                     and n.body like 'Dossier d''accompagnement clôturé automatiquement%'),
          'p1: a note of Leenkey says why the case closed');
select is((select count(*)::int from audit_log a join cases c on c.id = a.entity_id
            where c.property_id = :'p1' and a.action = 'case.status' and a.meta->>'auto' = 'true'), 1,
          'p1: the automatic closing is written to audit_log');
select is((select row(status, title)::text from listings where property_id = :'p1'), :'listing_before',
          'p1: the listing is not touched');
select is((select row((select count(*) from documents), (select count(*) from conversations),
                      (select coalesce(string_agg(distinct k.code, ',' order by k.code), '')
                         from sale_task_status t join sale_step_tasks k on k.id = t.task_id
                        where t.property_id = :'p1'))::text),
          row(:'documents_before'::bigint, :'conversations_before'::bigint, :'tasks_before'::text)::text,
          'p1: the documents, the conversations and the steps of the sale are not touched');
-- Stripe sends the refund again: the same event, then another one for the same payment.
set local role service_role;
select is(stripe_charge_refunded('evt_w_r1b', 'pi_w_1', 99000, true)->>'status', 'duplicate',
          'p1: the same refund event again changes nothing');
select is((select row(r->>'status', r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r1c', 'pi_w_1', 99000, true) r),
          '(processed,0,false)', 'p1: another event for the refund already recorded closes nothing again');
reset role;
select is((select row((select count(*) from case_notes n join cases c on c.id = n.case_id
                        where c.property_id = :'p1' and n.body like 'Dossier d''accompagnement clôturé%'),
                      (select count(*) from audit_log a join cases c on c.id = a.entity_id
                        where c.property_id = :'p1' and a.action = 'case.status'),
                      property_current_plan(:'p1'))::text),
          '(1,1,autonomie)', 'p1: one closing, one audit row, still Autonomie');
-- A new purchase after the refunded withdrawal: a plan as any other.
select tests.pay('1bis', :'p1', tests.uid('seller_a'), 'accompagne', false, 99000, 0) as s1bis \gset
select is((select row(property_current_plan(:'p1'),
                      (select plan from sale_progress where property_id = :'p1'),
                      (select count(*) from cases where property_id = :'p1' and source = 'plan_purchase'),
                      (select count(*) from cases where property_id = :'p1' and source = 'plan_purchase'
                          and status = 'new' and subject like 'Formule Accompagné souscrite · %'),
                      advisor_period_start(:'p1') = (select activated_at from subscriptions where id = :'s1bis'))::text),
          '(accompagne,accompagne,2,1,t)',
          'p1: bought again after the refund: in force, a new case, a new period of accompaniment');
\set who seller_a
\ir _as.psql
select is(has_entitlement(:'p1', 'advisor'), true, 'p1: the rights of the plan bought again');
select is((select count(*)::int from withdrawal_refunds(:'p1')), 1,
          'p1: the refunded withdrawal stays one request, the new plan is not one');
reset role;

-- B. After a passage, both within their period: everything ------------------------
\set who seller_a
\ir _as.psql
select is((select row(r->>'status', r->>'scope', r->>'refund_due_cents', r->>'back_to_plan',
                      r->>'replaced_plan_name')::text
             from subscription_withdraw(:'s2s', 'full') r),
          '(recorded,full,150000,autonomie,Accompagné)', 'p2: both contracts renounced, 1 500 € due');
select is(has_entitlement(:'p2', 'advisor'), false, 'p2: no paid right from the request');
select is((select row(r->>'status', r->>'scope')::text from subscription_withdraw(:'s2a') r),
          '(already,full)', 'p2: the plan replaced is renounced already, with the passage');
set local role service_role;
-- The 510 € first: Accompagné, renounced too, never comes back.
select is((select row(r->>'left_cents', r->>'case_closed', r->>'check')::text
             from stripe_charge_refunded('evt_w_r2s', 'pi_w_2s', 51000, true) r),
          '(99000,false,false)', 'p2: 510 € refunded, 990 € left, the case stays open');
reset role;
select is(property_current_plan(:'p2')::text, 'autonomie',
          'p2: after the refund of the 510 €, the seller is not back on Accompagné');
select is((select plan::text from sale_progress where property_id = :'p2'), 'autonomie',
          'p2: nor the sale');
\set who seller_a
\ir _as.psql
select is(has_entitlement(:'p2', 'advisor'), false, 'p2: nor the rights');
\set who admin
\ir _as.psql
select is((select row(count(*), min(withdrawal_scope), min(back_to_plan::text), min(withdrawal_due_cents),
                      min(withdrawal_refunded_cents), min(withdrawal_payments))::text
             from admin_refunds() where property_id = :'p2'),
          '(2,full,autonomie,150000,51000,2)',
          'admin: the two payments of p2, 1 500 € due for the request, 510 € refunded');
set local role service_role;
select is((select row(r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r2a', 'pi_w_2a', 99000, true) r),
          '(0,true)', 'p2: 990 € refunded, nothing left, the case closes');
reset role;
select is((select row(c.status, c.plan, c.subject)::text from cases c
            where c.property_id = :'p2' and c.source = 'plan_purchase'),
          '(closed,autonomie,"Rétractation · formule Sérénité · Ville2")', 'p2: the case of the plan, closed');

-- The other order: the 990 € first, with a partial refund on the way.
\set who seller_a
\ir _as.psql
select is(subscription_withdraw(:'s3s', 'full')->>'refund_due_cents', '150000', 'p3: both contracts renounced');
set local role service_role;
select is((select row(r->>'left_cents', r->>'check', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r3a', 'pi_w_3a', 99000, true) r),
          '(51000,false,false)',
          'p3: 990 € refunded first: the passage, renounced too, is not « to check », 510 € left');
reset role;
select is(property_current_plan(:'p3')::text, 'autonomie', 'p3: Sérénité, renounced, is not in force');
select ok(not exists (select 1 from case_notes n join cases c on c.id = n.case_id
                       where c.property_id = :'p3' and n.body like '%À vérifier%'),
          'p3: no payment « à vérifier » for a withdrawal refunded in two parts');
set local role service_role;
select is((select row(r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r3s1', 'pi_w_3s', 20000, false) r),
          '(31000,false)', 'p3: 200 € of the 510 € refunded: 310 € left');
select is((select row(r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r3s2', 'pi_w_3s', 51000, true) r),
          '(0,true)', 'p3: the rest refunded: the case closes');
reset role;
select is(property_current_plan(:'p3')::text, 'autonomie', 'p3: Autonomie, whatever the order of the refunds');
select is((select bool_and(refunded_at is not null) from subscriptions where id in (:'s3a', :'s3s')), true,
          'p3: both plans are refunded');

-- B. After a passage, both within their period: back to Accompagné ----------------
\set who seller_a
\ir _as.psql
select is((select row(r->>'status', r->>'scope', r->>'refund_due_cents', r->>'back_to_plan',
                      r->>'back_to_plan_name', r ? 'replaced_plan_name')::text
             from subscription_withdraw(:'s4s', 'upgrade') r),
          '(recorded,upgrade,51000,accompagne,Accompagné,f)', 'p4: the passage alone renounced, 510 € due');
select is(property_current_plan(:'p4')::text, 'accompagne', 'p4: back on Accompagné at the request');
select is(has_entitlement(:'p4', 'advisor'), true, 'p4: the adviser of Accompagné stays');
select is(has_entitlement(:'p4', 'notary_coordination'), false,
          'p4: the rights of Sérénité alone stop at the request');
select is((select row(r->>'status', r->>'scope')::text from subscription_withdraw(:'s4s', 'full') r),
          '(already,upgrade)', 'p4: the choice recorded is not changed by a second request');
reset role;
select is((select row(replaced_by is null, withdrawal_requested_at is null, refunded_at is null,
                      ends_at = :'s4a_ends'::timestamptz)::text from subscriptions where id = :'s4a'),
          '(t,t,t,t)', 'p4: Accompagné is in force again with its own term');
select is((select withdrawal_reverts_to from subscriptions where id = :'s4s'), :'s4a'::uuid,
          'p4: the passage renounced says which plan it goes back to');
select is((select plan::text from sale_progress where property_id = :'p4'), 'accompagne',
          'p4: the sale goes back to Accompagné');
select is((select row(advisor_intervention_quota(:'p4'), advisor_interventions_used(:'p4'),
                      advisor_interventions_pending(:'p4'))::text),
          '(4,1,1)', 'p4: the interventions of Accompagné, the one done and the one asked kept');
select is((select row(status, plan, subject)::text from cases where property_id = :'p4' and source = 'plan_purchase'),
          '(new,accompagne,"Formule Accompagné souscrite · Ville4")',
          'p4: the case stays open, its subject back to Accompagné');
set local role service_role;
select is((select row(r->>'left_cents', r->>'case_closed', r->>'check')::text
             from stripe_charge_refunded('evt_w_r4s', 'pi_w_4s', 51000, true) r),
          '(0,false,false)', 'p4: 510 € refunded, the case of Accompagné stays open');
reset role;
select is((select row(property_current_plan(:'p4'), (select refunded_at is null from subscriptions where id = :'s4a'),
                      (select status from cases where property_id = :'p4' and source = 'plan_purchase'))::text),
          '(accompagne,t,new)', 'p4: Accompagné stays active, not refunded, its case open');
\set who admin
\ir _as.psql
select is((select row(plan, withdrawal_scope, back_to_plan, withdrawal_due_cents, withdrawal_refunded_cents,
                      withdrawal_payments, refunded_at is not null)::text
             from admin_refunds() where property_id = :'p4'),
          '(serenite,upgrade,accompagne,51000,51000,1,t)',
          'admin: p4, one payment of 510 €, back to Accompagné, refunded');
-- Accompagné, still within its own period, may be renounced after all.
\set who seller_a
\ir _as.psql
select is((select row(r->>'status', r->>'scope', r->>'refund_due_cents', r->>'back_to_plan')::text
             from subscription_withdraw(:'s4a') r),
          '(recorded,full,99000,autonomie)',
          'p4: Accompagné, within its own period, is renounced in turn (a right of the consumer)');
select is(has_entitlement(:'p4', 'advisor'), false, 'p4: no paid right once Accompagné is renounced too');
\set who admin
\ir _as.psql
select is((select back_to_plan::text from admin_refunds() where subscription_id = :'s4s'), 'autonomie',
          'admin: the passage of p4 no longer says « back to Accompagné »');

-- B. Past the period of Accompagné: the passage alone -----------------------------
\set who seller_a
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L, %L)', :'s5s', 'full'), '0A000', null,
                 'p5: Accompagné past its period: renouncing everything is not offered');
select throws_ok(format('select subscription_withdraw(%L)', :'s5s'), '0A000', null,
                 'p5: nor by default');
select throws_ok(format('select subscription_withdraw(%L)', :'s5a'), '55000', null,
                 'p5: nor Accompagné itself, replaced and past its period');
select is(property_current_plan(:'p5')::text, 'serenite', 'p5: a request refused changes nothing');
select is((select row(r->>'status', r->>'scope', r->>'refund_due_cents', r->>'back_to_plan')::text
             from subscription_withdraw(:'s5s', 'upgrade') r),
          '(recorded,upgrade,51000,accompagne)', 'p5: the passage is renounced, 510 € due');
select is(property_current_plan(:'p5')::text, 'accompagne',
          'p5: back on Accompagné at the request, before the refund');
select is(has_entitlement(:'p5', 'advisor'), true, 'p5: the adviser of Accompagné stays');
select is(has_entitlement(:'p5', 'notary_coordination'), false, 'p5: the rights of Sérénité stop');
select throws_ok(format('select subscription_withdraw(%L)', :'s5a'), '22023', null,
                 'p5: Accompagné, in force again, is past its own period');
reset role;
select is((select ends_at from subscriptions where id = :'s5a'), :'s5a_ends'::timestamptz,
          'p5: Accompagné keeps its initial term');
select is(advisor_period_start(:'p5'), (select activated_at from subscriptions where id = :'s5a'),
          'p5: the history of the accompaniment starts with Accompagné still');
-- The conversation with the adviser says the order of Accompagné, not of the passage renounced.
select advisor_conversation_ensure(:'p5') is not null as p5_conversation \gset
\set who seller_a
\ir _as.psql
select is((select row(plan, closed_at is null, advisor_ordered_at)::text
             from conversation_summaries() where property_id = :'p5' and kind = 'advisor'),
          (select row('accompagne'::plan_code, true, activated_at)::text from subscriptions where id = :'s5a'),
          'p5: the conversation with the adviser stays open and reads the order of Accompagné');
reset role;
set local role service_role;
select is((select row(r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r5s1', 'pi_w_5s', 10000, false) r),
          '(41000,false)', 'p5: a partial refund of the 510 €: 410 € left');
select is((select row(r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r5s2', 'pi_w_5s', 51000, true) r),
          '(0,false)', 'p5: the 510 € refunded: the case of Accompagné stays open');
reset role;
select is((select row(property_current_plan(:'p5'),
                      (select row(refunded_at is null, replaced_by is null)::text from subscriptions where id = :'s5a'),
                      (select row(status, subject)::text from cases where property_id = :'p5' and source = 'plan_purchase'))::text),
          '(accompagne,"(t,t)","(new,""Formule Accompagné souscrite · Ville5"")")',
          'p5: Accompagné active, not refunded; its case open under its name');

-- Sérénité bought directly: as a single plan ---------------------------------------
\set who seller_a
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L, %L)', :'s6', 'upgrade'), '0A000', null,
                 'p6: Sérénité bought directly has no plan to go back to');
select is((select row(r->>'scope', r->>'refund_due_cents', r->>'back_to_plan')::text
             from subscription_withdraw(:'s6', 'full') r),
          '(full,150000,autonomie)', 'p6: renounced in full, 1 500 € due');
select is(has_entitlement(:'p6', 'notary_coordination'), false, 'p6: the rights stop at the request');
set local role service_role;
select is((select row(r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r6', 'pi_w_6', 150000, true) r),
          '(0,true)', 'p6: one refund of 1 500 € closes the case');

-- C. A refund by the team without a request: as before ------------------------------
select is((select row(r->>'withdrawal', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r7s', 'pi_w_7s', 51000, true) r),
          '(false,false)', 'p7: the passage refunded by the team, without a request');
reset role;
select is((select row(property_current_plan(:'p7'),
                      (select plan from sale_progress where property_id = :'p7'),
                      (select row(status, subject)::text from cases where property_id = :'p7' and source = 'plan_purchase'))::text),
          '(accompagne,accompagne,"(new,""Formule Accompagné souscrite · Ville7"")")',
          'p7: Accompagné in force again, the case open under its name');
set local role service_role;
select is((select row(r->>'withdrawal', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r7a', 'pi_w_7a', 99000, true) r),
          '(false,false)', 'p7: Accompagné refunded too, without a request: the case is left to the team');
reset role;
select is(property_current_plan(:'p7')::text, 'autonomie', 'p7: Autonomie once everything is refunded');

-- An upgrade paid from a page opened before the withdrawal: held.
set local role service_role;
select is((select stripe_checkout_complete('evt_w_late', 'cs_w_late', 'pi_w_late', :'pb', tests.uid('seller_b'),
            'serenite', true, 51000, 0, false, now(), '2026-11-09', '2026-11-26') ->> 'status'),
          'processed', 'pb: a passage over a plan in force is activated');
reset role;
\set who seller_b
\ir _as.psql
select is(subscription_withdraw((select id from subscriptions where stripe_checkout_session_id = 'cs_w_late'),
                                'full')->>'refund_due_cents',
          '150000', 'seller_b: renounces both plans of their own property');
set local role service_role;
select is((select stripe_checkout_complete('evt_w_late2', 'cs_w_late2', 'pi_w_late2', :'pb', tests.uid('seller_b'),
            'serenite', true, 51000, 0, false, now(), '2026-11-09', '2026-11-26') ->> 'status'),
          'held', 'pb: a passage paid over a plan renounced is held, never activated');
reset role;
select is(property_current_plan(:'pb')::text, 'autonomie', 'pb: still Autonomie');

-- A second passage on p5, renounced alone again ---------------------------------------
-- (The first request was made earlier: in this file both would share now().)
update subscriptions set withdrawal_requested_at = now() - interval '1 hour' where id = :'s5s';
select tests.pay('5s2', :'p5', tests.uid('seller_a'), 'serenite', true, 51000, 1) as s5s2 \gset
select is((select row(property_current_plan(:'p5'),
                      (select replaced_by = :'s5s2' from subscriptions where id = :'s5a'),
                      (select subject from cases where property_id = :'p5' and source = 'plan_purchase'))::text),
          '(serenite,t,"Formule Sérénité souscrite · Ville5")', 'p5: a second passage after the first was refunded');
\set who seller_a
\ir _as.psql
select is((select row(r->>'status', r->>'scope', r->>'refund_due_cents', r->>'back_to_plan')::text
             from subscription_withdraw(:'s5s2', 'upgrade') r),
          '(recorded,upgrade,51000,accompagne)', 'p5: the second passage is renounced alone too');
reset role;
select is((select row(property_current_plan(:'p5'),
                      (select withdrawal_reverts_to = :'s5a' from subscriptions where id = :'s5s2'),
                      (select row(replaced_by is null, ends_at = :'s5a_ends'::timestamptz)::text
                         from subscriptions where id = :'s5a'))::text),
          '(accompagne,t,"(t,t)")', 'p5: back on Accompagné again, its term unchanged');
set local role service_role;
select is((select row(r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r5s3', 'pi_w_5s2', 51000, true) r),
          '(0,false)', 'p5: the second passage refunded, the case of Accompagné still open');
reset role;
\set who admin
\ir _as.psql
select is((select row(count(*), min(withdrawal_scope), min(back_to_plan::text), sum(withdrawal_due_cents))::text
             from admin_refunds() where property_id = :'p5'),
          '(2,upgrade,accompagne,102000)', 'admin: the two passages of p5, each its own request');

-- The last day of the period, in the base as on the site ---------------------------------
reset role;
select is(withdrawal_last_day('2026-11-02T10:00:00Z'), '2026-11-16'::date,
          'calendar: ordered on Monday 2 November, the 14 days end on Monday 16');
select is((select row(withdrawal_open('2026-11-02T10:00:00Z', '2026-11-16T22:59:00Z'),
                      withdrawal_open('2026-11-02T10:00:00Z', '2026-11-16T23:01:00Z'))::text),
          '(t,f)', 'calendar: open until 23:59 in Paris on the 14th day, closed at 00:01 on the 15th');
select is((select row(withdrawal_last_day('2026-11-07T10:00:00Z'),
                      withdrawal_open('2026-11-07T10:00:00Z', '2026-11-23T22:59:00Z'),
                      withdrawal_open('2026-11-07T10:00:00Z', '2026-11-23T23:01:00Z'))::text),
          '(2026-11-23,t,f)', 'calendar: a period ending on a Saturday goes to the Monday, until its end');
select is((select row(withdrawal_last_day('2026-10-28T09:00:00Z'), withdrawal_last_day('2026-03-23T09:00:00Z'),
                      withdrawal_last_day('2026-04-30T09:00:00Z'), withdrawal_last_day('2026-05-11T09:00:00Z'))::text),
          '(2026-11-12,2026-04-07,2026-05-15,2026-05-26)',
          'calendar: 11 November, Easter Monday, Ascension Thursday and Whit Monday go to the next working day');
select is(withdrawal_last_day('2026-11-02T23:30:00Z'), '2026-11-17'::date,
          'calendar: an order at 00:30 in Paris counts from that day of Paris');
\set who seller_a
\ir _as.psql
select throws_ok($$select withdrawal_last_day(now())$$, '42501', null,
                 'seller_a: the calendar is not a function of the clients');
select throws_ok(format('select subscription_withdraw(%L)', :'s11'), '22023', null,
                 'p11: a direct call the day after the last day is refused (no margin of 20 days)');
select is(subscription_withdraw(:'s12')->>'status', 'recorded',
          'p12: a direct call on the last day is recorded');

-- The code deployed before the migration: (subscription, with_replaced) -------------------
select is((select row(r->>'status', r->>'scope', r->>'refund_due_cents')::text
             from subscription_withdraw(:'s8s', true) r),
          '(recorded,full,150000)', 'old call, true after a passage: both contracts, as before');
select is((select row(r->>'status', r->>'scope', r->>'refund_due_cents', r->>'back_to_plan')::text
             from subscription_withdraw(p_subscription_id => :'s9s', p_with_replaced => false) r),
          '(recorded,upgrade,51000,accompagne)',
          'old call by names, false after a passage: the passage alone, Accompagné in force at once');
select is((select row(r->>'status', r->>'scope', r->>'refund_due_cents')::text
             from subscription_withdraw(:'s10', false) r),
          '(recorded,full,99000)', 'old call, false on a single plan: that plan');
select is((select row(r->>'status', r->>'scope')::text
             from subscription_withdraw(p_subscription_id => :'s9s', p_scope => 'full') r),
          '(already,upgrade)', 'new call by names resolves to the new function');
select is(subscription_withdraw(:'s9s')->>'status', 'already',
          'a call with the subscription alone resolves to the new function');
\set who seller_b
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L, false)', :'s13'), '42501', null,
                 'seller_b: the old call never withdraws the plan of another seller');
\set who anon
\ir _as.psql
select throws_ok(format('select subscription_withdraw(%L, true)', :'s13'), '42501', null,
                 'anon: the old call is closed too');

-- Two open cases: the refund goes to the case of the withdrawal ---------------------------
\set who seller_a
\ir _as.psql
select is(subscription_withdraw(:'s13')->>'status', 'recorded', 'p13: the plan is renounced');
reset role;
set local role service_role;
select is((select stripe_checkout_complete('evt_w_13h', 'cs_w_13h', 'pi_w_13h', :'p13', tests.uid('seller_a'),
            'accompagne', false, 50000, 0, false, now(), '2026-11-09', '2026-11-26') ->> 'status'),
          'held', 'p13: a payment below the price, after the withdrawal, is held in a case of its own');
select is((select row(r->>'left_cents', r->>'case_closed')::text
             from stripe_charge_refunded('evt_w_r13', 'pi_w_13', 99000, true) r),
          '(0,true)', 'p13: the refund of the withdrawal closes the case of the withdrawal');
reset role;
select is((select array_agg(row(c.status, c.subject like 'Rétractation · formule %',
                                (select count(*) from case_notes n
                                  where n.case_id = c.id and n.body like 'Remboursement de %'))::text
                            order by (c.subject like 'Rétractation · formule %') desc)
             from cases c where c.property_id = :'p13' and c.source = 'plan_purchase'),
          '{"(closed,t,1)","(new,f,0)"}'::text[],
          'p13: the note of the refund is in the case of the withdrawal; the payment held keeps its open case');

-- Withdrawals recorded by the old function, brought to the new shape -------------------------
select is(property_current_plan(:'p14')::text, 'autonomie',
          'old shape: before the migration plays, a passage renounced alone leaves the property on Autonomie');
select withdrawal_old_shape_adopt();
select is((select row(property_current_plan(:'p14'),
                      (select plan from sale_progress where property_id = :'p14'),
                      (select withdrawal_reverts_to = :'s14a' from subscriptions where id = :'s14s'),
                      (select replaced_by is null from subscriptions where id = :'s14a'))::text),
          '(accompagne,accompagne,t,t)',
          'old shape: the passage renounced alone goes back to Accompagné, in force again');
select is((select row((select withdrawal_reverts_to = :'s15a' from subscriptions where id = :'s15s'),
                      (select withdrawal_reverts_to is null from subscriptions where id = :'s16s'),
                      property_current_plan(:'p15'), property_current_plan(:'p16'))::text),
          '(t,t,accompagne,autonomie)',
          'old shape: a refunded passage finds the plan it went back to; never when both were renounced');
select withdrawal_old_shape_adopt();
select is((select count(*)::int from subscriptions where withdrawal_reverts_to is not null
              and id in (:'s14s', :'s15s', :'s16s')), 2, 'old shape: played twice, nothing more');
\set who admin
\ir _as.psql
select is((select array_agg(row(withdrawal_scope, back_to_plan)::text order by property_id = :'p14' desc)
             from admin_refunds() where subscription_id in (:'s14s', :'s15s')),
          '{"(upgrade,accompagne)","(upgrade,accompagne)"}'::text[],
          'admin: the old withdrawals of a passage say « back to Accompagné »');
\set who seller_a
\ir _as.psql
select throws_ok('select withdrawal_old_shape_adopt()', '42501', null,
                 'seller_a: never plays the migration of the old withdrawals');
reset role;

-- The team reads ----------------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select count(*)::int from admin_refunds() where owner_id = tests.uid('seller_a')), 22,
          'admin: every payment renounced or refunded of seller_a');
select is((select row(withdrawal_scope, back_to_plan, withdrawal_due_cents, withdrawal_refunded_cents)::text
             from admin_refunds() where subscription_id = :'s7s'),
          '(,,,)', 'admin: a refund without a request has no withdrawal');
select is((select row(withdrawal_due_cents, withdrawal_refunded_cents, withdrawal_payments)::text
             from admin_refunds() where property_id = :'pb' and plan = 'accompagne'),
          '(150000,0,2)', 'admin: the withdrawal of seller_b, nothing refunded yet');

select * from finish();
rollback;
