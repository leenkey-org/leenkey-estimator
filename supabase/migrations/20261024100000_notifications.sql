-- L1-22: notifications (SPEC-V2 10, 18 and 19). Table and RLS: L1-05.
--
-- The rows are written by the database itself, from the events it holds (a
-- message, a listing sent for review, published or to correct), never by a
-- client: no insert policy, and no function callable by a user that takes a
-- text or a link (DECISIONS 2026-10-15, L1-05). Their wording is written by
-- the application from their type and their data (lib/i18n/fr.ts), so that
-- the texts stay in one place. The emails wait in the table and go out with
-- /api/cron/send-notification-emails, every 5 minutes, grouped as SPEC 10
-- says (leenkey/notifications/send-emails.ts).

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.notifications
  alter column title drop not null,
  add column data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  add column group_key text,
  add column email_after timestamptz,
  add column email_skipped_at timestamptz;

comment on column public.notifications.title is
  'Wording written when the row is created; null: written from type and data (lib/i18n/fr.ts)';
comment on column public.notifications.data is
  'Facts of the event, as they were (first name, excerpt, listing), for the wording';
comment on column public.notifications.group_key is
  'Rows grouped in one email (conversation:<id>, listings:review)';
comment on column public.notifications.email_after is
  'Null: no email; otherwise the email may leave from then (cron send-notification-emails)';
comment on column public.notifications.email_skipped_at is
  'The email did not leave: read meanwhile, preference off, account closed, too old';

create index notifications_unread_idx on public.notifications (profile_id) where read_at is null;
create index notifications_group_idx on public.notifications (profile_id, group_key, created_at desc)
  where group_key is not null;
create index notifications_email_due_idx on public.notifications (email_after)
  where email_after is not null and email_sent_at is null and email_skipped_at is null;

-- ---------------------------------------------------------------------------
-- Realtime: the bell of the recipient (postgres_changes, under the select
-- policy of the table). Hosted and local projects have the publication.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public'
                       and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The one way in: from the triggers below and, later, the webhooks and the
-- crons (service role). Never executable by a user.
-- ---------------------------------------------------------------------------
create function public.notification_add(
  p_profile_id uuid,
  p_type text,
  p_data jsonb,
  p_link text,
  p_group_key text default null,
  p_email_after timestamptz default null,
  p_created_at timestamptz default now(),
  p_read_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
begin
  insert into public.notifications
    (profile_id, type, data, link, group_key, channels, email_after, created_at, read_at)
  values
    (p_profile_id, p_type, coalesce(p_data, '{}'::jsonb), p_link, p_group_key,
     case when p_email_after is null then '{in_app}'::public.notification_channel[]
          else '{in_app,email}'::public.notification_channel[] end,
     p_email_after, coalesce(p_created_at, now()), p_read_at)
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- A new message (SPEC 10, message.new): to the other party of a listing
-- conversation; the advisor conversation has its own types (L1-34). Its
-- email waits 5 minutes, so that a message read in the app sends none, and
-- groups with the next ones of the conversation (cron). Never an email for
-- an old message (imported, seed), nor for a message the recipient has read.
-- ---------------------------------------------------------------------------
create function public.messages_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.conversations;
  recipient uuid;
  recipient_read timestamptz;
  sender_name text;
  listing_title text;
  is_read boolean;
begin
  if new.kind not in ('text', 'visit_invite') then
    return new;
  end if;
  select * into c from public.conversations where id = new.conversation_id;
  if not found or c.kind <> 'listing' then
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
      'excerpt', left(btrim(regexp_replace(new.body, '\s+', ' ', 'g')), 140),
      'truncated', char_length(btrim(regexp_replace(new.body, '\s+', ' ', 'g'))) > 140),
    '/messages/' || c.id,
    'conversation:' || c.id,
    case when not is_read and new.created_at > now() - interval '1 hour'
         then new.created_at + interval '5 minutes' end,
    new.created_at,
    case when is_read then recipient_read end);
  return new;
end;
$$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.messages_notify();

-- A conversation read (conversation_mark_read): its message notifications
-- up to that moment are read too, in the bell, and their email does not
-- leave.
create function public.conversations_read_notifications() returns trigger
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
  return new;
end;
$$;
create trigger conversations_read_notifications
  after update of seller_last_read_at, buyer_last_read_at on public.conversations
  for each row execute function public.conversations_read_notifications();

-- ---------------------------------------------------------------------------
-- A listing changes status (SPEC 10): sent for review, to the team
-- (listing.pending, its email grouped by the cron); published after its
-- review or to correct, to its seller (listing.published, listing.rejected:
-- their email leaves with the decision of the back office, L1-19). A listing
-- sent more than an hour ago (seed) sends no email.
-- ---------------------------------------------------------------------------
create function public.listings_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p public.properties;
  info jsonb;
  admin_id uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  select * into p from public.properties where id = new.property_id;
  info := jsonb_build_object(
    'entity_id', new.id,
    'listing_id', new.id,
    'property_id', new.property_id,
    'reference', new.reference,
    'title', new.title,
    'city', p.city,
    'postal_code', p.postal_code,
    'price_cents', new.price_cents);
  if new.status = 'pending' then
    -- The seller's first name, for the team (as in the email of L1-13).
    info := info || jsonb_build_object(
      'seller_first_name', (select first_name from public.profiles where id = p.owner_id));
    for admin_id in
      select id from public.profiles
       where 'admin' = any(roles) and deleted_at is null and suspended_at is null
    loop
      perform public.notification_add(
        admin_id, 'listing.pending', info, '/admin/annonces/' || new.id, 'listings:review',
        case when coalesce(new.submitted_at, now()) > now() - interval '1 hour' then now() end);
    end loop;
  elsif new.status = 'published' and old.status = 'pending' then
    perform public.notification_add(
      p.owner_id, 'listing.published', info || jsonb_build_object('slug', new.slug),
      '/vendeur/biens/' || new.property_id);
  elsif new.status = 'rejected' then
    perform public.notification_add(
      p.owner_id, 'listing.rejected', info || jsonb_build_object('reason', new.rejection_reason),
      '/vendeur/biens/' || new.property_id);
  end if;
  return new;
end;
$$;
create trigger listings_notify after update of status on public.listings
  for each row execute function public.listings_notify();

-- ---------------------------------------------------------------------------
-- The emails due, for the cron (service role only): the recipient, their
-- preferences and whether their account is open, and when the last email of
-- the same group left.
-- ---------------------------------------------------------------------------
create function public.notification_email_queue(p_limit int default 500)
returns table (
  id uuid,
  profile_id uuid,
  type text,
  data jsonb,
  link text,
  group_key text,
  created_at timestamptz,
  email_after timestamptz,
  read_at timestamptz,
  email text,
  first_name text,
  prefs jsonb,
  active boolean,
  group_last_sent_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select n.id, n.profile_id, n.type, n.data, n.link, n.group_key, n.created_at, n.email_after,
         n.read_at, u.email::text, p.first_name, p.notification_prefs,
         (p.deleted_at is null and p.suspended_at is null),
         (select max(o.email_sent_at) from public.notifications o
           where o.profile_id = n.profile_id and o.group_key = n.group_key)
    from public.notifications n
    join public.profiles p on p.id = n.profile_id
    left join auth.users u on u.id = n.profile_id
   where n.email_after is not null and n.email_after <= now()
     and n.email_sent_at is null and n.email_skipped_at is null
   order by n.email_after, n.created_at
   limit greatest(1, least(coalesce(p_limit, 500), 2000));
$$;

-- ---------------------------------------------------------------------------
-- The jobs (SPEC 19, DECISIONS 2026-10-08): pg_cron calls the route with
-- pg_net, its address and CRON_SECRET read from the Vault (« site_url »,
-- « cron_secret »). Until both are there (local, CI, a new project), the
-- call does nothing.
-- ---------------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_net with schema extensions;
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_net or pg_cron unavailable (%): the jobs are not scheduled', sqlerrm;
end;
$$;

create function public.cron_call(p_path text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  secret text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'site_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if base is null or secret is null then
    return null;
  end if;
  return net.http_post(
    url := rtrim(base, '/') || p_path,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret,
                                  'Content-Type', 'application/json'),
    timeout_milliseconds := 20000);
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'send-notification-emails';
    perform cron.schedule('send-notification-emails', '*/5 * * * *',
                          $job$select public.cron_call('/api/cron/send-notification-emails')$job$);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.notification_add(uuid, text, jsonb, text, text, timestamptz, timestamptz, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.notification_email_queue(int) from public, anon, authenticated;
revoke execute on function public.cron_call(text) from public, anon, authenticated;
revoke execute on function public.messages_notify() from public, anon, authenticated;
revoke execute on function public.conversations_read_notifications() from public, anon, authenticated;
revoke execute on function public.listings_notify() from public, anon, authenticated;
grant execute on function public.notification_add(uuid, text, jsonb, text, text, timestamptz, timestamptz, timestamptz)
  to service_role;
grant execute on function public.notification_email_queue(int) to service_role;
