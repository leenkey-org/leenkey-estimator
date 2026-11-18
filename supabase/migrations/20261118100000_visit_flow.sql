-- L3-02 (SPEC-V2 sections 10, 14 and 18): what follows the acts on a visit.
-- An invitation posts a notice in the listing conversation (kind
-- visit_invite; the buyer's screen adds the link of their invitation) and
-- tells the buyer (visit.invited, bell and email); a booking and a cancelling
-- post a notice and tell the parties (visit.booked, visit.cancelled); the day
-- before, from 8 h in Paris, both get a reminder (visit.reminder). The exact
-- address is never written in a notification: the email of the buyer reads
-- it when it leaves, for a visit still confirmed.
-- Triggers on the tables of L3-01: its functions do not change.

alter table public.visits add column reminder_sent_at timestamptz;

-- « 21/11/2026 à 10h00 », Paris time, for the notices of the conversation.
create function public.visit_date_label(p_at timestamptz) returns text
language sql stable set search_path = '' as $$
  select to_char(p_at at time zone 'Europe/Paris', 'DD/MM/YYYY "à" HH24"h"MI');
$$;

-- A notice in the listing conversation of the buyer about the property.
-- Never stops the act it tells (as offer_notice).
create function public.visit_notice(p_property uuid, p_buyer uuid, p_sender uuid, p_kind text,
                                    p_body text, p_meta jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  conv uuid;
begin
  select c.id into conv from public.conversations c
   where c.kind = 'listing' and c.property_id = p_property and c.buyer_id = p_buyer
   order by c.created_at desc limit 1;
  if conv is null then
    return;
  end if;
  insert into public.messages (conversation_id, sender_id, body, kind, meta)
  values (conv, p_sender, p_body, p_kind, p_meta);
exception when others then
  raise warning 'visit notice skipped for property %: %', p_property, sqlerrm;
end;
$$;

-- The notices of a visit are written by the database, one per act: they do
-- not count in the 20 messages an hour of their sender, and a visit_invite
-- has its own notification (visit.invited), not the one of a message.
create or replace function public.messages_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_admin()
     or new.kind in ('offer_notice', 'visit_invite', 'system') then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('messages_rate_limit:' || new.sender_id::text, 0));
  if (select count(*) from public.messages
       where sender_id = new.sender_id and kind = 'text'
         and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'messages_per_hour' using errcode = '54000';
  end if;
  return new;
end;
$$;

-- messages_notify of L1-34, for the messages written by a person only: an
-- invitation has its own notification (visit.invited).
create or replace function public.messages_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.conversations;
  recipient uuid;
  recipient_read timestamptz;
  sender_name text;
  listing_title text;
  v_reference text;
  is_read boolean;
  v_excerpt text;
  v_admin uuid;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if not found then
    return new;
  end if;
  v_excerpt := btrim(regexp_replace(new.body, '\s+', ' ', 'g'));

  if c.kind = 'advisor' then
    select l.reference, l.title into v_reference, listing_title
      from public.listings l
     where l.property_id = c.property_id and l.deleted_at is null
     order by l.created_at desc limit 1;
    select first_name into sender_name from public.profiles where id = new.sender_id;
    if new.sender_id = c.seller_id then
      -- The seller writes, or the assistant hands their question over: the team.
      if new.kind not in ('text', 'assistant_handoff') then
        return new;
      end if;
      for v_admin in
        select p.id from public.profiles p
         where 'admin' = any(p.roles) and p.deleted_at is null and p.suspended_at is null
      loop
        perform public.notification_add(
          v_admin,
          'advisor.message_from_client',
          jsonb_build_object(
            'conversation_id', c.id,
            'message_id', new.id,
            'entity_id', new.id,
            'sender_first_name', sender_name,
            'reference', v_reference,
            'listing_title', listing_title,
            'handoff', new.kind = 'assistant_handoff',
            'excerpt', left(v_excerpt, 140),
            'truncated', char_length(v_excerpt) > 140),
          '/admin/messages/' || c.id,
          'conversation:' || c.id,
          case when new.created_at > now() - interval '1 hour'
               then new.created_at + interval '5 minutes' end,
          new.created_at);
      end loop;
    elsif new.kind = 'text' then
      -- The team writes: the seller, like a new message.
      is_read := c.seller_last_read_at is not null and c.seller_last_read_at >= new.created_at;
      perform public.notification_add(
        c.seller_id,
        'advisor.message',
        jsonb_build_object(
          'conversation_id', c.id,
          'message_id', new.id,
          'sender_first_name', sender_name,
          'reference', v_reference,
          'listing_title', listing_title,
          'excerpt', left(v_excerpt, 140),
          'truncated', char_length(v_excerpt) > 140),
        '/messages/' || c.id,
        'conversation:' || c.id,
        case when not is_read and new.created_at > now() - interval '1 hour'
             then new.created_at + interval '5 minutes' end,
        new.created_at,
        case when is_read then c.seller_last_read_at end);
    end if;
    return new;
  end if;

  -- A listing conversation (L1-22, unchanged).
  if new.kind <> 'text' then
    return new;
  end if;
  if new.sender_id = c.seller_id then
    recipient := c.buyer_id;
    recipient_read := c.buyer_last_read_at;
  elsif new.sender_id = c.buyer_id then
    recipient := c.seller_id;
    recipient_read := c.seller_last_read_at;
  else
    return new;
  end if;
  if recipient is null then
    return new;
  end if;
  select first_name into sender_name from public.profiles where id = new.sender_id;
  select title into listing_title from public.listings where id = c.listing_id;
  is_read := recipient_read is not null and recipient_read >= new.created_at;
  perform public.notification_add(
    recipient,
    'message.new',
    jsonb_build_object(
      'conversation_id', c.id,
      'message_id', new.id,
      'from', case when new.sender_id = c.seller_id then 'seller' else 'buyer' end,
      'sender_first_name', sender_name,
      'listing_title', listing_title,
      'excerpt', left(v_excerpt, 140),
      'truncated', char_length(v_excerpt) > 140),
    '/messages/' || c.id,
    'conversation:' || c.id,
    case when not is_read and new.created_at > now() - interval '1 hour'
         then new.created_at + interval '5 minutes' end,
    new.created_at,
    case when is_read then recipient_read end);
  return new;
end;
$$;

-- The facts every notification of a visit carries (never the address).
create function public.visit_facts(p_property uuid, p_buyer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'property_id', p.id, 'listing_id', l.id, 'title', l.title, 'city', p.city,
    'buyer_first_name', b.first_name, 'seller_first_name', se.first_name)
    from public.properties p
    join public.profiles se on se.id = p.owner_id
    join public.profiles b on b.id = p_buyer
    left join public.listings l on l.property_id = p.id
   where p.id = p_property
   order by l.created_at desc nulls last limit 1;
$$;

-- ---------------------------------------------------------------------------
-- An invitation (new, or asked again: a new token)
-- ---------------------------------------------------------------------------
create function public.visit_invitations_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_seller uuid;
begin
  if tg_op = 'UPDATE' and new.token = old.token then
    return null;
  end if;
  select owner_id into v_seller from public.properties where id = new.property_id;
  perform public.visit_notice(
    new.property_id, new.buyer_id, v_seller, 'visit_invite',
    'Invitation à visiter le bien : réservation d''un créneau jusqu''au '
      || public.visit_date_label(new.expires_at) || '.',
    jsonb_build_object('type', 'invited', 'invitation_id', new.id));
  perform public.notification_add(
    new.buyer_id, 'visit.invited',
    public.visit_facts(new.property_id, new.buyer_id)
      || jsonb_build_object('entity_id', new.id, 'expires_at', new.expires_at),
    '/visites/reserver/' || new.token, 'visit-invitation:' || new.id, now());
  return null;
end;
$$;
create trigger visit_invitations_notify after insert or update of token on public.visit_invitations
  for each row execute function public.visit_invitations_notify();

-- ---------------------------------------------------------------------------
-- A visit booked, a visit cancelled
-- ---------------------------------------------------------------------------
create function public.visits_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_seller uuid;
  v_start timestamptz;
  v_end timestamptz;
  info jsonb;
  by_seller boolean;
begin
  select owner_id into v_seller from public.properties where id = new.property_id;
  select starts_at, ends_at into v_start, v_end from public.visit_slots where id = new.slot_id;
  info := public.visit_facts(new.property_id, new.buyer_id)
    || jsonb_build_object('entity_id', new.id, 'visit_id', new.id,
                          'starts_at', v_start, 'ends_at', v_end);

  if tg_op = 'INSERT' and new.status = 'confirmed' then
    perform public.visit_notice(
      new.property_id, new.buyer_id, new.buyer_id, 'system',
      'Visite réservée pour le ' || public.visit_date_label(v_start) || '.',
      jsonb_build_object('type', 'booked', 'visit_id', new.id));
    perform public.notification_add(
      v_seller, 'visit.booked', info || jsonb_build_object('role', 'seller'),
      '/vendeur/biens/' || new.property_id || '/visites', 'visit:' || new.id, now());
    perform public.notification_add(
      new.buyer_id, 'visit.booked', info || jsonb_build_object('role', 'buyer'),
      '/visites/' || new.id, 'visit:' || new.id, now());
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status = 'confirmed' then
    by_seller := new.cancelled_by is distinct from new.buyer_id;
    perform public.visit_notice(
      new.property_id, new.buyer_id, case when by_seller then v_seller else new.buyer_id end, 'system',
      'Visite du ' || public.visit_date_label(v_start) || ' annulée par '
        || case when by_seller then 'le vendeur' else 'l''acquéreur' end || '.',
      jsonb_build_object('type', 'cancelled', 'visit_id', new.id));
    -- The other party is told; the one who cancelled knows.
    if by_seller then
      perform public.notification_add(
        new.buyer_id, 'visit.cancelled', info || jsonb_build_object('role', 'buyer'),
        '/visites/' || new.id, 'visit-cancelled:' || new.id, now());
    else
      perform public.notification_add(
        v_seller, 'visit.cancelled', info || jsonb_build_object('role', 'seller'),
        '/vendeur/biens/' || new.property_id || '/visites', 'visit-cancelled:' || new.id, now());
    end if;
  end if;
  return null;
end;
$$;
create trigger visits_notify after insert or update of status on public.visits
  for each row execute function public.visits_notify();

-- ---------------------------------------------------------------------------
-- The reminder: the day before the visit, from 8 h in Paris, once
-- ---------------------------------------------------------------------------
create function public.visits_remind(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v record;
  n int := 0;
  info jsonb;
begin
  if extract(hour from p_now at time zone 'Europe/Paris') < 8 then
    return 0;
  end if;
  for v in
    select vi.id, vi.property_id, vi.buyer_id, s.starts_at, s.ends_at, p.owner_id
      from public.visits vi
      join public.visit_slots s on s.id = vi.slot_id
      join public.properties p on p.id = vi.property_id
     where vi.status = 'confirmed' and vi.reminder_sent_at is null and s.starts_at > p_now
       and (s.starts_at at time zone 'Europe/Paris')::date
           = (p_now at time zone 'Europe/Paris')::date + 1
     for update of vi
  loop
    info := public.visit_facts(v.property_id, v.buyer_id)
      || jsonb_build_object('entity_id', v.id, 'visit_id', v.id,
                            'starts_at', v.starts_at, 'ends_at', v.ends_at);
    perform public.notification_add(
      v.owner_id, 'visit.reminder', info || jsonb_build_object('role', 'seller'),
      '/vendeur/biens/' || v.property_id || '/visites', 'visit-reminder:' || v.id, p_now);
    perform public.notification_add(
      v.buyer_id, 'visit.reminder', info || jsonb_build_object('role', 'buyer'),
      '/visites/' || v.id, 'visit-reminder:' || v.id, p_now);
    update public.visits set reminder_sent_at = p_now where id = v.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- What the email of a visit needs when it leaves (the cron, service role):
-- the address for the buyer of a visit still confirmed, null otherwise.
create function public.visit_email_facts(p_visit uuid)
returns table (status public.visit_status, starts_at timestamptz, ends_at timestamptz,
               address_line text, postal_code text, city text)
language sql stable security definer set search_path = '' as $$
  select v.status, s.starts_at, s.ends_at,
         case when v.status = 'confirmed' then p.address_line end,
         case when v.status = 'confirmed' then p.postal_code end, p.city
    from public.visits v
    join public.visit_slots s on s.id = v.slot_id
    join public.properties p on p.id = v.property_id
   where v.id = p_visit;
$$;

revoke execute on function public.visit_date_label(timestamptz) from public, anon, authenticated;
revoke execute on function public.visit_notice(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.visit_facts(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.visit_invitations_notify() from public, anon, authenticated;
revoke execute on function public.visits_notify() from public, anon, authenticated;
revoke execute on function public.visits_remind(timestamptz) from public, anon, authenticated;
revoke execute on function public.visit_email_facts(uuid) from public, anon, authenticated;
grant execute on function public.visit_email_facts(uuid) to service_role;

-- pg_cron, in the database itself (SPEC 19, DECISIONS.md 2026-10-08): every
-- hour, the function waits for 8 h in Paris whatever the season.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'visit-reminders';
    perform cron.schedule('visit-reminders', '7 * * * *', $job$select public.visits_remind()$job$);
  end if;
end;
$$;
