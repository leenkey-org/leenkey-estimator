-- Documents of the paid plans (Cédric, 2026-11-26; DECISIONS.md 2026-11-26,
-- « Factures, avoirs et emails des formules »): the seller now gets an email
-- from Leenkey when a refund is recorded, with its credit note (leenkey/
-- billing/refund-emails.ts), once per credit note: the webhook can be
-- delivered again, the team can ask the credit note again from
-- /admin/remboursements, and a plan refunded in several payments has one
-- credit note, hence one email, per refund.
--
-- credit_notes.refund_emailed_at: when that email was taken in charge, null
-- while it is still to send. Written only by the two functions below, open
-- to the service role (the webhook, or the admin action after its own
-- check), like credit_notes_record. Read with the rest of the row (owner of
-- the plan, team): nothing private, the date of an email they received.
-- The policies and the grants of credit_notes are unchanged.

alter table public.credit_notes add column refund_emailed_at timestamptz;

-- The credit notes recorded before this migration were emailed by Stripe
-- (email_type: credit_note): no second email for them.
update public.credit_notes set refund_emailed_at = created_at where refund_emailed_at is null;

-- Takes the email of a credit note in charge: true for the one caller who
-- gets to send it, false when it was already taken (a second delivery).
create function public.credit_note_email_claim(p_credit_note_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  update public.credit_notes set refund_emailed_at = now()
   where id = p_credit_note_id and refund_emailed_at is null
  returning id into v_id;
  return v_id is not null;
end;
$$;
revoke execute on function public.credit_note_email_claim(uuid)
  from public, anon, authenticated;
grant execute on function public.credit_note_email_claim(uuid) to service_role;

-- Gives it back when the email could not be handed over: the next pass
-- (another delivery, « Créer l'avoir ») sends it.
create function public.credit_note_email_release(p_credit_note_id uuid) returns void
language sql security invoker set search_path = '' as $$
  update public.credit_notes set refund_emailed_at = null where id = p_credit_note_id;
$$;
revoke execute on function public.credit_note_email_release(uuid)
  from public, anon, authenticated;
grant execute on function public.credit_note_email_release(uuid) to service_role;
