-- L1-03: enums, profiles, buyer_profiles, signup trigger, RLS.
-- Reference: docs/SPEC-V2.md sections 4 (Enums, Utilisateurs) and 5 (RLS).

-- ---------------------------------------------------------------------------
-- Enums (full reference list, SPEC-V2 section 4)
-- ---------------------------------------------------------------------------
create type public.user_role        as enum ('seller','buyer','admin');
create type public.plan_code        as enum ('autonomie','accompagne','serenite');
create type public.property_type    as enum ('appartement','maison','terrain','autre');
create type public.listing_status   as enum ('draft','pending','published','paused','suspended','sold','rejected');
create type public.offer_status     as enum ('draft','submitted','viewed','accepted','declined','expired','withdrawn','superseded');
create type public.visit_status     as enum ('requested','confirmed','done','cancelled');
create type public.case_status      as enum ('new','in_progress','closed');
create type public.case_source      as enum ('plan_purchase','assistant_handoff','manual');
create type public.financing_status as enum ('not_provided','declared','document_provided','document_checked');
create type public.acquisition_mode   as enum ('own_name','joint','sci','other');
create type public.financing_mode     as enum ('no_loan','loan');
create type public.financing_progress as enum ('not_presented','simulation_done','broker_consulted','agreement_in_principle','other');
create type public.financing_document_type as enum ('accord_principe','attestation_courtier','simulation_bancaire','preuve_fonds_propres','autre');
create type public.conversation_kind as enum ('listing','advisor');
create type public.plan_feature as enum ('advisor','human_price_strategy','human_listing_review','human_offer_analysis','negotiation_support','sale_file_building','deep_document_review','notary_coordination','closing_follow_up');
create type public.buyer_project    as enum ('residence_principale','residence_secondaire','investissement');
create type public.document_type    as enum ('dpe','amiante','plomb','electricite','gaz','termites','erp','carrez',
                                             'titre_propriete','taxe_fonciere','pv_ag','reglement_copro',
                                             'appel_charges','facture_travaux','autre');
create type public.notification_channel as enum ('in_app','email');

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text check (char_length(first_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  phone text check (char_length(phone) <= 30),
  avatar_path text check (char_length(avatar_path) <= 300),
  roles public.user_role[] not null default '{}',
  ai_messages_today int not null default 0,
  ai_messages_date date,
  suspended_at timestamptz,
  suspension_reason text,
  notification_prefs jsonb not null default '{"email_messages":true,"email_offers":true,"email_alerts":true}'
    check (jsonb_typeof(notification_prefs) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- is_admin(): SPEC-V2 section 5. security definer so it can read profiles
-- whatever the caller's policies; search_path pinned.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and 'admin' = any(roles) and deleted_at is null
  );
$$;

alter table public.profiles enable row level security;

create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() and deleted_at is null)
  with check (id = auth.uid());

-- Column-level privileges: a user only edits their identity and preferences.
-- roles, quota, suspension and deletion columns are written by security
-- definer functions (profile_add_role here; admin functions in later tasks).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, avatar_path, notification_prefs)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- buyer_profiles
-- ---------------------------------------------------------------------------
create table public.buyer_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  project public.buyer_project,
  target_cities text[] check (cardinality(target_cities) <= 20),
  budget_max_cents bigint check (budget_max_cents >= 0),
  down_payment_cents bigint check (down_payment_cents >= 0),
  loan_needed boolean,
  loan_amount_cents bigint check (loan_amount_cents >= 0),
  financing_status public.financing_status not null default 'not_provided',
  current_financing_document_id uuid,  -- FK to financing_documents(id), added in L2-02
  situation_note text check (char_length(situation_note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create trigger buyer_profiles_set_updated_at before update on public.buyer_profiles
  for each row execute function public.set_updated_at();

-- financing_status follows the declared fields until a document is involved
-- (document_provided / document_checked are set by L2-02 functions only).
create function public.buyer_profiles_compute_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.financing_status in ('not_provided', 'declared') then
    new.financing_status := case
      when new.project is not null
       and new.budget_max_cents is not null
       and new.down_payment_cents is not null
       and new.loan_needed is not null
      then 'declared'::public.financing_status
      else 'not_provided'::public.financing_status
    end;
  end if;
  return new;
end;
$$;

create trigger buyer_profiles_compute_status before insert or update on public.buyer_profiles
  for each row execute function public.buyer_profiles_compute_status();

alter table public.buyer_profiles enable row level security;

create policy buyer_profiles_select_self_or_admin on public.buyer_profiles
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy buyer_profiles_update_self on public.buyer_profiles
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Rows are created by the signup trigger or profile_add_role('buyer').
-- Sellers read the financing summary through buyer_summary_for_seller()
-- (L1-05, once conversations and offers exist), never this table.
revoke all on public.buyer_profiles from anon, authenticated;
grant select on public.buyer_profiles to authenticated;
grant update (project, target_cities, budget_max_cents, down_payment_cents,
              loan_needed, loan_amount_cents, situation_note)
  on public.buyer_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Signup: one profiles row per auth.users row
-- ---------------------------------------------------------------------------
-- The signup form sends { role: 'seller' | 'buyer', first_name, last_name, phone }
-- as user metadata. Metadata is user-controlled: 'admin' is never accepted.
create function public.handle_new_user() returns trigger
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

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- profile_add_role: account page "ajouter Je vends / J'achète" (SPEC 8.14)
-- ---------------------------------------------------------------------------
create function public.profile_add_role(p_role public.user_role) returns public.user_role[]
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  result public.user_role[];
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_role not in ('seller', 'buyer') then
    raise exception 'role not allowed' using errcode = '42501';
  end if;

  update public.profiles
     set roles = case when p_role = any(roles) then roles else array_append(roles, p_role) end
   where id = uid and deleted_at is null and suspended_at is null
  returning roles into result;

  if result is null then
    raise exception 'profile unavailable' using errcode = '42501';
  end if;

  if p_role = 'buyer' then
    insert into public.buyer_profiles (profile_id) values (uid)
    on conflict (profile_id) do nothing;
  end if;

  return result;
end;
$$;

revoke execute on function public.profile_add_role(public.user_role) from public, anon;
grant execute on function public.profile_add_role(public.user_role) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.buyer_profiles_compute_status() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
