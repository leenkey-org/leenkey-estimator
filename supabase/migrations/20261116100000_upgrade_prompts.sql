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
--    opened, on their own property only. The only way to write the table:
--    the direct rights of L1-05 (insert, update) are taken back, so that the
--    plan aimed at is the one of the code (set here, never by the caller)
--    and the subject of an offer prompt is an offer sent on this property.
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
  p_event text,
  p_subject uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_target public.plan_code;
begin
  if not public.is_active_user() or not public.owns_property(p_property) then
    raise exception 'not the owner of this property' using errcode = '42501';
  end if;
  if p_event not in ('shown', 'clicked', 'dismissed') then
    raise exception 'upgrade_prompt_record: unknown event' using errcode = '22023';
  end if;
  -- The plan each prompt proposes (SPEC 11 bis), as leenkey/billing/upgrade-prompts.ts.
  v_target := case p_trigger
    when 'offer_accepted' then 'serenite'
    when 'file_incomplete' then 'serenite'
    else 'accompagne' end;
  -- The prompt of an offer: an offer sent on this property.
  if p_subject is not null and not exists (
    select 1 from public.offers o
      join public.listings l on l.id = o.listing_id
     where o.id = p_subject and l.property_id = p_property and o.status <> 'draft') then
    raise exception 'not an offer of this property' using errcode = '22023';
  end if;
  -- The constraints of the table check the code and that only an offer prompt has a subject.
  insert into public.upgrade_prompts (property_id, trigger_code, target_plan, subject_id)
  values (p_property, p_trigger, v_target, p_subject)
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
revoke execute on function public.upgrade_prompt_record(uuid, text, text, uuid) from public, anon;
grant execute on function public.upgrade_prompt_record(uuid, text, text, uuid) to authenticated;
revoke execute on function public.admin_upgrade_prompt_stats(int) from public, anon;
grant execute on function public.admin_upgrade_prompt_stats(int) to authenticated;
-- Written through upgrade_prompt_record only; read as before (owner, admin).
revoke insert, update on public.upgrade_prompts from authenticated;
