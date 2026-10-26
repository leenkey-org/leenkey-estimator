-- L1-23: the sale steps engine (SPEC-V2 section 9, DECISIONS 2026-10-15 and
-- 2026-10-26). The database ticks the tasks itself, from the events it holds,
-- as it creates the notifications (L1-22): the analysis of value linked, the
-- characteristics complete, six photos, the listing written, sent, online,
-- sold, a first contact. Then it sets the current step of the sale and tells
-- the seller when a step is reached (step.advanced, in the app only). What
-- only a screen knows (the documents to prepare seen) is declared by the
-- seller (sale_declare_event, core/steps/engine.ts). A paid plan switches the
-- template of the sale, the tasks done kept by their code.
-- No table created. RLS changed (PR #48): a seller ticks by hand only the
-- tasks without event of the steps where the seller acts, in the plan of the
-- sale; « Annonce en ligne » and the other tasks with an event never by hand.

-- ---------------------------------------------------------------------------
-- Current step: the furthest of the first step with a required task not done
-- and of the step an event reached (the next one when that step is done).
-- Tasks skipped on the way stay to do (DECISIONS 2026-10-26, point a): a
-- listing online is past « Préparer ma vente » even before the documents to
-- prepare, which have no screen before lot 3.
-- ---------------------------------------------------------------------------
create function public.sale_refresh_progress(p_property_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  sp public.sale_progress;
  first_open int;
  reached int;
  last_position int;
  target public.sale_steps;
  previous public.sale_steps;
  prop public.properties;
begin
  select * into sp from public.sale_progress where property_id = p_property_id for update;
  if not found then
    return;
  end if;
  select max(position) into last_position from public.sale_steps where plan = sp.plan;
  if last_position is null then
    return;  -- no template for this plan (empty database)
  end if;
  select min(s.position) into first_open
    from public.sale_steps s
    join public.sale_step_tasks t on t.step_id = s.id and t.required
   where s.plan = sp.plan
     and not exists (select 1 from public.sale_task_status st
                      where st.property_id = p_property_id and st.task_id = t.id
                        and st.done_at is not null);
  select max(s.position) into reached
    from public.sale_task_status st
    join public.sale_step_tasks t on t.id = st.task_id and t.auto_trigger is not null
    join public.sale_steps s on s.id = t.step_id and s.plan = sp.plan
   where st.property_id = p_property_id and st.done_at is not null;
  if reached is not null and not exists (
       select 1 from public.sale_steps s
         join public.sale_step_tasks t on t.step_id = s.id and t.required
        where s.plan = sp.plan and s.position = reached
          and not exists (select 1 from public.sale_task_status st
                           where st.property_id = p_property_id and st.task_id = t.id
                             and st.done_at is not null)) then
    reached := least(reached + 1, last_position);
  end if;
  select * into target from public.sale_steps
   where plan = sp.plan
     and position = greatest(coalesce(first_open, last_position), coalesce(reached, 1));
  if target.id is null or target.code = sp.current_step_code then
    return;
  end if;
  select * into previous from public.sale_steps where plan = sp.plan and code = sp.current_step_code;
  update public.sale_progress set current_step_code = target.code where property_id = p_property_id;
  -- A step reached, never one left behind: the seller is told, except while
  -- the seed or a migration replays the past (leenkey.sale_quiet).
  if target.position > coalesce(previous.position, 0)
     and coalesce(current_setting('leenkey.sale_quiet', true), '') <> 'on' then
    select * into prop from public.properties where id = p_property_id;
    perform public.notification_add(
      prop.owner_id, 'step.advanced',
      jsonb_build_object(
        'entity_id', p_property_id,
        'property_id', p_property_id,
        'step_code', target.code,
        'step_title', target.title,
        'step_position', target.position,
        'steps_total', last_position,
        'title', (select l.title from public.listings l where l.property_id = p_property_id),
        'city', prop.city),
      '/vendeur');
  end if;
end;
$$;

-- An event of the sale: ticks the tasks of the plan of the sale it triggers
-- (once: a task done stays done), then the current step follows. Called by
-- the triggers below and by sale_declare_event, never by a client.
create function public.sale_emit_event(p_property_id uuid, p_event text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  ticked int;
begin
  insert into public.sale_task_status (property_id, task_id, done_at)
  select sp.property_id, t.id, now()
    from public.sale_progress sp
    join public.sale_steps s on s.plan = sp.plan
    join public.sale_step_tasks t on t.step_id = s.id and t.auto_trigger = p_event
   where sp.property_id = p_property_id
  on conflict (property_id, task_id) do update
    set done_at = coalesce(public.sale_task_status.done_at, excluded.done_at)
    where public.sale_task_status.done_at is null;
  -- The step follows, row by row (sale_task_status_refresh).
  get diagnostics ticked = row_count;
  return ticked;
end;
$$;

-- ---------------------------------------------------------------------------
-- Events held by the database
-- ---------------------------------------------------------------------------

-- The property: its analysis of value linked (L1-13b) and its characteristics
-- complete, as the creation asks them (type, surface, rooms: L1-11).
create function public.sale_property_events() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estimation_id is not null or new.estimation_value_cents is not null then
    perform public.sale_emit_event(new.id, 'estimation.linked');
  end if;
  if new.type is not null and new.surface_m2 is not null and new.rooms is not null then
    perform public.sale_emit_event(new.id, 'property.complete');
  end if;
  return null;
end;
$$;
-- After properties_create_sale_progress (triggers fire in the order of their names).
create trigger properties_sale_events
  after insert or update of estimation_id, estimation_value_cents, type, surface_m2, rooms
  on public.properties for each row execute function public.sale_property_events();

-- Six photos at least.
create function public.sale_photo_events() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.photos where property_id = new.property_id) >= 6 then
    perform public.sale_emit_event(new.property_id, 'photos.min6');
  end if;
  return null;
end;
$$;
create trigger photos_sale_events
  after insert on public.photos for each row execute function public.sale_photo_events();

-- The listing: written (a price and a description, DECISIONS 2026-10-26,
-- point b), sent once, online once, sold. From its state, not from one
-- transition: a listing put online by the back office was sent too.
create function public.sale_listing_events() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.price_cents is not null and nullif(btrim(coalesce(new.description, '')), '') is not null then
    perform public.sale_emit_event(new.property_id, 'listing.draft_complete');
  end if;
  if new.status <> 'draft' and new.status <> 'rejected' or new.submitted_at is not null then
    perform public.sale_emit_event(new.property_id, 'listing.submitted');
  end if;
  if new.status in ('published', 'paused', 'sold') or new.published_at is not null then
    perform public.sale_emit_event(new.property_id, 'listing.published');
  end if;
  if new.status = 'sold' then
    perform public.sale_emit_event(new.property_id, 'listing.sold');
  end if;
  return null;
end;
$$;
create trigger listings_sale_events
  after insert or update of status, price_cents, description, submitted_at, published_at
  on public.listings for each row execute function public.sale_listing_events();

-- A first contact: a buyer writes about the listing (conversation_start, L1-21).
create function public.sale_conversation_events() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'listing' then
    perform public.sale_emit_event(new.property_id, 'conversation.created');
  end if;
  return null;
end;
$$;
create trigger conversations_sale_events
  after insert on public.conversations for each row execute function public.sale_conversation_events();

-- A task ticked or unticked by hand (seller or Leenkey): the step follows.
create function public.sale_task_status_refresh() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.sale_refresh_progress(coalesce(new.property_id, old.property_id));
  return null;
end;
$$;
create trigger sale_task_status_refresh
  after insert or update of done_at or delete on public.sale_task_status
  for each row execute function public.sale_task_status_refresh();

-- ---------------------------------------------------------------------------
-- Plan of the sale: the template follows it, the tasks done kept by their
-- code (SPEC-V2 section 9, « Implémentation »). Those of the former plan stay
-- recorded: back to it, they come back.
-- ---------------------------------------------------------------------------
create function public.sale_progress_plan_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.plan is not distinct from old.plan then
    return null;
  end if;
  insert into public.sale_task_status (property_id, task_id, done_at, done_by)
  select st.property_id, nt.id, st.done_at, st.done_by
    from public.sale_task_status st
    join public.sale_step_tasks ot on ot.id = st.task_id
    join public.sale_steps os on os.id = ot.step_id and os.plan = old.plan
    join public.sale_steps ns on ns.plan = new.plan and ns.code = os.code
    join public.sale_step_tasks nt on nt.step_id = ns.id and nt.code = ot.code
   where st.property_id = new.property_id and st.done_at is not null
  on conflict (property_id, task_id) do update
    set done_at = excluded.done_at, done_by = excluded.done_by
    where public.sale_task_status.done_at is null;
  perform public.sale_refresh_progress(new.property_id);
  return null;
end;
$$;
create trigger sale_progress_plan_changed
  after update of plan on public.sale_progress
  for each row execute function public.sale_progress_plan_changed();

-- The plan in force: the subscription of the property not refunded, not
-- replaced, not ended, the latest activated (DECISIONS 2026-10-15); otherwise
-- Autonomie. A paid plan bought (L1-26) or refunded switches the sale.
create function public.sale_subscription_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.sale_progress sp
     set plan = coalesce(
       (select s.plan from public.subscriptions s
         where s.property_id = sp.property_id and s.refunded_at is null and s.replaced_by is null
           and s.activated_at <= now() and (s.ends_at is null or s.ends_at > now())
         order by s.activated_at desc limit 1),
       'autonomie')
   where sp.property_id = new.property_id;
  return null;
end;
$$;
create trigger subscriptions_sale_plan
  after insert or update of plan, activated_at, ends_at, replaced_by, refunded_at
  on public.subscriptions for each row execute function public.sale_subscription_plan();

-- ---------------------------------------------------------------------------
-- Events only a screen knows, declared by the seller for a property of his
-- that still changes: the documents to prepare and the diagnostics seen.
-- ---------------------------------------------------------------------------
create function public.sale_declare_event(p_property_id uuid, p_event text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_event not in ('documents.checklist_viewed', 'documents.diagnostics_listed') then
    raise exception 'event % is not declared by a seller', p_event using errcode = '22023';
  end if;
  if not public.property_is_editable(p_property_id) then
    raise exception 'property % is not one the account may change', p_property_id
      using errcode = '42501';
  end if;
  perform public.sale_emit_event(p_property_id, p_event);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: a seller ticks by hand the tasks without event of the plan of the sale
-- where the seller acts (task owner, otherwise step owner).
-- ---------------------------------------------------------------------------
create function public.sale_task_is_seller_manual(p_property_id uuid, p_task_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sale_step_tasks t
      join public.sale_steps s on s.id = t.step_id
      join public.sale_progress sp on sp.property_id = p_property_id and sp.plan = s.plan
     where t.id = p_task_id and t.auto_trigger is null
       and coalesce(t.owner, s.owner) in ('seller', 'both'));
$$;

alter policy sale_task_status_insert_owner on public.sale_task_status
  with check (public.property_is_editable(property_id)
              and public.sale_task_is_seller_manual(property_id, task_id)
              and (done_by is null or done_by = auth.uid()));
alter policy sale_task_status_update_owner on public.sale_task_status
  using (public.property_is_editable(property_id)
         and public.sale_task_is_seller_manual(property_id, task_id))
  with check (public.property_is_editable(property_id)
              and public.sale_task_is_seller_manual(property_id, task_id)
              and (done_by is null or done_by = auth.uid()));

revoke execute on function public.sale_refresh_progress(uuid) from public, anon, authenticated;
revoke execute on function public.sale_emit_event(uuid, text) from public, anon, authenticated;
revoke execute on function public.sale_property_events() from public, anon, authenticated;
revoke execute on function public.sale_photo_events() from public, anon, authenticated;
revoke execute on function public.sale_listing_events() from public, anon, authenticated;
revoke execute on function public.sale_conversation_events() from public, anon, authenticated;
revoke execute on function public.sale_task_status_refresh() from public, anon, authenticated;
revoke execute on function public.sale_progress_plan_changed() from public, anon, authenticated;
revoke execute on function public.sale_subscription_plan() from public, anon, authenticated;
revoke execute on function public.sale_declare_event(uuid, text) from public, anon;
grant execute on function public.sale_declare_event(uuid, text) to authenticated;
revoke execute on function public.sale_task_is_seller_manual(uuid, uuid) from public, anon;
grant execute on function public.sale_task_is_seller_manual(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The sales already there (seed, recette on staging): their events replayed
-- from what the database holds, without notification, then their step.
-- ---------------------------------------------------------------------------
do $$
begin
  perform set_config('leenkey.sale_quiet', 'on', true);
  perform public.sale_emit_event(p.id, 'estimation.linked') from public.properties p
    where p.estimation_id is not null or p.estimation_value_cents is not null;
  perform public.sale_emit_event(p.id, 'property.complete') from public.properties p
    where p.type is not null and p.surface_m2 is not null and p.rooms is not null;
  perform public.sale_emit_event(ph.property_id, 'photos.min6') from public.photos ph
    group by ph.property_id having count(*) >= 6;
  perform public.sale_emit_event(l.property_id, 'listing.draft_complete') from public.listings l
    where l.price_cents is not null and nullif(btrim(coalesce(l.description, '')), '') is not null;
  perform public.sale_emit_event(l.property_id, 'listing.submitted') from public.listings l
    where l.status <> 'draft' and l.status <> 'rejected' or l.submitted_at is not null;
  perform public.sale_emit_event(l.property_id, 'listing.published') from public.listings l
    where l.status in ('published', 'paused', 'sold') or l.published_at is not null;
  perform public.sale_emit_event(l.property_id, 'listing.sold') from public.listings l
    where l.status = 'sold';
  perform public.sale_emit_event(c.property_id, 'conversation.created') from public.conversations c
    where c.kind = 'listing' group by c.property_id;
  perform public.sale_refresh_progress(sp.property_id) from public.sale_progress sp;
end;
$$;
