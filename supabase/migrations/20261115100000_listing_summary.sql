-- L2-05: the summary of a listing by the assistant (SPEC-V2 8.4 point 8): two
-- factual sentences on the public page of a listing, written when it is
-- published and again at each change of what it says.
--
-- Who writes it: a scheduled task (the route /api/cron/listing-summaries,
-- service role), never the seller: a text shown as « Résumé par l'assistant »
-- must not be one its seller can type (the column grants of `listings` give
-- them title, description and price only). The database asks for it:
-- - `summary_requested_at` is set when a listing goes online, and when a
--   listing online changes its title, its description, its price, or when
--   its property changes one of the facts the summary is written from. It is
--   the moment of the change itself (clock_timestamp, not the start of the
--   transaction): each change has its own request;
-- - the summary of before is removed at once: the page never shows a summary
--   of what the listing no longer says;
-- - the task writes the new one and clears the request, unless the listing
--   changed again meanwhile (the request is then a later one).
-- Read by the public through `public_listing_summary`, online listings only.
-- The log of the assistant takes its kind, written by the task only.

alter table public.listings add column summary_requested_at timestamptz;
create index listings_summary_requested_idx on public.listings (summary_requested_at)
  where summary_requested_at is not null;

-- ---------------------------------------------------------------------------
-- A listing going online, or changed while online.
-- ---------------------------------------------------------------------------
create function public.listings_summary_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (
       old.status <> 'published'
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.price_cents is distinct from old.price_cents) then
    new.summary := null;
    new.summary_requested_at := clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger listings_summary_request before update on public.listings
  for each row execute function public.listings_summary_request();

-- ---------------------------------------------------------------------------
-- The property of a listing online changed one of the facts the summary is
-- written from (the columns leenkey/listings/summary.ts gives the model, and
-- no other: a change of its address, of its charges or of its analysis of
-- value would only bill the same summary again).
-- ---------------------------------------------------------------------------
create function public.properties_summary_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  shown constant text[] := array[
    'type', 'city', 'district', 'surface_m2', 'carrez_m2', 'rooms', 'bedrooms', 'floor',
    'floors_total', 'has_elevator', 'has_balcony', 'has_terrace', 'has_garden', 'has_parking',
    'has_cellar', 'orientation', 'build_year', 'is_new_build', 'dpe_class', 'ges_class',
    'heating', 'copro_lots'];
  before jsonb;
  after jsonb;
begin
  select jsonb_object_agg(key, value) into before from jsonb_each(to_jsonb(old)) where key = any(shown);
  select jsonb_object_agg(key, value) into after from jsonb_each(to_jsonb(new)) where key = any(shown);
  if after is distinct from before then
    update public.listings
       set summary = null, summary_requested_at = clock_timestamp()
     where property_id = new.id and status = 'published';
  end if;
  return null;
end;
$$;

create trigger properties_summary_request after update on public.properties
  for each row execute function public.properties_summary_request();

-- The listings already online: their first summary.
update public.listings set summary_requested_at = now()
 where status = 'published' and deleted_at is null and summary is null;

-- ---------------------------------------------------------------------------
-- The summary of a listing online, for anyone.
-- ---------------------------------------------------------------------------
create function public.public_listing_summary(p_listing_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select l.summary
    from public.listings l
    join public.properties p on p.id = l.property_id
   where l.id = p_listing_id and l.status = 'published'
     and l.deleted_at is null and p.deleted_at is null;
$$;

-- ---------------------------------------------------------------------------
-- The log of the assistant: a summary of a listing, under its own kind, in
-- the name of the owner of the listing (context seller, its property).
-- ---------------------------------------------------------------------------
alter table public.ai_conversations
  drop constraint ai_conversations_kind_check;
alter table public.ai_conversations
  add constraint ai_conversations_kind_check
    check (kind in ('chat', 'reply_suggestion', 'listing_description', 'rejection_reason',
                    'case_summary', 'listing_summary'));
alter table public.ai_conversations
  add constraint ai_conversations_listing_summary_check
    check (kind <> 'listing_summary' or (context = 'seller' and property_id is not null));
-- Written by the scheduled task only (service role): an account does not log
-- a summary of its own, with tokens of its choice.
create policy ai_conversations_no_own_listing_summary on public.ai_conversations
  as restrictive for insert to authenticated
  with check (kind <> 'listing_summary');

-- ---------------------------------------------------------------------------
-- Every 5 minutes (pg_cron and pg_net, as the notification emails): the route
-- writes the summaries asked for.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'listing-summaries';
    perform cron.schedule('listing-summaries', '*/5 * * * *',
                          $job$select public.cron_call('/api/cron/listing-summaries')$job$);
  end if;
end;
$$;

revoke execute on function public.listings_summary_request() from public, anon, authenticated;
revoke execute on function public.properties_summary_request() from public, anon, authenticated;
revoke execute on function public.public_listing_summary(uuid) from public;
grant execute on function public.public_listing_summary(uuid) to anon, authenticated;
