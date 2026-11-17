-- P-01 (docs/SECURITE.md): the controls on the whole schema public, so that
-- a table, a function or a bucket added later cannot skip them. Every table
-- has its RLS; every security definer function fixes its search_path; no
-- policy lets anyone write freely; the two buckets are private; the
-- functions a visitor may call are the known ones (a new one is a decision).
begin;
\ir _helpers.psql
select plan(5);

select is((select coalesce(string_agg(c.relname, ', ' order by c.relname), '')
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
          '', 'every table of public has its RLS');

select is((select coalesce(string_agg(p.proname, ', ' order by p.proname), '')
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosecdef
              and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg
                               where cfg like 'search_path=%')),
          '', 'every security definer function fixes its search_path');

select is((select coalesce(string_agg(tablename || '.' || policyname, ', '), '')
             from pg_policies
            where schemaname = 'public' and cmd <> 'SELECT'
              and (qual = 'true' or with_check = 'true')),
          '', 'no policy writes with using (true)');

-- Read through jsonb: the bare database of the CI has no column public.
select is((select coalesce(string_agg(b.id, ', '), '') from storage.buckets b
            where coalesce((to_jsonb(b) ->> 'public')::boolean, false)),
          '', 'no public bucket: files are read through signed URLs or the policies');

select is((select coalesce(string_agg(distinct p.proname, ', ' order by p.proname), '')
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosecdef
              and has_function_privilege('anon', p.oid, 'execute')),
          'ai_visitor_answer, ai_visitor_ask, ai_visitor_history, estimation_record, '
          || 'knowledge_cards_visitor, listing_view_increment, photo_file_readable, '
          || 'public_listing_dpe, public_listing_energy, public_listing_photos, '
          || 'public_listing_summary, public_listings_details, public_listings_rows, '
          || 'rate_limit_hit, search_listings',
          'the security definer functions a visitor may call are the known ones');

select * from finish();
rollback;
