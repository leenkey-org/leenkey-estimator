-- L3-05 (SPEC-V2 section 15, « Analyse IA »): the documents of the sale file
-- read by the assistant, a reading aid for the seller and for the buyers a
-- document is shared with.
--
-- Who writes an analysis: a scheduled task (the route
-- /api/cron/analyze-documents, service role), never a client: a seller must
-- not be able to type an « analysis by the assistant » that buyers read. The
-- task claims a document (two runs never read the same one), sends its file
-- to the model, then records the analysis, or why there is none. Three
-- attempts at most; the seller may ask again, three times a day per document.
--
-- What it may cost is bounded in the queue itself, over a sliding window of
-- 24 hours, whatever is removed or fails meanwhile (document_analysis_attempts
-- keeps one row per document sent, without a link to it): 40 documents sent
-- per property, 60 per owner, 500 for the whole site; and 25 analysed
-- documents at most on a property.
--
-- Who reads it (L3-01: the analysis is not a readable column): the seller
-- through document_analyses(property), a buyer through
-- shared_document_summaries() (the documents shared with them, the summary
-- meant for them, never the one of the seller), anyone through
-- public_document_facts(listing): the facts the seller chose to show on a
-- listing online, never the file, never its title.
--
-- Only the sale file (public.documents) is ever queued: the financing
-- documents and the identity documents live in other tables and never leave
-- for the model.

alter table public.documents
  add column analysis_started_at timestamptz,
  add column analysis_attempts int not null default 0
    check (analysis_attempts between 0 and 3),
  add column analysis_error text
    check (analysis_error in ('not_started', 'unavailable', 'invalid', 'refused', 'unreadable',
                              'too_long', 'too_heavy', 'limit')),
  add column analysis_retried_at timestamptz[] not null default '{}';
-- (The column grants of L3-01 name their columns: none of these is readable
-- or writable by a client.)
create index documents_analysis_queue_idx on public.documents (analysis_attempts, created_at)
  where analyzed_at is null and deleted_at is null and analysis_attempts < 3;

-- The documents filed before this migration are not sent by themselves:
-- their seller starts the analysis with the button (« Lancer l'analyse »).
update public.documents
   set analysis_attempts = 3, analysis_error = 'not_started'
 where analyzed_at is null;

-- The facts shown on the listing are no longer set by an update of the
-- seller (grant of L3-01) but by document_public_facts_set, which checks
-- that there is an analysis to show.
revoke update (public_facts_approved_at) on public.documents from authenticated;

-- A document whose type changes is another document for its analysis: the
-- one written for the type of before goes, with the facts shown on the
-- listing, and the document waits for a new one.
create function public.documents_type_changed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.type is distinct from old.type then
    new.analysis := null;
    new.analyzed_at := null;
    new.public_facts_approved_at := null;
    new.analysis_attempts := 0;
    new.analysis_error := null;
    new.analysis_started_at := null;
  end if;
  return new;
end;
$$;
create trigger documents_type_changed before update of type on public.documents
  for each row execute function public.documents_type_changed();

-- ---------------------------------------------------------------------------
-- What was sent to the model: one row per document claimed, kept 48 hours,
-- without a link to the document (a removed document still counts).
-- Technical: read and written by the functions of the queue only.
-- ---------------------------------------------------------------------------
create table public.document_analysis_attempts (
  id bigint generated always as identity primary key,
  document_id uuid not null,
  property_id uuid not null,
  owner_id uuid not null,
  created_at timestamptz not null default now()
);
create index document_analysis_attempts_created_idx on public.document_analysis_attempts (created_at);
alter table public.document_analysis_attempts enable row level security;
-- No policy: no client reads or writes it.
revoke all on public.document_analysis_attempts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The queue (service role only)
-- ---------------------------------------------------------------------------
-- Claims the next documents to analyse: not analysed, not removed, fewer
-- than 3 attempts, not claimed in the last 10 minutes (a run that died gives
-- its documents back; a document that just failed waits as long). The new
-- ones first. Beyond 25 analysed documents on a property, the next ones are
-- closed with the error 'limit'. Beyond what the last 24 hours allow for
-- the property, its owner or the whole site, a document waits.
create function public.document_analysis_claim(p_limit int default 1)
returns table (document_id uuid, property_id uuid, owner_id uuid, type public.document_type,
               title text, storage_path text, mime_type text, size_bytes int, attempt int,
               last_error text, property_type public.property_type, surface_m2 numeric,
               carrez_m2 numeric)
language sql volatile security definer set search_path = '' as $$
  delete from public.document_analysis_attempts where created_at < now() - interval '48 hours';

  update public.documents d
     set analysis_error = 'limit', analysis_attempts = 3, analysis_started_at = null
   where d.analyzed_at is null and d.deleted_at is null and d.analysis_attempts < 3
     and (d.analysis_started_at is null or d.analysis_started_at < now() - interval '10 minutes')
     and (select count(*) from public.documents o
           where o.property_id = d.property_id and o.deleted_at is null
             and o.analyzed_at is not null) >= 25;

  with recent as (
    select a.property_id, a.owner_id from public.document_analysis_attempts a
     where a.created_at > now() - interval '24 hours'),
  picked as (
    select d.id, d.property_id, d.analysis_error as last_error, p.owner_id as property_owner,
           p.type as property_type, p.surface_m2, p.carrez_m2
      from public.documents d
      join public.properties p on p.id = d.property_id and p.deleted_at is null
     where d.analyzed_at is null and d.deleted_at is null and d.analysis_attempts < 3
       and (d.analysis_started_at is null or d.analysis_started_at < now() - interval '10 minutes')
       and (select count(*) from recent) < 500
       and (select count(*) from recent r where r.property_id = d.property_id) < 40
       and (select count(*) from recent r where r.owner_id = p.owner_id) < 60
     order by d.analysis_attempts, d.created_at
     limit greatest(1, least(coalesce(p_limit, 1), 3))
       for update of d skip locked),
  counted as (
    insert into public.document_analysis_attempts (document_id, property_id, owner_id)
    select picked.id, picked.property_id, picked.property_owner from picked)
  update public.documents d
     set analysis_started_at = now(), analysis_attempts = d.analysis_attempts + 1
    from picked
   where d.id = picked.id
  returning d.id, d.property_id, picked.property_owner, d.type, d.title, d.storage_path,
            d.mime_type, d.size_bytes, d.analysis_attempts, picked.last_error,
            picked.property_type, picked.surface_m2, picked.carrez_m2;
$$;

-- Records the analysis of a document claimed. A document « à vérifier »
-- (illegible, incomplete, not what its type says) tells its seller, by email
-- too: one email per property for those found together. What the model wrote
-- about it is read on the tab, never in a notification.
create function public.document_analysis_record(p_document uuid, p_analysis jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  d record;
  v_quality text := p_analysis->>'quality';
begin
  if jsonb_typeof(p_analysis) is distinct from 'object'
     or v_quality is null
     or v_quality not in ('ok', 'illegible', 'incomplete', 'wrong_type') then
    raise exception 'not an analysis' using errcode = '22023';
  end if;
  update public.documents
     set analysis = p_analysis, analyzed_at = now(), analysis_error = null,
         analysis_started_at = null, public_facts_approved_at = null
   where id = p_document and analyzed_at is null
  returning id, property_id, type, title, deleted_at into d;
  if not found then
    return false;
  end if;
  if d.deleted_at is null and v_quality <> 'ok' then
    perform public.notification_add(
      (select owner_id from public.properties where id = d.property_id),
      'document.needs_attention',
      jsonb_build_object(
        'entity_id', d.id, 'property_id', d.property_id,
        'title', (select l.title from public.listings l
                   where l.property_id = d.property_id order by l.created_at desc limit 1),
        'city', (select p.city from public.properties p where p.id = d.property_id),
        'document_title', d.title, 'document_type', d.type, 'quality', v_quality),
      '/vendeur/biens/' || d.property_id || '/documents',
      'document-quality:' || d.property_id, now());
  end if;
  return true;
end;
$$;

-- No analysis this time: why. `p_final` closes the attempts (a file the
-- model cannot read is not sent again by itself); otherwise the document
-- keeps its claim, and so waits 10 minutes before it is taken again: never
-- twice in the same run.
create function public.document_analysis_fail(p_document uuid, p_error text, p_final boolean)
returns void
language sql volatile security definer set search_path = '' as $$
  update public.documents
     set analysis_error = p_error,
         analysis_started_at = case when p_final then null else now() end,
         analysis_attempts = case when p_final then 3 else analysis_attempts end
   where id = p_document and analyzed_at is null;
$$;

-- The model could not be asked at all (its key refused, its quota reached,
-- its service down): the document was not sent, the attempt is given back,
-- for the document and for the count of what was sent; it waits 10 minutes.
create function public.document_analysis_release(p_document uuid) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.document_analysis_attempts a
   where a.id = (select max(b.id) from public.document_analysis_attempts b
                  where b.document_id = p_document);
  -- Only a document still claimed: one closed meanwhile keeps its state.
  update public.documents
     set analysis_attempts = greatest(0, analysis_attempts - 1), analysis_started_at = now()
   where id = p_document and analyzed_at is null and analysis_started_at is not null;
$$;

-- ---------------------------------------------------------------------------
-- The seller: the analyses of the documents of a property of theirs
-- ---------------------------------------------------------------------------
create function public.document_analyses(p_property uuid)
returns table (document_id uuid, status text, error text, analyzed_at timestamptz, analysis jsonb,
               public_facts_approved_at timestamptz, retries_left int, waiting_since timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id,
         case when d.analyzed_at is not null then 'done'
              when d.analysis_attempts >= 3 then 'failed'
              else 'pending' end,
         case when d.analyzed_at is null and d.analysis_attempts >= 3
              then coalesce(d.analysis_error, 'unavailable') end,
         d.analyzed_at, d.analysis, d.public_facts_approved_at,
         case when d.analysis_error in ('too_long', 'too_heavy', 'limit') then 0
              else greatest(0, 3 - (select count(*) from unnest(d.analysis_retried_at) r
                                     where r > now() - interval '24 hours'))::int end,
         -- Since when it waits: its last « Relancer », or its filing.
         coalesce((select max(r) from unnest(d.analysis_retried_at) r), d.created_at)
    from public.documents d
   where d.property_id = p_property and d.deleted_at is null
     and (public.owns_property(p_property) or public.is_admin());
$$;

-- « Lancer l'analyse » / « Relancer l'analyse » of a document that has none
-- and does not wait for one: three times a day per document at most. Never
-- for a file that cannot be sent as it is (too long, too heavy) nor beyond
-- the 25 documents of a property.
create function public.document_analysis_retry(p_document uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
  v_recent timestamptz[];
begin
  select * into d from public.documents where id = p_document and deleted_at is null for update;
  if not found or not public.is_active_user() or not public.property_is_editable(d.property_id) then
    raise exception 'not a document of yours' using errcode = '42501';
  end if;
  if d.analyzed_at is not null or d.analysis_attempts < 3
     or d.analysis_error in ('too_long', 'too_heavy', 'limit') then
    raise exception 'not an analysis to ask again' using errcode = '22023';
  end if;
  v_recent := array(select r from unnest(d.analysis_retried_at) r
                     where r > now() - interval '24 hours');
  if cardinality(v_recent) >= 3 then
    raise exception 'analysis_retries_per_day' using errcode = '54000';
  end if;
  update public.documents
     set analysis_attempts = 0, analysis_error = null, analysis_started_at = null,
         analysis_retried_at = v_recent || now()
   where id = p_document;
end;
$$;

-- « Afficher sur l'annonce » / « Retirer de l'annonce »: the public facts of
-- an analysis, shown on the listing once its seller says so.
create function public.document_public_facts_set(p_document uuid, p_show boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
begin
  select * into d from public.documents where id = p_document and deleted_at is null for update;
  if not found or not public.is_active_user() or not public.property_is_editable(d.property_id) then
    raise exception 'not a document of yours' using errcode = '42501';
  end if;
  if p_show and (d.analysis is null
                 or d.analysis->>'quality' is distinct from 'ok'
                 or jsonb_typeof(d.analysis->'public_facts') is distinct from 'object'
                 or d.analysis->'public_facts' = '{}'::jsonb) then
    raise exception 'nothing to show' using errcode = '22023';
  end if;
  update public.documents
     set public_facts_approved_at = case when p_show then now() end
   where id = p_document;
end;
$$;

-- ---------------------------------------------------------------------------
-- A buyer: the summary meant for them, of the documents shared with them
-- that the assistant read without a reserve (never a document « à vérifier »)
-- ---------------------------------------------------------------------------
create function public.shared_document_summaries()
returns table (document_id uuid, title text, type public.document_type, type_detected text,
               document_date text, summary_buyer text, key_facts jsonb, points_of_attention jsonb)
language sql stable security definer set search_path = '' as $$
  select d.id, d.title, d.type, d.analysis->>'type_detected', d.analysis->>'date',
         d.analysis->>'summary_buyer', coalesce(d.analysis->'key_facts', '[]'::jsonb),
         coalesce(d.analysis->'points_of_attention', '[]'::jsonb)
    from public.document_shares s
    join public.documents d on d.id = s.document_id and d.deleted_at is null
    join public.properties p on p.id = d.property_id and p.deleted_at is null
   where s.buyer_id = auth.uid() and d.analyzed_at is not null and d.analysis is not null
     and d.analysis->>'quality' = 'ok';
$$;

-- ---------------------------------------------------------------------------
-- Anyone: the facts a seller shows on a listing online
-- ---------------------------------------------------------------------------
create function public.public_document_facts(p_listing_id uuid)
returns table (type public.document_type, facts jsonb)
language sql stable security definer set search_path = '' as $$
  select d.type, d.analysis->'public_facts'
    from public.listings l
    join public.properties p on p.id = l.property_id and p.deleted_at is null
    join public.documents d on d.property_id = p.id and d.deleted_at is null
   where l.id = p_listing_id and l.status = 'published' and l.deleted_at is null
     and d.public_facts_approved_at is not null and d.analysis is not null
     and d.analysis->>'quality' = 'ok'
     and jsonb_typeof(d.analysis->'public_facts') = 'object'
   order by d.type, d.created_at;
$$;

-- ---------------------------------------------------------------------------
-- The log of the assistant: an analysis under its own kind, in the name of
-- the owner of the property, written by the scheduled task only.
-- ---------------------------------------------------------------------------
alter table public.ai_conversations
  drop constraint ai_conversations_kind_check;
alter table public.ai_conversations
  add constraint ai_conversations_kind_check
    check (kind in ('chat', 'reply_suggestion', 'listing_description', 'rejection_reason',
                    'case_summary', 'listing_summary', 'document_analysis'));
alter table public.ai_conversations
  add constraint ai_conversations_document_analysis_check
    check (kind <> 'document_analysis' or (context = 'seller' and property_id is not null));
create policy ai_conversations_no_own_document_analysis on public.ai_conversations
  as restrictive for insert to authenticated
  with check (kind <> 'document_analysis');
-- Nor a message in a log of the scheduled tasks (the summary of a listing,
-- L2-05, the analysis of a document): written in the name of the owner, such
-- a conversation is theirs for ai_messages_insert_own, and they could add to
-- it tokens or a text of their own.
create function public.ai_conversation_of_a_task(p_conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ai_conversations c
                  where c.id = p_conversation and c.kind in ('listing_summary', 'document_analysis'));
$$;
create policy ai_messages_no_own_task_log on public.ai_messages
  as restrictive for insert to authenticated
  with check (not public.ai_conversation_of_a_task(conversation_id));

-- ---------------------------------------------------------------------------
-- Every 5 minutes (pg_cron and pg_net, as the summaries of the listings).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'analyze-documents';
    perform cron.schedule('analyze-documents', '*/5 * * * *',
                          $job$select public.cron_call('/api/cron/analyze-documents')$job$);
  end if;
end;
$$;

revoke execute on function public.documents_type_changed() from public, anon, authenticated;
revoke execute on function public.document_analysis_claim(int) from public, anon, authenticated;
revoke execute on function public.document_analysis_record(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.document_analysis_fail(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.document_analysis_release(uuid) from public, anon, authenticated;
grant execute on function public.document_analysis_claim(int) to service_role;
grant execute on function public.document_analysis_record(uuid, jsonb) to service_role;
grant execute on function public.document_analysis_fail(uuid, text, boolean) to service_role;
grant execute on function public.document_analysis_release(uuid) to service_role;
revoke execute on function public.document_analyses(uuid) from public, anon;
revoke execute on function public.document_analysis_retry(uuid) from public, anon;
revoke execute on function public.document_public_facts_set(uuid, boolean) from public, anon;
revoke execute on function public.shared_document_summaries() from public, anon;
revoke execute on function public.ai_conversation_of_a_task(uuid) from public, anon;
grant execute on function public.document_analyses(uuid) to authenticated;
grant execute on function public.document_analysis_retry(uuid) to authenticated;
grant execute on function public.document_public_facts_set(uuid, boolean) to authenticated;
grant execute on function public.shared_document_summaries() to authenticated;
grant execute on function public.ai_conversation_of_a_task(uuid) to authenticated;
revoke execute on function public.public_document_facts(uuid) from public;
grant execute on function public.public_document_facts(uuid) to anon, authenticated;
