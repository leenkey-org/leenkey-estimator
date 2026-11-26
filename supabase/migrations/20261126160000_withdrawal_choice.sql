-- Withdrawal rules of the paid plans (Cédric, 2026-11-26, after his second
-- test; DECISIONS.md 2026-11-26, « Rétractation : arrêt immédiat, choix après
-- un passage »).
--
-- 1. A plan renounced gives no right from the request on, without waiting
--    for its refund: property_current_plan (hence has_entitlement, the
--    adviser, the sale template) leaves out a subscription whose withdrawal
--    is asked. Whatever the order of the refunds, a renounced plan never
--    comes back.
-- 2. subscriptions.withdrawal_reverts_to: after a passage (Accompagné, then
--    Sérénité), the seller may renounce the passage alone and go back to the
--    plan it replaced: that plan, in force again at once, with its own term
--    (ends_at) and its history. Null: a withdrawal of everything (Autonomie).
-- 3. subscription_withdraw(subscription, scope), in place of
--    (subscription, with_replaced): 'full' (everything paid for the plan in
--    force, back to Autonomie) or 'upgrade' (the passage alone, back to the
--    plan replaced). Refused: 'upgrade' without a plan replaced; 'full' when
--    the plan replaced is past its own period (only the passage is still
--    renounceable). The exact last day stays checked by the site (L1-40).
-- 4. stripe_charge_refunded: the refund of a renounced plan says what is
--    left to refund; the case of the plan follows the plan in force (plan and
--    subject) and, for a withdrawal, closes by itself once nothing is left
--    to refund and no paid plan is in force. Only the case: never the listing, the documents,
--    the conversations nor the steps of the sale.
-- 5. stripe_checkout_complete: a plan renounced is not « the plan in force
--    before »; the subject of the case follows a passage.
-- 6. admin_refunds(): per payment still, with the withdrawal it belongs to
--    (its scope, the plan the seller goes back to, what is due, refunded and
--    left for the whole request).
-- No policy changes; no enum value added.

-- 1. ---------------------------------------------------------------------------
alter table public.subscriptions
  add column withdrawal_reverts_to uuid references public.subscriptions(id),
  add constraint subscriptions_withdrawal_reverts_to_check
    check (withdrawal_reverts_to is null or withdrawal_requested_at is not null);
comment on column public.subscriptions.withdrawal_reverts_to is
  'Withdrawal of a passage alone: the subscription it replaced, in force again from the request. Null: everything renounced.';

-- Current paid plan of a property: latest subscription neither replaced,
-- refunded, renounced nor expired; otherwise Autonomie.
create or replace function public.property_current_plan(p uuid) returns public.plan_code
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.plan from public.subscriptions s
      where s.property_id = p and s.replaced_by is null and s.refunded_at is null
        and s.withdrawal_requested_at is null
        and s.ends_at > now()
      order by s.activated_at desc limit 1),
    'autonomie'::public.plan_code);
$$;

-- The sale follows a withdrawal too.
drop trigger subscriptions_sale_plan on public.subscriptions;
create trigger subscriptions_sale_plan
  after insert or update of plan, activated_at, ends_at, replaced_by, refunded_at,
                            withdrawal_requested_at
  on public.subscriptions for each row execute function public.sale_subscription_plan();

-- The interventions of the adviser count from the start of the plan in
-- force, read as property_current_plan reads it.
create or replace function public.advisor_period_start(p_property uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  with recursive chain as (
    select s.id, s.activated_at
      from public.subscriptions s
     where s.id = (select c.id from public.subscriptions c
                    where c.property_id = p_property and c.replaced_by is null
                      and c.refunded_at is null and c.withdrawal_requested_at is null
                      and c.ends_at > now()
                    order by c.activated_at desc limit 1)
    union
    select p.id, p.activated_at
      from public.subscriptions p
      join chain on p.replaced_by = chain.id
  )
  select min(activated_at) from chain;
$$;

create or replace function public.advisor_ordered_at(p_property uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select s.activated_at from public.subscriptions s
   where s.property_id = p_property and s.replaced_by is null
     and s.refunded_at is null and s.withdrawal_requested_at is null and s.ends_at > now()
     and s.early_start_requested_at is null
     and not exists (select 1 from public.subscriptions p2
                      where p2.replaced_by = s.id and p2.refunded_at is null)
   order by s.activated_at desc limit 1;
$$;

-- The subject of the case of a plan (« dossier d'accompagnement »), read by
-- the team and by the seller: the plan in force, or the withdrawal under way.
create function public.plan_case_subject(p_withdrawal boolean, p_plan_name text, p_place text)
returns text
language sql immutable set search_path = '' as $$
  select left(case when p_withdrawal then 'Rétractation · formule ' || coalesce(p_plan_name, '')
                   else 'Formule ' || coalesce(p_plan_name, '') || ' souscrite' end
              || ' · ' || coalesce(p_place, ''), 200);
$$;
revoke execute on function public.plan_case_subject(boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.plan_case_subject(boolean, text, text) to service_role;

-- Whether a subject was written by Leenkey for a plan in force or renounced
-- (never the subject of a payment « à vérifier », which stays).
create function public.plan_case_subject_follows(p_subject text) returns boolean
language sql immutable set search_path = '' as $$
  select p_subject like 'Formule % souscrite · %' or p_subject like 'Passage à % · %'
      or p_subject like 'Rétractation · formule % · %';
$$;
revoke execute on function public.plan_case_subject_follows(text) from public, anon, authenticated;
grant execute on function public.plan_case_subject_follows(text) to service_role;

-- 3. ---------------------------------------------------------------------------
drop function public.subscription_withdraw(uuid, boolean);

create function public.subscription_withdraw(
  p_subscription_id uuid,
  p_scope text default 'full'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_scope text := coalesce(p_scope, 'full');
  v_sub public.subscriptions%rowtype;
  v_prev public.subscriptions%rowtype;
  v_prev_name text;
  v_property uuid;
  v_owner uuid;
  v_place text;
  v_reference text;
  v_plan_name text;
  v_back public.plan_code;
  v_back_name text;
  v_due int;
  v_case uuid;
  v_admin uuid;
  v_now timestamptz := now();
  v_info jsonb;
begin
  if auth.uid() is null then
    raise exception 'subscription_withdraw: sign in first' using errcode = '42501';
  end if;
  if v_scope not in ('full', 'upgrade') then
    raise exception 'subscription_withdraw: scope' using errcode = '22023';
  end if;
  select s.property_id into v_property from public.subscriptions s where s.id = p_subscription_id;
  if v_property is not null then
    select p.owner_id, p.city into v_owner, v_place
      from public.properties p where p.id = v_property;
  end if;
  if v_property is null or v_owner is distinct from auth.uid() then
    raise exception 'subscription_withdraw: not a plan of this account' using errcode = '42501';
  end if;
  -- The property first, as the webhook does: a refund and a request never cross.
  perform 1 from public.properties p where p.id = v_property for update;
  select s.* into v_sub from public.subscriptions s where s.id = p_subscription_id for update;
  select pl.name into v_plan_name from public.plans pl where pl.code = v_sub.plan;
  select l.reference into v_reference from public.listings l where l.property_id = v_sub.property_id;
  v_info := jsonb_build_object(
    'entity_id', v_sub.id, 'property_id', v_sub.property_id, 'plan', v_sub.plan,
    'plan_name', v_plan_name, 'reference', coalesce(v_reference, v_place),
    'activated_at', v_sub.activated_at, 'amount_paid_cents', v_sub.amount_paid_cents,
    'early_start', v_sub.early_start_requested_at is not null);

  -- Asked twice (two tabs, a second click): the first request stands, with
  -- the choice it made, whatever is asked now.
  if v_sub.withdrawal_requested_at is not null then
    return v_info || jsonb_build_object(
      'status', 'already', 'requested_at', v_sub.withdrawal_requested_at,
      'scope', case when v_sub.withdrawal_reverts_to is not null then 'upgrade' else 'full' end);
  end if;
  if v_sub.refunded_at is not null or v_sub.replaced_by is not null
     or v_sub.amount_paid_cents <= 0 then
    raise exception 'subscription_withdraw: not a plan in force' using errcode = '55000';
  end if;
  if v_now > v_sub.activated_at + interval '20 days' then
    raise exception 'subscription_withdraw: the withdrawal period is over' using errcode = '22023';
  end if;

  -- The plan this one replaced (a passage), paid, neither refunded nor renounced.
  select s.* into v_prev from public.subscriptions s
   where s.replaced_by = v_sub.id and s.withdrawal_requested_at is null
     and s.refunded_at is null and s.amount_paid_cents > 0
   order by s.activated_at desc
   limit 1
     for update;
  if v_scope = 'upgrade' and v_prev.id is null then
    raise exception 'subscription_withdraw: no plan to go back to' using errcode = '0A000';
  end if;
  -- Past the period of the plan replaced, only the passage is renounced.
  if v_scope = 'full' and v_prev.id is not null
     and v_now > v_prev.activated_at + interval '20 days' then
    raise exception 'subscription_withdraw: the plan replaced is past its period'
      using errcode = '0A000';
  end if;
  if v_prev.id is not null then
    select pl.name into v_prev_name from public.plans pl where pl.code = v_prev.plan;
  end if;

  if v_scope = 'upgrade' then
    -- The plan replaced in force again first, then the passage renounced: the
    -- sale goes from one paid plan to the other, never through Autonomie.
    update public.subscriptions set replaced_by = null where id = v_prev.id;
    update public.subscriptions
       set withdrawal_requested_at = v_now, withdrawal_reverts_to = v_prev.id
     where id = v_sub.id;
    v_due := v_sub.amount_paid_cents;
  else
    update public.subscriptions set withdrawal_requested_at = v_now where id = v_sub.id;
    v_due := v_sub.amount_paid_cents;
    if v_prev.id is not null then
      update public.subscriptions set withdrawal_requested_at = v_now where id = v_prev.id;
      v_due := v_due + v_prev.amount_paid_cents;
      v_info := v_info || jsonb_build_object(
        'replaced_plan_name', v_prev_name,
        'replaced_amount_paid_cents', v_prev.amount_paid_cents,
        'replaced_activated_at', v_prev.activated_at);
    end if;
  end if;
  -- The plan in force from now on, as the rights read it.
  v_back := public.property_current_plan(v_sub.property_id);
  select pl.name into v_back_name from public.plans pl where pl.code = v_back;
  v_info := v_info || jsonb_build_object(
    'scope', v_scope, 'refund_due_cents', v_due,
    'back_to_plan', v_back, 'back_to_plan_name', v_back_name);

  -- The case of the plan: the open one, else the last one, reopened.
  select c.id into v_case from public.cases c
   where c.property_id = v_sub.property_id and c.source = 'plan_purchase'
   order by (c.status <> 'closed') desc, c.created_at desc
   limit 1;
  if v_case is null then
    insert into public.cases (property_id, profile_id, source, plan, subject)
    values (v_sub.property_id, v_owner, 'plan_purchase', v_back,
            public.plan_case_subject(v_scope = 'full',
                                     case when v_scope = 'full' then coalesce(v_plan_name, v_sub.plan::text)
                                          else coalesce(v_back_name, v_back::text) end,
                                     coalesce(v_reference, v_place)))
    returning id into v_case;
  else
    -- Its plan and its subject follow: the withdrawal under way, or the plan kept.
    update public.cases c
       set status = case when c.status = 'closed' then 'new'::public.case_status else c.status end,
           plan = v_back,
           subject = case
             when not public.plan_case_subject_follows(c.subject) then c.subject
             when v_scope = 'full' then
               public.plan_case_subject(true, coalesce(v_plan_name, v_sub.plan::text),
                                        coalesce(v_reference, v_place))
             else
               public.plan_case_subject(false, coalesce(v_back_name, v_back::text),
                                        coalesce(v_reference, v_place))
           end
     where c.id = v_case;
  end if;
  insert into public.case_notes (case_id, author_id, body)
  values (v_case, null, left(case when v_scope = 'upgrade' then format(
    'Rétractation demandée par le vendeur le %s pour le passage à %s (%s € payés le %s) : retour à la formule %s, en vigueur de nouveau dès cette demande, avec sa durée initiale (jusqu''au %s) et l''historique de l''accompagnement. Les prestations propres à %s sont arrêtées. À rembourser depuis Stripe sous 14 jours : %s €.',
    to_char(v_now at time zone 'Europe/Paris', 'DD/MM/YYYY à HH24:MI'),
    coalesce(v_plan_name, v_sub.plan::text), public.euros(v_sub.amount_paid_cents),
    to_char(v_sub.activated_at at time zone 'Europe/Paris', 'DD/MM/YYYY'),
    coalesce(v_prev_name, v_prev.plan::text),
    to_char(v_prev.ends_at at time zone 'Europe/Paris', 'DD/MM/YYYY'),
    coalesce(v_plan_name, v_sub.plan::text), public.euros(v_due))
  else format(
    'Rétractation demandée par le vendeur le %s (formule %s, %s € payés le %s%s).',
    to_char(v_now at time zone 'Europe/Paris', 'DD/MM/YYYY à HH24:MI'),
    coalesce(v_plan_name, v_sub.plan::text), public.euros(v_sub.amount_paid_cents),
    to_char(v_sub.activated_at at time zone 'Europe/Paris', 'DD/MM/YYYY'),
    case when v_sub.early_start_requested_at is not null
         then ', démarrage immédiat demandé : remboursement intégral tout de même'
         else '' end)
    || case when v_prev.id is not null
            then format(' Comprend aussi la formule %s remplacée (%s € payés le %s), encore dans son délai.',
                        coalesce(v_prev_name, v_prev.plan::text), public.euros(v_prev.amount_paid_cents),
                        to_char(v_prev.activated_at at time zone 'Europe/Paris', 'DD/MM/YYYY'))
            else '' end
    || format(' Les prestations payantes sont arrêtées dès cette demande : le bien est en %s. À rembourser depuis Stripe sous 14 jours : %s €. Ce dossier se clôture tout seul une fois le remboursement intégral enregistré ; l''annonce, les documents, les échanges et l''avancement du vendeur sont conservés.',
              coalesce(v_back_name, v_back::text), public.euros(v_due))
  end, 4000));

  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), 'plan.withdraw', 'subscription', v_sub.id,
          jsonb_build_object('scope', v_scope, 'refund_due_cents', v_due, 'back_to_plan', v_back,
                             'property_id', v_sub.property_id, 'case_id', v_case,
                             'replaced_subscription_id', v_prev.id));

  v_info := v_info || jsonb_build_object('status', 'recorded', 'requested_at', v_now,
                                         'case_id', v_case);
  for v_admin in
    select p.id from public.profiles p
     where 'admin' = any(p.roles) and p.deleted_at is null and p.id <> v_owner
  loop
    perform public.notification_add(
      v_admin, 'plan.withdrawn', v_info, '/admin/dossiers', 'plans:withdrawn', v_now);
  end loop;
  return v_info;
end;
$$;
revoke execute on function public.subscription_withdraw(uuid, text) from public, anon;
grant execute on function public.subscription_withdraw(uuid, text) to authenticated;

-- 4. ---------------------------------------------------------------------------
create or replace function public.stripe_charge_refunded(
  p_event_id text,
  p_payment_intent_id text,
  p_amount_refunded_cents int,
  p_fully_refunded boolean
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_subscription public.subscriptions;
  v_replacing public.subscriptions;
  v_case public.cases;
  v_reference text;
  v_place text;
  v_admin uuid;
  v_amount text := public.euros(p_amount_refunded_cents);
  v_plan_name text;
  v_replacing_name text;
  v_body text;
  v_withdrawn boolean;
  v_current public.plan_code;
  v_current_name text;
  v_current_paid boolean;
  v_left int := 0;
  v_closed boolean := false;
begin
  insert into public.stripe_events (id, type, payment_intent_id, refunded_cents, fully_refunded)
  values (p_event_id, 'charge.refunded', p_payment_intent_id, p_amount_refunded_cents, p_fully_refunded)
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;
  select * into v_subscription from public.subscriptions s
   where s.stripe_payment_intent_id = p_payment_intent_id
   limit 1;
  if v_subscription.id is null then
    -- Not a plan, or its payment not recorded yet: kept above, found when it comes.
    return jsonb_build_object('status', 'unknown');
  end if;
  perform 1 from public.properties p where p.id = v_subscription.property_id for update;
  -- Read again under the lock.
  select * into v_subscription from public.subscriptions s where s.id = v_subscription.id;
  v_withdrawn := v_subscription.withdrawal_requested_at is not null;

  select pl.name into v_plan_name from public.plans pl where pl.code = v_subscription.plan;
  if p_fully_refunded and v_subscription.refunded_at is null then
    -- A refunded upgrade: the plan it had replaced is in force again (unless
    -- renounced with it: property_current_plan leaves it out). Before the
    -- refund is written: the sale goes from one paid plan to the other.
    update public.subscriptions set replaced_by = null where replaced_by = v_subscription.id;
    update public.subscriptions set refunded_at = now() where id = v_subscription.id;
    -- A plan refunded after an upgrade replaced it: the upgrade stays, to
    -- settle; not when the upgrade is renounced too (its own refund follows).
    if v_subscription.replaced_by is not null then
      select * into v_replacing from public.subscriptions s
       where s.id = v_subscription.replaced_by and s.refunded_at is null
         and s.withdrawal_requested_at is null;
      if v_replacing.id is not null then
        select pl.name into v_replacing_name from public.plans pl where pl.code = v_replacing.plan;
      end if;
    end if;
  end if;

  -- The plan in force now, and what is left to refund of the withdrawal this
  -- payment belongs to (every payment of the same request).
  v_current := public.property_current_plan(v_subscription.property_id);
  select pl.name, pl.price_cents > 0 into v_current_name, v_current_paid
    from public.plans pl where pl.code = v_current;
  if v_withdrawn then
    select coalesce(sum(case when s.refunded_at is not null then 0 else greatest(
             s.amount_paid_cents - coalesce((select max(e.refunded_cents) from public.stripe_events e
                                              where e.type = 'charge.refunded'
                                                and e.payment_intent_id = s.stripe_payment_intent_id), 0),
             0) end), 0)::int
      into v_left
      from public.subscriptions s
     where s.property_id = v_subscription.property_id
       and s.withdrawal_requested_at = v_subscription.withdrawal_requested_at;
  end if;

  select l.reference into v_reference from public.listings l
   where l.property_id = v_subscription.property_id;
  select p.city into v_place from public.properties p where p.id = v_subscription.property_id;
  select c.* into v_case from public.cases c
   where c.property_id = v_subscription.property_id and c.source = 'plan_purchase'
   order by c.created_at desc
   limit 1;
  v_body := case
    when v_withdrawn and not p_fully_refunded then
      format('Remboursement partiel de %s € enregistré par Stripe pour la rétractation (formule %s) : reste %s € à rembourser.',
             v_amount, coalesce(v_plan_name, v_subscription.plan::text), public.euros(v_left))
    when v_withdrawn and v_left > 0 then
      format('Remboursement de %s € enregistré par Stripe pour la formule %s. Reste %s € à rembourser pour cette rétractation.',
             v_amount, coalesce(v_plan_name, v_subscription.plan::text), public.euros(v_left))
    when v_withdrawn and coalesce(v_current_paid, false) then
      format('Remboursement de %s € enregistré par Stripe : la rétractation est remboursée en entier. Le bien reste en formule %s.',
             v_amount, coalesce(v_current_name, v_current::text))
    when v_withdrawn then
      format('Remboursement de %s € enregistré par Stripe pour la formule %s : la rétractation est remboursée en entier.',
             v_amount, coalesce(v_plan_name, v_subscription.plan::text))
    when not p_fully_refunded then
      format('Remboursement partiel de %s € enregistré par Stripe : la formule reste active.', v_amount)
    when v_replacing.id is not null then
      format('Remboursement de %s € enregistré par Stripe pour la formule %s. À vérifier : le passage à %s qui l''a remplacée reste actif, à régulariser.',
             v_amount, coalesce(v_plan_name, v_subscription.plan::text), coalesce(v_replacing_name, v_replacing.plan::text))
    else
      format('Remboursement de %s € enregistré par Stripe : la formule %s n''est plus active.',
             v_amount, coalesce(v_plan_name, v_subscription.plan::text))
  end;
  if v_case.id is not null then
    if p_fully_refunded then
      -- The case follows the plan in force again (the one an upgrade had
      -- replaced, or Autonomie), its subject too while a paid plan stays.
      update public.cases c
         set plan = v_current,
             subject = case
               when coalesce(v_current_paid, false) and public.plan_case_subject_follows(c.subject)
                 then public.plan_case_subject(false, coalesce(v_current_name, v_current::text),
                                               coalesce(v_reference, v_place))
               else c.subject end
       where c.id = v_case.id;
    end if;
    insert into public.case_notes (case_id, author_id, body) values (v_case.id, null, v_body);
    -- A withdrawal with nothing left to refund and no paid plan in force: the
    -- case of the plan closes by itself. Only the case: the listing, the
    -- documents, the conversations and the steps of the sale are not touched.
    -- A case that holds a payment « à vérifier » waits for the team; so does
    -- the case of a refund made without a request, as before.
    if v_withdrawn and p_fully_refunded and not coalesce(v_current_paid, false)
       and v_case.status <> 'closed'
       and not exists (select 1 from public.subscriptions s
                        where s.property_id = v_subscription.property_id
                          and s.withdrawal_requested_at is not null
                          and s.refunded_at is null and s.amount_paid_cents > 0)
       and not exists (select 1 from public.case_notes n
                        where n.case_id = v_case.id and n.author_id is null
                          and (n.body like 'À vérifier%' or n.body like '%À vérifier :%')) then
      update public.cases set status = 'closed' where id = v_case.id;
      insert into public.case_notes (case_id, author_id, body)
      values (v_case.id, null,
              'Dossier d''accompagnement clôturé automatiquement : le remboursement intégral est enregistré et le bien est en '
              || coalesce(v_current_name, v_current::text)
              || '. Le parcours de vente continue : l''annonce, les documents, les échanges et l''avancement du vendeur sont conservés.');
      update public.notifications
         set read_at = now()
       where type = 'case.created' and read_at is null and data->>'case_id' = v_case.id::text;
      insert into public.audit_log (actor_id, action, entity, entity_id, meta)
      values (null, 'case.status', 'case', v_case.id,
              jsonb_build_object('from', v_case.status, 'to', 'closed', 'auto', true,
                                 'reason', 'refund', 'subscription_id', v_subscription.id));
      v_closed := true;
    end if;
  end if;
  for v_admin in
    select p.id from public.profiles p where 'admin' = any(p.roles) and p.deleted_at is null
  loop
    perform public.notification_add(
      v_admin, 'plan.refunded',
      jsonb_build_object('plan', v_subscription.plan, 'reference', v_reference,
                         'amount_cents', p_amount_refunded_cents, 'full', p_fully_refunded,
                         'check', v_replacing.id is not null,
                         'withdrawal', v_withdrawn, 'left_cents', v_left,
                         'case_closed', v_closed),
      '/admin/dossiers');
  end loop;

  return jsonb_build_object('status', 'processed', 'subscription_id', v_subscription.id,
                            'full', p_fully_refunded, 'check', v_replacing.id is not null,
                            'withdrawal', v_withdrawn, 'left_cents', v_left,
                            'case_closed', v_closed);
end;
$$;

-- 5. ---------------------------------------------------------------------------
-- As 20261103190000_stripe_checkout.sql, with two changes: the plan in force
-- before leaves out a plan renounced (an upgrade paid from a page opened
-- before the withdrawal is held, not activated on top of a renounced plan),
-- and the subject of the open case follows a passage.
create or replace function public.stripe_checkout_complete(
  p_event_id text,
  p_session_id text,
  p_payment_intent_id text,
  p_property_id uuid,
  p_owner_id uuid,
  p_plan public.plan_code,
  p_upgrade boolean,
  p_amount_paid_cents int,
  p_discount_cents int,
  p_early_start boolean,
  p_accepted_at timestamptz,
  p_cgu_version text,
  p_cgv_version text,
  p_promotion_code text default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_upgrade boolean := coalesce(p_upgrade, false);
  v_amount int := greatest(coalesce(p_amount_paid_cents, 0), 0);
  v_discount int := greatest(coalesce(p_discount_cents, 0), 0);
  v_payment text := nullif(p_payment_intent_id, '');
  v_owner uuid;
  v_reference text;
  v_place text;
  v_plan public.plans;
  v_previous public.subscriptions;
  v_previous_price int := 0;
  v_expected int;
  v_refunded boolean;
  v_hold boolean := false;
  v_check text[] := '{}';
  v_subscription uuid;
  v_case uuid;
  v_subject text;
  v_admin uuid;
begin
  insert into public.stripe_events (id, type, payment_intent_id)
  values (p_event_id, 'checkout.session.completed', v_payment)
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;
  -- One subscription per session, whatever the event that brings it.
  if exists (select 1 from public.subscriptions s where s.stripe_checkout_session_id = p_session_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select p.owner_id, p.city into v_owner, v_place
    from public.properties p
   where p.id = p_property_id
     for update;
  if v_owner is null or v_owner <> p_owner_id then
    raise exception 'stripe_checkout_complete: the property is not this owner''s' using errcode = '22023';
  end if;
  select l.reference into v_reference from public.listings l where l.property_id = p_property_id;
  select * into v_plan from public.plans pl where pl.code = p_plan;
  if v_plan.code is null or v_plan.price_cents <= 0 then
    raise exception 'stripe_checkout_complete: not a paid plan' using errcode = '22023';
  end if;

  select * into v_previous from public.subscriptions s
   where s.property_id = p_property_id and s.replaced_by is null and s.refunded_at is null
     and s.withdrawal_requested_at is null
     and s.ends_at > now()
   order by s.activated_at desc
   limit 1;
  if v_previous.id is not null then
    select pl.price_cents into v_previous_price from public.plans pl where pl.code = v_previous.plan;
  end if;

  -- The order checked again against the plan in force now.
  if v_upgrade and (v_previous.id is null or coalesce(v_previous_price, 0) <= 0
                    or v_previous_price >= v_plan.price_cents) then
    v_hold := true;
    v_check := v_check || 'passage payé sans la formule inférieure en vigueur'::text;
  elsif not v_upgrade and v_previous.id is not null then
    if coalesce(v_previous_price, 0) >= v_plan.price_cents then
      v_hold := true;
      v_check := v_check || 'une formule égale ou supérieure était déjà active'::text;
    else
      v_check := v_check || 'une formule payante était déjà active : la différence est à rembourser'::text;
    end if;
  end if;
  -- An upgrade is the difference with the plan in force; else the price of the plan.
  v_expected := case when v_upgrade and v_previous.id is not null and coalesce(v_previous_price, 0) > 0
                     then v_plan.price_cents - v_previous_price
                     else v_plan.price_cents end;
  if v_amount + v_discount <> v_expected then
    if v_amount + v_discount < v_expected then
      v_hold := true;
    end if;
    v_check := v_check || format('%s € reçus au lieu de %s €', public.euros(v_amount + v_discount),
                                 public.euros(v_expected));
  end if;
  if v_hold then
    v_check := v_check || 'paiement gardé, formule non activée'::text;
  end if;
  v_refunded := v_payment is not null and exists (
    select 1 from public.stripe_events e
     where e.type = 'charge.refunded' and e.payment_intent_id = v_payment and e.fully_refunded);
  if v_refunded then
    v_check := v_check || 'remboursé avant d''être enregistré'::text;
  end if;

  insert into public.subscriptions (
    property_id, owner_id, plan, amount_paid_cents, discount_cents,
    stripe_checkout_session_id, stripe_payment_intent_id, stripe_promotion_code,
    plan_snapshot, early_start_requested_at, refunded_at
  ) values (
    p_property_id, p_owner_id, p_plan, v_amount, v_discount,
    p_session_id, v_payment, nullif(btrim(coalesce(p_promotion_code, '')), ''),
    -- The plan sheet as it stood when it was paid (SPEC 4, L1-40).
    jsonb_build_object(
      'code', v_plan.code, 'name', v_plan.name, 'price_cents', v_plan.price_cents,
      'description', v_plan.description, 'features', to_jsonb(v_plan.features),
      'upgrade', v_upgrade, 'cgu_version', p_cgu_version, 'cgv_version', p_cgv_version),
    case when p_early_start then coalesce(p_accepted_at, now()) end,
    case when v_refunded then now() end
  ) returning id into v_subscription;
  if v_hold and not v_refunded then
    -- Recorded, never in force (property_current_plan reads ends_at > now()).
    update public.subscriptions set ends_at = activated_at where id = v_subscription;
  end if;
  if v_previous.id is not null and not v_refunded and not v_hold then
    update public.subscriptions set replaced_by = v_subscription where id = v_previous.id;
  end if;

  insert into public.legal_acceptances (profile_id, document, version, context, subscription_id, accepted_at)
  values (p_owner_id, 'cgu', p_cgu_version, 'checkout', v_subscription, coalesce(p_accepted_at, now())),
         (p_owner_id, 'cgv', p_cgv_version, 'checkout', v_subscription, coalesce(p_accepted_at, now()));

  -- The case of the team: an upgrade goes to the open case of the property.
  if v_upgrade then
    select c.id into v_case from public.cases c
     where c.property_id = p_property_id and c.source = 'plan_purchase' and c.status <> 'closed'
     order by c.created_at desc
     limit 1;
  end if;
  if v_case is not null then
    -- Its subject follows the passage (2026-11-26): never a held or a refunded one.
    update public.cases c
       set plan = public.property_current_plan(p_property_id),
           subject = case
             when not v_hold and not v_refunded and public.plan_case_subject_follows(c.subject)
               then public.plan_case_subject(false, v_plan.name, coalesce(v_reference, v_place))
             else c.subject end
     where c.id = v_case;
    insert into public.case_notes (case_id, author_id, body)
    values (v_case, null, format('Passage à %s payé (%s €).', v_plan.name, public.euros(v_amount)));
  else
    -- Its subject is read by the seller too (cases_select_own_or_admin): the flags go to a note.
    v_subject := case when v_hold or v_refunded then 'Paiement de la formule ' || v_plan.name || ' à vérifier'
                      when v_upgrade then 'Passage à ' || v_plan.name
                      else 'Formule ' || v_plan.name || ' souscrite' end
                 || ' · ' || coalesce(v_reference, v_place);
    insert into public.cases (property_id, profile_id, source, plan, subject)
    values (p_property_id, p_owner_id, 'plan_purchase', public.property_current_plan(p_property_id),
            left(v_subject, 200))
    returning id into v_case;
  end if;
  if cardinality(v_check) > 0 then
    insert into public.case_notes (case_id, author_id, body)
    values (v_case, null, left('À vérifier : ' || array_to_string(v_check, ' ; ') || '.', 4000));
  end if;

  if not v_refunded and not v_hold then
    perform public.notification_add(
      p_owner_id, 'plan.activated',
      jsonb_build_object('plan', p_plan, 'plan_name', v_plan.name,
                         'reference', coalesce(v_reference, v_place),
                         'early_start', coalesce(p_early_start, false)),
      '/vendeur/formule?bien=' || p_property_id);
  end if;
  for v_admin in
    select p.id from public.profiles p where 'admin' = any(p.roles) and p.deleted_at is null
  loop
    perform public.notification_add(
      v_admin, 'case.created',
      jsonb_build_object('plan', p_plan, 'plan_name', v_plan.name,
                         'reference', coalesce(v_reference, v_place),
                         'upgrade', v_upgrade, 'case_id', v_case,
                         'check', cardinality(v_check) > 0, 'held', v_hold),
      '/admin/dossiers');
  end loop;

  return jsonb_build_object(
    'status', case when v_refunded then 'refunded' when v_hold then 'held' else 'processed' end,
    'subscription_id', v_subscription, 'case_id', v_case,
    'plan_name', v_plan.name, 'reference', coalesce(v_reference, v_place),
    'replaced_plan', v_previous.plan, 'check', to_jsonb(v_check));
end;
$$;

-- 6. ---------------------------------------------------------------------------
-- As 20261125150000_credit_notes_refunds.sql, one row per payment still, with
-- the withdrawal it belongs to: its scope ('full', or 'upgrade' for a passage
-- renounced alone), the plan the seller goes back to, and what is due,
-- refunded and paid by how many payments for the whole request (the plans
-- renounced together share their withdrawal_requested_at). Same security.
drop function public.admin_refunds();
create function public.admin_refunds()
returns table (
  subscription_id uuid,
  property_id uuid,
  reference text,
  city text,
  owner_id uuid,
  first_name text,
  last_name text,
  plan public.plan_code,
  amount_paid_cents int,
  activated_at timestamptz,
  requested_at timestamptz,
  refunded_at timestamptz,
  refunded_cents int,
  last_refund_at timestamptz,
  payment_intent_id text,
  replacing_plan public.plan_code,
  credited_cents int,
  credit_notes jsonb,
  withdrawal_scope text,
  back_to_plan public.plan_code,
  withdrawal_due_cents int,
  withdrawal_refunded_cents int,
  withdrawal_payments int
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    with refunds as (
      select e.payment_intent_id as pi, max(e.refunded_cents)::int as cents,
             max(e.processed_at) as at
        from public.stripe_events e
       where e.type = 'charge.refunded' and e.payment_intent_id is not null
       group by e.payment_intent_id
    ),
    -- What Stripe refunded of each payment, never more than was paid; a plan
    -- marked refunded counts in full.
    paid as (
      select s.id, s.property_id as property, s.withdrawal_requested_at as requested,
             s.amount_paid_cents as due,
             case when s.refunded_at is not null then s.amount_paid_cents
                  else least(s.amount_paid_cents, coalesce(r.cents, 0)) end as back
        from public.subscriptions s
        left join refunds r on r.pi = s.stripe_payment_intent_id
       where s.withdrawal_requested_at is not null
    ),
    requests as (
      select p.property, p.requested, sum(p.due)::int as due, sum(p.back)::int as back,
             count(*)::int as payments
        from paid p
       group by p.property, p.requested
    )
    select s.id, s.property_id, l.reference, p.city, s.owner_id, pr.first_name, pr.last_name,
           s.plan, s.amount_paid_cents, s.activated_at, s.withdrawal_requested_at, s.refunded_at,
           coalesce(r.cents, 0), r.at, s.stripe_payment_intent_id, next.plan,
           coalesce((select sum(c.amount_cents)::int from public.credit_notes c
                      where c.subscription_id = s.id), 0),
           coalesce((select jsonb_agg(jsonb_build_object(
                              'number', c.number, 'amount_cents', c.amount_cents,
                              'pdf_url', c.pdf_url, 'issued_at', c.issued_at)
                              order by c.issued_at)
                       from public.credit_notes c where c.subscription_id = s.id), '[]'::jsonb),
           case when s.withdrawal_requested_at is null then null
                when s.withdrawal_reverts_to is not null then 'upgrade'
                else 'full' end,
           -- The plan kept by a passage renounced alone, unless renounced or
           -- refunded since; else the free plan.
           case when s.withdrawal_requested_at is null then null
                else coalesce((select b.plan from public.subscriptions b
                                where b.id = s.withdrawal_reverts_to
                                  and b.withdrawal_requested_at is null
                                  and b.refunded_at is null),
                              'autonomie'::public.plan_code) end,
           q.due, q.back, q.payments
      from public.subscriptions s
      left join refunds r on r.pi = s.stripe_payment_intent_id
      left join requests q on q.property = s.property_id and q.requested = s.withdrawal_requested_at
      left join public.properties p on p.id = s.property_id
      left join public.listings l on l.property_id = s.property_id
      left join public.profiles pr on pr.id = s.owner_id
      left join public.subscriptions next on next.id = s.replaced_by
     where s.withdrawal_requested_at is not null
        or s.refunded_at is not null
        or coalesce(r.cents, 0) > 0
     order by s.withdrawal_requested_at asc nulls last, s.refunded_at desc nulls last, s.id
     limit 500;
end;
$$;
revoke execute on function public.admin_refunds() from public, anon;
grant execute on function public.admin_refunds() to authenticated;

-- 7. Existing data ---------------------------------------------------------------
-- The sales of the plans renounced before this migration follow the plan in
-- force now (as the daily job does for a plan ended).
update public.sale_progress sp
   set plan = public.property_current_plan(sp.property_id)
 where sp.plan is distinct from public.property_current_plan(sp.property_id);

-- The open cases of the plans: the plan in force and its subject (a passage
-- paid before today kept the subject of the first plan); a withdrawal still
-- to refund says so.
update public.cases c
   set plan = public.property_current_plan(c.property_id),
       subject = case
         when exists (select 1 from public.subscriptions s
                       where s.property_id = c.property_id and s.withdrawal_requested_at is not null
                         and s.withdrawal_reverts_to is null and s.refunded_at is null
                         and s.amount_paid_cents > 0)
           then public.plan_case_subject(
                  true,
                  (select pl.name from public.subscriptions s
                     join public.plans pl on pl.code = s.plan
                    where s.property_id = c.property_id and s.withdrawal_requested_at is not null
                      and s.withdrawal_reverts_to is null and s.refunded_at is null
                      and s.amount_paid_cents > 0
                    order by s.activated_at desc limit 1),
                  coalesce((select l.reference from public.listings l where l.property_id = c.property_id),
                           (select p.city from public.properties p where p.id = c.property_id)))
         when (select pl.price_cents from public.plans pl
                where pl.code = public.property_current_plan(c.property_id)) > 0
           then public.plan_case_subject(
                  false,
                  (select pl.name from public.plans pl
                    where pl.code = public.property_current_plan(c.property_id)),
                  coalesce((select l.reference from public.listings l where l.property_id = c.property_id),
                           (select p.city from public.properties p where p.id = c.property_id)))
         else c.subject end
 where c.source = 'plan_purchase' and c.status <> 'closed' and c.property_id is not null
   and public.plan_case_subject_follows(c.subject);

-- The cases of the withdrawals already refunded in full, the property back
-- on the free plan: closed, as stripe_charge_refunded now does.
with done as (
  update public.cases c
     set status = 'closed'
   where c.source = 'plan_purchase' and c.status <> 'closed' and c.property_id is not null
     and (select pl.price_cents from public.plans pl
           where pl.code = public.property_current_plan(c.property_id)) = 0
     and exists (select 1 from public.subscriptions s
                  where s.property_id = c.property_id and s.withdrawal_requested_at is not null)
     and not exists (select 1 from public.subscriptions s
                      where s.property_id = c.property_id and s.withdrawal_requested_at is not null
                        and s.refunded_at is null and s.amount_paid_cents > 0)
     and not exists (select 1 from public.case_notes n
                      where n.case_id = c.id and n.author_id is null
                        and (n.body like 'À vérifier%' or n.body like '%À vérifier :%'))
  returning c.id
)
insert into public.case_notes (case_id, author_id, body)
select d.id, null,
       'Dossier d''accompagnement clôturé automatiquement : le remboursement intégral est enregistré et le bien est en '
       || (select pl.name from public.plans pl where pl.price_cents = 0 order by pl.position limit 1)
       || '. Le parcours de vente continue : l''annonce, les documents, les échanges et l''avancement du vendeur sont conservés.'
  from done d;
