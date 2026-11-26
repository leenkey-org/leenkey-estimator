-- Named lists of favourites (Younes, 2026-11-26; DECISIONS.md 2026-11-26,
-- « Listes de favoris nommées »): an account sorts the listings it saved in
-- lists it names (« Lyon », « Bordeaux », « À visiter »).
--
-- 1. favorite_lists: the lists of an account, 20 at most, a name of 1 to 40
--    characters, unique for the account whatever its case. Private: read and
--    written by their owner with their session; the team reads, never writes.
-- 2. favorites.list_id: a favourite is in one list at most. Saved first
--    (the heart, unchanged: the insert grant stays (buyer_id, listing_id)),
--    filed after, by an update of list_id alone. Deleting a list keeps its
--    favourites, without a list.
-- 3. account_export gives the lists; account_anonymize deletes them (a
--    closed account keeps its row in profiles: the cascade does not run).
--
-- Changes to the permissions of favorites (CLAUDE.md section 14): one more
-- policy (favorites_update_own_list) and one more grant (update (list_id)).
-- Its existing policies and grants are unchanged.

create table public.favorite_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
-- One name per account, whatever its case and the spaces around it.
create unique index favorite_lists_owner_name_key
  on public.favorite_lists (owner_id, lower(btrim(name)));
create trigger favorite_lists_set_updated_at before update on public.favorite_lists
  for each row execute function public.set_updated_at();

-- 20 lists per account. Security invoker: the count is the owner's own rows
-- (favorite_lists_insert_own only lets an account insert for itself). The
-- lock makes two inserts of the same account wait for each other.
create function public.favorite_lists_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('favorite_lists_limit:' || new.owner_id::text, 0));
  if (select count(*) from public.favorite_lists where owner_id = new.owner_id) >= 20 then
    raise exception 'favorite_lists_per_account' using errcode = '54000';
  end if;
  return new;
end;
$$;
create trigger favorite_lists_limit before insert on public.favorite_lists
  for each row execute function public.favorite_lists_limit();
revoke execute on function public.favorite_lists_limit() from public, anon, authenticated;

alter table public.favorite_lists enable row level security;

create policy favorite_lists_select_own_or_admin on public.favorite_lists
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy favorite_lists_insert_own on public.favorite_lists
  for insert to authenticated
  with check (owner_id = auth.uid() and public.is_active_user());

create policy favorite_lists_update_own on public.favorite_lists
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy favorite_lists_delete_own on public.favorite_lists
  for delete to authenticated
  using (owner_id = auth.uid());

revoke all on public.favorite_lists from anon, authenticated;
grant select, delete on public.favorite_lists to authenticated;
grant insert (owner_id, name) on public.favorite_lists to authenticated;
grant update (name) on public.favorite_lists to authenticated;

-- ---------------------------------------------------------------------------
-- favorites.list_id
-- ---------------------------------------------------------------------------
alter table public.favorites
  add column list_id uuid references public.favorite_lists(id) on delete set null;
create index favorites_list_idx on public.favorites (list_id) where list_id is not null;

-- Filing a favourite: its own row, into no list or one of its own lists
-- (owner_id is compared here: an admin reads every list, and must not file
-- into the list of someone else either).
create policy favorites_update_own_list on public.favorites
  for update to authenticated
  using (buyer_id = auth.uid())
  with check (
    buyer_id = auth.uid()
    and (list_id is null
         or exists (select 1 from public.favorite_lists l
                     where l.id = favorites.list_id and l.owner_id = auth.uid())));

grant update (list_id) on public.favorites to authenticated;

-- ---------------------------------------------------------------------------
-- Account: export and deletion
-- ---------------------------------------------------------------------------
-- account_export of 20261123150100_ddt_coverage.sql, with the lists of
-- favourites of the account: the only change (`'favorite_lists'`; each
-- favourite gives its list_id by itself).
create or replace function public.account_export() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with me as (select auth.uid() as id),
  my_properties as (select p.* from public.properties p, me where p.owner_id = me.id),
  my_conversations as (
    select c.* from public.conversations c, me where me.id in (c.buyer_id, c.seller_id)),
  my_offers as (select o.* from public.offers o, me where o.buyer_id = me.id),
  received as (select o.* from public.offer_for_seller o, me where o.seller_id = me.id),
  my_ai as (select a.* from public.ai_conversations a, me where a.profile_id = me.id)
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p, me where p.id = me.id),
    'buyer_profile', (select to_jsonb(b) from public.buyer_profiles b, me where b.profile_id = me.id),
    'legal_acceptances', (select coalesce(jsonb_agg(to_jsonb(a) order by a.accepted_at), '[]')
                            from public.legal_acceptances a, me where a.profile_id = me.id),
    'properties', (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at), '[]') from my_properties p),
    'listings', (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at), '[]')
                   from public.listings l where l.property_id in (select id from my_properties)),
    'photos', (select coalesce(jsonb_agg(to_jsonb(ph) order by ph.property_id, ph.position), '[]')
                 from public.photos ph where ph.property_id in (select id from my_properties)),
    'subscriptions', (select coalesce(jsonb_agg(to_jsonb(s) order by s.activated_at), '[]')
                        from public.subscriptions s, me where s.owner_id = me.id),
    'conversations', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]') from my_conversations c),
    'messages', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]')
                   from public.messages m where m.conversation_id in (select id from my_conversations)),
    'offers_sent', (select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at), '[]') from my_offers o),
    'offers_received', (select coalesce(jsonb_agg(to_jsonb(o) order by o.submitted_at), '[]') from received o),
    'offer_events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at), '[]')
                       from public.offer_events e
                      where e.offer_id in (select id from my_offers union select id from received)),
    -- The columns the person reads (not the note nor the author of the check).
    'financing_documents', (select coalesce(jsonb_agg(jsonb_build_object(
                                'id', f.id, 'type', f.type, 'document_date', f.document_date,
                                'mime_type', f.mime_type, 'size_bytes', f.size_bytes,
                                'created_at', f.created_at, 'checked_at', f.checked_at,
                                'deleted_at', f.deleted_at) order by f.created_at), '[]')
                              from public.financing_documents f, me where f.buyer_id = me.id),
    -- The identity documents: what the person reads of them (never a file,
    -- never the note of the team nor who decided).
    'identity_documents', (select coalesce(jsonb_agg(jsonb_build_object(
                               'id', i.id, 'type', i.type, 'mime_type', i.mime_type,
                               'size_bytes', i.size_bytes, 'created_at', i.created_at,
                               'checked_at', i.checked_at, 'refused_at', i.refused_at,
                               'refusal_reason', i.refusal_reason, 'withdrawn_at', i.withdrawn_at,
                               'file_deleted_at', i.file_deleted_at) order by i.created_at), '[]')
                             from public.identity_documents i, me where i.buyer_id = me.id),
    'favorites', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at), '[]')
                    from public.favorites f, me where f.buyer_id = me.id),
    'favorite_lists', (select coalesce(jsonb_agg(to_jsonb(fl) order by fl.created_at), '[]')
                         from public.favorite_lists fl, me where fl.owner_id = me.id),
    'assistant_conversations', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]') from my_ai a),
    'assistant_messages', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]')
                             from public.ai_messages m where m.conversation_id in (select id from my_ai)),
    -- Without the claim token of an anonymous valuation.
    'valuations', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at), '[]')
                     from (select v.id, v.created_at, v.input, v.result, v.low_cents, v.value_cents,
                                  v.high_cents, v.email
                             from public.estimations v, me where v.profile_id = me.id) e),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]')
                        from public.notifications n, me where n.profile_id = me.id),
    -- Lot 3: visits, the sale file (the columns the person reads), alerts.
    -- L3-03: the note of the seller of a visit, for the seller only (not
    -- for an admin who was the buyer of the visit).
    'visits', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', v.id, 'slot_id', v.slot_id, 'property_id', v.property_id,
                   'buyer_id', v.buyer_id, 'status', v.status,
                   'buyer_interest', v.buyer_interest, 'buyer_feedback', v.buyer_feedback,
                   'seller_feedback', case when public.owns_property(v.property_id)
                                           then public.visit_seller_note(v.id) end,
                   'cancelled_at', v.cancelled_at, 'cancelled_by', v.cancelled_by,
                   'reminder_sent_at', v.reminder_sent_at,
                   'feedback_requested_at', v.feedback_requested_at,
                   'created_at', v.created_at, 'updated_at', v.updated_at) order by v.created_at), '[]')
                 from public.visits v, me
                where v.buyer_id = me.id or v.property_id in (select id from my_properties)),
    'visit_slots', (select coalesce(jsonb_agg(to_jsonb(s) order by s.starts_at), '[]')
                      from public.visit_slots s where s.property_id in (select id from my_properties)),
    'visit_invitations', (select coalesce(jsonb_agg(jsonb_build_object(
                              'property_id', i.property_id, 'buyer_id', i.buyer_id,
                              'expires_at', i.expires_at, 'created_at', i.created_at) order by i.created_at), '[]')
                            from public.visit_invitations i, me
                           where i.buyer_id = me.id or i.property_id in (select id from my_properties)),
    'documents', (select coalesce(jsonb_agg(jsonb_build_object(
                      'id', d.id, 'property_id', d.property_id, 'type', d.type, 'title', d.title,
                      'mime_type', d.mime_type, 'size_bytes', d.size_bytes, 'created_at', d.created_at,
                      'deleted_at', d.deleted_at, 'covers', d.covers) order by d.created_at), '[]')
                    from public.documents d where d.property_id in (select id from my_properties)),
    'documents_shared_with_me', (select coalesce(jsonb_agg(to_jsonb(s) order by s.shared_at), '[]')
                                   from public.document_shares s, me where s.buyer_id = me.id),
    'document_access_requests', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]')
                                   from public.document_access_requests r, me where r.buyer_id = me.id),
    'alerts', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]')
                 from public.alerts a, me where a.buyer_id = me.id),
    'requests_to_the_team', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]')
                               from public.cases c, me where c.profile_id = me.id),
    -- The interventions asked of the adviser, the columns the seller reads
    -- (not the note of the team).
    'advisor_interventions', (select coalesce(jsonb_agg(jsonb_build_object(
                                  'id', a.id, 'property_id', a.property_id, 'reason', a.reason,
                                  'message', a.message, 'status', a.status,
                                  'requested_at', a.requested_at, 'done_at', a.done_at)
                                order by a.requested_at), '[]')
                                from public.advisor_interventions a
                               where a.property_id in (select id from my_properties)))
  from me where me.id is not null;
$$;

-- account_anonymize of 20261123130000_identity_documents.sql, with the lists
-- of favourites of the account deleted: the only change.
create or replace function public.account_anonymize(p_profile uuid, p_now timestamptz default now())
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles
     where id = p_profile and deleted_at is not null
       and deleted_at <= p_now - interval '30 days') then
    raise exception 'not an account closed 30 days ago' using errcode = '22023';
  end if;

  update public.profiles
     set first_name = null, last_name = null, phone = null, avatar_path = null,
         suspension_reason = null,
         notification_prefs = '{"email_alerts": false, "email_offers": false, "email_messages": false}'::jsonb
   where id = p_profile;
  delete from public.buyer_profiles where profile_id = p_profile;
  delete from public.offers where buyer_id = p_profile and status = 'draft';
  -- A document an offer sent refers to keeps its row (type, date), never its file.
  update public.financing_documents set storage_path = ''
   where buyer_id = p_profile
     and id in (select financing_document_id from public.offers where financing_document_id is not null);
  delete from public.financing_documents
   where buyer_id = p_profile
     and id not in (select financing_document_id from public.offers where financing_document_id is not null);
  -- The identity documents: their rows (their files go first, account_files).
  delete from public.identity_documents where buyer_id = p_profile;
  delete from public.photos
   where property_id in (select id from public.properties where owner_id = p_profile);
  -- The address, what finds it (the DPE number gives it, through the
  -- register of the ADEME), the free texts of the seller and their history;
  -- the characteristics and the prices stay (city, surface, rooms).
  update public.properties
     set address_line = 'Adresse effacée', location = null, public_location = null,
         district = null, dpe_number = null, dpe_date = null, dpe_exemption_reason = null,
         estimation_id = null
   where owner_id = p_profile;
  -- The same address, frozen with the offers received on these properties.
  delete from public.offer_property_addresses a
   using public.offers o
   where o.id = a.offer_id and o.seller_id = p_profile;
  update public.listings l
     set title = 'Annonce supprimée', description = '', summary = null,
         rejection_reason = null, suspension_reason = null,
         compliance_requested_at = null, compliance_due_at = null,
         compliance_reason = null, compliance_reminded_at = null
    from public.properties p
   where p.id = l.property_id and p.owner_id = p_profile;
  delete from public.listing_revisions r
   using public.listings l, public.properties p
   where l.id = r.listing_id and p.id = l.property_id and p.owner_id = p_profile;
  delete from public.ai_conversations where profile_id = p_profile;
  delete from public.notifications where profile_id = p_profile;
  delete from public.favorites where buyer_id = p_profile;
  delete from public.favorite_lists where owner_id = p_profile;
  delete from public.estimations where profile_id = p_profile;
  -- Lot 3: the sale file (its shares go with it), the alerts, the
  -- invitations and requests of the buyer, the free texts of the visits.
  delete from public.documents
   where property_id in (select id from public.properties where owner_id = p_profile);
  delete from public.alerts where buyer_id = p_profile;
  delete from public.visit_invitations where buyer_id = p_profile;
  delete from public.document_access_requests where buyer_id = p_profile;
  delete from public.document_shares where buyer_id = p_profile;
  -- L3-04: the reasons written for « Non concerné » (free text of the seller).
  delete from public.document_exemptions
   where property_id in (select id from public.properties where owner_id = p_profile);
  update public.visits set buyer_feedback = null, buyer_interest = null where buyer_id = p_profile;
  update public.visits set seller_feedback = null
   where property_id in (select id from public.properties where owner_id = p_profile);
  -- The interventions of the adviser: what the seller wrote, what the team noted.
  update public.advisor_interventions set message = null, team_note = null
   where property_id in (select id from public.properties where owner_id = p_profile);
end;
$$;
