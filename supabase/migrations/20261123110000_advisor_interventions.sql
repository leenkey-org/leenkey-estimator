-- Interventions of the adviser: request, reason, counter (asked by Cédric on
-- 2026-11-19, order of 2026-11-20, DECISIONS.md 2026-11-23). The paid plans
-- sell a number of interventions per property (supabase/seed/01_plans.sql:
-- « 4 interventions personnalisées de 20 minutes », « 6 … au lieu de 4 ») and
-- an initial appointment; nothing counted them.
--
-- 1. plans.advisor_interventions: how many interventions a plan sells, beside
--    its rights; null: none. Its values come with the seed of the plans
--    (reference data, CLAUDE.md 5), never from a plan name in the code.
-- 2. advisor_interventions: a request of the seller of a property whose plan
--    has the adviser (reason, message), followed by the team (scheduled, done,
--    cancelled, a note the seller never reads). The initial appointment is a
--    row of the same table (reason initial_meeting), written by the team.
-- 3. What counts: an intervention done, since the start of the plan in force
--    (the first order of the chain of its upgrades: a passage to a dearer
--    plan keeps what was used, a plan bought again after its end starts
--    anew). A request, a scheduled or a cancelled one never counts; the
--    initial appointment neither.
-- 4. advisor_intervention_summary: the counter, for the owner and the team.
-- 5. advisor_intervention_request: the request of the seller, refused once
--    the interventions of the plan are used; it is also their message in the
--    conversation with the adviser, which tells every admin (bell and email).
-- 6. The team: admin_advisor_interventions (the list, with the initial
--    appointments still to plan), admin_advisor_intervention_set and
--    admin_advisor_initial_meeting, each written to audit_log.
-- 7. account_export and account_anonymize: the free texts of the requests.
-- The file only adds (no existing policy changes).

-- 1. ---------------------------------------------------------------------------
alter table public.plans
  add column advisor_interventions int check (advisor_interventions > 0);
comment on column public.plans.advisor_interventions is
  'Interventions of the adviser sold with the plan, per property; null: none.';

-- 2. ---------------------------------------------------------------------------
create type public.advisor_intervention_status as enum ('requested', 'scheduled', 'done', 'cancelled');
create type public.advisor_intervention_reason as enum (
  'initial_meeting', 'price_strategy', 'listing', 'visits', 'offer', 'documents', 'other');

create table public.advisor_interventions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  -- The seller who asked; for the initial appointment, the owner it is planned with.
  requested_by uuid not null references public.profiles(id),
  reason public.advisor_intervention_reason not null,
  -- Null for the initial appointment, and once the account is anonymised.
  message text check (char_length(message) between 1 and 2000),
  status public.advisor_intervention_status not null default 'requested',
  requested_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid references public.profiles(id),
  -- Of the team, never read by the seller (no grant on the column).
  team_note text check (char_length(team_note) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  check ((status = 'done') = (done_at is not null))
);
create index advisor_interventions_property_idx
  on public.advisor_interventions (property_id, requested_at desc);
create trigger advisor_interventions_set_updated_at before update on public.advisor_interventions
  for each row execute function public.set_updated_at();

-- Read by the owner of the property and the team; written by the functions
-- below only. By column: the note of the team and who did the intervention
-- stay with the team (admin_advisor_interventions).
alter table public.advisor_interventions enable row level security;
create policy advisor_interventions_select on public.advisor_interventions
  for select to authenticated
  using (public.owns_property(property_id) or public.is_admin());
revoke all on public.advisor_interventions from anon, authenticated;
grant select (id, property_id, requested_by, reason, message, status, requested_at, done_at,
              created_at, updated_at)
  on public.advisor_interventions to authenticated;

-- 3. ---------------------------------------------------------------------------
-- When the plan in force of a property began: the order at the root of the
-- chain of its upgrades (subscriptions.replaced_by). Null without a paid plan.
create function public.advisor_period_start(p_property uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  with recursive chain as (
    select s.id, s.activated_at
      from public.subscriptions s
     where s.id = (select c.id from public.subscriptions c
                    where c.property_id = p_property and c.replaced_by is null
                      and c.refunded_at is null and c.ends_at > now()
                    order by c.activated_at desc limit 1)
    union
    select p.id, p.activated_at
      from public.subscriptions p
      join chain on p.replaced_by = chain.id
  )
  select min(activated_at) from chain;
$$;

-- How many interventions the plan in force of a property sells; null when it
-- has no adviser (plan_entitlements) or sells none.
create function public.advisor_intervention_quota(p_property uuid) returns int
language sql stable security definer set search_path = '' as $$
  select pl.advisor_interventions
    from public.plans pl
   where pl.code = public.property_current_plan(p_property)
     and public.advisor_right(p_property);
$$;

create function public.advisor_interventions_used(p_property uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.advisor_interventions a
   where a.property_id = p_property
     and a.status = 'done'
     and a.reason <> 'initial_meeting'
     and a.done_at >= coalesce(public.advisor_period_start(p_property), '-infinity'::timestamptz);
$$;

-- The initial appointment of the plan in force: scheduled, done, or null
-- (still to plan; a cancelled one is to plan again).
create function public.advisor_initial_meeting_status(p_property uuid)
returns public.advisor_intervention_status
language sql stable security definer set search_path = '' as $$
  select a.status
    from public.advisor_interventions a
   where a.property_id = p_property
     and a.reason = 'initial_meeting'
     and a.status in ('scheduled', 'done')
     and a.requested_at >= coalesce(public.advisor_period_start(p_property), '-infinity'::timestamptz)
   order by (a.status = 'done') desc, a.requested_at desc
   limit 1;
$$;

-- 4. ---------------------------------------------------------------------------
-- The counter of a property, for its owner and the team: no row for anyone
-- else, nor when the plan in force sells no intervention. plan_name: the plan
-- in force, as the table plans names it. next_*: the cheapest plan on sale,
-- dearer than the one in force, that sells more of them (read in plans,
-- never a plan name in the code).
create function public.advisor_intervention_summary(p_property uuid)
returns table (
  quota int,
  used int,
  pending int,
  initial_meeting public.advisor_intervention_status,
  plan_name text,
  next_plan public.plan_code,
  next_plan_name text,
  next_quota int
)
language sql stable security definer set search_path = '' as $$
  select q.quota,
         public.advisor_interventions_used(p_property),
         (select count(*)::int from public.advisor_interventions a
           where a.property_id = p_property and a.status in ('requested', 'scheduled')
             and a.reason <> 'initial_meeting'),
         public.advisor_initial_meeting_status(p_property),
         (select cur.name from public.plans cur
           where cur.code = public.property_current_plan(p_property)),
         n.code, n.name, n.advisor_interventions
    from (select public.advisor_intervention_quota(p_property) as quota) q
    left join lateral (
      select pl.code, pl.name, pl.advisor_interventions
        from public.plans pl
        join public.plans cur on cur.code = public.property_current_plan(p_property)
       where pl.active and pl.price_cents > cur.price_cents
         and pl.advisor_interventions > q.quota
       order by pl.price_cents, pl.position
       limit 1) n on true
   where q.quota is not null
     and exists (select 1 from public.properties pr
                  where pr.id = p_property and pr.deleted_at is null
                    and (pr.owner_id = (select auth.uid()) or public.is_admin()));
$$;

-- 5. ---------------------------------------------------------------------------
-- The reason, as the conversation and the team read it.
create function public.advisor_intervention_reason_label(p_reason public.advisor_intervention_reason)
returns text
language sql immutable set search_path = '' as $$
  select case p_reason
    when 'initial_meeting' then 'Rendez-vous initial'
    when 'price_strategy' then 'Prix et stratégie'
    when 'listing' then 'Annonce'
    when 'visits' then 'Visites'
    when 'offer' then 'Offre reçue'
    when 'documents' then 'Documents'
    else 'Autre'
  end;
$$;

-- The request of the seller: their property, their account active, a plan
-- with the adviser that sells interventions, some of them left (54000 once
-- they are used: writing to the adviser stays open, it is not an
-- intervention). The request is also their message in the conversation with
-- the adviser, where the team answers: messages_notify tells every admin (in
-- the app and by email); these notifications say it is a request and lead to
-- the list of the back office.
create function public.advisor_intervention_request(
  p_property uuid,
  p_reason public.advisor_intervention_reason,
  p_message text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_message text := btrim(coalesce(p_message, ''));
  v_quota int;
  v_conversation uuid;
  v_id uuid;
  v_posted uuid;
begin
  if uid is null or not public.is_active_user() then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- The initial appointment is planned by the team, never asked for here.
  if p_reason is null or p_reason = 'initial_meeting' then
    raise exception 'advisor_intervention: reason' using errcode = '22023';
  end if;
  if char_length(v_message) < 10 or char_length(v_message) > 2000 then
    raise exception 'advisor_intervention: message length' using errcode = '22023';
  end if;
  if not exists (select 1 from public.properties pr
                  where pr.id = p_property and pr.owner_id = uid and pr.deleted_at is null) then
    raise exception 'property not found' using errcode = '42501';
  end if;
  v_quota := public.advisor_intervention_quota(p_property);
  if v_quota is null then
    raise exception 'advisor_intervention: no intervention in this plan' using errcode = '22023';
  end if;
  if public.advisor_interventions_used(p_property) >= v_quota then
    raise exception 'advisor_intervention: quota' using errcode = '54000';
  end if;
  v_conversation := public.advisor_conversation_ensure(p_property);
  if v_conversation is null
     or exists (select 1 from public.conversations c
                 where c.id = v_conversation and c.closed_at is not null) then
    raise exception 'advisor_intervention: no conversation with the adviser' using errcode = '22023';
  end if;

  insert into public.advisor_interventions (property_id, requested_by, reason, message)
  values (p_property, uid, p_reason, v_message)
  returning id into v_id;

  insert into public.messages (conversation_id, sender_id, body, kind, meta)
  values (v_conversation, uid,
          'Demande d''intervention : ' || public.advisor_intervention_reason_label(p_reason)
            || E'\n\n' || v_message,
          'text',
          jsonb_build_object('type', 'advisor_intervention', 'intervention_id', v_id,
                             'reason', p_reason))
  returning id into v_posted;

  update public.notifications n
     set data = n.data || jsonb_build_object('intervention', true, 'intervention_id', v_id,
                                             'reason', p_reason),
         link = '/admin/messages/interventions'
   where n.type = 'advisor.message_from_client'
     and n.group_key = 'conversation:' || v_conversation
     and n.data->>'message_id' = v_posted::text;
  return v_id;
end;
$$;

-- 6. ---------------------------------------------------------------------------
-- The list of the team: every request, the open ones first (the oldest
-- first), then the others (the latest first); and, with no row of its own
-- (id null), the initial appointment of each plan in force that is neither
-- scheduled nor done. With the counter of the property.
create function public.admin_advisor_interventions()
returns table (
  id uuid,
  property_id uuid,
  reason public.advisor_intervention_reason,
  message text,
  status public.advisor_intervention_status,
  requested_at timestamptz,
  done_at timestamptz,
  done_by_first_name text,
  team_note text,
  seller_id uuid,
  seller_first_name text,
  seller_last_name text,
  reference text,
  listing_title text,
  property_type public.property_type,
  rooms int,
  city text,
  cover_path text,
  plan public.plan_code,
  quota int,
  used int,
  conversation_id uuid
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
  with entries as (
    select a.id, a.property_id, a.reason, a.message, a.status, a.requested_at, a.done_at,
           a.done_by, a.team_note
      from public.advisor_interventions a
    union all
    select null::uuid, s.property_id, 'initial_meeting'::public.advisor_intervention_reason,
           null::text, 'requested'::public.advisor_intervention_status,
           public.advisor_period_start(s.property_id), null::timestamptz, null::uuid, null::text
      from (select distinct sub.property_id
              from public.subscriptions sub
              join public.properties pr on pr.id = sub.property_id and pr.deleted_at is null
             where sub.replaced_by is null and sub.refunded_at is null and sub.ends_at > now()) s
     where public.advisor_intervention_quota(s.property_id) is not null
       and public.advisor_initial_meeting_status(s.property_id) is null
  )
  select e.id, e.property_id, e.reason, e.message, e.status, e.requested_at, e.done_at,
         d.first_name, e.team_note,
         p.owner_id, o.first_name, o.last_name,
         l.reference, l.title, p.type, p.rooms, p.city,
         (select ph.storage_path from public.photos ph where ph.property_id = p.id and ph.is_cover),
         public.property_current_plan(p.id),
         public.advisor_intervention_quota(p.id),
         public.advisor_interventions_used(p.id),
         (select c.id from public.conversations c
           where c.property_id = p.id and c.kind = 'advisor')
    from entries e
    join public.properties p on p.id = e.property_id
    join public.profiles o on o.id = p.owner_id
    left join public.profiles d on d.id = e.done_by
    left join public.listings l
      on l.id = (select l2.id from public.listings l2
                  where l2.property_id = p.id and l2.deleted_at is null
                  order by l2.created_at desc limit 1)
   order by (e.status in ('requested', 'scheduled')) desc,
            case when e.status in ('requested', 'scheduled') then e.requested_at end asc,
            coalesce(e.done_at, e.requested_at) desc,
            e.id
   limit 500;
end;
$$;

-- « Planifiée », « Faite », « Annulée », with an optional note of the team
-- (kept when none is given). Any of the three from any other status: a
-- mistake is corrected (an intervention marked done by error no longer
-- counts once cancelled). Refused when nothing changes (a stale tab), and
-- for a cancelled initial appointment (planned again from its property).
create function public.admin_advisor_intervention_set(
  p_intervention uuid,
  p_status public.advisor_intervention_status,
  p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.advisor_interventions;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_status is null or p_status = 'requested' then
    raise exception 'advisor_intervention: status' using errcode = '22023';
  end if;
  if char_length(v_note) > 2000 then
    raise exception 'advisor_intervention: note length' using errcode = '22023';
  end if;
  select * into v_row from public.advisor_interventions a where a.id = p_intervention for update;
  if not found then
    raise exception 'intervention not found' using errcode = 'P0002';
  end if;
  if v_row.status = p_status then
    raise exception 'already in that status' using errcode = '22023';
  end if;
  -- One initial appointment at a time: a cancelled one is planned again with
  -- admin_advisor_initial_meeting, never brought back.
  if v_row.reason = 'initial_meeting' and v_row.status = 'cancelled' then
    raise exception 'a cancelled initial appointment is planned again' using errcode = '22023';
  end if;
  update public.advisor_interventions
     set status = p_status,
         done_at = case when p_status = 'done' then now() end,
         done_by = case when p_status = 'done' then auth.uid() end,
         team_note = coalesce(v_note, team_note)
   where id = p_intervention;
  perform public.audit('advisor_intervention.status', 'advisor_intervention', p_intervention,
                       jsonb_build_object('property_id', v_row.property_id, 'reason', v_row.reason,
                                          'from', v_row.status, 'to', p_status,
                                          'note', v_note is not null));
end;
$$;

-- The initial appointment of the plan in force of a property, scheduled or
-- done by the team: its row, once (then admin_advisor_intervention_set).
create function public.admin_advisor_initial_meeting(
  p_property uuid,
  p_status public.advisor_intervention_status,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('scheduled', 'done') then
    raise exception 'advisor_intervention: status' using errcode = '22023';
  end if;
  if char_length(v_note) > 2000 then
    raise exception 'advisor_intervention: note length' using errcode = '22023';
  end if;
  -- One admin at a time for a property: the check below holds.
  select pr.owner_id into v_owner from public.properties pr
   where pr.id = p_property and pr.deleted_at is null
     for no key update;
  if not found then
    raise exception 'property not found' using errcode = 'P0002';
  end if;
  if public.advisor_intervention_quota(p_property) is null then
    raise exception 'advisor_intervention: no intervention in this plan' using errcode = '22023';
  end if;
  if public.advisor_initial_meeting_status(p_property) is not null then
    raise exception 'already scheduled or done' using errcode = '22023';
  end if;
  insert into public.advisor_interventions
    (property_id, requested_by, reason, status, done_at, done_by, team_note)
  values (p_property, v_owner, 'initial_meeting', p_status,
          case when p_status = 'done' then now() end,
          case when p_status = 'done' then auth.uid() end,
          v_note)
  returning id into v_id;
  perform public.audit('advisor_intervention.status', 'advisor_intervention', v_id,
                       jsonb_build_object('property_id', p_property, 'reason', 'initial_meeting',
                                          'from', null, 'to', p_status,
                                          'note', v_note is not null));
  return v_id;
end;
$$;

revoke execute on function public.advisor_period_start(uuid) from public, anon, authenticated;
revoke execute on function public.advisor_intervention_quota(uuid) from public, anon, authenticated;
revoke execute on function public.advisor_interventions_used(uuid) from public, anon, authenticated;
revoke execute on function public.advisor_initial_meeting_status(uuid) from public, anon, authenticated;
revoke execute on function public.advisor_intervention_reason_label(public.advisor_intervention_reason)
  from public, anon, authenticated;
revoke execute on function public.advisor_intervention_summary(uuid) from public, anon;
grant execute on function public.advisor_intervention_summary(uuid) to authenticated;
revoke execute on function public.advisor_intervention_request(uuid, public.advisor_intervention_reason, text)
  from public, anon;
grant execute on function public.advisor_intervention_request(uuid, public.advisor_intervention_reason, text)
  to authenticated;
revoke execute on function public.admin_advisor_interventions() from public, anon;
grant execute on function public.admin_advisor_interventions() to authenticated;
revoke execute on function public.admin_advisor_intervention_set(uuid, public.advisor_intervention_status, text)
  from public, anon;
grant execute on function public.admin_advisor_intervention_set(uuid, public.advisor_intervention_status, text)
  to authenticated;
revoke execute on function public.admin_advisor_initial_meeting(uuid, public.advisor_intervention_status, text)
  from public, anon;
grant execute on function public.admin_advisor_initial_meeting(uuid, public.advisor_intervention_status, text)
  to authenticated;

-- 7. ---------------------------------------------------------------------------
-- account_export of 20261121140000_visit_feedback.sql, with the interventions
-- asked of the adviser on the properties of the account: the only change.
create or replace function public.account_export() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with me as (select auth.uid() as id),
  my_properties as (select p.* from public.properties p, me where p.owner_id = me.id),
  my_conversations as (
    select c.* from public.conversations c, me where me.id in (c.buyer_id, c.seller_id)),
  my_offers as (select o.* from public.offers o, me where o.buyer_id = me.id),
  received as (select o.* from public.offer_for_seller o, me where o.seller_id = me.id),
  my_ai as (select a.* from public.ai_conversations a, me where a.profile_id = me.id)
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p, me where p.id = me.id),
    'buyer_profile', (select to_jsonb(b) from public.buyer_profiles b, me where b.profile_id = me.id),
    'legal_acceptances', (select coalesce(jsonb_agg(to_jsonb(a) order by a.accepted_at), '[]')
                            from public.legal_acceptances a, me where a.profile_id = me.id),
    'properties', (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at), '[]') from my_properties p),
    'listings', (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at), '[]')
                   from public.listings l where l.property_id in (select id from my_properties)),
    'photos', (select coalesce(jsonb_agg(to_jsonb(ph) order by ph.property_id, ph.position), '[]')
                 from public.photos ph where ph.property_id in (select id from my_properties)),
    'subscriptions', (select coalesce(jsonb_agg(to_jsonb(s) order by s.activated_at), '[]')
                        from public.subscriptions s, me where s.owner_id = me.id),
    'conversations', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]') from my_conversations c),
    'messages', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]')
                   from public.messages m where m.conversation_id in (select id from my_conversations)),
    'offers_sent', (select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at), '[]') from my_offers o),
    'offers_received', (select coalesce(jsonb_agg(to_jsonb(o) order by o.submitted_at), '[]') from received o),
    'offer_events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at), '[]')
                       from public.offer_events e
                      where e.offer_id in (select id from my_offers union select id from received)),
    -- The columns the person reads (not the note nor the author of the check).
    'financing_documents', (select coalesce(jsonb_agg(jsonb_build_object(
                                'id', f.id, 'type', f.type, 'document_date', f.document_date,
                                'mime_type', f.mime_type, 'size_bytes', f.size_bytes,
                                'created_at', f.created_at, 'checked_at', f.checked_at,
                                'deleted_at', f.deleted_at) order by f.created_at), '[]')
                              from public.financing_documents f, me where f.buyer_id = me.id),
    'favorites', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at), '[]')
                    from public.favorites f, me where f.buyer_id = me.id),
    'assistant_conversations', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]') from my_ai a),
    'assistant_messages', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]')
                             from public.ai_messages m where m.conversation_id in (select id from my_ai)),
    -- Without the claim token of an anonymous valuation.
    'valuations', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at), '[]')
                     from (select v.id, v.created_at, v.input, v.result, v.low_cents, v.value_cents,
                                  v.high_cents, v.email
                             from public.estimations v, me where v.profile_id = me.id) e),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]')
                        from public.notifications n, me where n.profile_id = me.id),
    -- Lot 3: visits, the sale file (the columns the person reads), alerts.
    -- L3-03: the note of the seller of a visit, for the seller only (not
    -- for an admin who was the buyer of the visit).
    'visits', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', v.id, 'slot_id', v.slot_id, 'property_id', v.property_id,
                   'buyer_id', v.buyer_id, 'status', v.status,
                   'buyer_interest', v.buyer_interest, 'buyer_feedback', v.buyer_feedback,
                   'seller_feedback', case when public.owns_property(v.property_id)
                                           then public.visit_seller_note(v.id) end,
                   'cancelled_at', v.cancelled_at, 'cancelled_by', v.cancelled_by,
                   'reminder_sent_at', v.reminder_sent_at,
                   'feedback_requested_at', v.feedback_requested_at,
                   'created_at', v.created_at, 'updated_at', v.updated_at) order by v.created_at), '[]')
                 from public.visits v, me
                where v.buyer_id = me.id or v.property_id in (select id from my_properties)),
    'visit_slots', (select coalesce(jsonb_agg(to_jsonb(s) order by s.starts_at), '[]')
                      from public.visit_slots s where s.property_id in (select id from my_properties)),
    'visit_invitations', (select coalesce(jsonb_agg(jsonb_build_object(
                              'property_id', i.property_id, 'buyer_id', i.buyer_id,
                              'expires_at', i.expires_at, 'created_at', i.created_at) order by i.created_at), '[]')
                            from public.visit_invitations i, me
                           where i.buyer_id = me.id or i.property_id in (select id from my_properties)),
    'documents', (select coalesce(jsonb_agg(jsonb_build_object(
                      'id', d.id, 'property_id', d.property_id, 'type', d.type, 'title', d.title,
                      'mime_type', d.mime_type, 'size_bytes', d.size_bytes, 'created_at', d.created_at,
                      'deleted_at', d.deleted_at) order by d.created_at), '[]')
                    from public.documents d where d.property_id in (select id from my_properties)),
    'documents_shared_with_me', (select coalesce(jsonb_agg(to_jsonb(s) order by s.shared_at), '[]')
                                   from public.document_shares s, me where s.buyer_id = me.id),
    'document_access_requests', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]')
                                   from public.document_access_requests r, me where r.buyer_id = me.id),
    'alerts', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]')
                 from public.alerts a, me where a.buyer_id = me.id),
    'requests_to_the_team', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]')
                               from public.cases c, me where c.profile_id = me.id),
    -- The interventions asked of the adviser, the columns the seller reads
    -- (not the note of the team).
    'advisor_interventions', (select coalesce(jsonb_agg(jsonb_build_object(
                                  'id', a.id, 'property_id', a.property_id, 'reason', a.reason,
                                  'message', a.message, 'status', a.status,
                                  'requested_at', a.requested_at, 'done_at', a.done_at)
                                order by a.requested_at), '[]')
                                from public.advisor_interventions a
                               where a.property_id in (select id from my_properties)))
  from me where me.id is not null;
$$;

-- account_anonymize of 20261122120000_listing_deletion.sql, with the free
-- texts of the interventions of the adviser on the properties of the closed
-- seller (their message, the note of the team) erased: the only change. The
-- message of the request in the conversation with the adviser stays, as the
-- other messages of the account do.
create or replace function public.account_anonymize(p_profile uuid, p_now timestamptz default now())
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles
     where id = p_profile and deleted_at is not null
       and deleted_at <= p_now - interval '30 days') then
    raise exception 'not an account closed 30 days ago' using errcode = '22023';
  end if;

  update public.profiles
     set first_name = null, last_name = null, phone = null, avatar_path = null,
         suspension_reason = null,
         notification_prefs = '{"email_alerts": false, "email_offers": false, "email_messages": false}'::jsonb
   where id = p_profile;
  delete from public.buyer_profiles where profile_id = p_profile;
  delete from public.offers where buyer_id = p_profile and status = 'draft';
  -- A document an offer sent refers to keeps its row (type, date), never its file.
  update public.financing_documents set storage_path = ''
   where buyer_id = p_profile
     and id in (select financing_document_id from public.offers where financing_document_id is not null);
  delete from public.financing_documents
   where buyer_id = p_profile
     and id not in (select financing_document_id from public.offers where financing_document_id is not null);
  delete from public.photos
   where property_id in (select id from public.properties where owner_id = p_profile);
  -- The address, what finds it (the DPE number gives it, through the
  -- register of the ADEME), the free texts of the seller and their history;
  -- the characteristics and the prices stay (city, surface, rooms).
  update public.properties
     set address_line = 'Adresse effacée', location = null, public_location = null,
         district = null, dpe_number = null, dpe_date = null, dpe_exemption_reason = null,
         estimation_id = null
   where owner_id = p_profile;
  -- The same address, frozen with the offers received on these properties.
  delete from public.offer_property_addresses a
   using public.offers o
   where o.id = a.offer_id and o.seller_id = p_profile;
  update public.listings l
     set title = 'Annonce supprimée', description = '', summary = null,
         rejection_reason = null, suspension_reason = null,
         compliance_requested_at = null, compliance_due_at = null,
         compliance_reason = null, compliance_reminded_at = null
    from public.properties p
   where p.id = l.property_id and p.owner_id = p_profile;
  delete from public.listing_revisions r
   using public.listings l, public.properties p
   where l.id = r.listing_id and p.id = l.property_id and p.owner_id = p_profile;
  delete from public.ai_conversations where profile_id = p_profile;
  delete from public.notifications where profile_id = p_profile;
  delete from public.favorites where buyer_id = p_profile;
  delete from public.estimations where profile_id = p_profile;
  -- Lot 3: the sale file (its shares go with it), the alerts, the
  -- invitations and requests of the buyer, the free texts of the visits.
  delete from public.documents
   where property_id in (select id from public.properties where owner_id = p_profile);
  delete from public.alerts where buyer_id = p_profile;
  delete from public.visit_invitations where buyer_id = p_profile;
  delete from public.document_access_requests where buyer_id = p_profile;
  delete from public.document_shares where buyer_id = p_profile;
  -- L3-04: the reasons written for « Non concerné » (free text of the seller).
  delete from public.document_exemptions
   where property_id in (select id from public.properties where owner_id = p_profile);
  update public.visits set buyer_feedback = null, buyer_interest = null where buyer_id = p_profile;
  update public.visits set seller_feedback = null
   where property_id in (select id from public.properties where owner_id = p_profile);
  -- The interventions of the adviser: what the seller wrote, what the team noted.
  update public.advisor_interventions set message = null, team_note = null
   where property_id in (select id from public.properties where owner_id = p_profile);
end;
$$;
