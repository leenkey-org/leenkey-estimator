-- A withdrawal within the 14 days is refunded in full, even after an
-- immediate start (Cédric, 2026-11-19; DECISIONS.md 2026-11-20): the note
-- written in the case of the property for the team no longer speaks of a
-- proportional amount. Nothing else changes in subscription_withdraw.
create or replace function public.subscription_withdraw(
  p_subscription_id uuid,
  p_with_replaced boolean default false
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_sub public.subscriptions%rowtype;
  v_prev public.subscriptions%rowtype;
  v_prev_name text;
  v_owner uuid;
  v_place text;
  v_reference text;
  v_plan_name text;
  v_case uuid;
  v_admin uuid;
  v_now timestamptz := now();
  v_info jsonb;
begin
  if auth.uid() is null then
    raise exception 'subscription_withdraw: sign in first' using errcode = '42501';
  end if;
  select s.* into v_sub from public.subscriptions s where s.id = p_subscription_id for update;
  if v_sub.id is not null then
    select p.owner_id, p.city into v_owner, v_place
      from public.properties p where p.id = v_sub.property_id;
  end if;
  if v_sub.id is null or v_owner is distinct from auth.uid() then
    raise exception 'subscription_withdraw: not a plan of this account' using errcode = '42501';
  end if;
  select pl.name into v_plan_name from public.plans pl where pl.code = v_sub.plan;
  select l.reference into v_reference from public.listings l where l.property_id = v_sub.property_id;
  v_info := jsonb_build_object(
    'entity_id', v_sub.id, 'property_id', v_sub.property_id, 'plan', v_sub.plan,
    'plan_name', v_plan_name, 'reference', coalesce(v_reference, v_place),
    'activated_at', v_sub.activated_at, 'amount_paid_cents', v_sub.amount_paid_cents,
    'early_start', v_sub.early_start_requested_at is not null);

  -- Asked twice (two tabs, a second click): the first request stands.
  if v_sub.withdrawal_requested_at is not null then
    return v_info || jsonb_build_object('status', 'already',
                                        'requested_at', v_sub.withdrawal_requested_at);
  end if;
  if v_sub.refunded_at is not null or v_sub.replaced_by is not null
     or v_sub.amount_paid_cents <= 0 then
    raise exception 'subscription_withdraw: not a plan in force' using errcode = '55000';
  end if;
  if v_now > v_sub.activated_at + interval '20 days' then
    raise exception 'subscription_withdraw: the withdrawal period is over' using errcode = '22023';
  end if;

  update public.subscriptions set withdrawal_requested_at = v_now where id = v_sub.id;
  -- The plan this one replaced, still in its own period: renounced with it.
  if coalesce(p_with_replaced, false) then
    select s.* into v_prev from public.subscriptions s
     where s.replaced_by = v_sub.id and s.withdrawal_requested_at is null
       and s.refunded_at is null and s.amount_paid_cents > 0
       and v_now <= s.activated_at + interval '20 days'
       for update;
    if v_prev.id is not null then
      update public.subscriptions set withdrawal_requested_at = v_now where id = v_prev.id;
      select pl.name into v_prev_name from public.plans pl where pl.code = v_prev.plan;
      v_info := v_info || jsonb_build_object(
        'replaced_plan_name', v_prev_name,
        'replaced_amount_paid_cents', v_prev.amount_paid_cents,
        'replaced_activated_at', v_prev.activated_at);
    end if;
  end if;

  -- The case of the plan: the open one, else the last one, reopened.
  select c.id into v_case from public.cases c
   where c.property_id = v_sub.property_id and c.source = 'plan_purchase'
   order by (c.status <> 'closed') desc, c.created_at desc
   limit 1;
  if v_case is null then
    insert into public.cases (property_id, profile_id, source, plan, subject)
    values (v_sub.property_id, v_owner, 'plan_purchase', v_sub.plan,
            left('Rétractation · formule ' || coalesce(v_plan_name, v_sub.plan::text)
                 || ' · ' || coalesce(v_reference, v_place, ''), 200))
    returning id into v_case;
  else
    update public.cases set status = 'new' where id = v_case and status = 'closed';
  end if;
  insert into public.case_notes (case_id, author_id, body)
  values (v_case, null, format(
    'Rétractation demandée par le vendeur le %s (formule %s, %s € payés le %s%s). À rembourser depuis Stripe sous 14 jours.',
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
            else '' end);

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
