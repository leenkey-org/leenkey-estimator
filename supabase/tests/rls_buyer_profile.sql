-- L1-25: the buying project of a buyer. They write their own project, never
-- its status; a seller sees the status, never the amounts (criterion of L1-25).
begin;
\ir _helpers.psql
select plan(9);
\ir _plan.psql

-- What a seller can read about the buyers: no amount in any of its results
-- (the rows themselves, status for the seller of the property and nothing
-- for another one: rls_plans_sales_messaging.sql).
select ok(pg_get_function_result('public.buyer_summary_for_seller(uuid)'::regprocedure) !~ 'cents|budget|down_payment|loan',
          'buyer_summary_for_seller: no amount among its columns');
select ok(pg_get_function_result('public.conversation_summaries(uuid)'::regprocedure) !~ 'cents|budget|down_payment|loan',
          'conversation_summaries: no amount among its columns');

-- Buyer C ------------------------------------------------------------------
\set who buyer_c
\ir _as.psql
select lives_ok($$update buyer_profiles set project = 'investissement', target_cities = '{Savigny-sur-Orge,Juvisy-sur-Orge}',
                  budget_max_cents = 30000000, down_payment_cents = 5000000, loan_needed = true,
                  loan_amount_cents = 25000000, situation_note = 'CDI' where profile_id = tests.uid('buyer_c')$$,
                'buyer_c: saves their project');
select is((select financing_status from buyer_profiles where profile_id = tests.uid('buyer_c')),
          'declared'::financing_status, 'buyer_c: project, budget, down payment and loan need: declared');
select lives_ok($$update buyer_profiles set loan_needed = null where profile_id = tests.uid('buyer_c')$$,
                'buyer_c: clears the loan need');
select is((select financing_status from buyer_profiles where profile_id = tests.uid('buyer_c')),
          'not_provided'::financing_status, 'buyer_c: incomplete again: not provided');
select throws_ok($$update buyer_profiles set financing_status = 'document_checked' where profile_id = tests.uid('buyer_c')$$,
                 '42501', null, 'buyer_c: never writes the status');

-- Buyer D ------------------------------------------------------------------
\set who buyer_d
\ir _as.psql
update buyer_profiles set budget_max_cents = 1 where profile_id = tests.uid('buyer_c');
\set who buyer_c
\ir _as.psql
select is((select budget_max_cents from buyer_profiles where profile_id = tests.uid('buyer_c')), 30000000::bigint,
          'buyer_d: cannot change the project of buyer_c');

-- Seller A -----------------------------------------------------------------
\set who seller_a
\ir _as.psql
select is((select count(*) from buyer_profiles where profile_id = tests.uid('buyer_c'))::int, 0,
          'seller_a: never reads the project of a buyer');

select * from finish();
rollback;
