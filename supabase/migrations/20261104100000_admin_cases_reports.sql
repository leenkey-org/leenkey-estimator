-- L1-30c: the cases and the reports of the back office (SPEC-V2 section 17).
-- The admin already reads the cases, their notes, the reports, the
-- conversations and their messages through the RLS of L1-05 (is_admin()).
-- Added here, for the admin only (each function checks is_admin() itself),
-- every change written to audit_log (CLAUDE.md section 11), no table:
--
-- 1. admin_cases, admin_case_counts: the list of /admin/dossiers, open ones
--    first by age, with its search and its filters, and the cases holding a
--    payment « à vérifier » (the notes Stripe wrote, L1-26).
-- 2. admin_case_set_status, admin_case_assign, admin_case_add_note: the
--    status of a case, the admin who follows it, an internal note. A case
--    leaving « new » reads its « case.created » notifications.
-- 3. admin_case_task_set: a task of Leenkey of the sale of the property
--    ticked or unticked (sale_task_status, the step follows by the trigger
--    of L1-23); only a task done by hand by Leenkey (owner leenkey or both,
--    no event behind it), of the plan of the sale.
-- 4. admin_reports, admin_report_counts: the list of /admin/signalements:
--    who reported whom, on which listing, why.
-- 5. admin_report_read: the messages of a reported conversation, each
--    reading traced (SPEC 17: « lecture complète autorisée dans ce cadre,
--    tracée »).
-- 6. admin_report_resolve: a report closed, with an optional note; its
--    notifications read.
-- 7. admin_report_warn: the other party of the conversation warned; the
--    email leaves from the server action. Written to the history of the
--    report and to that of the account.
-- 8. reports_notify: a report sent, each admin told (report.created, in the
--    app and by email through the cron of L1-22, grouped).
--
-- The reads run with the caller's rights (security invoker: the RLS of the
-- tables they read is a second barrier); the writes with the owner's, for
-- audit_log and the notifications, out of reach of a user.

-- ---------------------------------------------------------------------------
-- 1. Cases
-- ---------------------------------------------------------------------------

-- A note written by Leenkey itself about a payment to check (L1-26,
-- stripe_checkout_complete and stripe_charge_refunded).
create function public.case_has_check(p_case uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.case_notes n
     where n.case_id = p_case and n.author_id is null
       and (n.body like 'À vérifier%' or n.body like '%À vérifier :%'));
$$;

-- p_status null: the open cases (new and in progress). Open ones from the
-- oldest, closed ones from the latest change.
create function public.admin_cases(
  p_status public.case_status default null,
  p_query text default null,
  p_limit int default 200
)
returns table (
  id uuid,
  subject text,
  source public.case_source,
  plan public.plan_code,
  status public.case_status,
  created_at timestamptz,
  updated_at timestamptz,
  property_id uuid,
  reference text,
  city text,
  profile_id uuid,
  first_name text,
  last_name text,
  assigned_to uuid,
  assigned_first_name text,
  assigned_last_name text,
  to_check boolean
)
language plpgsql stable security invoker set search_path = '' as $$
declare
  q text := nullif(btrim(coalesce(p_query, '')), '');
  pattern text;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if q is not null then
    pattern := '%' || replace(replace(replace(left(q, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return query
    select c.id, c.subject, c.source, c.plan, c.status, c.created_at, c.updated_at,
           c.property_id, l.reference, p.city, c.profile_id, pr.first_name, pr.last_name,
           c.assigned_to, a.first_name, a.last_name,
           c.status <> 'closed' and public.case_has_check(c.id)
      from public.cases c
      left join public.properties p on p.id = c.property_id
      left join public.listings l on l.property_id = c.property_id
      left join public.profiles pr on pr.id = c.profile_id
      left join public.profiles a on a.id = c.assigned_to
     where (case when p_status is null then c.status <> 'closed' else c.status = p_status end)
       and (pattern is null
            or concat_ws(' ', c.subject, l.reference, p.city, pr.first_name, pr.last_name)
               ilike pattern escape '\')
     order by
       case when p_status = 'closed' then coalesce(c.updated_at, c.created_at) end desc nulls last,
       c.created_at asc, c.id
     limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

create function public.admin_case_counts()
returns table (open int, new int, in_progress int, closed int, to_check int)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select
      (select count(*)::int from public.cases c where c.status <> 'closed'),
      (select count(*)::int from public.cases c where c.status = 'new'),
      (select count(*)::int from public.cases c where c.status = 'in_progress'),
      (select count(*)::int from public.cases c where c.status = 'closed'),
      (select count(*)::int from public.cases c
        where c.status <> 'closed' and public.case_has_check(c.id));
end;
$$;

-- The case, locked for the change, or an error: not an admin, not found.
create function public.admin_case_lock(p_case uuid) returns public.cases
language plpgsql security definer set search_path = '' as $$
declare
  v_case public.cases;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into v_case from public.cases c where c.id = p_case for update;
  if not found then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  return v_case;
end;
$$;

create function public.admin_case_set_status(p_case uuid, p_status public.case_status)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_case public.cases := public.admin_case_lock(p_case);
begin
  if p_status is null then
    raise exception 'a status is required' using errcode = '22023';
  end if;
  -- A stale tab never writes a change that did not happen.
  if v_case.status = p_status then
    raise exception 'already in that status' using errcode = '22023';
  end if;
  update public.cases set status = p_status where id = p_case;
  perform public.audit('case.status', 'case', p_case,
                       jsonb_build_object('from', v_case.status, 'to', p_status));
  -- Taken in hand: its notifications are dealt with.
  if p_status <> 'new' then
    update public.notifications
       set read_at = now()
     where type = 'case.created' and read_at is null and data->>'case_id' = p_case::text;
  end if;
end;
$$;

-- p_assignee: an admin, or null to leave the case to nobody.
create function public.admin_case_assign(p_case uuid, p_assignee uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_case public.cases := public.admin_case_lock(p_case);
begin
  if p_assignee is not null and not exists (
    select 1 from public.profiles p
     where p.id = p_assignee and 'admin' = any(p.roles) and p.deleted_at is null) then
    raise exception 'a case is followed by an admin' using errcode = '22023';
  end if;
  if v_case.assigned_to is not distinct from p_assignee then
    raise exception 'already followed by that admin' using errcode = '22023';
  end if;
  update public.cases set assigned_to = p_assignee where id = p_case;
  perform public.audit('case.assign', 'case', p_case,
                       jsonb_build_object('from', v_case.assigned_to, 'to', p_assignee));
end;
$$;

create function public.admin_case_add_note(p_case uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_case public.cases := public.admin_case_lock(p_case);
  v_body text := btrim(coalesce(p_body, ''));
  v_note uuid;
begin
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'a note of 1 to 4000 characters' using errcode = '22023';
  end if;
  insert into public.case_notes (case_id, author_id, body)
  values (v_case.id, auth.uid(), v_body)
  returning id into v_note;
  update public.cases set updated_at = now() where id = v_case.id;
  perform public.audit('case.note', 'case', v_case.id, jsonb_build_object('note_id', v_note));
  return v_note;
end;
$$;

-- A task of Leenkey of the sale of the case's property, ticked (p_done) or
-- unticked. Returns whether it is done now.
create function public.admin_case_task_set(p_case uuid, p_task uuid, p_done boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_case public.cases := public.admin_case_lock(p_case);
  v_code text;
  v_title text;
  v_done_at timestamptz;
begin
  if p_done is null then
    raise exception 'done or not' using errcode = '22023';
  end if;
  if v_case.property_id is null or not exists (
    select 1 from public.properties p where p.id = v_case.property_id and p.deleted_at is null) then
    raise exception 'the case has no property' using errcode = '22023';
  end if;
  select t.code, t.title into v_code, v_title
    from public.sale_step_tasks t
    join public.sale_steps s on s.id = t.step_id
    join public.sale_progress sp on sp.property_id = v_case.property_id and sp.plan = s.plan
   where t.id = p_task and t.auto_trigger is null
     and coalesce(t.owner, s.owner) in ('leenkey', 'both');
  if v_code is null then
    raise exception 'not a task of Leenkey of this sale' using errcode = '22023';
  end if;
  select st.done_at into v_done_at
    from public.sale_task_status st
   where st.property_id = v_case.property_id and st.task_id = p_task
     for update;
  if (v_done_at is not null) = p_done then
    raise exception 'already in that state' using errcode = '22023';
  end if;
  if p_done then
    insert into public.sale_task_status (property_id, task_id, done_at, done_by)
    values (v_case.property_id, p_task, now(), auth.uid())
    on conflict (property_id, task_id) do update
      set done_at = excluded.done_at, done_by = excluded.done_by;
  else
    update public.sale_task_status set done_at = null, done_by = null
     where property_id = v_case.property_id and task_id = p_task;
  end if;
  perform public.audit('case.task', 'case', v_case.id,
                       jsonb_build_object('task', v_code, 'title', v_title, 'done', p_done));
  return p_done;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Reports
-- ---------------------------------------------------------------------------

-- The other party of a reported conversation: the one the report is about.
create function public.report_target(p_reporter uuid, p_seller uuid, p_buyer uuid) returns uuid
language sql immutable set search_path = '' as $$
  select case when p_reporter = p_seller then p_buyer else p_seller end;
$$;

-- p_open: the open ones from the oldest; else the closed ones from the latest.
create function public.admin_reports(p_open boolean default true, p_limit int default 200)
returns table (
  id uuid,
  reason text,
  created_at timestamptz,
  resolved_at timestamptz,
  conversation_id uuid,
  listing_id uuid,
  listing_title text,
  reference text,
  reporter_id uuid,
  reporter_first_name text,
  reporter_last_name text,
  target_id uuid,
  target_first_name text,
  target_last_name text,
  target_suspended_at timestamptz
)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select r.id, r.reason, r.created_at, r.resolved_at, r.conversation_id,
           c.listing_id, l.title, l.reference,
           r.reporter_id, rp.first_name, rp.last_name,
           t.id, t.first_name, t.last_name, t.suspended_at
      from public.reports r
      left join public.conversations c on c.id = r.conversation_id
      left join public.listings l on l.id = c.listing_id
      left join public.profiles rp on rp.id = r.reporter_id
      left join public.profiles t
        on t.id = public.report_target(r.reporter_id, c.seller_id, c.buyer_id)
     where (r.resolved_at is null) = coalesce(p_open, true)
     order by
       case when coalesce(p_open, true) then r.created_at end asc,
       r.resolved_at desc nulls last, r.id
     limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

create function public.admin_report_counts()
returns table (open int, resolved int)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select (select count(*)::int from public.reports r where r.resolved_at is null),
           (select count(*)::int from public.reports r where r.resolved_at is not null);
end;
$$;

-- The report, locked for the change, or an error: not an admin, not found.
create function public.admin_report_lock(p_report uuid) returns public.reports
language plpgsql security definer set search_path = '' as $$
declare
  v_report public.reports;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into v_report from public.reports r where r.id = p_report for update;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;
  return v_report;
end;
$$;

-- Every message of the reported conversation, in order, the reading written
-- to the history of the report: once per admin and per half hour, so that a
-- page read again after a decision does not fill the history.
create function public.admin_report_read(p_report uuid)
returns table (id uuid, sender_id uuid, body text, kind text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_conversation uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select r.conversation_id into v_conversation from public.reports r where r.id = p_report;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.audit_log a
     where a.entity = 'report' and a.entity_id = p_report and a.action = 'report.read'
       and a.actor_id = auth.uid() and a.created_at > now() - interval '30 minutes') then
    perform public.audit('report.read', 'report', p_report,
                         jsonb_build_object('conversation_id', v_conversation));
  end if;
  return query
    select m.id, m.sender_id, m.body, m.kind, m.created_at
      from public.messages m
     where m.conversation_id = v_conversation
     order by m.created_at, m.id
     limit 1000;
end;
$$;

create function public.admin_report_resolve(p_report uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_report public.reports := public.admin_report_lock(p_report);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_report.resolved_at is not null then
    raise exception 'already closed' using errcode = '22023';
  end if;
  if char_length(coalesce(v_note, '')) > 2000 then
    raise exception 'a note of 2000 characters at most' using errcode = '22023';
  end if;
  update public.reports set resolved_at = now(), resolved_by = auth.uid() where id = p_report;
  perform public.audit('report.resolve', 'report', p_report,
                       case when v_note is null then null else jsonb_build_object('reason', v_note) end);
  update public.notifications
     set read_at = now()
   where type = 'report.created' and read_at is null and data->>'report_id' = p_report::text;
end;
$$;

-- Returns the account warned: the other party of the conversation. Only while
-- the report is open: closing it says what was done.
create function public.admin_report_warn(p_report uuid, p_reason text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_report public.reports := public.admin_report_lock(p_report);
  v_reason text := btrim(coalesce(p_reason, ''));
  v_target uuid;
begin
  if v_report.resolved_at is not null then
    raise exception 'already closed' using errcode = '22023';
  end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 2000 then
    raise exception 'a reason of 3 to 2000 characters' using errcode = '22023';
  end if;
  select public.report_target(v_report.reporter_id, c.seller_id, c.buyer_id) into v_target
    from public.conversations c
   where c.id = v_report.conversation_id;
  if v_target is null or not exists (
    select 1 from public.profiles p
     where p.id = v_target and p.deleted_at is null and not ('admin' = any(p.roles))) then
    raise exception 'nobody to warn' using errcode = '22023';
  end if;
  perform public.audit('report.warn', 'report', p_report,
                       jsonb_build_object('reason', v_reason, 'profile_id', v_target));
  perform public.audit('user.warn', 'profile', v_target,
                       jsonb_build_object('reason', v_reason, 'report_id', p_report));
  return v_target;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. A report sent: each admin told, in the app and by the grouped email of
-- the team (cron of L1-22, as the listings to review).
-- ---------------------------------------------------------------------------
create function public.reports_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_info jsonb;
  v_admin uuid;
begin
  select jsonb_build_object(
           'report_id', new.id,
           'conversation_id', new.conversation_id,
           'listing_title', l.title,
           'reference', l.reference,
           'excerpt', left(new.reason, 140),
           'truncated', char_length(new.reason) > 140)
    into v_info
    from public.conversations c
    left join public.listings l on l.id = c.listing_id
   where c.id = new.conversation_id;
  for v_admin in
    select p.id from public.profiles p
     where 'admin' = any(p.roles) and p.deleted_at is null and p.suspended_at is null
  loop
    perform public.notification_add(
      v_admin, 'report.created', coalesce(v_info, jsonb_build_object('report_id', new.id)),
      '/admin/signalements/' || new.id, 'reports:review',
      -- By email too, unless it is an old one (imported, seed): in the app only.
      case when new.created_at > now() - interval '1 hour' then now() end);
  end loop;
  return null;
end;
$$;
create trigger reports_notify after insert on public.reports
  for each row execute function public.reports_notify();

revoke execute on function public.case_has_check(uuid) from public, anon;
revoke execute on function public.admin_cases(public.case_status, text, int) from public, anon;
revoke execute on function public.admin_case_counts() from public, anon;
revoke execute on function public.admin_case_lock(uuid) from public, anon, authenticated;
revoke execute on function public.admin_case_set_status(uuid, public.case_status) from public, anon;
revoke execute on function public.admin_case_assign(uuid, uuid) from public, anon;
revoke execute on function public.admin_case_add_note(uuid, text) from public, anon;
revoke execute on function public.admin_case_task_set(uuid, uuid, boolean) from public, anon;
revoke execute on function public.report_target(uuid, uuid, uuid) from public, anon;
revoke execute on function public.admin_reports(boolean, int) from public, anon;
revoke execute on function public.admin_report_counts() from public, anon;
revoke execute on function public.admin_report_lock(uuid) from public, anon, authenticated;
revoke execute on function public.admin_report_read(uuid) from public, anon;
revoke execute on function public.admin_report_resolve(uuid, text) from public, anon;
revoke execute on function public.admin_report_warn(uuid, text) from public, anon;
revoke execute on function public.reports_notify() from public, anon, authenticated;
grant execute on function public.case_has_check(uuid) to authenticated;
grant execute on function public.admin_cases(public.case_status, text, int) to authenticated;
grant execute on function public.admin_case_counts() to authenticated;
grant execute on function public.admin_case_set_status(uuid, public.case_status) to authenticated;
grant execute on function public.admin_case_assign(uuid, uuid) to authenticated;
grant execute on function public.admin_case_add_note(uuid, text) to authenticated;
grant execute on function public.admin_case_task_set(uuid, uuid, boolean) to authenticated;
grant execute on function public.report_target(uuid, uuid, uuid) to authenticated;
grant execute on function public.admin_reports(boolean, int) to authenticated;
grant execute on function public.admin_report_counts() to authenticated;
grant execute on function public.admin_report_read(uuid) to authenticated;
grant execute on function public.admin_report_resolve(uuid, text) to authenticated;
grant execute on function public.admin_report_warn(uuid, text) to authenticated;
