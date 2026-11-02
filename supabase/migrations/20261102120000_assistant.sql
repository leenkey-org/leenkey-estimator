-- L1-28: the assistant (SPEC-V2 section 12). Three pieces of the database,
-- the rest is in core/ai and leenkey/ai:
--
-- 1. ai_quota_consume: one message of the assistant counted against the
--    daily limit of the account (core/ai/quotas.ts gives the limit: the
--    limits live in the code, not in a column, SPEC 12). The counter
--    (profiles.ai_messages_today, not writable by its owner) restarts at
--    midnight in Europe/Paris: its date (ai_messages_date) is compared with
--    today's at each call, so no job is needed for it to be right (the cron
--    of SPEC 19 only tidies up). One update: two messages sent at the same
--    moment never both take the last place.
-- 2. knowledge_cards: the FAQ of Cédric for an audience, in the system prompt
--    of the assistant (Q69, option a: every card read, none missed by the
--    search). Same rules as search_knowledge (L1-27): a signed-in active
--    account, an audience among its roles (an admin: all), the table itself
--    staying readable by the admin alone. Ordered so that the prompt is the
--    same bytes at each call (prompt caching).
-- 3. One result per call of a tool in the log (ai_messages): a confirmation
--    clicked twice, or in two tabs, is written once.

create function public.ai_quota_consume(p_limit integer)
returns table (allowed boolean, used integer)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_used integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'ai_quota_consume: signed-in active account required' using errcode = '42501';
  end if;
  if p_limit is not null and p_limit < 0 then
    raise exception 'ai_quota_consume: the limit is a positive number' using errcode = '22023';
  end if;

  update public.profiles p
     set ai_messages_today = case when p.ai_messages_date = v_today then p.ai_messages_today + 1 else 1 end,
         ai_messages_date = v_today
   where p.id = auth.uid()
     and (p_limit is null
          or (case when p.ai_messages_date = v_today then p.ai_messages_today else 0 end) < p_limit)
  returning p.ai_messages_today into v_used;
  if found then
    return query select true, v_used;
    return;
  end if;
  -- The limit is reached: nothing counted.
  return query
    select false, case when p.ai_messages_date = v_today then p.ai_messages_today else 0 end
      from public.profiles p where p.id = auth.uid();
end;
$$;

revoke execute on function public.ai_quota_consume(integer) from public, anon;
grant execute on function public.ai_quota_consume(integer) to authenticated;

create function public.knowledge_cards(p_audience text)
returns table (id uuid, category text, step_code text, question text, answer text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'knowledge_cards: signed-in active account required' using errcode = '42501';
  end if;
  if p_audience is null or p_audience not in ('seller', 'buyer', 'admin') then
    raise exception 'knowledge_cards: unknown audience' using errcode = '22023';
  end if;
  if not public.is_admin() and not exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and p_audience::public.user_role = any(pr.roles)
  ) then
    raise exception 'knowledge_cards: audience not among the roles of the account' using errcode = '42501';
  end if;

  return query
    select kb.id, kb.category, kb.step_code, kb.question, kb.answer
      from public.knowledge_base kb
     where p_audience = 'admin' or kb.audience in (p_audience, 'both')
     order by kb.category collate "C", kb.question collate "C", kb.id;
end;
$$;

revoke execute on function public.knowledge_cards(text) from public, anon;
grant execute on function public.knowledge_cards(text) to authenticated;

create unique index ai_messages_tool_result_idx
  on public.ai_messages (conversation_id, (content ->> 'tool_use_id'))
  where role = 'tool';
