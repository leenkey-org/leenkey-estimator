-- The assistant of the public site (DECISIONS.md 2026-11-07): a visitor
-- without an account asks basic questions and is helped to subscribe; the
-- answers come from the plans and the FAQ only, no tool. Its conversations
-- are kept in the log of the assistant (ai_conversations, ai_messages) for
-- the admin to read again, with no account: context 'visitor', no profile,
-- the visitor and its address known by a keyed hash only (visitor_key,
-- ip_key, computed by the server with a key of its own, leenkey/ai/visitor.ts).
-- The hash of the address is cleared once its day is over, the conversations
-- are deleted after 30 days (ai_visitor_purge).
--
-- A visitor has no session: nothing is opened to it on the tables. The
-- route of the site calls four functions without a session; each first
-- checks that the caller is the server of the site (ai_visitor_server: a
-- key derived from CRON_SECRET, the secret of the jobs that the Vault holds
-- as cron_secret), so that nobody calls them straight with the public anon
-- key (no question counted, no answer written but by the site):
-- 1. ai_visitor_ask: the limits of the day (10 questions per visitor, 30 per
--    address, 300 for the whole site; core/ai/quotas.ts), then the question
--    written, in the conversation of this visitor of the day from this
--    address, or a new one.
-- 2. ai_visitor_history: the last messages of a conversation of this visitor.
-- 3. ai_visitor_answer: the answer to the last question, once, in the shape
--    of an answer of the model (text and thinking, its size bounded).
-- 4. knowledge_cards_visitor: the cards of the FAQ, for its system prompt.

alter table public.ai_conversations
  drop constraint ai_conversations_context_check;
alter table public.ai_conversations
  add constraint ai_conversations_context_check
    check (context in ('seller', 'buyer', 'admin', 'visitor'));

alter table public.ai_conversations alter column profile_id drop not null;
alter table public.ai_conversations
  add column visitor_key text,
  add column ip_key text;

-- A conversation of a visitor has no profile and its hashes (the one of
-- the address cleared after its day); any other has a profile and none of them.
alter table public.ai_conversations
  add constraint ai_conversations_visitor_check check (
    case when context = 'visitor'
      then profile_id is null and kind = 'chat' and property_id is null
           and visitor_key ~ '^[0-9a-f]{64}$' and (ip_key is null or ip_key ~ '^[0-9a-f]{64}$')
      else profile_id is not null and visitor_key is null and ip_key is null
    end);

create index ai_conversations_visitor_idx
  on public.ai_conversations (visitor_key, created_at desc) where context = 'visitor';
create index ai_conversations_visitor_ip_idx
  on public.ai_conversations (ip_key, created_at desc) where context = 'visitor';
create index ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at desc);

-- The caller is the server of the site: it alone holds CRON_SECRET, from
-- which it derives this key (leenkey/ai/visitor.ts, serverKey). Without the
-- secret in the Vault, nothing passes (the assistant of the site is then
-- unavailable). The two keys compared by their hashes, not byte by byte.
create function public.ai_visitor_server(p_key text) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_expected text;
begin
  select encode(extensions.hmac('leenkey:ai-visitor:server', s.decrypted_secret, 'sha256'), 'hex')
    into v_expected
    from vault.decrypted_secrets s
   where s.name = 'cron_secret';
  if v_expected is null or p_key is null
     or extensions.digest(p_key, 'sha256') <> extensions.digest(v_expected, 'sha256') then
    raise exception 'ai_visitor: only the site calls this' using errcode = '42501';
  end if;
end;
$$;

-- Start of the day in Europe/Paris, as the limits of the accounts (ai_quota_consume).
create function public.ai_visitor_day_start() returns timestamptz
language sql stable set search_path = '' as $$
  select (date_trunc('day', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
$$;

-- The questions of the visitors since the start of the day: all of them, or
-- those of a visitor, or of an address (a conversation takes questions from
-- one address on its day only: ai_visitor_ask).
create function public.ai_visitor_questions(p_visitor text default null, p_ip text default null)
returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.ai_messages m
    join public.ai_conversations c on c.id = m.conversation_id
   where c.context = 'visitor' and m.role = 'user'
     and m.created_at >= public.ai_visitor_day_start()
     and (p_visitor is null or c.visitor_key = p_visitor)
     and (p_ip is null or c.ip_key = p_ip);
$$;

-- A conversation of this visitor, opened less than a day ago, or null: the
-- one a question was just written to (its answer may end after midnight).
create function public.ai_visitor_conversation(p_visitor text, p_conversation uuid)
returns uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.ai_conversations c
   where c.id = p_conversation and c.context = 'visitor' and c.visitor_key = p_visitor
     and c.created_at > now() - interval '1 day';
$$;

-- Limits of the day, also in core/ai/quotas.ts (tests/unit/ai/visitor.test.ts
-- checks that both say the same): per visitor, per address, for the site.
create function public.ai_visitor_ask(
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
  if public.ai_visitor_questions() >= 300 then
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

-- The last 40 rows of a conversation of this visitor, oldest first.
create function public.ai_visitor_history(p_key text, p_visitor text, p_conversation uuid)
returns table (role text, content jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_conversation uuid;
begin
  perform public.ai_visitor_server(p_key);
  v_conversation := public.ai_visitor_conversation(p_visitor, p_conversation);
  if v_conversation is null then
    raise exception 'ai_visitor_history: no such conversation' using errcode = 'P0002';
  end if;
  return query
    select x.role, x.content, x.created_at
      from (select m.role, m.content, m.created_at
              from public.ai_messages m
             where m.conversation_id = v_conversation
             order by m.created_at desc
             limit 40) x
     order by x.created_at;
end;
$$;

-- The answer to the last question of a conversation of this visitor, once:
-- never more answers than questions. In the shape of an answer of the model
-- (leenkey/ai/visitor.ts, answerRow): text and thinking only, its tokens
-- within the cap of the route (VISITOR_SETTINGS.maxTokens).
create function public.ai_visitor_answer(
  p_key text,
  p_visitor text,
  p_conversation uuid,
  p_content jsonb,
  p_model text,
  p_input_tokens int,
  p_output_tokens int
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_conversation uuid;
begin
  perform public.ai_visitor_server(p_key);
  v_conversation := public.ai_visitor_conversation(p_visitor, p_conversation);
  if v_conversation is null then
    raise exception 'ai_visitor_answer: no such conversation' using errcode = 'P0002';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object'
     or p_content ->> 'type' is distinct from 'assistant'
     or jsonb_typeof(p_content -> 'blocks') is distinct from 'array'
     or exists (select 1 from jsonb_array_elements(p_content -> 'blocks') b
                 where coalesce(b ->> 'type', '') not in ('text', 'thinking', 'redacted_thinking'))
     or octet_length(p_content::text) > 32768
     or p_model is null or char_length(p_model) > 100
     or coalesce(p_input_tokens, -1) < 0 or coalesce(p_output_tokens, -1) < 0
     or p_input_tokens > 100000 or p_output_tokens > 1500 then
    raise exception 'ai_visitor_answer: invalid answer' using errcode = '22023';
  end if;
  perform 1 from public.ai_conversations c where c.id = v_conversation for update;
  if (select count(*) filter (where m.role = 'assistant') >= count(*) filter (where m.role = 'user')
        from public.ai_messages m where m.conversation_id = v_conversation) then
    return false;
  end if;
  insert into public.ai_messages (conversation_id, role, content, model, input_tokens, output_tokens)
  values (v_conversation, 'assistant', p_content, p_model, p_input_tokens, p_output_tokens);
  return true;
end;
$$;

-- The FAQ for the system prompt of the assistant of the site: every card
-- (the questions of a seller, a buyer and both), as knowledge_cards reads
-- them, always in the same order (the prompt is cached).
create function public.knowledge_cards_visitor(p_key text)
returns table (id uuid, category text, step_code text, question text, answer text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.ai_visitor_server(p_key);
  return query
    select kb.id, kb.category, kb.step_code, kb.question, kb.answer
      from public.knowledge_base kb
     where kb.audience in ('seller', 'buyer', 'both')
     order by kb.category collate "C", kb.question collate "C", kb.id;
end;
$$;

-- What is kept of the visitors: the hash of an address for its day only
-- (the limits of the day), the conversations 30 days. Every night.
create function public.ai_visitor_purge() returns void
language sql security definer set search_path = '' as $$
  update public.ai_conversations set ip_key = null
   where context = 'visitor' and ip_key is not null
     and created_at < public.ai_visitor_day_start();
  delete from public.ai_conversations
   where context = 'visitor' and created_at < now() - interval '30 days';
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-visitor-assistant';
    perform cron.schedule('purge-visitor-assistant', '17 3 * * *',
                          $job$select public.ai_visitor_purge()$job$);
  end if;
end;
$$;

revoke execute on function public.ai_visitor_server(text) from public, anon, authenticated;
revoke execute on function public.ai_visitor_day_start() from public;
revoke execute on function public.ai_visitor_questions(text, text) from public, anon, authenticated;
revoke execute on function public.ai_visitor_conversation(text, uuid) from public, anon, authenticated;
revoke execute on function public.ai_visitor_purge() from public, anon, authenticated;
revoke execute on function public.ai_visitor_ask(text, text, text, uuid, text) from public;
revoke execute on function public.ai_visitor_history(text, text, uuid) from public;
revoke execute on function public.ai_visitor_answer(text, text, uuid, jsonb, text, int, int) from public;
revoke execute on function public.knowledge_cards_visitor(text) from public;
grant execute on function public.ai_visitor_day_start() to anon, authenticated;
grant execute on function public.ai_visitor_ask(text, text, text, uuid, text) to anon, authenticated;
grant execute on function public.ai_visitor_history(text, text, uuid) to anon, authenticated;
grant execute on function public.ai_visitor_answer(text, text, uuid, jsonb, text, int, int) to anon, authenticated;
grant execute on function public.knowledge_cards_visitor(text) to anon, authenticated;
