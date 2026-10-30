-- L1-27: search_knowledge, the hybrid search of the knowledge base. A
-- signed-in account reads the cards of its audience (and those for both),
-- never the table itself; an admin reads them all; 5 cards at most, fused by
-- the ranks of their closeness and of their words; a card of the current step
-- a little first; cards without an embedding left out. Synthetic embeddings:
-- unit vectors, so that the closeness is known (1 for the same vector, 0.8 for
-- the mix below, 0 for an orthogonal one).
begin;
\ir _helpers.psql
select plan(15);
\ir _plan.psql

create function tests.kb_vector(p_weights double precision[]) returns extensions.vector
language sql immutable as $$
  select (array(select coalesce(p_weights[g], 0) from generate_series(1, 384) g))::real[]::extensions.vector;
$$;
grant execute on function tests.kb_vector(double precision[]) to authenticated, anon;

-- The cards of the seed (or of a previous import) stay out of the way.
update knowledge_base set embedding = null;
insert into knowledge_base (audience, category, step_code, question, answer, source_file, embedding) values
  ('seller', 'test', 'S3', 'Q seller S3', 'Réponse.', 'rls-test', tests.kb_vector('{1}')),
  ('buyer', 'test', null, 'Q buyer', 'Réponse.', 'rls-test', tests.kb_vector('{1}')),
  ('both', 'test', null, 'Q both', 'Réponse.', 'rls-test', tests.kb_vector('{0.8,0.6}')),
  ('seller', 'test', 'S2', 'Q seller S2', 'Réponse.', 'rls-test', tests.kb_vector('{0.8,0.6}')),
  ('seller', 'test', null, 'Q seller without embedding', 'Le notaire rédige l''acte.', 'rls-test', null),
  ('both', 'test', null, 'Q both far 1', 'Réponse.', 'rls-test', tests.kb_vector('{0,0,1}')),
  ('both', 'test', null, 'Q both far 2', 'Réponse.', 'rls-test', tests.kb_vector('{0,0,0,1}')),
  ('seller', 'test', null, 'Dois-je choisir un notaire ?', 'Le notaire est choisi par le vendeur.', 'rls-test',
   tests.kb_vector('{-1}'));

select ok(not has_function_privilege('anon', 'public.search_knowledge(extensions.vector, text, text, text, integer)', 'execute'),
          'anon: may not search the knowledge base');

-- Seller A --------------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is((select count(*) from knowledge_base)::int, 0, 'seller_a: still no direct read of the table');
select is((select array_agg(question order by question)
           from search_knowledge(tests.kb_vector('{1}'), null, 'seller')),
          '{"Q both","Q both far 1","Q both far 2","Q seller S2","Q seller S3"}'::text[],
          'seller_a: the closest cards for sellers and for both, never for buyers, never without an embedding');
select is((select round(similarity::numeric, 3) from search_knowledge(tests.kb_vector('{1}'), null, 'seller') limit 1),
          1.000, 'seller_a: the same vector, similarity 1');
select is((select array_agg(question) from search_knowledge(tests.kb_vector('{1}'), null, 'seller', 'S2', 2)),
          '{"Q seller S3","Q seller S2"}'::text[],
          'seller_a: a card of the current step before an equally close card, never before a closer one');
select is((select question from search_knowledge(tests.kb_vector('{1}'), 'Faut-il un notaire ?', 'seller') limit 1),
          'Dois-je choisir un notaire ?', 'seller_a: the words of the question bring a card far in meaning first');
select ok(not exists (select 1 from search_knowledge(tests.kb_vector('{1}'), 'notaire', 'seller')
                      where question = 'Q seller without embedding'),
          'seller_a: a card without an embedding is left out, even when its words match');
select is((select count(*) from search_knowledge(tests.kb_vector('{1}'), '', 'seller', null, 2))::int, 2,
          'seller_a: the number of cards asked');
select throws_ok($$select * from search_knowledge(tests.kb_vector('{1}'), null, 'admin')$$, '22023', null,
                 'seller_a: the audience of the admin is refused');
select throws_ok($$select * from search_knowledge(tests.kb_vector('{1}'), null, 'tous')$$, '22023', null,
                 'seller_a: an unknown audience is refused');
select throws_ok($$select * from search_knowledge(null, 'notaire', 'seller')$$, '22004', null,
                 'seller_a: an embedding is required');

-- Buyer C ---------------------------------------------------------------------
\set who buyer_c
\ir _as.psql
select is((select array_agg(question order by question)
           from search_knowledge(tests.kb_vector('{1}'), 'notaire', 'buyer')),
          '{"Q both","Q both far 1","Q both far 2","Q buyer"}'::text[],
          'buyer_c: cards for buyers and for both, never for sellers, even when their words match');

-- Admin -----------------------------------------------------------------------
\set who admin
\ir _as.psql
select is((select count(*) from search_knowledge(tests.kb_vector('{1}'), null, 'admin', null, 50))::int, 5,
          'admin: every audience, 5 cards at most even when more are asked');
select is((select count(*) from search_knowledge(tests.kb_vector('{1}'), null, 'admin', null, 0))::int, 1,
          'admin: at least one card');

-- A suspended account ---------------------------------------------------------
reset role;
update profiles set suspended_at = now() where id = tests.uid('buyer_d');
\set who buyer_d
\ir _as.psql
select throws_ok($$select * from search_knowledge(tests.kb_vector('{1}'), null, 'buyer')$$, '42501', null,
                 'buyer_d suspended: no search');

select * from finish();
rollback;
