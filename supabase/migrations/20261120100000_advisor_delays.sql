-- Delays of the adviser as Cédric set them on 2026-11-19 (DECISIONS.md
-- 2026-11-20): Monday to Friday, a first contact within 1 working day, an
-- answer within 2 working days. The welcome message of the conversation with
-- the adviser no longer says « sous 24 h »; messages already written stay.
create or replace function public.advisor_conversation_ensure(p_property uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_conversation uuid;
  v_sender uuid;
  v_early boolean;
begin
  select pr.owner_id into v_owner
    from public.properties pr
   where pr.id = p_property and pr.deleted_at is null;
  if v_owner is null or not public.advisor_right(p_property) then
    return null;
  end if;
  insert into public.conversations (kind, property_id, seller_id)
  values ('advisor', p_property, v_owner)
  on conflict (property_id) where kind = 'advisor' do nothing
  returning id into v_conversation;
  if v_conversation is null then
    select c.id into v_conversation from public.conversations c
     where c.property_id = p_property and c.kind = 'advisor';
    return v_conversation;
  end if;
  -- Written by the team: the first admin, else the seller (a database without
  -- an admin, tests); a system message shows no author.
  select p.id into v_sender from public.profiles p
   where 'admin' = any(p.roles) and p.deleted_at is null
   order by p.created_at, p.id
   limit 1;
  -- Immediate start asked, or not (L1-26): the adviser answers within 2 working days,
  -- or once the 14 days of the withdrawal are over (SPEC 11); a plan ordered
  -- more than 14 days ago (the conversations opened by this migration) has
  -- started already.
  select exists (
    select 1 from public.subscriptions s
     where s.property_id = p_property and s.refunded_at is null and s.ends_at > now()
       and (s.early_start_requested_at is not null or s.activated_at <= now() - interval '14 days')
  ) into v_early;
  insert into public.messages (conversation_id, sender_id, body, kind, meta)
  values (
    v_conversation, coalesce(v_sender, v_owner),
    case when coalesce(v_early, false) then
      'Bonjour, je suis votre conseiller Leenkey pour la vente de votre bien. Écrivez-moi ici à tout moment : je vous réponds sous 2 jours ouvrés, du lundi au vendredi. L''équipe Leenkey'
    else
      'Bonjour, je suis votre conseiller Leenkey pour la vente de votre bien. Votre accompagnement commence à la fin du délai de rétractation de 14 jours, à la date indiquée dans l''email de votre commande. Vous pouvez déjà m''écrire ici : je vous réponds à partir de cette date, sous 2 jours ouvrés. L''équipe Leenkey'
    end,
    'system',
    jsonb_build_object('type', 'advisor_welcome'));
  return v_conversation;
end;
$$;
