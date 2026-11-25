-- Credit notes and refunds (Cédric, 2026-11-25; DECISIONS.md 2026-11-25,
-- « Avoirs et remboursements »), after a real test in preprod: the
-- withdrawal (L1-40), the refund made by hand in the Stripe dashboard and its
-- webhook (charge.refunded, stripe_charge_refunded) work; two things were
-- missing.
--
-- 1. credit_notes: the Stripe credit note (« avoir ») of a refund, attached
--    to the invoice of the order and linked to the refund already made
--    (never a second refund). Created by the webhook (leenkey/billing/
--    webhook.ts, core/billing/stripe.ts) or again by an admin from
--    /admin/remboursements when it failed; written only here, by
--    credit_notes_record (service role: the webhook, or the server action of
--    the admin after its own check). Read by the owner of the plan (on
--    /vendeur/formule) and by the team. Nobody writes from a client.
-- 2. admin_refunds(): the page /admin/remboursements, for the team only:
--    the plans renounced (withdrawal_requested_at) or refunded, the amount
--    refunded as Stripe last said it (stripe_events, which the team does not
--    read), the credit notes. The status and the deadline of 14 days (code
--    de la consommation L221-24) are computed in code (leenkey/admin/
--    refunds.ts).
--
-- The notification « plan.withdrawn » now leads to /admin/remboursements:
-- by its catalogue (leenkey/notifications/catalog.ts), which picks the link
-- from the type, so subscription_withdraw stays as it is.

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id),
  stripe_credit_note_id text not null unique check (char_length(stripe_credit_note_id) <= 255),
  number text not null check (char_length(number) <= 100),
  amount_cents int not null check (amount_cents >= 0),
  pdf_url text check (pdf_url is null or (char_length(pdf_url) <= 2000 and pdf_url like 'https://%')),
  -- When Stripe issued it.
  issued_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index credit_notes_subscription_idx on public.credit_notes (subscription_id, issued_at);
create trigger credit_notes_set_updated_at before update on public.credit_notes
  for each row execute function public.set_updated_at();

alter table public.credit_notes enable row level security;
create policy credit_notes_select_owner_or_admin on public.credit_notes
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.subscriptions s
                where s.id = credit_notes.subscription_id and s.owner_id = auth.uid()));
revoke all on public.credit_notes from anon, authenticated;
grant select on public.credit_notes to authenticated;

-- The credit notes of the payment `p_payment_intent_id` as Stripe lists them
-- (an array of { id, number, amount_cents, pdf_url, issued_at }), the ones
-- created now and the ones made by hand by the team on the invoice alike:
-- written once, brought up to date after. `p_actor`: the admin who asked it
-- again from the back office (audit_log), null for the webhook.
create function public.credit_notes_record(
  p_payment_intent_id text,
  p_notes jsonb,
  p_actor uuid default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_subscription uuid;
  v_note jsonb;
  v_count int := 0;
begin
  if p_payment_intent_id is null or btrim(p_payment_intent_id) = '' then
    raise exception 'credit_notes_record: a payment is required' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_notes, '[]'::jsonb)) <> 'array' then
    raise exception 'credit_notes_record: the notes are an array' using errcode = '22023';
  end if;
  select s.id into v_subscription from public.subscriptions s
   where s.stripe_payment_intent_id = p_payment_intent_id
   order by s.activated_at desc
   limit 1;
  if v_subscription is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  for v_note in select * from jsonb_array_elements(coalesce(p_notes, '[]'::jsonb)) loop
    insert into public.credit_notes
      (subscription_id, stripe_credit_note_id, number, amount_cents, pdf_url, issued_at)
    values (v_subscription, v_note->>'id', v_note->>'number', (v_note->>'amount_cents')::int,
            nullif(v_note->>'pdf_url', ''), (v_note->>'issued_at')::timestamptz)
    on conflict (stripe_credit_note_id) do update
      set number = excluded.number, amount_cents = excluded.amount_cents,
          pdf_url = excluded.pdf_url, issued_at = excluded.issued_at
      where (credit_notes.number, credit_notes.amount_cents, credit_notes.pdf_url, credit_notes.issued_at)
            is distinct from (excluded.number, excluded.amount_cents, excluded.pdf_url, excluded.issued_at);
    v_count := v_count + 1;
  end loop;
  if p_actor is not null then
    insert into public.audit_log (actor_id, action, entity, entity_id, meta)
    values (p_actor, 'credit_note.retry', 'subscription', v_subscription,
            jsonb_build_object('payment_intent_id', p_payment_intent_id, 'credit_notes', v_count));
  end if;
  return jsonb_build_object('status', 'recorded', 'subscription_id', v_subscription,
                            'count', v_count);
end;
$$;
revoke execute on function public.credit_notes_record(text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.credit_notes_record(text, jsonb, uuid) to service_role;

-- The refunds of the team (/admin/remboursements): the plans renounced, and
-- the plans refunded without a withdrawal (their credit note may be missing
-- all the same). Security definer: stripe_events is read by nobody else.
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
  credit_notes jsonb
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
                       from public.credit_notes c where c.subscription_id = s.id), '[]'::jsonb)
      from public.subscriptions s
      left join refunds r on r.pi = s.stripe_payment_intent_id
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
