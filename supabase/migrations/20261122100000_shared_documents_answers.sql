-- L3-07 (SPEC-V2 sections 12 and 15, DECISIONS.md 2026-11-20 and 2026-11-22):
-- the assistant of a buyer answers their questions about a property from the
-- analyses of the documents shared with them, and names the document each
-- fact comes from.
--
-- shared_document_answers(listing) is shared_document_summaries() of L3-05
-- with what an answer needs beside the summary: the property and its listing
-- (to keep to the documents of one property, and to name it), and the day of
-- the share. The same rule: the documents of the sale file (public.documents)
-- shared with the caller (document_shares), read without a reserve
-- (quality ok), the summary meant for a buyer, never the one of the seller.
-- A financing document or any other file of an account is not a row of
-- public.documents: it is never read here.
--
-- `p_listing`: a listing of the property asked about; null: every property.
-- A listing none of whose documents is shared with the caller gives no row,
-- as a listing that does not exist: nothing says which.
--
-- The listing named beside a document is the last one of its property that
-- is not removed, and only while it is online: the title of a draft, of a
-- listing withdrawn or suspended is not public, so it is not given (null).

create or replace function public.shared_document_answers(p_listing uuid default null)
returns table (document_id uuid, property_id uuid, listing_id uuid, listing_title text, city text,
               title text, type public.document_type, type_detected text, document_date text,
               summary_buyer text, key_facts jsonb, points_of_attention jsonb,
               shared_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, d.property_id, case when l.status = 'published' then l.id end,
         case when l.status = 'published' then l.title end, p.city, d.title, d.type,
         d.analysis->>'type_detected', d.analysis->>'date', d.analysis->>'summary_buyer',
         coalesce(d.analysis->'key_facts', '[]'::jsonb),
         coalesce(d.analysis->'points_of_attention', '[]'::jsonb), s.shared_at
    from public.document_shares s
    join public.documents d on d.id = s.document_id and d.deleted_at is null
    join public.properties p on p.id = d.property_id and p.deleted_at is null
    -- The listing of the property as shared_documents() names it: its last one.
    left join lateral (select li.id, li.title, li.status from public.listings li
                        where li.property_id = p.id and li.deleted_at is null
                        order by li.created_at desc limit 1) l on true
   where s.buyer_id = auth.uid() and d.analyzed_at is not null and d.analysis is not null
     and d.analysis->>'quality' = 'ok'
     and (p_listing is null
          or exists (select 1 from public.listings li
                      where li.id = p_listing and li.property_id = p.id
                        and li.deleted_at is null))
   order by s.shared_at desc, d.id;
$$;

revoke execute on function public.shared_document_answers(uuid) from public, anon;
grant execute on function public.shared_document_answers(uuid) to authenticated;
