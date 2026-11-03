-- L1-26: the payment of a plan by Stripe Checkout (SPEC-V2 section 11).
-- The browser never activates anything: Stripe calls /api/webhooks/stripe,
-- which checks the signature and calls one of the two functions below with
-- the service role (CLAUDE.md section 4: webhooks only). Each one does all
-- its writes in one transaction and is idempotent: the event is written to
-- stripe_events first, a second delivery of it changes nothing.
--
-- 1. subscriptions: the columns of the sale « conforme » (L1-40, decision of
--    2026-10-15): the plan sheet accepted, the immediate start asked, the
--    withdrawal (button of L1-40).
-- 2. case_notes.author_id may be null: a note written by Leenkey itself (a
--    refund recorded by Stripe), never by a user (the policy of the admin
--    still asks author_id = auth.uid()).
-- 3. stripe_checkout_complete: a plan paid. The subscription (the plan in
--    force before is replaced by it: an upgrade, or a second order), the
--    acceptance of the CGU and CGV with their versions, the case of the
--    team, the notifications of the seller and of the team. The plan of the
--    sale follows by the triggers of L1-23 (sale_subscription_plan).
-- 4. stripe_charge_refunded: a refund done by Cédric in Stripe. Total: the
--    subscription is refunded (its rights stop, the sale goes back to the
--    plan in force before: the one an upgrade had replaced, else Autonomie);
--    partial: a note only. A note on the case, a notification to the team.

alter table public.subscriptions
  add column plan_snapshot jsonb,
  add column early_start_requested_at timestamptz,
  add column withdrawal_requested_at timestamptz;

alter table public.case_notes alter column author_id drop not null;

-- « 1 500,00 » whatever the locale of the server (notes of the cases).
create function public.euros(p_cents int) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(to_char(coalesce(p_cents, 0) / 100.0, 'FM999,999,990.00'), ',', ' '), '.', ',');
$$;

create function public.stripe_checkout_complete(
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
  v_owner uuid;
  v_reference text;
  v_place text;
  v_plan public.plans;
  v_previous public.subscriptions;
  v_subscription uuid;
  v_case uuid;
  v_subject text;
  v_admin uuid;
begin
  insert into public.stripe_events (id, type) values (p_event_id, 'checkout.session.completed')
    on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;
  -- One subscription per session, whatever the event that brings it.
  if exists (select 1 from public.subscriptions s where s.stripe_checkout_session_id = p_session_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select p.owner_id, l.reference, p.city into v_owner, v_reference, v_place
    from public.properties p
    left join public.listings l on l.property_id = p.id
   where p.id = p_property_id;
  if v_owner is null or v_owner <> p_owner_id then
    raise exception 'stripe_checkout_complete: the property is not this owner''s' using errcode = '22023';
  end if;
  select * into v_plan from public.plans pl where pl.code = p_plan;
  if v_plan.code is null or v_plan.price_cents <= 0 then
    raise exception 'stripe_checkout_complete: not a paid plan' using errcode = '22023';
  end if;

  select * into v_previous from public.subscriptions s
   where s.property_id = p_property_id and s.replaced_by is null and s.refunded_at is null
     and s.ends_at > now()
   order by s.activated_at desc
   limit 1;

  insert into public.subscriptions (
    property_id, owner_id, plan, amount_paid_cents, discount_cents,
    stripe_checkout_session_id, stripe_payment_intent_id, stripe_promotion_code,
    plan_snapshot, early_start_requested_at
  ) values (
    p_property_id, p_owner_id, p_plan, greatest(coalesce(p_amount_paid_cents, 0), 0),
    greatest(coalesce(p_discount_cents, 0), 0),
    p_session_id, nullif(p_payment_intent_id, ''), nullif(btrim(coalesce(p_promotion_code, '')), ''),
    -- The plan sheet as it stood when it was paid (SPEC 4, L1-40).
    jsonb_build_object(
      'code', v_plan.code, 'name', v_plan.name, 'price_cents', v_plan.price_cents,
      'description', v_plan.description, 'features', to_jsonb(v_plan.features),
      'upgrade', coalesce(p_upgrade, false), 'cgu_version', p_cgu_version,
      'cgv_version', p_cgv_version),
    case when p_early_start then coalesce(p_accepted_at, now()) end
  ) returning id into v_subscription;
  if v_previous.id is not null then
    update public.subscriptions set replaced_by = v_subscription where id = v_previous.id;
  end if;

  insert into public.legal_acceptances (profile_id, document, version, context, subscription_id, accepted_at)
  values (p_owner_id, 'cgu', p_cgu_version, 'checkout', v_subscription, coalesce(p_accepted_at, now())),
         (p_owner_id, 'cgv', p_cgv_version, 'checkout', v_subscription, coalesce(p_accepted_at, now()));

  -- The case of the team: an upgrade goes to the open case of the property.
  if coalesce(p_upgrade, false) then
    select c.id into v_case from public.cases c
     where c.property_id = p_property_id and c.source = 'plan_purchase' and c.status <> 'closed'
     order by c.created_at desc
     limit 1;
  end if;
  if v_case is not null then
    update public.cases set plan = p_plan where id = v_case;
    insert into public.case_notes (case_id, author_id, body)
    values (v_case, null, format('Passage à %s payé (%s €).', v_plan.name,
                                 public.euros(p_amount_paid_cents)));
  else
    v_subject := case when coalesce(p_upgrade, false) then 'Passage à ' || v_plan.name
                      else 'Formule ' || v_plan.name || ' souscrite' end
                 || ' · ' || coalesce(v_reference, v_place)
                 || case when v_previous.id is not null and not coalesce(p_upgrade, false)
                         then ' (une formule payante était déjà active : à vérifier)' else '' end;
    insert into public.cases (property_id, profile_id, source, plan, subject)
    values (p_property_id, p_owner_id, 'plan_purchase', p_plan, left(v_subject, 200))
    returning id into v_case;
  end if;

  perform public.notification_add(
    p_owner_id, 'plan.activated',
    jsonb_build_object('plan', p_plan, 'plan_name', v_plan.name,
                       'reference', coalesce(v_reference, v_place),
                       'early_start', coalesce(p_early_start, false)),
    '/vendeur/formule?bien=' || p_property_id);
  for v_admin in
    select p.id from public.profiles p where 'admin' = any(p.roles) and p.deleted_at is null
  loop
    perform public.notification_add(
      v_admin, 'case.created',
      jsonb_build_object('plan', p_plan, 'plan_name', v_plan.name,
                         'reference', coalesce(v_reference, v_place),
                         'upgrade', coalesce(p_upgrade, false), 'case_id', v_case),
      '/admin/dossiers');
  end loop;

  return jsonb_build_object(
    'status', 'processed', 'subscription_id', v_subscription, 'case_id', v_case,
    'plan_name', v_plan.name, 'reference', coalesce(v_reference, v_place),
    'replaced_plan', v_previous.plan);
end;
$$;

create function public.stripe_charge_refunded(
  p_event_id text,
  p_payment_intent_id text,
  p_amount_refunded_cents int,
  p_fully_refunded boolean
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_subscription public.subscriptions;
  v_case uuid;
  v_reference text;
  v_admin uuid;
  v_amount text := public.euros(p_amount_refunded_cents);
  v_plan_name text;
begin
  insert into public.stripe_events (id, type) values (p_event_id, 'charge.refunded')
    on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;
  select * into v_subscription from public.subscriptions s
   where s.stripe_payment_intent_id = p_payment_intent_id
   limit 1;
  if v_subscription.id is null then
    -- Not a plan (or not this environment): recorded, nothing else.
    return jsonb_build_object('status', 'unknown');
  end if;

  if p_fully_refunded and v_subscription.refunded_at is null then
    update public.subscriptions set refunded_at = now() where id = v_subscription.id;
    -- A refunded upgrade: the plan it had replaced is in force again.
    update public.subscriptions set replaced_by = null where replaced_by = v_subscription.id;
  end if;

  select l.reference into v_reference from public.listings l
   where l.property_id = v_subscription.property_id;
  select pl.name into v_plan_name from public.plans pl where pl.code = v_subscription.plan;
  select c.id into v_case from public.cases c
   where c.property_id = v_subscription.property_id and c.source = 'plan_purchase'
   order by c.created_at desc
   limit 1;
  if v_case is not null then
    if p_fully_refunded then
      -- The case follows the plan in force again (the one an upgrade had replaced, or Autonomie).
      update public.cases set plan = public.property_current_plan(v_subscription.property_id)
       where id = v_case;
    end if;
    insert into public.case_notes (case_id, author_id, body)
    values (v_case, null,
            case when p_fully_refunded
                 then format('Remboursement de %s € enregistré par Stripe : la formule %s n''est plus active.',
                             v_amount, coalesce(v_plan_name, v_subscription.plan::text))
                 else format('Remboursement partiel de %s € enregistré par Stripe : la formule reste active.',
                             v_amount) end);
  end if;
  for v_admin in
    select p.id from public.profiles p where 'admin' = any(p.roles) and p.deleted_at is null
  loop
    perform public.notification_add(
      v_admin, 'plan.refunded',
      jsonb_build_object('plan', v_subscription.plan, 'reference', v_reference,
                         'amount_cents', p_amount_refunded_cents, 'full', p_fully_refunded),
      '/admin/dossiers');
  end loop;

  return jsonb_build_object('status', 'processed', 'subscription_id', v_subscription.id,
                            'full', p_fully_refunded);
end;
$$;

revoke execute on function public.euros(int) from public, anon;
revoke execute on function public.stripe_checkout_complete(
  text, text, text, uuid, uuid, public.plan_code, boolean, int, int, boolean, timestamptz, text, text, text
) from public, anon, authenticated;
revoke execute on function public.stripe_charge_refunded(text, text, int, boolean)
  from public, anon, authenticated;
grant execute on function public.stripe_checkout_complete(
  text, text, text, uuid, uuid, public.plan_code, boolean, int, int, boolean, timestamptz, text, text, text
) to service_role;
grant execute on function public.stripe_charge_refunded(text, text, int, boolean) to service_role;
