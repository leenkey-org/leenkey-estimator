-- L1-27: search of the knowledge base (SPEC-V2 sections 3 and 12), behind the
-- tool search_knowledge of the assistant. Hybrid: the closeness of the
-- embeddings (gte-small, normalized by the Edge Function embed, cosine) and
-- the words of the question in French (full text, the question of a card
-- weighing more than its answer), fused by their ranks (reciprocal rank
-- fusion, k = 60). Measured on the FAQ of Cédric (scripts/kb-eval.mjs,
-- DECISIONS 2026-10-30): the card expected among the 5 returned for 18
-- questions out of 20, against 17 for the embeddings alone; gte-small is
-- weak in French. A card of the current step of the sale is ranked a little
-- closer in meaning. Cards without an embedding are left out (an import
-- computes it).
--
-- The cards stay readable by the admin alone (RLS of knowledge_base, L1-05);
-- a signed-in account reads them through this function, for its audience: a
-- seller the cards for sellers and for both, a buyer those for buyers and
-- for both, an admin all of them. 5 cards at most.

alter table public.knowledge_base
  add column search_document tsvector generated always as (
    setweight(to_tsvector('french'::regconfig, question), 'A')
      || setweight(to_tsvector('french'::regconfig, answer), 'D')
  ) stored;
create index knowledge_base_search_idx on public.knowledge_base using gin (search_document);

create function public.search_knowledge(
  p_embedding extensions.vector(384),
  p_query text,
  p_audience text,
  p_step_code text default null,
  p_limit integer default 5
) returns table (
  id uuid,
  category text,
  step_code text,
  question text,
  answer text,
  similarity double precision,
  score double precision
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  -- Any of the words of the question: plainto_tsquery joins them with AND.
  v_words tsquery := nullif(
    replace(plainto_tsquery('french'::regconfig, coalesce(p_query, ''))::text, ' & ', ' | '), ''
  )::tsquery;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'search_knowledge: signed-in active account required' using errcode = '42501';
  end if;
  if p_embedding is null then
    raise exception 'search_knowledge: embedding required' using errcode = '22004';
  end if;
  if p_audience is null or p_audience not in ('seller', 'buyer', 'admin')
     or (p_audience = 'admin' and not public.is_admin()) then
    raise exception 'search_knowledge: unknown audience' using errcode = '22023';
  end if;

  return query
    with cards as (
      select kb.id, kb.embedding, kb.search_document,
             -- A card of the current step a little closer in meaning.
             (kb.embedding operator(extensions.<=>) p_embedding)
               - case when p_step_code is not null and kb.step_code = p_step_code then 0.02 else 0 end
               as distance
      from public.knowledge_base kb
      where kb.embedding is not null
        and (p_audience = 'admin' or kb.audience in (p_audience, 'both'))
    ),
    by_meaning as (
      select c.id, row_number() over (order by c.distance, c.id) as position
      from cards c
      order by c.distance, c.id
      limit 20
    ),
    by_words as (
      select c.id, row_number() over (order by ts_rank_cd(c.search_document, v_words) desc, c.id) as position
      from cards c
      where v_words is not null and c.search_document @@ v_words
      order by ts_rank_cd(c.search_document, v_words) desc, c.id
      limit 20
    ),
    fused as (
      select coalesce(m.id, w.id) as card_id,
             coalesce(1.0 / (60 + m.position), 0) + coalesce(1.0 / (60 + w.position), 0) as fused_score
      from by_meaning m
      full join by_words w on w.id = m.id
    )
    select kb.id, kb.category, kb.step_code, kb.question, kb.answer,
           (1 - (kb.embedding operator(extensions.<=>) p_embedding))::double precision,
           f.fused_score::double precision
    from fused f
    join public.knowledge_base kb on kb.id = f.card_id
    order by 7 desc, kb.id
    limit least(greatest(coalesce(p_limit, 5), 1), 5);
end;
$$;

revoke execute on function public.search_knowledge(extensions.vector, text, text, text, integer) from public, anon;
grant execute on function public.search_knowledge(extensions.vector, text, text, text, integer) to authenticated;
