-- L1-05: plans, plan_entitlements, subscriptions (12-month term), stripe_events,
-- upgrade_prompts, sale_* (steps engine), conversations, messages, reports,
-- cases, case_notes, notifications, knowledge_base, ai_conversations,
-- ai_messages, admin account functions, buyer summary for sellers. RLS.
-- Reference: docs/SPEC-V2.md sections 4 and 5; DECISIONS 2026-10-15 (12-month
-- term, back to Autonomie at expiry; 12 months restart on upgrade).
-- audit_log already exists (L1-04).

create extension if not exists vector with schema extensions;

-- Helper functions from L1-03/L1-04 are only needed by signed-in users
-- (anon also inherits EXECUTE through PUBLIC, hence both revokes).
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_active_user() from public, anon;
revoke execute on function public.owns_property(uuid) from public, anon;
revoke execute on function public.property_is_editable(uuid) from public, anon;
revoke execute on function public.listing_is_public(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.owns_property(uuid) to authenticated;
grant execute on function public.property_is_editable(uuid) to authenticated;
grant execute on function public.listing_is_public(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- plans, plan_entitlements (content loaded by seed)
-- ---------------------------------------------------------------------------
create table public.plans (
  code public.plan_code primary key,
  name text not null,
  tagline text not null,
  price_cents int not null check (price_cents >= 0),
  stripe_price_id text,
  scope text not null default 'property' check (scope in ('property','account')),
  description text not null,
  features text[] not null,
  position int not null,
  active boolean not null default true
);

create table public.plan_entitlements (
  plan public.plan_code references public.plans(code) on delete cascade,
  feature public.plan_feature not null,
  primary key (plan, feature)
);

alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;

create policy plans_select_all on public.plans for select to anon, authenticated using (true);
create policy plans_write_admin on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy plan_entitlements_select_all on public.plan_entitlements for select to anon, authenticated using (true);
create policy plan_entitlements_write_admin on public.plan_entitlements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.plans, public.plan_entitlements from anon, authenticated;
grant select on public.plans, public.plan_entitlements to anon, authenticated;
grant insert, update, delete on public.plans, public.plan_entitlements to authenticated;

-- ---------------------------------------------------------------------------
-- subscriptions: written by the Stripe webhook (service role) only
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  owner_id uuid not null references public.profiles(id),
  plan public.plan_code not null,
  amount_paid_cents int not null default 0 check (amount_paid_cents >= 0),
  discount_cents int not null default 0 check (discount_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_promotion_code text,
  activated_at timestamptz not null default now(),
  ends_at timestamptz,                  -- activated_at + 12 months; at expiry the property goes back to Autonomie
  replaced_by uuid references public.subscriptions(id),
  refunded_at timestamptz
);
create index subscriptions_property_idx on public.subscriptions (property_id, activated_at desc);

create function public.subscriptions_set_term() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.ends_at is null then
    new.ends_at := new.activated_at + interval '12 months';
  end if;
  return new;
end;
$$;
create trigger subscriptions_set_term before insert on public.subscriptions
  for each row execute function public.subscriptions_set_term();

alter table public.subscriptions enable row level security;
create policy subscriptions_select_owner_or_admin on public.subscriptions
  for select to authenticated using (owner_id = auth.uid() or public.is_admin());
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

-- Current paid plan of a property: latest subscription neither replaced,
-- refunded nor expired; otherwise Autonomie.
create function public.property_current_plan(p uuid) returns public.plan_code
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.plan from public.subscriptions s
      where s.property_id = p and s.replaced_by is null and s.refunded_at is null
        and s.ends_at > now()
      order by s.activated_at desc limit 1),
    'autonomie'::public.plan_code);
$$;

-- ---------------------------------------------------------------------------
-- stripe_events: idempotence of the webhook, service role only
-- ---------------------------------------------------------------------------
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- upgrade_prompts
-- ---------------------------------------------------------------------------
create table public.upgrade_prompts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  trigger_code text not null check (char_length(trigger_code) <= 60),
  target_plan public.plan_code not null,
  shown_at timestamptz not null default now(),
  dismissed_at timestamptz,
  clicked_at timestamptz,
  unique (property_id, trigger_code)
);
alter table public.upgrade_prompts enable row level security;
create policy upgrade_prompts_select_owner_or_admin on public.upgrade_prompts
  for select to authenticated using (public.owns_property(property_id) or public.is_admin());
create policy upgrade_prompts_insert_owner on public.upgrade_prompts
  for insert to authenticated with check (public.owns_property(property_id));
create policy upgrade_prompts_update_owner on public.upgrade_prompts
  for update to authenticated using (public.owns_property(property_id)) with check (public.owns_property(property_id));
revoke all on public.upgrade_prompts from anon, authenticated;
grant select on public.upgrade_prompts to authenticated;
grant insert (property_id, trigger_code, target_plan) on public.upgrade_prompts to authenticated;
grant update (dismissed_at, clicked_at) on public.upgrade_prompts to authenticated;

-- ---------------------------------------------------------------------------
-- Sale steps engine (templates loaded by seed; instances per property)
-- ---------------------------------------------------------------------------
create table public.sale_steps (
  id uuid primary key default gen_random_uuid(),
  plan public.plan_code not null,
  code text not null,
  position int not null,
  title text not null,
  description text not null,
  owner text not null check (owner in ('seller','leenkey','both')),
  auto_trigger text,
  unique (plan, code)
);

create table public.sale_step_tasks (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.sale_steps(id) on delete cascade,
  code text not null,
  title text not null,
  auto_trigger text,
  required boolean not null default true,
  position int not null,
  unique (step_id, code)
);

create table public.sale_progress (
  property_id uuid primary key references public.properties(id) on delete cascade,
  plan public.plan_code not null default 'autonomie',
  current_step_code text not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz
);
create trigger sale_progress_set_updated_at before update on public.sale_progress
  for each row execute function public.set_updated_at();

create table public.sale_task_status (
  property_id uuid references public.properties(id) on delete cascade,
  task_id uuid references public.sale_step_tasks(id) on delete cascade,
  done_at timestamptz,
  done_by uuid references public.profiles(id),
  primary key (property_id, task_id)
);

-- One progress row per property, created with the property (first step of
-- the Autonomie template, 'prepare' until the templates are seeded).
create function public.properties_create_sale_progress() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.sale_progress (property_id, plan, current_step_code)
  values (new.id, 'autonomie',
          coalesce((select code from public.sale_steps where plan = 'autonomie' order by position limit 1), 'prepare'))
  on conflict (property_id) do nothing;
  return new;
end;
$$;
create trigger properties_create_sale_progress after insert on public.properties
  for each row execute function public.properties_create_sale_progress();

-- A seller ticks only the tasks of steps where the seller acts.
create function public.sale_task_is_seller_owned(p_task_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sale_step_tasks t join public.sale_steps s on s.id = t.step_id
                 where t.id = p_task_id and s.owner in ('seller', 'both'));
$$;

alter table public.sale_steps enable row level security;
alter table public.sale_step_tasks enable row level security;
alter table public.sale_progress enable row level security;
alter table public.sale_task_status enable row level security;

create policy sale_steps_select on public.sale_steps for select to authenticated using (true);
create policy sale_steps_write_admin on public.sale_steps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy sale_step_tasks_select on public.sale_step_tasks for select to authenticated using (true);
create policy sale_step_tasks_write_admin on public.sale_step_tasks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy sale_progress_select_owner_or_admin on public.sale_progress
  for select to authenticated using (public.owns_property(property_id) or public.is_admin());
create policy sale_progress_update_admin on public.sale_progress
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy sale_task_status_select_owner_or_admin on public.sale_task_status
  for select to authenticated using (public.owns_property(property_id) or public.is_admin());
create policy sale_task_status_insert_owner on public.sale_task_status
  for insert to authenticated
  with check (public.property_is_editable(property_id) and public.sale_task_is_seller_owned(task_id)
              and (done_by is null or done_by = auth.uid()));
create policy sale_task_status_update_owner on public.sale_task_status
  for update to authenticated
  using (public.property_is_editable(property_id) and public.sale_task_is_seller_owned(task_id))
  with check (public.property_is_editable(property_id) and public.sale_task_is_seller_owned(task_id)
              and (done_by is null or done_by = auth.uid()));
create policy sale_task_status_write_admin on public.sale_task_status for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.sale_steps, public.sale_step_tasks, public.sale_progress, public.sale_task_status from anon, authenticated;
grant select on public.sale_steps, public.sale_step_tasks, public.sale_progress, public.sale_task_status to authenticated;
grant insert, update, delete on public.sale_steps, public.sale_step_tasks to authenticated;
grant update (plan, current_step_code) on public.sale_progress to authenticated;
grant insert (property_id, task_id, done_at, done_by), update (done_at, done_by), delete
  on public.sale_task_status to authenticated;

-- public_listings now carries the property's plan (sale_progress.plan).
create or replace function public.public_listings_rows()
returns table (
  id uuid, slug text, reference text, title text, description text,
  price_cents bigint, published_at timestamptz,
  type public.property_type, city text, postal_code text, district text,
  public_location extensions.geography, public_lat double precision, public_lng double precision,
  surface_m2 numeric, rooms int, bedrooms int, floor int,
  has_elevator boolean, has_balcony boolean, has_terrace boolean, has_garden boolean,
  has_parking boolean, has_cellar boolean, orientation text, build_year int,
  dpe_class char(1), ges_class char(1), charges_monthly_cents int,
  property_tax_yearly_cents int, seller_first_name text, plan public.plan_code
)
language sql stable security definer set search_path = '' as $$
  select l.id, l.slug, l.reference, l.title, l.description, l.price_cents, l.published_at,
         p.type, p.city, p.postal_code, p.district, p.public_location,
         extensions.st_y(p.public_location::extensions.geometry),
         extensions.st_x(p.public_location::extensions.geometry),
         p.surface_m2, p.rooms, p.bedrooms, p.floor, p.has_elevator, p.has_balcony,
         p.has_terrace, p.has_garden, p.has_parking, p.has_cellar, p.orientation,
         p.build_year, p.dpe_class, p.ges_class, p.charges_monthly_cents,
         p.property_tax_yearly_cents,
         pr.first_name,
         coalesce(s.plan, 'autonomie')
  from public.listings l
  join public.properties p on p.id = l.property_id
  join public.profiles pr on pr.id = p.owner_id
  left join public.sale_progress s on s.property_id = p.id
  where l.status = 'published' and l.deleted_at is null and p.deleted_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Messaging: one mechanism for seller <-> buyer (listing) and
-- seller <-> Leenkey team (advisor, paid plans)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'listing',
  property_id uuid not null references public.properties(id),
  listing_id uuid references public.listings(id),
  seller_id uuid not null references public.profiles(id),
  buyer_id uuid references public.profiles(id),
  last_message_at timestamptz,
  seller_last_read_at timestamptz,
  buyer_last_read_at timestamptz,
  leenkey_last_read_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'listing' and listing_id is not null and buyer_id is not null)
      or (kind = 'advisor' and buyer_id is null))
);
create unique index conversations_listing_buyer_idx on public.conversations (listing_id, buyer_id) where kind = 'listing';
create unique index conversations_advisor_idx on public.conversations (property_id) where kind = 'advisor';
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);
create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 4000),
  kind text not null default 'text' check (kind in ('text','system','visit_invite','offer_notice','assistant_handoff')),
  meta jsonb,
  ai_suggested boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id),
  reporter_id uuid not null references public.profiles(id),
  reason text not null check (char_length(reason) between 3 and 2000),
  resolved_at timestamptz, resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create function public.is_conversation_participant(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations
                 where id = c and (seller_id = auth.uid() or buyer_id = auth.uid()));
$$;

-- Admins write only in advisor conversations (on behalf of the Leenkey team).
create function public.can_write_conversation(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations
    where id = c and closed_at is null
      and (seller_id = auth.uid() or buyer_id = auth.uid()
           or (kind = 'advisor' and public.is_admin()))
  );
$$;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

create policy conversations_select_participant_or_admin on public.conversations
  for select to authenticated
  using (seller_id = auth.uid() or buyer_id = auth.uid() or public.is_admin());
revoke all on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;

create policy messages_select_participant_or_admin on public.messages
  for select to authenticated
  using (public.is_conversation_participant(conversation_id) or public.is_admin());
create policy messages_insert_writer on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_active_user()
              and public.can_write_conversation(conversation_id));
revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body, ai_suggested) on public.messages to authenticated;

create policy reports_insert_participant on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_conversation_participant(conversation_id));
create policy reports_select_admin on public.reports
  for select to authenticated using (public.is_admin());
create policy reports_update_admin on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (conversation_id, reporter_id, reason) on public.reports to authenticated;
grant update (resolved_at, resolved_by) on public.reports to authenticated;

-- New message: bump the conversation and mark it read for the sender.
create function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  update public.conversations
     set last_message_at = new.created_at,
         seller_last_read_at = case when new.sender_id = c.seller_id then new.created_at else seller_last_read_at end,
         buyer_last_read_at = case when new.sender_id = c.buyer_id then new.created_at else buyer_last_read_at end,
         leenkey_last_read_at = case when c.kind = 'advisor' and new.sender_id <> c.seller_id
                                     then new.created_at else leenkey_last_read_at end
   where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

-- A buyer opens (or finds again) the conversation of a published listing.
create function public.conversation_start(p_listing_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  l record;
  conv uuid;
begin
  if uid is null or not public.is_active_user() then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select li.id, li.property_id, p.owner_id into l
    from public.listings li join public.properties p on p.id = li.property_id
   where li.id = p_listing_id and li.status = 'published' and li.deleted_at is null and p.deleted_at is null;
  if l.id is null then
    raise exception 'listing not available' using errcode = '22023';
  end if;
  if l.owner_id = uid then
    raise exception 'cannot contact yourself' using errcode = '22023';
  end if;
  select id into conv from public.conversations
   where kind = 'listing' and listing_id = l.id and buyer_id = uid;
  if conv is null then
    insert into public.conversations (kind, property_id, listing_id, seller_id, buyer_id)
    values ('listing', l.property_id, l.id, l.owner_id, uid)
    returning id into conv;
  end if;
  return conv;
end;
$$;

create function public.conversation_mark_read(p_conversation_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.conversations;
begin
  select * into c from public.conversations where id = p_conversation_id;
  if c.id is null then
    raise exception 'conversation not found' using errcode = '42501';
  elsif c.seller_id = auth.uid() then
    update public.conversations set seller_last_read_at = now() where id = c.id;
  elsif c.buyer_id = auth.uid() then
    update public.conversations set buyer_last_read_at = now() where id = c.id;
  elsif c.kind = 'advisor' and public.is_admin() then
    update public.conversations set leenkey_last_read_at = now() where id = c.id;
  else
    raise exception 'conversation not found' using errcode = '42501';
  end if;
end;
$$;

-- SPEC section 5, reduced until offers exist (L2: offers added by create or replace).
create function public.has_buyer_relation(p uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c
                 where c.property_id = p and c.kind = 'listing' and c.buyer_id = b);
$$;

-- What a seller may know about the buyers who contacted them (Q5): project
-- and financing status only, never amounts or documents. Document type and
-- check date come with financing_documents (L2-02).
create function public.buyer_summary_for_seller(p_property_id uuid)
returns table (buyer_id uuid, first_name text, project public.buyer_project,
               financing_status public.financing_status,
               financing_document_type public.financing_document_type,
               financing_checked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select pr.id, pr.first_name, bp.project, coalesce(bp.financing_status, 'not_provided'),
         null::public.financing_document_type, null::timestamptz
  from public.profiles pr
  left join public.buyer_profiles bp on bp.profile_id = pr.id
  where public.owns_property(p_property_id)
    and public.has_buyer_relation(p_property_id, pr.id);
$$;

-- ---------------------------------------------------------------------------
-- Cases (support files) and internal notes
-- ---------------------------------------------------------------------------
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id),
  profile_id uuid not null references public.profiles(id),
  source public.case_source not null,
  plan public.plan_code,
  status public.case_status not null default 'new',
  subject text not null check (char_length(subject) between 1 and 200),
  ai_summary text,
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create trigger cases_set_updated_at before update on public.cases
  for each row execute function public.set_updated_at();

create table public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.cases enable row level security;
alter table public.case_notes enable row level security;
create policy cases_select_own_or_admin on public.cases
  for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy cases_write_admin on public.cases for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy case_notes_admin on public.case_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin() and author_id = auth.uid());
revoke all on public.cases, public.case_notes from anon, authenticated;
grant select, insert, update on public.cases to authenticated;
grant select, insert on public.case_notes to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications: read and marked read by their recipient; created by the
-- server-side notification functions (L1-22)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  channels public.notification_channel[] not null default '{in_app}',
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

alter table public.notifications enable row level security;
create policy notifications_select_own_or_admin on public.notifications
  for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy notifications_update_own on public.notifications
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Knowledge base (assistant): admin only; the assistant reads it through a
-- server-side search function (L1-27)
-- ---------------------------------------------------------------------------
create table public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('seller','buyer','both')),
  category text not null,
  step_code text,
  question text not null,
  answer text not null,
  embedding extensions.vector(384),
  source_file text,
  updated_at timestamptz not null default now()
);
create index knowledge_base_embedding_idx on public.knowledge_base
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.knowledge_base enable row level security;
create policy knowledge_base_admin on public.knowledge_base for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.knowledge_base from anon, authenticated;
grant select, insert, update, delete on public.knowledge_base to authenticated;

-- ---------------------------------------------------------------------------
-- Assistant logs
-- ---------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  context text not null check (context in ('seller','buyer','admin')),
  property_id uuid references public.properties(id),
  created_at timestamptz not null default now()
);
create index ai_conversations_profile_idx on public.ai_conversations (profile_id, created_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content jsonb not null,
  model text, input_tokens int, output_tokens int,
  created_at timestamptz not null default now()
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

create function public.owns_ai_conversation(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ai_conversations where id = c and profile_id = auth.uid());
$$;

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
create policy ai_conversations_select_own_or_admin on public.ai_conversations
  for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy ai_conversations_insert_own on public.ai_conversations
  for insert to authenticated
  with check (profile_id = auth.uid() and public.is_active_user()
              and (context <> 'admin' or public.is_admin())
              and (property_id is null or public.owns_property(property_id)));
create policy ai_messages_select_own_or_admin on public.ai_messages
  for select to authenticated using (public.owns_ai_conversation(conversation_id) or public.is_admin());
create policy ai_messages_insert_own on public.ai_messages
  for insert to authenticated with check (public.owns_ai_conversation(conversation_id));
revoke all on public.ai_conversations, public.ai_messages from anon, authenticated;
grant select on public.ai_conversations, public.ai_messages to authenticated;
grant insert (profile_id, context, property_id) on public.ai_conversations to authenticated;
grant insert (conversation_id, role, content, model, input_tokens, output_tokens) on public.ai_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Admin account functions (deferred from L1-03): roles and suspension,
-- written to audit_log
-- ---------------------------------------------------------------------------
create function public.admin_set_roles(p_profile_id uuid, p_roles public.user_role[])
returns public.user_role[]
language plpgsql security definer set search_path = '' as $$
declare
  old_roles public.user_role[];
  new_roles public.user_role[] := (select coalesce(array_agg(distinct r order by r), '{}') from unnest(p_roles) r);
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_profile_id = auth.uid() and not ('admin' = any(new_roles)) then
    raise exception 'an admin cannot remove their own admin role' using errcode = '22023';
  end if;
  select roles into old_roles from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  update public.profiles set roles = new_roles where id = p_profile_id;
  if 'buyer' = any(new_roles) then
    insert into public.buyer_profiles (profile_id) values (p_profile_id) on conflict (profile_id) do nothing;
  end if;
  perform public.audit('user.set_roles', 'profile', p_profile_id,
                       jsonb_build_object('from', old_roles, 'to', new_roles));
  return new_roles;
end;
$$;

create function public.admin_suspend_user(p_profile_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'an admin cannot suspend themselves' using errcode = '22023';
  end if;
  update public.profiles set suspended_at = now(), suspension_reason = btrim(p_reason)
   where id = p_profile_id and deleted_at is null;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  perform public.audit('user.suspend', 'profile', p_profile_id, jsonb_build_object('reason', btrim(p_reason)));
end;
$$;

create function public.admin_unsuspend_user(p_profile_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  update public.profiles set suspended_at = null, suspension_reason = null where id = p_profile_id;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  perform public.audit('user.unsuspend', 'profile', p_profile_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.subscriptions_set_term() from public, anon, authenticated;
revoke execute on function public.properties_create_sale_progress() from public, anon, authenticated;
revoke execute on function public.messages_after_insert() from public, anon, authenticated;

revoke execute on function public.property_current_plan(uuid) from public, anon;
revoke execute on function public.sale_task_is_seller_owned(uuid) from public, anon;
revoke execute on function public.is_conversation_participant(uuid) from public, anon;
revoke execute on function public.can_write_conversation(uuid) from public, anon;
revoke execute on function public.conversation_start(uuid) from public, anon;
revoke execute on function public.conversation_mark_read(uuid) from public, anon;
revoke execute on function public.has_buyer_relation(uuid, uuid) from public, anon;
revoke execute on function public.buyer_summary_for_seller(uuid) from public, anon;
revoke execute on function public.owns_ai_conversation(uuid) from public, anon;
revoke execute on function public.admin_set_roles(uuid, public.user_role[]) from public, anon;
revoke execute on function public.admin_suspend_user(uuid, text) from public, anon;
revoke execute on function public.admin_unsuspend_user(uuid) from public, anon;
grant execute on function public.property_current_plan(uuid) to authenticated;
grant execute on function public.sale_task_is_seller_owned(uuid) to authenticated;
grant execute on function public.is_conversation_participant(uuid) to authenticated;
grant execute on function public.can_write_conversation(uuid) to authenticated;
grant execute on function public.conversation_start(uuid) to authenticated;
grant execute on function public.conversation_mark_read(uuid) to authenticated;
grant execute on function public.has_buyer_relation(uuid, uuid) to authenticated;
grant execute on function public.buyer_summary_for_seller(uuid) to authenticated;
grant execute on function public.owns_ai_conversation(uuid) to authenticated;
grant execute on function public.admin_set_roles(uuid, public.user_role[]) to authenticated;
grant execute on function public.admin_suspend_user(uuid, text) to authenticated;
grant execute on function public.admin_unsuspend_user(uuid) to authenticated;
