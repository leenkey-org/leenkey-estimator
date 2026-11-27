-- Documents of the paid plans (Cédric, 2026-11-26; DECISIONS.md 2026-11-26,
-- « Factures, avoirs et emails des formules »).
--
-- 1. The seller gets an email from Leenkey when a refund is recorded, with
--    its credit note (leenkey/billing/refund-emails.ts), once per credit
--    note: the webhook can be delivered again, the team can ask again from
--    /admin/remboursements, and a plan refunded in several payments has one
--    credit note, hence one email, per refund. Two columns on credit_notes:
--    refund_email_claimed_at (a sender took it, for 10 minutes: a sender
--    that died leaves it to the next one) and refund_emailed_at (handed to
--    the mail service: final). Written only by the functions below, open to
--    the service role (the webhook, or the admin action after its own
--    check), like credit_notes_record. Read with the rest of the row (owner
--    of the plan, team): nothing private, the date of an email they
--    received. The policies and the grants of credit_notes are unchanged.
-- 2. The team opening the invoice or the credit note of a seller, and the
--    team sending a refund email again, are written in audit_log.
-- 3. rate_limit_hit learns the bucket « document »: the downloads of
--    /vendeur/formule/document, per account (each one asks Stripe).

alter table public.credit_notes
  add column refund_emailed_at timestamptz,
  add column refund_email_claimed_at timestamptz;

-- The credit notes recorded before this migration were emailed by Stripe
-- (email_type: credit_note): no second email for them.
update public.credit_notes set refund_emailed_at = created_at where refund_emailed_at is null;

-- Takes the email of a credit note in charge: true for the one caller who
-- gets to send it, false when it was sent, or taken less than 10 minutes
-- ago (a second delivery at the same time). A claim older than that is
-- stale (its sender died before saying « sent » or « released »): taken back.
create function public.credit_note_email_claim(p_credit_note_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  update public.credit_notes set refund_email_claimed_at = now()
   where id = p_credit_note_id
     and refund_emailed_at is null
     and (refund_email_claimed_at is null
          or refund_email_claimed_at < now() - interval '10 minutes')
  returning id into v_id;
  return v_id is not null;
end;
$$;
revoke execute on function public.credit_note_email_claim(uuid)
  from public, anon, authenticated;
grant execute on function public.credit_note_email_claim(uuid) to service_role;

-- The email was handed to the mail service: final, never sent again.
create function public.credit_note_email_sent(p_credit_note_id uuid) returns void
language sql security invoker set search_path = '' as $$
  update public.credit_notes set refund_emailed_at = now()
   where id = p_credit_note_id and refund_emailed_at is null;
$$;
revoke execute on function public.credit_note_email_sent(uuid)
  from public, anon, authenticated;
grant execute on function public.credit_note_email_sent(uuid) to service_role;

-- Gives it back when the email could not be handed over: the next pass
-- (another delivery, the back office) sends it. Never undoes a « sent ».
create function public.credit_note_email_release(p_credit_note_id uuid) returns void
language sql security invoker set search_path = '' as $$
  update public.credit_notes set refund_email_claimed_at = null
   where id = p_credit_note_id and refund_emailed_at is null;
$$;
revoke execute on function public.credit_note_email_release(uuid)
  from public, anon, authenticated;
grant execute on function public.credit_note_email_release(uuid) to service_role;

-- Credit notes Leenkey did not create (made by hand in the Stripe dashboard,
-- which emails them itself): marked as emailed, nothing is sent for them.
-- Returns how many were marked.
create function public.credit_notes_emailed_elsewhere(p_stripe_credit_note_ids text[]) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_count int;
begin
  update public.credit_notes set refund_emailed_at = now()
   where stripe_credit_note_id = any(coalesce(p_stripe_credit_note_ids, '{}'))
     and refund_emailed_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.credit_notes_emailed_elsewhere(text[])
  from public, anon, authenticated;
grant execute on function public.credit_notes_emailed_elsewhere(text[]) to service_role;

-- « Renvoyer l'email » of the back office (leenkey/admin/actions.ts,
-- resendRefundEmail): who asked, for which plan, what left. Called with the
-- admin's session, after the emails.
create function public.refund_email_resent(p_subscription_id uuid, p_sent int, p_failed int)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if not exists (select 1 from public.subscriptions s where s.id = p_subscription_id) then
    raise exception 'subscription not found' using errcode = '42501';
  end if;
  perform public.audit('refund_email.resend', 'subscription', p_subscription_id,
                       jsonb_build_object('sent', coalesce(p_sent, 0),
                                          'failed', coalesce(p_failed, 0)));
end;
$$;
revoke execute on function public.refund_email_resent(uuid, int, int) from public, anon;
grant execute on function public.refund_email_resent(uuid, int, int) to authenticated;

-- The team opens the invoice (p_kind « facture », p_id the subscription) or
-- a credit note (« avoir », its row) of a seller: written in the audit log
-- before the browser is sent to Stripe (app/(forms)/vendeur/formule/
-- document/route.ts). An admin opening the document of their own plan
-- writes nothing; an owner who is not admin does not call it.
create function public.billing_document_opened(p_kind text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_kind = 'facture' then
    select s.owner_id into v_owner from public.subscriptions s where s.id = p_id;
  elsif p_kind = 'avoir' then
    select s.owner_id into v_owner
      from public.credit_notes c join public.subscriptions s on s.id = c.subscription_id
     where c.id = p_id;
  else
    raise exception 'billing_document_opened: unknown kind' using errcode = '22023';
  end if;
  if not found then
    raise exception 'document not found' using errcode = '42501';
  end if;
  if v_owner is distinct from auth.uid() then
    perform public.audit('billing_document.opened',
                         case p_kind when 'facture' then 'subscription' else 'credit_note' end,
                         p_id, jsonb_build_object('owner_id', v_owner, 'kind', p_kind));
  end if;
end;
$$;
revoke execute on function public.billing_document_opened(text, uuid) from public, anon;
grant execute on function public.billing_document_opened(text, uuid) to authenticated;

-- rate_limit_hit (20261108160000_rate_limits.sql), the same with one more
-- bucket: « document », 30 downloads per quarter of an hour, keyed by the
-- account (lib/rate-limit.ts, allowAccount). Grants unchanged.
alter table public.rate_limits drop constraint rate_limits_bucket_check;
alter table public.rate_limits add constraint rate_limits_bucket_check
  check (bucket in ('signup', 'signin', 'reset', 'contact', 'report', 'estimate', 'document'));

create or replace function public.rate_limit_hit(
  p_server text,
  p_bucket text,
  p_key text,
  p_count boolean default true
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_limit int;
  v_seconds int;
  v_start timestamptz;
  v_hits int;
begin
  perform public.rate_limit_server(p_server);
  case p_bucket
    when 'signup' then v_limit := 5; v_seconds := 3600;
    when 'signin' then v_limit := 20; v_seconds := 900;
    when 'reset' then v_limit := 5; v_seconds := 3600;
    when 'contact' then v_limit := 5; v_seconds := 3600;
    when 'report' then v_limit := 5; v_seconds := 3600;
    when 'estimate' then v_limit := 20; v_seconds := 3600;
    when 'document' then v_limit := 30; v_seconds := 900;
    else raise exception 'rate_limit_hit: unknown bucket' using errcode = '22023';
  end case;
  if p_key is null or p_key !~ '^[0-9a-f]{64}$' then
    raise exception 'rate_limit_hit: invalid key' using errcode = '22023';
  end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);
  if not coalesce(p_count, true) then
    select coalesce(max(r.hits), 0) into v_hits
      from public.rate_limits r
     where r.bucket = p_bucket and r.key = p_key and r.window_start = v_start;
    return v_hits < v_limit;
  end if;
  insert into public.rate_limits (bucket, key, window_start, hits)
  values (p_bucket, p_key, v_start, 1)
  on conflict (bucket, key, window_start)
    do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= v_limit;
end;
$$;
