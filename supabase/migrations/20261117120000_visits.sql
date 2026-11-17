-- L3-01 (SPEC-V2 sections 4 and 14, CLAUDE.md section 7): visits on
-- invitation. Nobody books a visit without being invited by the seller: the
-- seller opens slots (one at a time, 30, 45 or 60 minutes, no series), invites
-- a buyer who has a relation with the property (a conversation or an offer
-- sent), the buyer books a free slot with the token of the invitation (valid
-- 7 days). The exact address is given only to a buyer with a visit confirmed.
--
-- Every write goes through a function (security definer, checks auth.uid()
-- and its parameters); the tables have no write grant. The messages, emails,
-- .ics and screens: L3-02; the feedback after the visit: L3-03.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.visit_slots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null default 1 check (capacity between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint visit_slots_length check (
    ends_at - starts_at in (interval '30 minutes', interval '45 minutes', interval '60 minutes'))
);
create index visit_slots_property_idx on public.visit_slots (property_id, starts_at);
create trigger visit_slots_set_updated_at before update on public.visit_slots
  for each row execute function public.set_updated_at();

create table public.visit_invitations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  token text not null unique check (token ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (property_id, buyer_id)
);
create index visit_invitations_buyer_idx on public.visit_invitations (buyer_id);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.visit_slots(id),
  property_id uuid not null references public.properties(id),
  buyer_id uuid not null references public.profiles(id),
  status public.visit_status not null default 'confirmed',
  buyer_feedback text check (char_length(buyer_feedback) <= 2000),
  buyer_interest int check (buyer_interest between 1 and 5),
  seller_feedback text check (char_length(seller_feedback) <= 2000),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint visits_cancelled check ((status = 'cancelled') = (cancelled_at is not null))
);
create index visits_slot_idx on public.visits (slot_id);
create index visits_property_idx on public.visits (property_id);
create index visits_buyer_idx on public.visits (buyer_id);
create trigger visits_set_updated_at before update on public.visits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Who reads what (no write grant: the functions below write)
-- ---------------------------------------------------------------------------
alter table public.visit_slots enable row level security;
alter table public.visit_invitations enable row level security;
alter table public.visits enable row level security;

-- A buyer reads the slot of a visit of theirs (its date); the free slots of
-- an invitation come from visit_open_slots.
create policy visit_slots_select on public.visit_slots for select to authenticated
  using (public.owns_property(property_id) or public.is_admin()
         or exists (select 1 from public.visits v
                     where v.slot_id = visit_slots.id and v.buyer_id = auth.uid()));
create policy visit_invitations_select on public.visit_invitations for select to authenticated
  using (buyer_id = auth.uid() or public.owns_property(property_id) or public.is_admin());
create policy visits_select on public.visits for select to authenticated
  using (buyer_id = auth.uid() or public.owns_property(property_id) or public.is_admin());

revoke all on public.visit_slots, public.visit_invitations, public.visits from anon, authenticated;
grant select on public.visit_slots, public.visit_invitations, public.visits to authenticated;

-- ---------------------------------------------------------------------------
-- A relation with the property: a conversation about it, or an offer sent
-- ---------------------------------------------------------------------------
create function public.buyer_relates_to_property(p_property uuid, p_buyer uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c
                  where c.property_id = p_property and c.buyer_id = p_buyer and c.kind = 'listing')
      or exists (select 1 from public.offers o
                   join public.listings l on l.id = o.listing_id
                  where l.property_id = p_property and o.buyer_id = p_buyer and o.status <> 'draft');
$$;

-- The property can be visited: not deleted, its listing online or paused.
create function public.property_visitable(p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.properties p
                   join public.listings l on l.property_id = p.id
                  where p.id = p_property and p.deleted_at is null and l.deleted_at is null
                    and l.status in ('published', 'paused'));
$$;

-- ---------------------------------------------------------------------------
-- The seller: slots and invitations
-- ---------------------------------------------------------------------------
create function public.visit_slot_add(p_property uuid, p_starts_at timestamptz, p_minutes int)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_end timestamptz := p_starts_at + make_interval(mins => p_minutes);
begin
  if not public.is_active_user() or not public.property_is_editable(p_property) then
    raise exception 'not a property of yours' using errcode = '42501';
  end if;
  if not public.property_visitable(p_property) then
    raise exception 'the listing is not online' using errcode = '22023';
  end if;
  if p_minutes not in (30, 45, 60) then
    raise exception 'a slot lasts 30, 45 or 60 minutes' using errcode = '22023';
  end if;
  if p_starts_at < now() + interval '1 hour' or p_starts_at > now() + interval '90 days' then
    raise exception 'a slot starts between in one hour and in 90 days' using errcode = '22023';
  end if;
  if exists (select 1 from public.visit_slots s
              where s.property_id = p_property
                and tstzrange(s.starts_at, s.ends_at) && tstzrange(p_starts_at, v_end)) then
    raise exception 'the slot overlaps another one' using errcode = '23P01';
  end if;
  insert into public.visit_slots (property_id, starts_at, ends_at)
  values (p_property, p_starts_at, v_end)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.visit_slot_remove(p_slot uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.visit_slots;
begin
  select * into s from public.visit_slots where id = p_slot for update;
  if not found or not public.is_active_user() or not public.property_is_editable(s.property_id) then
    raise exception 'not a slot of yours' using errcode = '42501';
  end if;
  if exists (select 1 from public.visits v where v.slot_id = p_slot and v.status = 'confirmed') then
    raise exception 'cancel the visit of this slot first' using errcode = '22023';
  end if;
  -- Kept when it has visits in its history (cancelled, done): only a free slot goes.
  if exists (select 1 from public.visits v where v.slot_id = p_slot) then
    raise exception 'the slot has visits in its history' using errcode = '22023';
  end if;
  delete from public.visit_slots where id = p_slot;
end;
$$;

-- A token for a buyer who has a relation with the property, valid 7 days;
-- asked again, a new token (the old link no longer works).
create function public.visit_invite(p_property uuid, p_buyer uuid)
returns table (token text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires timestamptz := now() + interval '7 days';
begin
  if not public.is_active_user() or not public.property_is_editable(p_property) then
    raise exception 'not a property of yours' using errcode = '42501';
  end if;
  if not public.property_visitable(p_property) then
    raise exception 'the listing is not online' using errcode = '22023';
  end if;
  if not public.buyer_relates_to_property(p_property, p_buyer)
     or not exists (select 1 from public.profiles
                     where id = p_buyer and deleted_at is null and suspended_at is null) then
    raise exception 'this buyer has no relation with the property' using errcode = '22023';
  end if;
  insert into public.visit_invitations as i (property_id, buyer_id, token, expires_at)
  values (p_property, p_buyer, v_token, v_expires)
  on conflict (property_id, buyer_id)
    do update set token = excluded.token, expires_at = excluded.expires_at;
  return query select v_token, v_expires;
end;
$$;

-- ---------------------------------------------------------------------------
-- The buyer: free slots and booking, with the token of their invitation
-- ---------------------------------------------------------------------------
create function public.visit_invitation_of(p_token text) returns public.visit_invitations
language sql stable security definer set search_path = '' as $$
  select * from public.visit_invitations
   where token = p_token and buyer_id = auth.uid() and expires_at > now();
$$;

create function public.visit_open_slots(p_token text)
returns table (slot_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  i public.visit_invitations := public.visit_invitation_of(p_token);
begin
  if i.id is null or not public.is_active_user() then
    raise exception 'invitation not found or expired' using errcode = '42501';
  end if;
  return query
    select s.id, s.starts_at, s.ends_at
      from public.visit_slots s
     where s.property_id = i.property_id and s.starts_at > now()
       and (select count(*) from public.visits v
             where v.slot_id = s.id and v.status = 'confirmed') < s.capacity
     order by s.starts_at;
end;
$$;

create function public.visit_book(p_token text, p_slot uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  i public.visit_invitations := public.visit_invitation_of(p_token);
  s public.visit_slots;
  v_id uuid;
begin
  if i.id is null or not public.is_active_user() then
    raise exception 'invitation not found or expired' using errcode = '42501';
  end if;
  select * into s from public.visit_slots where id = p_slot and property_id = i.property_id for update;
  if not found then
    raise exception 'not a slot of this property' using errcode = '22023';
  end if;
  if s.starts_at <= now() then
    raise exception 'this slot has passed' using errcode = '22023';
  end if;
  if not public.property_visitable(i.property_id) then
    raise exception 'the listing is not online' using errcode = '22023';
  end if;
  if (select count(*) from public.visits v where v.slot_id = s.id and v.status = 'confirmed') >= s.capacity then
    raise exception 'this slot is full' using errcode = '23P01';
  end if;
  if exists (select 1 from public.visits v join public.visit_slots vs on vs.id = v.slot_id
              where v.property_id = i.property_id and v.buyer_id = i.buyer_id
                and v.status = 'confirmed' and vs.starts_at > now()) then
    raise exception 'a visit of this property is already booked' using errcode = '23505';
  end if;
  insert into public.visits (slot_id, property_id, buyer_id)
  values (s.id, i.property_id, i.buyer_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- The buyer until 2 hours before (SPEC 14), the seller until it starts.
create function public.visit_cancel(p_visit uuid) returns public.visit_status
language plpgsql security definer set search_path = '' as $$
declare
  v public.visits;
  v_start timestamptz;
  v_seller boolean;
begin
  select * into v from public.visits where id = p_visit for update;
  if not found then
    raise exception 'visit not found' using errcode = '42501';
  end if;
  v_seller := public.owns_property(v.property_id);
  if not (v.buyer_id = auth.uid() or v_seller) then
    raise exception 'visit not found' using errcode = '42501';
  end if;
  if v.status <> 'confirmed' then
    raise exception 'this visit is not booked' using errcode = '22023';
  end if;
  select starts_at into v_start from public.visit_slots where id = v.slot_id;
  if v_start <= now() or (not v_seller and v_start <= now() + interval '2 hours') then
    raise exception 'too late to cancel this visit' using errcode = '22023';
  end if;
  update public.visits
     set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid()
   where id = p_visit;
  return 'cancelled';
end;
$$;

-- The exact address: to the buyer of a confirmed visit, and to the seller.
create function public.visit_address(p_visit uuid)
returns table (address_line text, postal_code text, city text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.visits v
                  where v.id = p_visit
                    and ((v.buyer_id = auth.uid() and v.status = 'confirmed')
                         or public.owns_property(v.property_id))) then
    raise exception 'visit not found' using errcode = '42501';
  end if;
  return query
    select p.address_line, p.postal_code, p.city
      from public.visits v join public.properties p on p.id = v.property_id
     where v.id = p_visit;
end;
$$;

revoke execute on function public.buyer_relates_to_property(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.property_visitable(uuid) from public, anon, authenticated;
revoke execute on function public.visit_invitation_of(text) from public, anon, authenticated;
revoke execute on function public.visit_slot_add(uuid, timestamptz, int) from public, anon;
revoke execute on function public.visit_slot_remove(uuid) from public, anon;
revoke execute on function public.visit_invite(uuid, uuid) from public, anon;
revoke execute on function public.visit_open_slots(text) from public, anon;
revoke execute on function public.visit_book(text, uuid) from public, anon;
revoke execute on function public.visit_cancel(uuid) from public, anon;
revoke execute on function public.visit_address(uuid) from public, anon;
grant execute on function public.visit_slot_add(uuid, timestamptz, int) to authenticated;
grant execute on function public.visit_slot_remove(uuid) to authenticated;
grant execute on function public.visit_invite(uuid, uuid) to authenticated;
grant execute on function public.visit_open_slots(text) to authenticated;
grant execute on function public.visit_book(text, uuid) to authenticated;
grant execute on function public.visit_cancel(uuid) to authenticated;
grant execute on function public.visit_address(uuid) to authenticated;
