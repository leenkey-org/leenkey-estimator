-- L1-34: the conversation with the Leenkey adviser (SPEC-V2 8.6, 10, 11, 12,
-- 17), on the messaging of L1-21 (conversations.kind = 'advisor', one per
-- property; admins already read and write in it, L1-05).
--
-- 1. advisor_conversation_ensure: the conversation of a property whose plan in
--    force includes the adviser (plan_entitlements, never a plan name), with
--    its welcome message. Called by a trigger of subscriptions, deferred to
--    the end of the transaction: the webhook (stripe_checkout_complete) closes
--    a held order and records a refunded one in the same transaction, and
--    neither gives the adviser. Existing paid plans get theirs here.
-- 2. conversation_summaries: the advisor conversation of a seller in their
--    list (kind), first; conversation_senders: the first names of the authors
--    of a thread (the admins who answer, SPEC 8.6).
-- 3. admin_advisor_conversations: the shared inbox of the team
--    (/admin/messages), unread first.
-- 4. ai_advisor_handoff: the question summed up by the assistant
--    (contact_advisor, SPEC 12), posted by the seller after their
--    confirmation, with the result of the tool in the log of the assistant.
-- 5. Notifications: advisor.message (the team writes, to the seller, email
--    grouped like message.new) and advisor.message_from_client (the seller
--    writes, to every admin, one email for the team); read by one admin, read
--    for the team.
-- 6. (In 2 and 3.) The list of a seller says the plan of the
--    property; the shared inbox, the case of the property.
-- 7. admin_counts: the unread conversations, a count of the sidebar.

-- 1. ---------------------------------------------------------------------------
-- Whether the plan in force of a property includes the adviser: the advisor
-- conversation is open while it does (a plan ended or refunded closes it,
-- a new one opens it again), for the seller and the team alike.
create function public.advisor_right(p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.plan_entitlements e
     where e.plan = public.property_current_plan(p_property) and e.feature = 'advisor');
$$;

create function public.advisor_conversation_ensure(p_property uuid) returns uuid
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
  -- Immediate start asked, or not (L1-26): the adviser answers within 24 h,
  -- or once the 14 days of the withdrawal are over (SPEC 11).
  select s.early_start_requested_at is not null into v_early
    from public.subscriptions s
   where s.property_id = p_property and s.replaced_by is null and s.refunded_at is null
     and s.ends_at > now()
   order by s.activated_at desc
   limit 1;
  insert into public.messages (conversation_id, sender_id, body, kind, meta)
  values (
    v_conversation, coalesce(v_sender, v_owner),
    case when coalesce(v_early, false) then
      'Bonjour, je suis votre conseiller Leenkey pour la vente de votre bien. Écrivez-moi ici à tout moment : je vous réponds sous 24 h. L''équipe Leenkey'
    else
      'Bonjour, je suis votre conseiller Leenkey pour la vente de votre bien. Votre accompagnement commence à la fin du délai de rétractation de 14 jours, à la date indiquée dans l''email de votre commande. Vous pouvez déjà m''écrire ici : je vous réponds à partir de cette date, sous 24 h. L''équipe Leenkey'
    end,
    'system',
    jsonb_build_object('type', 'advisor_welcome'));
  return v_conversation;
end;
$$;

create function public.subscriptions_advisor_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.advisor_conversation_ensure(new.property_id);
  return null;
end;
$$;
create constraint trigger subscriptions_advisor_conversation
  after insert or update on public.subscriptions
  deferrable initially deferred
  for each row execute function public.subscriptions_advisor_conversation();

-- The plans already paid (preprod): their conversation now.
select public.advisor_conversation_ensure(p.id)
  from public.properties p
 where p.deleted_at is null
   and exists (select 1 from public.subscriptions s where s.property_id = p.id);

-- Writing: an advisor conversation while its property has the right.
create or replace function public.can_write_conversation(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations
    where id = c and closed_at is null
      and (seller_id = auth.uid() or buyer_id = auth.uid()
           or (kind = 'advisor' and public.is_admin()))
      and (kind <> 'advisor' or public.advisor_right(property_id))
  );
$$;

-- 2. ---------------------------------------------------------------------------
drop function public.conversation_summaries(uuid);
create function public.conversation_summaries(p_conversation_id uuid default null)
returns table (
  id uuid,
  kind public.conversation_kind,
  role text,
  property_id uuid,
  listing_id uuid,
  listing_slug text,
  listing_status public.listing_status,
  listing_title text,
  property_type public.property_type,
  rooms int,
  city text,
  cover_path text,
  counterpart_first_name text,
  buyer_financing_status public.financing_status,
  last_message_at timestamptz,
  last_message_body text,
  last_message_mine boolean,
  unread boolean,
  closed_at timestamptz,
  plan public.plan_code
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.kind,
         case when c.seller_id = auth.uid() then 'seller' else 'buyer' end,
         c.property_id, l.id, l.slug, l.status, l.title, p.type, p.rooms, p.city,
         case when c.seller_id = auth.uid() or l.status = 'published' then
           (select ph.storage_path from public.photos ph where ph.property_id = p.id and ph.is_cover)
         end,
         -- The advisor conversation: the team, no first name of an account.
         case when c.kind = 'listing' then other.first_name end,
         case when c.kind = 'listing' and c.seller_id = auth.uid() then
           coalesce((select bp.financing_status from public.buyer_profiles bp
                     where bp.profile_id = c.buyer_id), 'not_provided')
         end,
         c.last_message_at,
         last.body,
         last.sender_id = auth.uid(),
         last.sender_id <> auth.uid()
           and c.last_message_at > coalesce(
             case when c.seller_id = auth.uid() then c.seller_last_read_at else c.buyer_last_read_at end,
             '-infinity'::timestamptz),
         case when c.kind = 'advisor' and not public.advisor_right(c.property_id)
              then coalesce(c.closed_at, now()) else c.closed_at end,
         -- The plan of the property, said by the header of the adviser.
         case when c.kind = 'advisor' then public.property_current_plan(c.property_id) end
  from public.conversations c
  join public.properties p on p.id = c.property_id
  -- The listing of the conversation; for the adviser, the listing of the property.
  left join public.listings l
    on l.id = coalesce(c.listing_id,
                       (select l2.id from public.listings l2
                         where l2.property_id = c.property_id and l2.deleted_at is null
                         order by l2.created_at desc limit 1))
  left join public.profiles other
    on other.id = case when c.seller_id = auth.uid() then c.buyer_id else c.seller_id end
  join lateral (select m.body, m.sender_id from public.messages m
                where m.conversation_id = c.id
                order by m.created_at desc, m.id desc limit 1) last on true
  where (c.kind = 'listing' and (c.seller_id = auth.uid() or c.buyer_id = auth.uid())
         or c.kind = 'advisor' and c.seller_id = auth.uid() and p.deleted_at is null)
    and (p_conversation_id is null or c.id = p_conversation_id)
  -- The adviser first (SPEC 8.6: pinned at the top of the seller's list).
  order by c.kind = 'advisor' desc, c.last_message_at desc, c.id;
$$;

create function public.conversation_senders(p_conversation_id uuid)
returns table (sender_id uuid, first_name text)
language sql stable security definer set search_path = '' as $$
  select distinct m.sender_id, pr.first_name
    from public.messages m
    join public.profiles pr on pr.id = m.sender_id
   where m.conversation_id = p_conversation_id
     and m.kind <> 'system'
     and (public.is_conversation_participant(p_conversation_id) or public.is_admin());
$$;

-- 3. ---------------------------------------------------------------------------
create function public.admin_advisor_conversations()
returns table (
  id uuid,
  property_id uuid,
  seller_id uuid,
  case_id uuid,
  reference text,
  listing_title text,
  property_type public.property_type,
  rooms int,
  city text,
  cover_path text,
  seller_first_name text,
  seller_last_name text,
  plan public.plan_code,
  last_message_at timestamptz,
  last_message_body text,
  last_from_seller boolean,
  unread boolean,
  closed_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
  select c.id, c.property_id, c.seller_id,
         -- The case of the property (L1-30c), the last one opened.
         (select cs.id from public.cases cs where cs.property_id = c.property_id
           order by cs.created_at desc, cs.id desc limit 1),
         l.reference, l.title, p.type, p.rooms, p.city,
         (select ph.storage_path from public.photos ph where ph.property_id = p.id and ph.is_cover),
         s.first_name, s.last_name,
         public.property_current_plan(p.id),
         c.last_message_at, last.body,
         last.sender_id = c.seller_id,
         last.sender_id = c.seller_id
           and c.last_message_at > coalesce(c.leenkey_last_read_at, '-infinity'::timestamptz),
         case when not public.advisor_right(c.property_id)
              then coalesce(c.closed_at, now()) else c.closed_at end
    from public.conversations c
    join public.properties p on p.id = c.property_id
    join public.profiles s on s.id = c.seller_id
    left join public.listings l
      on l.id = (select l2.id from public.listings l2
                  where l2.property_id = c.property_id and l2.deleted_at is null
                  order by l2.created_at desc limit 1)
    join lateral (select m.body, m.sender_id from public.messages m
                  where m.conversation_id = c.id
                  order by m.created_at desc, m.id desc limit 1) last on true
   where c.kind = 'advisor'
   order by (last.sender_id = c.seller_id
             and c.last_message_at > coalesce(c.leenkey_last_read_at, '-infinity'::timestamptz)) desc,
            c.last_message_at desc, c.id;
end;
$$;

-- 4. ---------------------------------------------------------------------------
-- contact_advisor (SPEC-V2 12), confirmed by the seller: the summary of their
-- question in the conversation with the adviser (kind assistant_handoff), and
-- the result of the tool in the log of the assistant, in one transaction (a
-- call is answered once: ai_messages_tool_result_idx).
create function public.ai_advisor_handoff(
  p_conversation_id uuid,
  p_tool_use_id text,
  p_tool_name text,
  p_property uuid,
  p_summary text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_summary, ''));
  v_conversation uuid;
  v_message uuid;
begin
  if uid is null or not public.is_active_user() then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.ai_conversations a
                  where a.id = p_conversation_id and a.profile_id = uid) then
    raise exception 'assistant conversation not found' using errcode = '42501';
  end if;
  if not exists (select 1 from public.properties pr
                  where pr.id = p_property and pr.owner_id = uid and pr.deleted_at is null) then
    raise exception 'property not found' using errcode = '42501';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'summary length' using errcode = '22023';
  end if;
  v_conversation := public.advisor_conversation_ensure(p_property);
  if v_conversation is null then
    raise exception 'no adviser for this plan' using errcode = '22023';
  end if;
  insert into public.messages (conversation_id, sender_id, body, kind)
  values (v_conversation, uid, v_body, 'assistant_handoff')
  returning id into v_message;
  insert into public.ai_messages (conversation_id, role, content)
  values (p_conversation_id, 'tool', jsonb_build_object(
    'type', 'tool_result', 'tool_use_id', p_tool_use_id, 'name', p_tool_name,
    'status', 'confirmed', 'result', jsonb_build_object('sent', true)));
  return v_conversation;
end;
$$;

-- 5. ---------------------------------------------------------------------------
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
  if new.kind not in ('text', 'visit_invite') then
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

-- Read by one admin (opened, or answered): read for the whole team, in the
-- bell, and its email does not leave.
create or replace function public.conversations_read_notifications() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.seller_last_read_at is not null
     and new.seller_last_read_at is distinct from old.seller_last_read_at then
    update public.notifications
       set read_at = new.seller_last_read_at
     where profile_id = new.seller_id and group_key = 'conversation:' || new.id
       and read_at is null and created_at <= new.seller_last_read_at;
  end if;
  if new.buyer_id is not null and new.buyer_last_read_at is not null
     and new.buyer_last_read_at is distinct from old.buyer_last_read_at then
    update public.notifications
       set read_at = new.buyer_last_read_at
     where profile_id = new.buyer_id and group_key = 'conversation:' || new.id
       and read_at is null and created_at <= new.buyer_last_read_at;
  end if;
  if new.kind = 'advisor' and new.leenkey_last_read_at is not null
     and new.leenkey_last_read_at is distinct from old.leenkey_last_read_at then
    update public.notifications
       set read_at = new.leenkey_last_read_at
     where profile_id <> new.seller_id and group_key = 'conversation:' || new.id
       and read_at is null and created_at <= new.leenkey_last_read_at;
  end if;
  return new;
end;
$$;
drop trigger if exists conversations_read_notifications on public.conversations;
create trigger conversations_read_notifications
  after update of seller_last_read_at, buyer_last_read_at, leenkey_last_read_at
  on public.conversations
  for each row execute function public.conversations_read_notifications();

-- 7. ---------------------------------------------------------------------------
-- The count of the sidebar of the back office: the advisor conversations
-- where the seller wrote last and the team has not read it yet.
drop function public.admin_counts();
create function public.admin_counts()
returns table (
  listings_pending int,
  listings_oldest_submitted_at timestamptz,
  cases_open int,
  reports_open int,
  advisor_unread int
)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select
      (select count(*)::int from public.listings l
        where l.status = 'pending' and l.deleted_at is null),
      (select min(coalesce(l.submitted_at, l.created_at)) from public.listings l
        where l.status = 'pending' and l.deleted_at is null),
      (select count(*)::int from public.cases c where c.status <> 'closed'),
      (select count(*)::int from public.reports r where r.resolved_at is null),
      (select count(*)::int from public.conversations c
        where c.kind = 'advisor'
          and c.last_message_at > coalesce(c.leenkey_last_read_at, '-infinity'::timestamptz)
          and (select m.sender_id from public.messages m
                where m.conversation_id = c.id
                order by m.created_at desc, m.id desc limit 1) = c.seller_id);
end;
$$;
revoke execute on function public.admin_counts() from public, anon;
grant execute on function public.admin_counts() to authenticated;

revoke execute on function public.advisor_right(uuid) from public, anon, authenticated;
revoke execute on function public.advisor_conversation_ensure(uuid) from public, anon, authenticated;
revoke execute on function public.subscriptions_advisor_conversation() from public, anon, authenticated;
revoke execute on function public.conversation_summaries(uuid) from public, anon;
grant execute on function public.conversation_summaries(uuid) to authenticated;
revoke execute on function public.conversation_senders(uuid) from public, anon;
grant execute on function public.conversation_senders(uuid) to authenticated;
revoke execute on function public.admin_advisor_conversations() from public, anon;
grant execute on function public.admin_advisor_conversations() to authenticated;
revoke execute on function public.ai_advisor_handoff(uuid, text, text, uuid, text) from public, anon;
grant execute on function public.ai_advisor_handoff(uuid, text, text, uuid, text) to authenticated;
