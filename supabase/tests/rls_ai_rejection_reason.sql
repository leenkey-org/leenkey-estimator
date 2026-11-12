-- L1-30d: the motive of a refusal drafted by the assistant is logged under
-- its own kind, by the team only (context 'admin'); read by the team, never
-- by a seller, a buyer or a visitor.
begin;
\ir _helpers.psql
select plan(8);
\ir _plan.psql

\set who admin
\ir _as.psql
select lives_ok($$insert into ai_conversations (profile_id, context, kind)
                  values (tests.uid('admin'), 'admin', 'rejection_reason')$$,
                'admin: logs a motive drafted by the assistant');
select lives_ok($$insert into ai_messages (conversation_id, role, content, model, input_tokens, output_tokens)
                  select id, 'assistant', '{"type":"suggestion","text":"Photos à reprendre."}', 'test-model', 300, 40
                    from ai_conversations where kind = 'rejection_reason'$$,
                'admin: logs the motive and its tokens');
select throws_ok($$insert into ai_conversations (profile_id, context, kind)
                   values (tests.uid('admin'), 'seller', 'rejection_reason')$$,
                 '23514', null, 'admin: a motive of refusal belongs to the admin context only');

\set who seller_a
\ir _as.psql
select throws_ok($$insert into ai_conversations (profile_id, context, kind)
                   values (tests.uid('seller_a'), 'seller', 'rejection_reason')$$,
                 '23514', null, 'seller_a: no motive of refusal in its own context');
select throws_ok($$insert into ai_conversations (profile_id, context, kind)
                   values (tests.uid('seller_a'), 'admin', 'rejection_reason')$$,
                 '42501', null, 'seller_a: never the context of the team');
select is((select count(*) from ai_conversations where kind = 'rejection_reason')::int, 0,
          'seller_a: never the motives drafted for the team');

\set who buyer_c
\ir _as.psql
select is((select count(*) from ai_messages)::int, 0, 'buyer_c: never their log');

\set who anon
\ir _as.psql
select throws_ok('select count(*) from ai_conversations', '42501', null, 'anon: never a log of the assistant');

select * from finish();
rollback;
