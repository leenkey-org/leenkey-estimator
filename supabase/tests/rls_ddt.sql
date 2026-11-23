-- DDT filed at once, level A (SPEC-V2 15, DECISIONS.md 2026-11-23): a DDT is
-- filed with the diagnostics it covers; only a DDT has some, at least one,
-- diagnostics only; no client writes the column; its seller alone changes
-- it; a buyer reads it only for a document shared with them; nothing of a
-- DDT is ever shown on a listing. Fixtures in 99995.
begin;
\ir _helpers.psql
select plan(27);
\ir _plan.psql

\set who seller_a
\ir _as.psql
insert into properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms, location)
values (tests.uid('seller_a'), 'maison', '5 rue du Diagnostic', '99995', 'Diagville', 90, 4,
        extensions.st_setsrid(extensions.st_makepoint(2.41, 48.76), 4326)::extensions.geography)
returning id as prop \gset
insert into listings (property_id, title, description, price_cents)
values (:'prop', 'Maison au DDT', 'Description.', 30000000)
returning id as listing \gset
\o /dev/null
select tests.dpe(:'listing');
select listing_submit(:'listing');
\o
\set who admin
\ir _as.psql
\o /dev/null
select listing_publish(:'listing');
\o
select :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path_ddt,
       :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path_dpe,
       :'prop' || '/sale/' || gen_random_uuid() || '.pdf' as path_bad \gset

-- Filing
\set who seller_a
\ir _as.psql
insert into storage.objects (bucket_id, name, owner, metadata) values
  ('documents', :'path_ddt', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}'),
  ('documents', :'path_dpe', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}'),
  ('documents', :'path_bad', tests.uid('seller_a'), '{"mimetype": "application/pdf", "size": 1000}');
select document_add(:'prop', 'ddt', 'Dossier de diagnostics (DDT)', :'path_ddt',
                    array['plomb', 'dpe', 'amiante', 'dpe']::document_type[]) as ddt \gset
select is((select covers from documents where id = :'ddt'), array['dpe', 'amiante', 'plomb']::document_type[],
          'seller_a: files a DDT with the diagnostics it covers, each once, in the order of the types');
select document_add(:'prop', 'dpe', 'DPE', :'path_dpe') as dpe \gset
select is((select covers from documents where id = :'dpe'), '{}'::document_type[],
          'a document filed as before (four arguments) covers nothing');
select throws_ok(format($$select document_add(%L, 'ddt', 'DDT', %L)$$, :'prop', :'path_bad'),
                 '22023', null, 'a DDT covers at least one diagnostic');
select throws_ok(format($$select document_add(%L, 'ddt', 'DDT', %L, array['dpe', 'titre_propriete']::document_type[])$$, :'prop', :'path_bad'),
                 '22023', null, 'a DDT covers diagnostics only');
select throws_ok(format($$select document_add(%L, 'erp', 'ERP', %L, array['erp']::document_type[])$$, :'prop', :'path_bad'),
                 '22023', null, 'only a DDT covers diagnostics');

-- No client writes the column, nor makes or unmakes a DDT by its type.
select throws_ok(format($$update documents set covers = array['gaz']::document_type[] where id = %L$$, :'ddt'),
                 '42501', null, 'seller_a: the coverage is not a column a client writes');
select throws_ok(format($$update documents set type = 'dpe' where id = %L$$, :'ddt'),
                 '23514', null, 'seller_a: a DDT does not become another document');
select throws_ok(format($$update documents set type = 'ddt' where id = %L$$, :'dpe'),
                 '23514', null, 'seller_a: a document does not become a DDT');

-- Changing the coverage
select lives_ok(format($$select document_coverage_set(%L, array['erp', 'plomb', 'erp']::document_type[])$$, :'ddt'),
                'seller_a: changes what their DDT covers');
select is((select covers from documents where id = :'ddt'), array['plomb', 'erp']::document_type[],
          'the coverage is the one said last');
select throws_ok(format($$select document_coverage_set(%L, array['dpe']::document_type[])$$, :'dpe'),
                 '22023', null, 'coverage refused on a document that is not a DDT');
select throws_ok(format($$select document_coverage_set(%L, array['pv_ag']::document_type[])$$, :'ddt'),
                 '22023', null, 'coverage refused for a type that is not a diagnostic');
select throws_ok(format($$select document_coverage_set(%L, '{}'::document_type[])$$, :'ddt'),
                 '22023', null, 'coverage refused when it is empty');
select is((select covers from documents where id = :'ddt'), array['plomb', 'erp']::document_type[],
          'a refused change leaves the coverage as it was');

\set who seller_b
\ir _as.psql
select throws_ok(format($$select document_coverage_set(%L, array['dpe']::document_type[])$$, :'ddt'),
                 '42501', null, 'seller_b: cannot set the coverage of a document of seller_a');
select is((select count(*)::int from documents where id = :'ddt'), 0,
          'seller_b: reads neither the DDT of seller_a nor its coverage');
\set who anon
\ir _as.psql
select throws_ok(format($$select document_coverage_set(%L, array['dpe']::document_type[])$$, :'ddt'),
                 '42501', null, 'anon: no access');

-- A buyer reads the coverage only for a document shared with them.
\set who buyer_c
\ir _as.psql
\o /dev/null
select conversation_open(:'listing', 'Bonjour, puis-je voir vos diagnostics ?');
\o
select is((select count(*)::int from documents where id = :'ddt'), 0,
          'buyer_c: in contact, nothing shared: no coverage read');
select is((select count(*)::int from shared_documents()), 0, 'buyer_c: nothing listed yet');
\set who seller_a
\ir _as.psql
\o /dev/null
select document_share(array[:'ddt']::uuid[], tests.uid('buyer_c'));
\o
\set who buyer_c
\ir _as.psql
select is((select covers from documents where id = :'ddt'), array['plomb', 'erp']::document_type[],
          'buyer_c: reads the coverage of the DDT shared with them');
select is((select type::text || '|' || title || '|' || array_to_string(covers, ',') from shared_documents()),
          'ddt|Dossier de diagnostics (DDT)|plomb,erp',
          'buyer_c: the shared DDT is one document, with its name and what it covers');
select throws_ok(format($$select document_coverage_set(%L, array['dpe']::document_type[])$$, :'ddt'),
                 '42501', null, 'buyer_c: reads the coverage, never changes it');
\set who buyer_d
\ir _as.psql
select is((select count(*)::int from documents where id = :'ddt') + (select count(*)::int from shared_documents()), 0,
          'buyer_d: nothing shared, nothing read');

-- Nothing of a DDT is shown on a listing, whatever its analysis holds.
reset role;
update documents
   set analysis = '{"quality": "ok", "public_facts": {"amiante": "absence"}}'::jsonb, analyzed_at = now()
 where id = :'ddt';
\set who seller_a
\ir _as.psql
select throws_ok(format($$select document_public_facts_set(%L, true)$$, :'ddt'),
                 '22023', null, 'seller_a: the facts of a DDT are not shown on the listing');
reset role;
update documents set public_facts_approved_at = now() where id = :'ddt';
\set who anon
\ir _as.psql
select is((select count(*)::int from public_document_facts(:'listing')), 0,
          'anon: no fact of a DDT on the listing, even approved in the table');

-- Removed: the buyer no longer reads it.
\set who seller_a
\ir _as.psql
update documents set deleted_at = now() where id = :'ddt';
select throws_ok(format($$select document_coverage_set(%L, array['dpe']::document_type[])$$, :'ddt'),
                 '42501', null, 'seller_a: a removed DDT is no longer changed');
\set who buyer_c
\ir _as.psql
select is((select count(*)::int from documents where id = :'ddt') + (select count(*)::int from shared_documents()), 0,
          'buyer_c: a removed DDT is no longer read');

select * from finish();
rollback;
