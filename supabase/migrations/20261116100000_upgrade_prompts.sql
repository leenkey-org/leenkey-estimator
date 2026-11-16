-- L2-09: the upgrade prompts (SPEC-V2 section 11 bis), on the table of L1-05.
--
-- 1. A prompt may concern one subject: `offer_received` and `offer_accepted`
--    come back for a new offer (SPEC 11 bis, « peuvent réapparaître pour une
--    nouvelle offre »), the others once per property. One row per property,
--    trigger and subject (null for the others).
-- 2. The codes of SPEC 11 bis only.
-- 3. A prompt hidden stays hidden, a click stays recorded: dismissed_at and
--    clicked_at are written once, shown_at never changes (a trigger, whoever
--    updates the row).
-- 4. upgrade_prompt_record: the page records what its seller saw, hid or
--    opened, with the rights of the seller (security invoker: the policies
--    of L1-05, owner of the property only). The plan aimed at comes with the
--    call, checked against the codes.
-- 5. admin_upgrade_prompt_stats: the measure of SPEC 11 bis for the back
--    office, per trigger: shown, opened, hidden, converted (a plan ordered on
--    the property within 7 days of the click).
--
-- No new table; the policies of L1-05 are unchanged.

-- 1. ---------------------------------------------------------------------------
alter table public.upgrade_prompts add column subject_id uuid;
alter table public.upgrade_prompts drop constraint upgrade_prompts_property_id_trigger_code_key;
alter table public.upgrade_prompts
  add constraint upgrade_prompts_once unique nulls not distinct (property_id, trigger_code, subject_id);

-- 2. ---------------------------------------------------------------------------
alter table public.upgrade_prompts
  add constraint upgrade_prompts_trigger_code check (trigger_code in (
    'offer_accepted', 'offer_received', 'visits_no_offer', 'contacts_no_visit',
    'low_contacts', 'file_incomplete', 'listing_ready', 'valuation_done'));
-- Only the two prompts of an offer have a subject.
alter table public.upgrade_prompts
  add constraint upgrade_prompts_subject check (
    (subject_id is not null) = (trigger_code in ('offer_accepted', 'offer_received')));

-- 3. ---------------------------------------------------------------------------
create function public.upgrade_prompts_write_once() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.property_id := old.property_id;
  new.trigger_code := old.trigger_code;
  new.subject_id := old.subject_id;
  new.target_plan := old.target_plan;
  new.shown_at := old.shown_at;
  new.dismissed_at := coalesce(old.dismissed_at, new.dismissed_at);
  new.clicked_at := coalesce(old.clicked_at, new.clicked_at);
  return new;
end;
$$;
create trigger upgrade_prompts_write_once
  before update on public.upgrade_prompts
  for each row execute function public.upgrade_prompts_write_once();

-- 4. ---------------------------------------------------------------------------
create function public.upgrade_prompt_record(
  p_property uuid,
  p_trigger text,
  p_target public.plan_code,
  p_event text,
  p_subject uuid default null
) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_event not in ('shown', 'clicked', 'dismissed') then
    raise exception 'upgrade_prompt_record: unknown event' using errcode = '22023';
  end if;
  -- The constraints of the table check the code and its subject; the policy, the owner.
  insert into public.upgrade_prompts (property_id, trigger_code, target_plan, subject_id)
  values (p_property, p_trigger, p_target, p_subject)
  on conflict (property_id, trigger_code, subject_id) do nothing;
  if p_event = 'clicked' then
    update public.upgrade_prompts set clicked_at = now()
     where property_id = p_property and trigger_code = p_trigger
       and subject_id is not distinct from p_subject and clicked_at is null;
  elsif p_event = 'dismissed' then
    update public.upgrade_prompts set dismissed_at = now()
     where property_id = p_property and trigger_code = p_trigger
       and subject_id is not distinct from p_subject and dismissed_at is null;
  end if;
end;
$$;

-- 5. ---------------------------------------------------------------------------
create function public.admin_upgrade_prompt_stats(p_days int default 30)
returns table (trigger_code text, shown int, clicked int, dismissed int, converted int)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select u.trigger_code,
           count(*)::int,
           count(u.clicked_at)::int,
           count(u.dismissed_at)::int,
           count(*) filter (where exists (
             select 1 from public.subscriptions s
              where s.property_id = u.property_id
                and s.activated_at >= u.clicked_at
                and s.activated_at < u.clicked_at + interval '7 days'))::int
      from public.upgrade_prompts u
     where u.shown_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365))
     group by u.trigger_code
     order by u.trigger_code;
end;
$$;

revoke execute on function public.upgrade_prompts_write_once() from public, anon, authenticated;
revoke execute on function public.upgrade_prompt_record(uuid, text, public.plan_code, text, uuid) from public, anon;
grant execute on function public.upgrade_prompt_record(uuid, text, public.plan_code, text, uuid) to authenticated;
revoke execute on function public.admin_upgrade_prompt_stats(int) from public, anon;
grant execute on function public.admin_upgrade_prompt_stats(int) to authenticated;
grant insert (property_id, trigger_code, target_plan, subject_id) on public.upgrade_prompts to authenticated;
