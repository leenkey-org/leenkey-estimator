-- Adjustments of the purchase offer asked by Cédric (answers of 2026-11-19 and
-- 2026-11-20, DECISIONS.md 2026-11-21 « Ajustements de l'offre »).
--
-- 1. The exact address of the property in the offer: frozen when the offer is
--    sent, in its own table (offer_property_addresses), never in the row a
--    buyer reads. Read through offer_property_address(): the team, the seller
--    of the offer, and its buyer once one of their visits of the property is
--    confirmed or done (SPEC 14). The view of the seller carries it.
-- 2. offer_submit: « Obtention d'une autorisation particulière » (as « Autre
--    situation à préciser ») asks for its details; the address is frozen.
--    The trigger offers_freeze_after_submit is untouched.
-- 3. offer_events_notify: the team is told when an offer is RECEIVED on a
--    sale whose plan includes an adviser (plan_entitlements, never a plan
--    name), as it already is when one is accepted (L2-07).
-- 4. The proof of financing: its buyer is told when it is checked (bell and
--    email); its file is deleted once checked (the storage object by the
--    admin action, with the session of the admin; the row, its type and the
--    date of the check stay, the status too).
-- 5. A report: its author is told when it is handled (closed).
-- 6. offer_record_precontract: no start of a withdrawal period kept for an
--    acquisition by an SCI (none is shown to a company).
-- 7. account_anonymize: the frozen addresses of the offers received by a
--    closed seller go with the address of their properties.
--
-- No enum value. One table, with its RLS; one storage policy added (delete of
-- a checked proof by the team); no existing policy changed.

-- 1. ---------------------------------------------------------------------------
-- One row per offer sent, written once: its key is the offer (no id of its
-- own), and it has no updated_at since it is never updated.
create table public.offer_property_addresses (
  offer_id uuid primary key references public.offers(id) on delete cascade,
  address_line text not null check (char_length(address_line) <= 200),
  created_at timestamptz not null default now()
);

-- Written by offer_submit only; read by the team, and through the function
-- and the view below. Nobody else reads or writes the table.
alter table public.offer_property_addresses enable row level security;

create policy offer_property_addresses_select_admin on public.offer_property_addresses
  for select to authenticated
  using (public.is_admin());

revoke all on public.offer_property_addresses from anon, authenticated;
grant select on public.offer_property_addresses to authenticated;

-- Never changed; deleted only with the account of the seller of the offer,
-- once closed (account_anonymize): the address of their property is erased
-- everywhere then. Holds for the owner of the table and the service role too.
create function public.offer_property_addresses_immutable() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' and exists (
       select 1 from public.offers o join public.profiles pr on pr.id = o.seller_id
        where o.id = old.offer_id and pr.deleted_at is not null) then
    return old;
  end if;
  raise exception 'the address frozen with an offer is never changed' using errcode = '42501';
end;
$$;

create trigger offer_property_addresses_immutable
  before update or delete on public.offer_property_addresses
  for each row execute function public.offer_property_addresses_immutable();

revoke execute on function public.offer_property_addresses_immutable() from public, anon, authenticated;

-- The offers already sent: the address of their property as it is today.
insert into public.offer_property_addresses (offer_id, address_line)
select o.id, p.address_line
  from public.offers o
  join public.listings l on l.id = o.listing_id
  join public.properties p on p.id = l.property_id
 where o.submitted_at is not null
on conflict (offer_id) do nothing;

-- The exact address of the property of an offer, for who may read it: the
-- team, the seller of an offer sent, the buyer of the offer once one of their
-- visits of the property is confirmed or done. Null for anyone else (and for
-- a buyer who has not visited): the offer then shows the town only. A draft
-- reads the address of the property as it is; an offer sent, the frozen one.
create function public.offer_property_address(p_offer uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(a.address_line, case when o.status = 'draft' then p.address_line end, '')
    from public.offers o
    join public.listings l on l.id = o.listing_id
    join public.properties p on p.id = l.property_id
    left join public.offer_property_addresses a on a.offer_id = o.id
   where o.id = p_offer
     and (public.is_admin()
          or (o.seller_id = auth.uid() and o.status <> 'draft')
          or (o.buyer_id = auth.uid()
              and exists (select 1 from public.visits v
                           where v.property_id = p.id and v.buyer_id = auth.uid()
                             and v.status in ('confirmed', 'done'))));
$$;

revoke execute on function public.offer_property_address(uuid) from public, anon;
grant execute on function public.offer_property_address(uuid) to authenticated;

-- The view of the seller (L2-04a), with the frozen address of their property.
create or replace view public.offer_for_seller with (security_barrier = true) as
select
  o.id, o.reference, o.version, o.listing_id, o.buyer_id, o.seller_id,
  public.offer_identity_for_seller(o.buyer_identity, o.status = 'accepted') as buyer_identity,
  case when o.status = 'accepted' then o.co_buyers
       else coalesce((select jsonb_agg(public.offer_identity_for_seller(c, false))
                        from jsonb_array_elements(o.co_buyers) c), '[]'::jsonb)
  end as co_buyers,
  o.acquisition_mode, o.acquisition_mode_other,
  case when o.status = 'accepted' then o.sci_details
       else jsonb_strip_nulls(jsonb_build_object('name', o.sci_details->'name',
                                                 'status', o.sci_details->'status'))
  end as sci_details,
  o.property_snapshot, o.price_cents, o.price_in_words,
  o.financing_mode, o.down_payment_cents, o.loan_amount_cents, o.loan_duration_years,
  o.loan_rate_max_pct, o.lender_name, o.financing_progress, o.financing_progress_other,
  o.financing_status_at_submit,
  o.condition_prior_sale, o.condition_authorization, o.condition_other, o.conditions_details,
  o.validity_until, o.visited, o.declarations, o.message,
  case when o.status in ('submitted', 'viewed') and o.validity_until <= now()
       then 'expired'::public.offer_status else o.status end as status,
  o.synthesis,
  case when o.status = 'accepted' then o.pdf_path end as pdf_path,
  o.superseded_by, o.submitted_at, o.viewed_at, o.answered_at, o.withdrawn_at,
  coalesce(o.expired_at, case when o.status in ('submitted', 'viewed') and o.validity_until <= now()
                              then o.validity_until end) as expired_at,
  o.seller_acceptance, o.precontract_signed_at, o.withdrawal_period_start, o.created_at,
  (select d.type from public.financing_documents d where d.id = o.financing_document_id)
    as financing_document_type,
  (select d.checked_at from public.financing_documents d where d.id = o.financing_document_id)
    as financing_checked_at,
  (select l.property_id from public.listings l where l.id = o.listing_id) as property_id,
  (select a.address_line from public.offer_property_addresses a where a.offer_id = o.id)
    as property_address_line
from public.offers o
where o.seller_id = auth.uid() and o.status <> 'draft';

-- 2. ---------------------------------------------------------------------------
-- As in L2-01, plus the details of the conditions and the frozen address.
create or replace function public.offer_submit(p_offer_id uuid) returns public.offer_status
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
  l public.listings;
  p public.properties;
  previous uuid;
  prev public.offers;
  identity_ok boolean;
begin
  select * into o from public.offers where id = p_offer_id and buyer_id = auth.uid() for update;
  if not found or not public.is_active_user() then
    raise exception 'offer not found' using errcode = '42501';
  end if;
  if o.status <> 'draft' then
    perform public.offer_bad_transition(o.status, 'send');
  end if;
  if not public.offer_can_draft(o.listing_id) then
    raise exception 'this offer can no longer be sent' using errcode = '42501';
  end if;

  -- What the form must have filled (the server action checks it first): the
  -- buyer and each co-buyer complete, « À deux / indivision » with one at
  -- least.
  identity_ok := public.offer_identity_complete(o.buyer_identity)
             and not exists (select 1 from jsonb_array_elements(o.co_buyers) c
                              where not public.offer_identity_complete(c))
             and (o.acquisition_mode <> 'joint' or jsonb_array_length(o.co_buyers) >= 1);
  if not identity_ok
     or o.price_cents is null
     or o.financing_mode is null or o.visited is null or o.validity_until is null
     or (o.acquisition_mode = 'other' and coalesce(btrim(o.acquisition_mode_other), '') = '')
     or (o.acquisition_mode = 'sci' and (
           coalesce(btrim(o.sci_details->>'name'), '') = ''
           or coalesce(o.sci_details->>'status', '') not in ('registered', 'in_formation')
           or (o.sci_details->>'status' = 'registered'
               and coalesce(o.sci_details->>'siren', '') !~ '^[0-9]{9}$')))
     or (o.financing_mode = 'loan' and (o.loan_amount_cents <= 0 or o.loan_duration_years is null
                                        or o.loan_rate_max_pct is null))
     or (o.financing_mode = 'no_loan' and (o.loan_amount_cents <> 0 or o.loan_duration_years is not null
                                           or o.loan_rate_max_pct is not null))
     or (o.financing_progress = 'other' and coalesce(btrim(o.financing_progress_other), '') = '')
     -- « Obtention d'une autorisation particulière », « Autre situation à
     -- préciser »: said in the details (answer of Cédric of 2026-11-19).
     or ((o.condition_authorization or o.condition_other)
         and coalesce(btrim(o.conditions_details), '') = '')
     or not coalesce((o.declarations->>'accuracy')::boolean, false)
     or not coalesce((o.declarations->>'price_and_financing_checked')::boolean, false)
     or not coalesce((o.declarations->>'legal_effects_understood')::boolean, false)
     or not coalesce((o.declarations->>'info_read')::boolean, false)
  then
    raise exception 'the offer is incomplete' using errcode = '22023';
  end if;
  -- From 2 to 10 days (decision of Cédric of 2026-10-01), an hour of margin
  -- for the time between the last step and the sending.
  if o.validity_until < now() + interval '2 days' - interval '1 hour'
     or o.validity_until > now() + interval '10 days' + interval '1 hour' then
    raise exception 'the validity of the offer must be from 2 to 10 days' using errcode = '22023';
  end if;

  select * into l from public.listings where id = o.listing_id;
  select * into p from public.properties where id = l.property_id;

  -- The offer in progress of the same buyer on the listing gives way to this
  -- one; past its validity, it is expired, not superseded.
  select * into prev from public.offers
   where buyer_id = o.buyer_id and listing_id = o.listing_id and status in ('submitted', 'viewed')
   for update;
  if found then
    prev := public.offer_expire_if_due(prev);
    if prev.status in ('submitted', 'viewed') then
      previous := prev.id;
    end if;
  end if;
  if previous is not null then
    update public.offers set status = 'superseded', superseded_by = o.id where id = previous;
    perform public.offer_event(previous, 'superseded', jsonb_build_object('by', o.id));
  end if;

  update public.offers
     set status = 'submitted',
         submitted_at = now(),
         price_in_words = public.price_in_words_fr(o.price_cents),
         property_snapshot = jsonb_build_object(
           'listing_reference', l.reference,
           'title', l.title,
           -- The town only in what the buyer reads of its row (SPEC 14); the
           -- exact address is frozen beside it (offer_property_addresses).
           'address', jsonb_build_object('postal_code', p.postal_code, 'city', p.city),
           'type', p.type,
           'surface_m2', p.surface_m2,
           'rooms', p.rooms,
           'annexes', to_jsonb(array_remove(array[
             case when p.has_parking then 'parking' end,
             case when p.has_cellar then 'cellar' end,
             case when p.has_garden then 'garden' end,
             case when p.has_balcony then 'balcony' end,
             case when p.has_terrace then 'terrace' end], null)),
           'asking_price_cents', l.price_cents),
         financing_status_at_submit = (select financing_status from public.buyer_profiles
                                        where profile_id = o.buyer_id),
         declarations = o.declarations || jsonb_build_object('accepted_at', now())
   where id = o.id;
  -- The exact address of the property, as it is when the offer is sent.
  insert into public.offer_property_addresses (offer_id, address_line)
  values (o.id, p.address_line);
  perform public.offer_event(o.id, 'submitted',
                             case when previous is not null then jsonb_build_object('supersedes', previous) end);
  return 'submitted';
end;
$$;

-- 3. ---------------------------------------------------------------------------
-- As in L2-07, plus the team told when the offer is received.
create or replace function public.offer_events_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
  l public.listings;
  p public.properties;
  info jsonb;
  link text;
  thread text;
  v_admin uuid;
begin
  if new.event not in ('submitted', 'viewed', 'accepted', 'declined',
                       'withdrawn', 'expired', 'precontract_recorded') then
    return null;
  end if;
  select * into o from public.offers where id = new.offer_id;
  select * into l from public.listings where id = o.listing_id;
  select * into p from public.properties where id = l.property_id;

  if new.event = 'precontract_recorded' then
    -- The task of the sale, ticked once (a task done stays done); the step
    -- follows (sale_task_status_refresh).
    insert into public.sale_task_status (property_id, task_id, done_at)
    select sp.property_id, t.id, now()
      from public.sale_progress sp
      join public.sale_steps s on s.plan = sp.plan
      join public.sale_step_tasks t on t.step_id = s.id and t.code = 'precontract_signed'
     where sp.property_id = p.id
    on conflict (property_id, task_id) do update
      set done_at = excluded.done_at
      where public.sale_task_status.done_at is null;
    return null;
  end if;

  link := '/offres/' || o.id;
  thread := 'offer:' || o.id;
  info := jsonb_build_object(
    'entity_id', o.id,
    'offer_id', o.id,
    'reference', o.reference,
    'listing_id', l.id,
    'property_id', p.id,
    'title', l.title,
    'city', p.city,
    'price_cents', o.price_cents);

  if new.event = 'submitted' then
    -- The seller: bell and email (SPEC 18: amount, gap, financing status, no PDF).
    perform public.notification_add(
      o.seller_id, 'offer.received',
      info || jsonb_build_object(
        'asking_price_cents', (o.property_snapshot->>'asking_price_cents')::bigint,
        'financing_status', o.financing_status_at_submit,
        'buyer_first_name', o.buyer_identity->>'first_name',
        'validity_until', o.validity_until),
      link, thread, now());
    perform public.sale_emit_event(p.id, 'offer.submitted');
    perform public.offer_notice(
      o, o.buyer_id,
      format('Offre d''achat %s envoyée au vendeur : %s.', o.reference,
             public.offer_amount_label(o.price_cents)),
      'offer_submitted');
    -- The team, when the plan of the sale includes an adviser (answer of
    -- Cédric of 2026-11-19, Q88): told as soon as the offer is received, so
    -- that the adviser may look at it before the seller answers. The listing
    -- and the price, never who the buyer is. One group: the emails leave
    -- together. Telling the team never undoes the sending.
    if exists (select 1 from public.plan_entitlements e
                where e.plan = public.property_current_plan(p.id)
                  and e.feature = 'advisor') then
      begin
        for v_admin in
          select a.id from public.profiles a
           where 'admin' = any(a.roles) and a.deleted_at is null and a.suspended_at is null
             and a.id not in (o.seller_id, o.buyer_id)
        loop
          perform public.notification_add(
            v_admin, 'offer.received_team',
            info || jsonb_build_object(
              'listing_reference', l.reference,
              'plan', public.property_current_plan(p.id),
              'asking_price_cents', (o.property_snapshot->>'asking_price_cents')::bigint),
            '/admin/offres/' || o.id, 'offers:received', now());
        end loop;
      exception when others then
        raise warning 'offer.received_team not sent for offer %: %', o.id, sqlerrm;
      end;
    end if;
  elsif new.event = 'viewed' then
    -- The buyer, in the bell only.
    perform public.notification_add(o.buyer_id, 'offer.viewed', info, link, thread);
  elsif new.event = 'withdrawn' then
    -- The seller: bell and email, with the date and the time of the withdrawal.
    perform public.notification_add(
      o.seller_id, 'offer.withdrawn',
      info || jsonb_build_object(
        'buyer_first_name', o.buyer_identity->>'first_name',
        'withdrawn_at', o.withdrawn_at),
      link, thread || ':withdrawn', now());
    perform public.offer_notice(
      o, o.buyer_id,
      format('Offre d''achat %s retirée par l''acquéreur.', o.reference),
      'offer_withdrawn');
  elsif new.event = 'expired' then
    -- Its buyer and its seller: bell and email.
    perform public.notification_add(
      o.buyer_id, 'offer.expired',
      info || jsonb_build_object('role', 'buyer', 'expired_at', o.expired_at),
      link, thread || ':expired', now());
    perform public.notification_add(
      o.seller_id, 'offer.expired',
      info || jsonb_build_object('role', 'seller', 'expired_at', o.expired_at,
                                 'buyer_first_name', o.buyer_identity->>'first_name'),
      link, thread || ':expired', now());
  else
    -- Accepted or declined: the buyer, bell and email, with the message of the seller.
    perform public.notification_add(
      o.buyer_id, 'offer.answered',
      jsonb_strip_nulls(info || jsonb_build_object(
        'accepted', new.event = 'accepted',
        'message', new.meta->>'message')),
      link, thread, now());
    if new.event = 'accepted' then
      perform public.sale_emit_event(p.id, 'offer.accepted');
      -- The team, when the plan of the sale includes an adviser (L2-07): the
      -- sheet of the offer in the back office. One group for the team: its
      -- emails leave together.
      if exists (select 1 from public.plan_entitlements e
                  where e.plan = public.property_current_plan(p.id)
                    and e.feature = 'advisor') then
        -- Telling the team never undoes the answer of the seller.
        begin
          for v_admin in
            select a.id from public.profiles a
             where 'admin' = any(a.roles) and a.deleted_at is null and a.suspended_at is null
               and a.id not in (o.seller_id, o.buyer_id)
          loop
            perform public.notification_add(
              v_admin, 'offer.accepted_team',
              info || jsonb_build_object(
                'listing_reference', l.reference,
                'plan', public.property_current_plan(p.id),
                'asking_price_cents', (o.property_snapshot->>'asking_price_cents')::bigint),
              '/admin/offres/' || o.id, 'offers:accepted', now());
          end loop;
        exception when others then
          raise warning 'offer.accepted_team not sent for offer %: %', o.id, sqlerrm;
        end;
      end if;
    end if;
    perform public.offer_notice(
      o, o.seller_id,
      format(case when new.event = 'accepted' then 'Offre d''achat %s acceptée par le vendeur.'
                  else 'Offre d''achat %s refusée par le vendeur.' end, o.reference),
      'offer_' || new.event);
  end if;
  return null;
end;
$$;

revoke execute on function public.offer_events_notify() from public, anon, authenticated;

-- 4. ---------------------------------------------------------------------------
alter table public.financing_documents add column file_deleted_at timestamptz;
grant select (file_deleted_at) on public.financing_documents to authenticated;

-- A proof checked: its buyer is told, in the app and by email. Never stops
-- the check.
create function public.financing_documents_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform public.notification_add(
      new.buyer_id, 'financing.checked',
      jsonb_build_object('entity_id', new.id, 'document_id', new.id, 'document_type', new.type,
                         'checked_at', new.checked_at),
      '/acquereur/profil', 'financing:' || new.id, now());
  exception when others then
    raise warning 'financing.checked not sent for document %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

create trigger financing_documents_notify after update of checked_at on public.financing_documents
  for each row when (old.checked_at is null and new.checked_at is not null)
  execute function public.financing_documents_notify();

-- The file of a checked proof is deleted by the team (answer of Cédric of
-- 2026-11-19): the admin action removes the storage object with the session
-- of the admin, this policy allows it for a checked document only (the
-- function says no to anyone who is not of the team).
create function public.financing_file_checked(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
     and exists (select 1 from public.financing_documents d
                  where d.storage_path = p_name and d.checked_at is not null);
$$;

create policy documents_financing_delete_checked on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.financing_file_buyer(name) is not null
         and public.is_admin() and public.financing_file_checked(name));

-- Once the object is gone, the document says so (the buyer and the team no
-- longer see a link to it). Refused while the file is still in the bucket.
create function public.financing_document_file_removed(p_document_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.financing_documents;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into d from public.financing_documents where id = p_document_id for update;
  if not found then
    raise exception 'document not found' using errcode = '42501';
  end if;
  if d.checked_at is null then
    raise exception 'this document is not checked' using errcode = '22023';
  end if;
  if exists (select 1 from storage.objects
              where bucket_id = 'documents' and name = d.storage_path) then
    raise exception 'the file of this document is still stored' using errcode = '22023';
  end if;
  if d.file_deleted_at is null then
    update public.financing_documents set file_deleted_at = now() where id = d.id;
    perform public.audit('financing.file_deleted', 'financing_document', d.id,
                         jsonb_build_object('buyer_id', d.buyer_id));
  end if;
end;
$$;

-- The documents of a buyer as the team reads them, with the deletion of the file.
drop function public.admin_financing_documents(uuid);
create function public.admin_financing_documents(p_buyer_id uuid)
returns table (
  id uuid, type public.financing_document_type, document_date date, mime_type text,
  size_bytes int, created_at timestamptz, deleted_at timestamptz, checked_at timestamptz,
  checked_by_name text, check_note text, is_current boolean, file_deleted_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select d.id, d.type, d.document_date, d.mime_type, d.size_bytes, d.created_at, d.deleted_at,
           d.checked_at, nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), d.check_note,
           coalesce(bp.current_financing_document_id = d.id, false), d.file_deleted_at
      from public.financing_documents d
      left join public.profiles pr on pr.id = d.checked_by
      left join public.buyer_profiles bp on bp.profile_id = d.buyer_id
     where d.buyer_id = p_buyer_id
     order by d.created_at desc;
end;
$$;

revoke execute on function public.financing_documents_notify() from public, anon, authenticated;
revoke execute on function public.financing_file_checked(text) from public, anon;
revoke execute on function public.financing_document_file_removed(uuid) from public, anon;
revoke execute on function public.admin_financing_documents(uuid) from public, anon;
grant execute on function public.financing_file_checked(text) to authenticated;
grant execute on function public.financing_document_file_removed(uuid) to authenticated;
grant execute on function public.admin_financing_documents(uuid) to authenticated;

-- 5. ---------------------------------------------------------------------------
-- A report handled (closed by the team): its author is told, in the app and
-- by email. Never what was decided, never the note of the team. Never stops
-- the closing.
create function public.reports_notify_handled() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if exists (select 1 from public.profiles p
                where p.id = new.reporter_id and p.deleted_at is null) then
      perform public.notification_add(
        new.reporter_id, 'report.handled',
        jsonb_build_object(
          'entity_id', new.id,
          'report_id', new.id,
          'conversation_id', new.conversation_id,
          'listing_title', (select l.title from public.conversations c
                              join public.listings l on l.id = c.listing_id
                             where c.id = new.conversation_id)),
        case when new.conversation_id is null then '/messages'
             else '/messages/' || new.conversation_id end,
        'report:' || new.id, now());
    end if;
  exception when others then
    raise warning 'report.handled not sent for report %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

create trigger reports_notify_handled after update of resolved_at on public.reports
  for each row when (old.resolved_at is null and new.resolved_at is not null)
  execute function public.reports_notify_handled();

revoke execute on function public.reports_notify_handled() from public, anon, authenticated;

-- 6. ---------------------------------------------------------------------------
-- As in L2-07; an acquisition by an SCI keeps no start of a withdrawal period.
create or replace function public.offer_record_precontract(
  p_offer_id uuid, p_signed_at date, p_withdrawal_start date default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
begin
  select * into o from public.offers where id = p_offer_id
     and (seller_id = auth.uid() or public.is_admin()) for update;
  if not found or not public.is_active_user() then
    raise exception 'offer not found' using errcode = '42501';
  end if;
  -- The team, in the place of the seller: a right of the plan in force,
  -- never a plan name.
  if o.seller_id <> auth.uid() and not exists (
    select 1 from public.listings l
      join public.plan_entitlements e
        on e.plan = public.property_current_plan(l.property_id)
     where l.id = o.listing_id and e.feature = 'notary_coordination') then
    raise exception 'the plan of this sale has no avant-contrat recorded by the team'
      using errcode = '42501';
  end if;
  if o.status <> 'accepted' then
    perform public.offer_bad_transition(o.status, 'record the avant-contrat of');
  end if;
  if p_signed_at is null or p_signed_at > (now() at time zone 'Europe/Paris')::date
     or p_signed_at < (o.answered_at at time zone 'Europe/Paris')::date then
    raise exception 'the date of the avant-contrat is not valid' using errcode = '22023';
  end if;
  -- No withdrawal period shown for an acquisition by an SCI (answer of
  -- Cédric of 2026-11-19): its start is not kept.
  if o.acquisition_mode = 'sci' then
    p_withdrawal_start := null;
  end if;
  if p_withdrawal_start is not null
     and (p_withdrawal_start < p_signed_at
          or p_withdrawal_start > (now() at time zone 'Europe/Paris')::date) then
    raise exception 'the withdrawal period starts from the avant-contrat to today'
      using errcode = '22023';
  end if;
  update public.offers
     set precontract_signed_at = p_signed_at, withdrawal_period_start = p_withdrawal_start
   where id = o.id;
  perform public.offer_event(o.id, 'precontract_recorded',
    jsonb_build_object('signed_at', p_signed_at, 'withdrawal_start', p_withdrawal_start));
  if public.is_admin() and o.seller_id <> auth.uid() then
    perform public.audit('offer.precontract', 'offer', o.id,
      jsonb_build_object('signed_at', p_signed_at, 'withdrawal_start', p_withdrawal_start));
  end if;
end;
$$;

-- 7. ---------------------------------------------------------------------------
-- account_anonymize of L3-03 (20261121140000), with the addresses frozen with
-- the offers received by the closed seller, erased with the address of their
-- properties: the only change.
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
         rejection_reason = null, suspension_reason = null
    from public.properties p
   where p.id = l.property_id and p.owner_id = p_profile;
  delete from public.listing_revisions r
   using public.listings l, public.properties p
   where l.id = r.listing_id and p.id = l.property_id and p.owner_id = p_profile;
  delete from public.ai_conversations where profile_id = p_profile;
  delete from public.notifications where profile_id = p_profile;
  delete from public.favorites where buyer_id = p_profile;
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
end;
$$;
