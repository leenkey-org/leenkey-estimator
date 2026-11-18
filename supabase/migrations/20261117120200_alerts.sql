-- L3-01 (SPEC-V2 sections 4 and 16, CLAUDE.md section 7): buyer alerts. A
-- buyer saves the filters of a search (the stored form of SearchFilters,
-- checked by Zod on the server) under a name, 5 alerts at most. The daily
-- digest (cron, L3-06) writes last_sent_at with the service key: a client
-- never writes it.

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  criteria jsonb not null check (jsonb_typeof(criteria) = 'object' and pg_column_size(criteria) <= 4096),
  last_sent_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index alerts_buyer_idx on public.alerts (buyer_id);
create index alerts_active_idx on public.alerts (active) where active;
create trigger alerts_set_updated_at before update on public.alerts
  for each row execute function public.set_updated_at();

-- 5 alerts at most per buyer (SPEC 16). Locks the profile so that two
-- creations at the same time cannot both pass.
create function public.alerts_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profiles where id = new.buyer_id for update;
  if (select count(*) from public.alerts where buyer_id = new.buyer_id) >= 5 then
    raise exception 'five alerts at most' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger alerts_limit before insert on public.alerts
  for each row execute function public.alerts_limit();
revoke execute on function public.alerts_limit() from public, anon, authenticated;

alter table public.alerts enable row level security;

create policy alerts_select on public.alerts for select to authenticated
  using (buyer_id = auth.uid() or public.is_admin());
create policy alerts_insert on public.alerts for insert to authenticated
  with check (buyer_id = auth.uid() and public.is_active_user());
create policy alerts_update on public.alerts for update to authenticated
  using (buyer_id = auth.uid() and public.is_active_user())
  with check (buyer_id = auth.uid());
create policy alerts_delete on public.alerts for delete to authenticated
  using (buyer_id = auth.uid());

revoke all on public.alerts from anon, authenticated;
grant select on public.alerts to authenticated;
grant insert (buyer_id, name, criteria, active) on public.alerts to authenticated;
grant update (name, criteria, active) on public.alerts to authenticated;
grant delete on public.alerts to authenticated;
