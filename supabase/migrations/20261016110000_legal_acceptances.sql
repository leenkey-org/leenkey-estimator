-- L1-09: dated and versioned acceptance of the terms of use (CGU) and of the
-- privacy policy at signup (SPEC section 4, legal_acceptances; DECISIONS
-- 2026-10-15 "vendre légalement"). The sales terms (CGV, context 'checkout')
-- come with L1-40.
-- Signup: the server action puts the accepted versions in the user metadata
-- ({"legal": {"cgu": "2026-10-16", "privacy": "2026-10-16"}}) and the signup
-- trigger records them, at the time of the signup, before any session exists.
-- Afterwards (new version of a text, account created without them) the user
-- accepts through legal_accept(), context 'update' (DECISIONS 2026-10-16).

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  document text not null check (document in ('cgu','cgv','privacy')),
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  context text not null check (context in ('signup','update','checkout')),
  subscription_id uuid references public.subscriptions(id),
  accepted_at timestamptz not null default now()
);
create index legal_acceptances_profile_idx
  on public.legal_acceptances (profile_id, document, accepted_at desc);

alter table public.legal_acceptances enable row level security;

create policy legal_acceptances_select_own_or_admin on public.legal_acceptances
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- Append-only: rows are written by the signup trigger and the functions below.
revoke all on public.legal_acceptances from anon, authenticated;
grant select on public.legal_acceptances to authenticated;

-- Records the CGU and privacy versions given at signup; anything else in the
-- metadata (document, version format) is ignored.
create function public.legal_record_signup(p_profile_id uuid, p_legal jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  doc text;
begin
  if jsonb_typeof(p_legal) is distinct from 'object' then
    return;
  end if;
  foreach doc in array array['cgu', 'privacy'] loop
    if p_legal->>doc ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      insert into public.legal_acceptances (profile_id, document, version, context)
      values (p_profile_id, doc, p_legal->>doc, 'signup');
    end if;
  end loop;
end;
$$;

-- Signup trigger of L1-03, plus the acceptances.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested text := meta->>'role';
  initial_roles public.user_role[] := '{}';
begin
  if requested in ('seller', 'buyer') then
    initial_roles := array[requested::public.user_role];
  end if;

  insert into public.profiles (id, first_name, last_name, phone, roles)
  values (
    new.id,
    nullif(left(btrim(meta->>'first_name'), 80), ''),
    nullif(left(btrim(meta->>'last_name'), 80), ''),
    nullif(left(btrim(meta->>'phone'), 30), ''),
    initial_roles
  );

  if 'buyer' = any(initial_roles) then
    insert into public.buyer_profiles (profile_id) values (new.id);
  end if;

  perform public.legal_record_signup(new.id, meta->'legal');
  return new;
end;
$$;

-- Acceptance by a signed-in user: {"cgu": "<version>", "privacy": "<version>"}.
-- Context 'signup' for a first acceptance of the document, 'update' afterwards.
create function public.legal_accept(p_versions jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  doc text;
  ver text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_versions) is distinct from 'object' or p_versions = '{}'::jsonb then
    raise exception 'versions are required' using errcode = '22023';
  end if;
  for doc, ver in select key, value from jsonb_each_text(p_versions) loop
    if doc not in ('cgu', 'privacy') then
      raise exception 'only the CGU and the privacy policy are accepted here' using errcode = '22023';
    end if;
    if ver is null or ver !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'invalid version' using errcode = '22023';
    end if;
    insert into public.legal_acceptances (profile_id, document, version, context)
    values (uid, doc, ver,
            case when exists (select 1 from public.legal_acceptances
                              where profile_id = uid and document = doc)
                 then 'update' else 'signup' end);
  end loop;
end;
$$;

revoke execute on function public.legal_record_signup(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.legal_accept(jsonb) from public, anon;
grant execute on function public.legal_accept(jsonb) to authenticated;
