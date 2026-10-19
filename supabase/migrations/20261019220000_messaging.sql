-- L1-21: messaging (SPEC-V2 8.6). The first message of a buyer opens the
-- conversation, a participant reads their conversations (property, first
-- name of the other party, last message, unread), anti-abuse limits, and
-- Realtime on messages and conversations. Tables and RLS: L1-05.

-- ---------------------------------------------------------------------------
-- Realtime (postgres_changes, filtered by the select policies of each table):
-- the new messages of an open conversation, the changes of the list. Hosted
-- and local projects have the publication; a bare Postgres does not.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['messages', 'conversations'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Anti-abuse (SPEC 8.6): 20 messages an hour per sender, 5 new conversations
-- a day per buyer, over sliding windows. Checked on every insert, whatever
-- the way in; never for the Leenkey team (advisor replies) nor without a
-- user (the payment webhook, the seed). Error 54000, with the limit as message.
-- One sender (one buyer) at a time, under a lock held until the end of the
-- transaction: simultaneous requests would otherwise each count without the
-- others and all pass.
-- ---------------------------------------------------------------------------
create index messages_sender_idx on public.messages (sender_id, created_at desc);
create index conversations_buyer_created_idx on public.conversations (buyer_id, created_at desc)
  where kind = 'listing';

create function public.messages_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('messages_rate_limit:' || new.sender_id::text, 0));
  if (select count(*) from public.messages
       where sender_id = new.sender_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'messages_per_hour' using errcode = '54000';
  end if;
  return new;
end;
$$;
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.messages_rate_limit();

create function public.conversations_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind <> 'listing' or auth.uid() is null or public.is_admin() then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('conversations_rate_limit:' || new.buyer_id::text, 0));
  if (select count(*) from public.conversations
       where kind = 'listing' and buyer_id = new.buyer_id
         and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'conversations_per_day' using errcode = '54000';
  end if;
  return new;
end;
$$;
create trigger conversations_rate_limit before insert on public.conversations
  for each row execute function public.conversations_rate_limit();

-- ---------------------------------------------------------------------------
-- Reports (SPEC 8.6 and 17): one open report per participant and
-- conversation, so that a conversation cannot fill the queue of the team; a
-- new one once the team has dealt with it.
-- ---------------------------------------------------------------------------
create unique index reports_open_once on public.reports (conversation_id, reporter_id)
  where resolved_at is null;

-- ---------------------------------------------------------------------------
-- The first message of a buyer opens the conversation (SPEC 8.6): both in one
-- transaction, so that a refused message (limit, length) leaves no empty
-- conversation for the seller. On a listing already contacted: the same
-- conversation, the message added to it.
-- ---------------------------------------------------------------------------
create function public.conversation_open(p_listing_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  conv uuid := public.conversation_start(p_listing_id);
begin
  if not public.can_write_conversation(conv) then
    raise exception 'conversation closed' using errcode = '42501';
  end if;
  insert into public.messages (conversation_id, sender_id, body)
  values (conv, auth.uid(), p_body);
  return conv;
end;
$$;

-- ---------------------------------------------------------------------------
-- The conversations of a participant, for the list and the header of a
-- conversation (SPEC 8.6): the property (a buyer no longer reads a paused or
-- sold listing), the first name of the other party (profiles are private),
-- the financing status of the buyer for the seller only (as
-- buyer_summary_for_seller: never amounts or documents), the last message and
-- whether it is unread. Its cover photo only where the photo route serves it
-- (owner, or a published listing). Listing conversations with a message; the
-- advisor one comes with L1-34.
-- ---------------------------------------------------------------------------
create function public.conversation_summaries(p_conversation_id uuid default null)
returns table (
  id uuid,
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
  closed_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select c.id,
         case when c.seller_id = auth.uid() then 'seller' else 'buyer' end,
         c.property_id, c.listing_id, l.slug, l.status, l.title, p.type, p.rooms, p.city,
         case when c.seller_id = auth.uid() or l.status = 'published' then
           (select ph.storage_path from public.photos ph where ph.property_id = p.id and ph.is_cover)
         end,
         other.first_name,
         case when c.seller_id = auth.uid() then
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
         c.closed_at
  from public.conversations c
  join public.properties p on p.id = c.property_id
  left join public.listings l on l.id = c.listing_id
  join public.profiles other
    on other.id = case when c.seller_id = auth.uid() then c.buyer_id else c.seller_id end
  join lateral (select m.body, m.sender_id from public.messages m
                where m.conversation_id = c.id
                order by m.created_at desc, m.id desc limit 1) last on true
  where c.kind = 'listing'
    and (c.seller_id = auth.uid() or c.buyer_id = auth.uid())
    and (p_conversation_id is null or c.id = p_conversation_id)
  order by c.last_message_at desc, c.id;
$$;

revoke execute on function public.messages_rate_limit() from public, anon, authenticated;
revoke execute on function public.conversations_rate_limit() from public, anon, authenticated;
revoke execute on function public.conversation_open(uuid, text) from public, anon;
revoke execute on function public.conversation_summaries(uuid) from public, anon;
grant execute on function public.conversation_open(uuid, text) to authenticated;
grant execute on function public.conversation_summaries(uuid) to authenticated;
