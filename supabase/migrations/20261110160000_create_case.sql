-- L1-31: the handoff to a human (SPEC-V2 sections 5 and 12). A request of a
-- seller, or of a buyer, becomes a case of the back office (L1-30c), read by
-- the team; the person cannot write in cases (cases_write_admin), so the
-- writing goes through functions that check everything themselves, never
-- through the service role (CLAUDE.md section 8).
--
-- 1. create_case(subject, summary, source, property): a case of the caller,
--    for one of their properties or none (the default, hence the last
--    parameter), 5 open requests at most, told to every admin (in the app
--    and by email, grouped).
-- 2. ai_create_case: the same, confirmed in the assistant (tool
--    create_case): the case and the result of the tool in the log, in one
--    transaction (a call is answered once: ai_messages_tool_result_idx).
-- The file only adds (applied to staging without a confirmation).

-- 1. ---------------------------------------------------------------------------
create function public.create_case(
  p_subject text,
  p_summary text,
  p_source public.case_source,
  p_property_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_subject text := btrim(regexp_replace(coalesce(p_subject, ''), '\s+', ' ', 'g'));
  v_summary text := btrim(coalesce(p_summary, ''));
  v_place text;
  v_reference text;
  v_first text;
  v_initial text;
  v_case uuid;
  v_admin uuid;
begin
  if uid is null or not public.is_active_user() then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- A case of a plan paid is written by the payment only (stripe_checkout_complete).
  if p_source is null or p_source not in ('assistant_handoff', 'manual') then
    raise exception 'create_case: source' using errcode = '22023';
  end if;
  if char_length(v_subject) < 3 or char_length(v_subject) > 200 then
    raise exception 'create_case: subject length' using errcode = '22023';
  end if;
  if char_length(v_summary) < 10 or char_length(v_summary) > 4000 then
    raise exception 'create_case: summary length' using errcode = '22023';
  end if;
  -- One request at a time for an account: the count below holds.
  select pr.first_name, upper(left(btrim(pr.last_name), 1)) into v_first, v_initial
    from public.profiles pr where pr.id = uid for update;
  if p_property_id is not null then
    select p.city into v_place from public.properties p
     where p.id = p_property_id and p.owner_id = uid and p.deleted_at is null;
    if not found then
      raise exception 'property not found' using errcode = '42501';
    end if;
    select l.reference into v_reference from public.listings l
     where l.property_id = p_property_id and l.deleted_at is null;
  end if;
  if (select count(*) from public.cases c
       where c.profile_id = uid and c.status <> 'closed'
         and c.source in ('assistant_handoff', 'manual')) >= 5 then
    raise exception 'create_case: too many open requests' using errcode = '54000';
  end if;

  insert into public.cases (property_id, profile_id, source, plan, subject, ai_summary)
  values (p_property_id, uid, p_source,
          case when p_property_id is not null then public.property_current_plan(p_property_id) end,
          v_subject, v_summary)
  returning id into v_case;

  for v_admin in
    select p.id from public.profiles p
     where 'admin' = any(p.roles) and p.deleted_at is null and p.suspended_at is null
       and p.id <> uid
  loop
    perform public.notification_add(
      v_admin, 'case.created',
      -- entity_id: one event for the whole team (its email names it once, core/notifications).
      jsonb_build_object('entity_id', v_case, 'case_id', v_case, 'source', p_source,
                         'subject', v_subject,
                         'reference', coalesce(v_reference, v_place),
                         'first_name', v_first, 'last_initial', nullif(v_initial, '')),
      '/admin/dossiers/' || v_case, 'cases:requests', now());
  end loop;
  return v_case;
end;
$$;

revoke execute on function public.create_case(text, text, public.case_source, uuid) from public, anon;
grant execute on function public.create_case(text, text, public.case_source, uuid) to authenticated;

-- 2. ---------------------------------------------------------------------------
create function public.ai_create_case(
  p_conversation_id uuid,
  p_tool_use_id text,
  p_tool_name text,
  p_subject text,
  p_summary text,
  p_property uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_case uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_tool_name is distinct from 'create_case' then
    raise exception 'ai_create_case: create_case only' using errcode = '22023';
  end if;
  if p_tool_use_id is null or char_length(p_tool_use_id) not between 1 and 200 then
    raise exception 'ai_create_case: tool call' using errcode = '22023';
  end if;
  if not exists (select 1 from public.ai_conversations a
                  where a.id = p_conversation_id and a.profile_id = uid) then
    raise exception 'assistant conversation not found' using errcode = '42501';
  end if;
  v_case := public.create_case(p_subject, p_summary, 'assistant_handoff', p_property);
  insert into public.ai_messages (conversation_id, role, content)
  values (p_conversation_id, 'tool', jsonb_build_object(
    'type', 'tool_result', 'tool_use_id', p_tool_use_id, 'name', p_tool_name,
    'status', 'confirmed', 'result', jsonb_build_object('sent', true)));
  return v_case;
end;
$$;

revoke execute on function public.ai_create_case(uuid, text, text, text, text, uuid) from public, anon;
grant execute on function public.ai_create_case(uuid, text, text, text, text, uuid) to authenticated;
