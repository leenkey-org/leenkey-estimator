-- Compliant sale of the plans (L1-40, SPEC-V2 section 11, decision of
-- 2026-10-15): the withdrawal of 14 days and the end of a plan.
--
-- 1. subscription_withdraw: « Renoncer au contrat » on /vendeur/formule, by
--    the owner of the property, with their session, during the withdrawal
--    period: records withdrawal_requested_at, writes a note to the case of
--    the plan (reopened when closed) and tells each admin, in the app and by
--    email through the cron of L1-22 (one email to the team, the addresses
--    of the admins read with the service role only). The refund stays
--    with Leenkey, in Stripe (charge.refunded then ends the paid rights).
--    The last day of the period (14 days, one ending on a Saturday, a Sunday
--    or a public holiday going to the next working day) is computed by the
--    site (leenkey/billing/orders.ts, withdrawalEnds), which refuses past it;
--    the base only refuses a request more than 20 days after the order, so
--    that it never refuses one the law allows. A suspended account may still
--    withdraw: a right of the consumer. After a passage (Accompagné, then
--    Sérénité within a few days), the plan replaced may still be in its own
--    period: p_with_replaced (the site checks its last day) renounces both
--    contracts at once.
-- 2. subscriptions_daily, every morning: the sale of a property whose plan
--    ended follows the plan in force again (sale_progress.plan, as the
--    trigger of the subscriptions does when they change), and the owner of a
--    plan ending within 30 days is told once (plan.ending, in the app and by
--    email through the cron of L1-22). end_reminded_at keeps it to once.

alter table public.subscriptions add column end_reminded_at timestamptz;

create function public.subscription_withdraw(
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
         then ', démarrage immédiat demandé : un montant proportionnel aux prestations fournies peut rester dû'
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

create function public.subscriptions_daily() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_synced int;
  v_reminded int := 0;
  r record;
begin
  -- 1. Plans ended: the sale follows the plan in force (Autonomie).
  with changed as (
    update public.sale_progress sp
       set plan = public.property_current_plan(sp.property_id)
     where sp.plan is distinct from public.property_current_plan(sp.property_id)
    returning 1)
  select count(*)::int into v_synced from changed;

  -- 2. Plans ending within 30 days, once, not for a property sold.
  for r in
    select s.id, s.property_id, s.plan, s.ends_at, p.owner_id, pl.name,
           coalesce(l.reference, p.city) as reference
      from public.subscriptions s
      join public.properties p on p.id = s.property_id and p.deleted_at is null
      join public.plans pl on pl.code = s.plan
      left join public.listings l on l.property_id = s.property_id
     where s.replaced_by is null and s.refunded_at is null
       and s.withdrawal_requested_at is null and s.end_reminded_at is null
       and s.ends_at > now() and s.ends_at <= now() + interval '30 days'
       and l.status is distinct from 'sold'
       and public.property_current_plan(s.property_id) = s.plan
       for update of s skip locked
  loop
    perform public.notification_add(
      r.owner_id, 'plan.ending',
      jsonb_build_object('entity_id', r.id, 'plan', r.plan, 'plan_name', r.name,
                         'reference', r.reference, 'ends_at', r.ends_at),
      '/vendeur/formule?bien=' || r.property_id, 'plan-ending:' || r.id, now());
    update public.subscriptions set end_reminded_at = now() where id = r.id;
    v_reminded := v_reminded + 1;
  end loop;
  return jsonb_build_object('synced', v_synced, 'reminded', v_reminded);
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'subscriptions-daily';
    perform cron.schedule('subscriptions-daily', '23 7 * * *', $job$select public.subscriptions_daily()$job$);
  end if;
end;
$$;

revoke execute on function public.subscription_withdraw(uuid, boolean) from public, anon;
grant execute on function public.subscription_withdraw(uuid, boolean) to authenticated;
revoke execute on function public.subscriptions_daily() from public, anon, authenticated;
