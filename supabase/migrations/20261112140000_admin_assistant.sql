-- L1-30d (second part): the assistant in the back office (SPEC-V2 section
-- 17, « Assistant /admin/assistant ») and « Synthèse avant appel » of a case.
--
-- 1. ai_conversations.kind: 'case_summary', the summary of a case drafted for
--    the team before a call, logged like the other calls of the model, in the
--    context of the team only (as 'rejection_reason', 2026-11-12).
-- 2. admin_ai_usage: the tokens of the model by day (Europe/Paris), context
--    and model, for the team (rights of the caller: RLS of the log).
-- 3. admin_ai_conversations: the log of the assistant, filtered by context
--    and searched in its messages, for the team (rights of the caller).
-- 4. admin_knowledge_import: the cards of a file of the FAQ, imported by the
--    team as scripts/seed-knowledge.mjs does it (upsert on the file, the
--    category and the question; the embedding reset when the answer
--    changes; the cards gone from the file removed), written in audit_log.

alter table public.ai_conversations
  drop constraint ai_conversations_kind_check;
alter table public.ai_conversations
  add constraint ai_conversations_kind_check
    check (kind in ('chat', 'reply_suggestion', 'listing_description', 'rejection_reason',
                    'case_summary'));

alter table public.ai_conversations
  drop constraint ai_conversations_rejection_reason_check;
alter table public.ai_conversations
  add constraint ai_conversations_team_kinds_check
    check (kind not in ('rejection_reason', 'case_summary') or context = 'admin');

-- 2. Tokens by day ----------------------------------------------------------
create function public.admin_ai_usage(p_days integer default 30)
returns table (
  day date,
  context text,
  model text,
  answers bigint,
  input_tokens bigint,
  output_tokens bigint,
  cache_read_tokens bigint,
  cache_write_tokens bigint
)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin_ai_usage: admin only' using errcode = '42501';
  end if;
  return query
    select (m.created_at at time zone 'Europe/Paris')::date,
           c.context,
           coalesce(m.model, ''),
           count(*),
           coalesce(sum(m.input_tokens), 0)::bigint,
           coalesce(sum(m.output_tokens), 0)::bigint,
           -- Read from the prompt cache, written to it: kept beside the
           -- answer (core/ai/log.ts), billed apart from input_tokens.
           coalesce(sum((m.content -> 'usage' ->> 'cacheReadInputTokens')::bigint), 0)::bigint,
           coalesce(sum((m.content -> 'usage' ->> 'cacheCreationInputTokens')::bigint), 0)::bigint
      from public.ai_messages m
      join public.ai_conversations c on c.id = m.conversation_id
     where m.role = 'assistant'
       and m.created_at >= (date_trunc('day', now() at time zone 'Europe/Paris')
                            - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 366) - 1))
                           at time zone 'Europe/Paris'
     group by 1, 2, 3
     order by 1 desc, 2, 3;
end;
$$;

-- The answers of a period: read by date, not by conversation. The log of
-- the team: its conversations by date.
create index ai_conversations_created_idx on public.ai_conversations (created_at desc);
create index ai_messages_created_idx on public.ai_messages (created_at) where role = 'assistant';

revoke execute on function public.admin_ai_usage(integer) from public, anon;
grant execute on function public.admin_ai_usage(integer) to authenticated;

-- 3. The log -----------------------------------------------------------------
create function public.admin_ai_conversations(
  p_context text default null,
  p_query text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  context text,
  kind text,
  created_at timestamptz,
  last_at timestamptz,
  messages bigint,
  input_tokens bigint,
  output_tokens bigint,
  first_name text,
  last_name text,
  reference text,
  first_question text
)
language plpgsql stable security invoker set search_path = '' as $$
#variable_conflict use_column
declare
  v_query text := nullif(btrim(left(coalesce(p_query, ''), 100)), '');
  v_pattern text;
begin
  if not public.is_admin() then
    raise exception 'admin_ai_conversations: admin only' using errcode = '42501';
  end if;
  if p_context is not null and p_context not in ('seller', 'buyer', 'admin', 'visitor') then
    raise exception 'admin_ai_conversations: unknown context' using errcode = '22023';
  end if;
  v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  -- The conversations first, the most recent first (index of L1-05 on
  -- profile and date, the date alone for the team), then their messages
  -- summed: the cost follows the page, not the size of the log.
  return query
    with picked as (
      select c.id, c.context, c.kind, c.created_at, c.profile_id, c.property_id
        from public.ai_conversations c
        left join public.profiles p on p.id = c.profile_id
        left join public.listings l on l.property_id = c.property_id and l.deleted_at is null
       where (p_context is null or c.context = p_context)
         and (v_query is null
              or exists (select 1 from public.ai_messages s
                          where s.conversation_id = c.id
                            and ((s.content ->> 'text') ilike v_pattern
                                 or (s.content -> 'blocks')::text ilike v_pattern))
              or l.reference ilike v_pattern
              or concat_ws(' ', p.first_name, p.last_name) ilike v_pattern)
       order by c.created_at desc
       limit least(greatest(coalesce(p_limit, 100), 1), 201))
    select k.id, k.context, k.kind, k.created_at,
           coalesce(max(m.created_at), k.created_at),
           count(m.id),
           coalesce(sum(m.input_tokens), 0)::bigint,
           coalesce(sum(m.output_tokens), 0)::bigint,
           p.first_name, p.last_name, l.reference,
           -- What a person wrote first; never the data given to the model.
           (select left(coalesce(f.content ->> 'text', ''), 200)
              from public.ai_messages f
             where f.conversation_id = k.id and f.role = 'user'
               and f.content ->> 'type' = 'user'
             order by f.created_at limit 1)
      from picked k
      left join public.ai_messages m on m.conversation_id = k.id
      left join public.profiles p on p.id = k.profile_id
      left join public.listings l on l.property_id = k.property_id and l.deleted_at is null
     group by k.id, k.context, k.kind, k.created_at, p.first_name, p.last_name, l.reference
     order by k.created_at desc;
end;
$$;

revoke execute on function public.admin_ai_conversations(text, text, integer) from public, anon;
grant execute on function public.admin_ai_conversations(text, text, integer) to authenticated;

-- 4. Import of a file of the FAQ --------------------------------------------
-- The cards of the import, trimmed (an empty step is none).
create function public.knowledge_import_cards(p_cards jsonb)
returns table (audience text, category text, step_code text, question text, answer text)
language sql immutable set search_path = '' as $$
  select x.audience, btrim(x.category), nullif(btrim(coalesce(x.step_code, '')), ''),
         btrim(x.question), btrim(x.answer)
    from jsonb_to_recordset(p_cards)
         as x(audience text, category text, step_code text, question text, answer text);
$$;
revoke execute on function public.knowledge_import_cards(jsonb) from public, anon, authenticated;

create function public.admin_knowledge_import(p_source_file text, p_cards jsonb)
returns table (inserted integer, updated integer, removed integer, unchanged integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_total integer;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_removed integer := 0;
begin
  if not public.is_admin() then
    raise exception 'admin_knowledge_import: admin only' using errcode = '42501';
  end if;
  if p_source_file is null or p_source_file !~ '^[a-z0-9][a-z0-9._-]{0,80}\.md$' then
    raise exception 'admin_knowledge_import: file name' using errcode = '22023';
  end if;
  if p_cards is null or jsonb_typeof(p_cards) is distinct from 'array'
     or jsonb_array_length(p_cards) not between 1 and 300 then
    raise exception 'admin_knowledge_import: 1 to 300 cards' using errcode = '22023';
  end if;

  -- The cards as they are imported: trimmed, an empty step is none.
  if exists (select 1 from jsonb_array_elements(p_cards) e where jsonb_typeof(e) <> 'object') then
    raise exception 'admin_knowledge_import: invalid card' using errcode = '22023';
  end if;
  if exists (select 1 from public.knowledge_import_cards(p_cards) i
              where i.audience is null or i.audience not in ('seller', 'buyer', 'both')
                 or coalesce(i.category, '') = '' or char_length(i.category) > 80
                 or coalesce(i.question, '') = '' or char_length(i.question) > 300
                 or coalesce(i.answer, '') = '' or char_length(i.answer) > 4000
                 or char_length(coalesce(i.step_code, '')) > 80) then
    raise exception 'admin_knowledge_import: invalid card' using errcode = '22023';
  end if;
  select count(*) into v_total from public.knowledge_import_cards(p_cards);
  if v_total <> (select count(distinct (i.category, i.question))
                   from public.knowledge_import_cards(p_cards) i) then
    raise exception 'admin_knowledge_import: a question twice in a category' using errcode = '22023';
  end if;

  with changed as (
    update public.knowledge_base k
       set audience = i.audience, step_code = i.step_code, answer = i.answer,
           embedding = case when k.answer is distinct from i.answer then null else k.embedding end,
           updated_at = now()
      from public.knowledge_import_cards(p_cards) i
     where k.source_file = p_source_file and k.category = i.category and k.question = i.question
       and (k.audience, k.step_code, k.answer) is distinct from (i.audience, i.step_code, i.answer)
    returning 1)
  select count(*) into v_updated from changed;

  with added as (
    insert into public.knowledge_base (audience, category, step_code, question, answer, source_file)
    select i.audience, i.category, i.step_code, i.question, i.answer, p_source_file
      from public.knowledge_import_cards(p_cards) i
     where not exists (select 1 from public.knowledge_base k
                        where k.source_file = p_source_file
                          and k.category = i.category and k.question = i.question)
    returning 1)
  select count(*) into v_inserted from added;

  with gone as (
    delete from public.knowledge_base k
     where k.source_file = p_source_file
       and not exists (select 1 from public.knowledge_import_cards(p_cards) i
                        where i.category = k.category and i.question = k.question)
    returning 1)
  select count(*) into v_removed from gone;

  perform public.audit('knowledge.import', 'knowledge_base', null,
                       jsonb_build_object('file', p_source_file, 'cards', v_total,
                                          'inserted', v_inserted, 'updated', v_updated,
                                          'removed', v_removed));
  return query select v_inserted, v_updated, v_removed, v_total - v_inserted - v_updated;
end;
$$;

revoke execute on function public.admin_knowledge_import(text, jsonb) from public, anon;
grant execute on function public.admin_knowledge_import(text, jsonb) to authenticated;
