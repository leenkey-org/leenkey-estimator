-- The assistant of the public site: 100 questions a day for the whole site
-- at launch, no longer 300 (decision of Younes, DECISIONS.md 2026-11-08):
-- at worst about 2.5 to 4 euros a day of the model. The function is
-- replaced as it was, its limit aside (20261107100000_ai_visitor.sql); its
-- privileges are kept.

-- Limits of the day, also in core/ai/quotas.ts (tests/unit/ai/visitor.test.ts
-- checks that both say the same): per visitor, per address, for the site.
create or replace function public.ai_visitor_ask(
  p_key text,
  p_visitor text,
  p_ip text,
  p_conversation uuid default null,
  p_text text default null
)
returns table (conversation_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
declare
  v_text text := btrim(coalesce(p_text, ''));
  v_conversation uuid;
begin
  perform public.ai_visitor_server(p_key);
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{64}$'
     or p_ip is null or p_ip !~ '^[0-9a-f]{64}$' then
    raise exception 'ai_visitor_ask: invalid visitor' using errcode = '22023';
  end if;
  if char_length(v_text) < 1 or char_length(v_text) > 500 then
    raise exception 'ai_visitor_ask: a question of 1 to 500 characters' using errcode = '22023';
  end if;

  -- One question counted at a time: two at once never pass the limit together.
  perform pg_advisory_xact_lock(hashtext('public.ai_visitor_ask'));
  if public.ai_visitor_questions() >= 100 then
    return query select null::uuid, 'site_limit'::text;
    return;
  end if;
  if public.ai_visitor_questions(p_visitor, null) >= 10 then
    return query select null::uuid, 'visitor_limit'::text;
    return;
  end if;
  if public.ai_visitor_questions(null, p_ip) >= 30 then
    return query select null::uuid, 'ip_limit'::text;
    return;
  end if;

  -- The conversation of this visitor, of the day and from this address
  -- (each question then counts for the address it came from); else a new one.
  select c.id into v_conversation
    from public.ai_conversations c
   where c.id = p_conversation and c.context = 'visitor' and c.visitor_key = p_visitor
     and c.ip_key = p_ip and c.created_at >= public.ai_visitor_day_start();
  if v_conversation is null then
    insert into public.ai_conversations (profile_id, context, kind, visitor_key, ip_key)
    values (null, 'visitor', 'chat', p_visitor, p_ip)
    returning id into v_conversation;
  end if;
  insert into public.ai_messages (conversation_id, role, content)
  values (v_conversation, 'user',
          jsonb_build_object('type', 'user', 'text', v_text, 'context', null));
  return query select v_conversation, 'ok'::text;
end;
$$;
