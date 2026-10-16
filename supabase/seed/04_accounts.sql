-- Seed accounts (SPEC-V2 section 22, CLAUDE.md section 7): seller_a, seller_b,
-- buyer_c, buyer_d and admin, <name>@test.leenkey.fr, local and staging only.
-- Password: SEED_PASSWORD, set by scripts/db-seed.sh as seed.password, and
-- kept in Vault (secret "seed_password") to be read from the Supabase
-- dashboard. Without SEED_PASSWORD the Vault secret is reused, or a random one
-- is created there: no password in the repository.
-- auth.users differs between a hosted project (email_confirmed_at, generated
-- confirmed_at, auth.identities) and the bare supabase/postgres image used
-- locally and in CI: the columns written are those that exist.

do $$
declare
  pw text := nullif(current_setting('seed.password', true), '');
  secret uuid;
  stored text;
  acc record;
  j jsonb;
  cols text;
begin
  select s.id, s.decrypted_secret into secret, stored
  from vault.decrypted_secrets s where s.name = 'seed_password';
  if pw is null then
    pw := coalesce(stored, encode(extensions.gen_random_bytes(18), 'base64'));
  end if;
  if secret is null then
    perform vault.create_secret(pw, 'seed_password', 'Mot de passe des comptes de seed (local et staging)');
  elsif stored is distinct from pw then
    perform vault.update_secret(secret, pw);
  end if;

  for acc in
    select * from (values
      ('5eed0000-0000-4000-8000-00000000000a'::uuid, 'seller_a@test.leenkey.fr', 'Alice', 'Martin', '{seller}'::public.user_role[]),
      ('5eed0000-0000-4000-8000-00000000000b'::uuid, 'seller_b@test.leenkey.fr', 'Bruno', 'Lefèvre', '{seller}'::public.user_role[]),
      ('5eed0000-0000-4000-8000-00000000000c'::uuid, 'buyer_c@test.leenkey.fr', 'Chloé', 'Dubois', '{buyer}'::public.user_role[]),
      ('5eed0000-0000-4000-8000-00000000000d'::uuid, 'buyer_d@test.leenkey.fr', 'David', 'Moreau', '{buyer}'::public.user_role[]),
      ('5eed0000-0000-4000-8000-0000000000ad'::uuid, 'admin@test.leenkey.fr', 'Cédric', null, '{admin}'::public.user_role[])
    ) as a(id, email, first_name, last_name, roles)
  loop
    if not exists (select 1 from auth.users where id = acc.id) then
      j := jsonb_build_object(
        'instance_id', '00000000-0000-0000-0000-000000000000',
        'id', acc.id, 'aud', 'authenticated', 'role', 'authenticated', 'email', acc.email,
        'encrypted_password', extensions.crypt(pw, extensions.gen_salt('bf', 10)),
        'email_confirmed_at', now(), 'confirmed_at', now(),
        'raw_app_meta_data', jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        'raw_user_meta_data', jsonb_strip_nulls(jsonb_build_object(
          'role', case when acc.roles[1] in ('seller', 'buyer') then acc.roles[1]::text end,
          'first_name', acc.first_name, 'last_name', acc.last_name, 'email_verified', true)),
        'created_at', now(), 'updated_at', now(),
        -- GoTrue reads these as strings: empty, never null.
        'confirmation_token', '', 'recovery_token', '', 'email_change', '', 'email_change_token', '',
        'email_change_token_new', '', 'email_change_token_current', '', 'phone_change', '',
        'phone_change_token', '', 'reauthentication_token', '');
      select string_agg(quote_ident(c.column_name), ', ') into cols
      from information_schema.columns c
      where c.table_schema = 'auth' and c.table_name = 'users' and c.is_generated = 'NEVER'
        and c.column_name in (select jsonb_object_keys(j));
      -- The signup trigger (handle_new_user) creates the profile.
      execute format('insert into auth.users (%1$s) select %1$s from jsonb_populate_record(null::auth.users, $1)', cols)
        using j;
      if to_regclass('auth.identities') is not null then
        execute 'insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
                 values ($1::text, $1, $2, ''email'', now(), now(), now()) on conflict do nothing'
          using acc.id, jsonb_build_object('sub', acc.id::text, 'email', acc.email,
                                           'email_verified', true, 'phone_verified', false);
      end if;
    else
      update auth.users set encrypted_password = extensions.crypt(pw, extensions.gen_salt('bf', 10))
       where id = acc.id
         and case when encrypted_password ~ '^\$2[aby]\$'
                  then encrypted_password <> extensions.crypt(pw, encrypted_password)
                  else true end;
    end if;

    -- Back to the reference state (names, roles, active), whatever the recette changed.
    update public.profiles
       set first_name = acc.first_name, last_name = acc.last_name, roles = acc.roles,
           suspended_at = null, suspension_reason = null, deleted_at = null
     where id = acc.id
       and (first_name, last_name, roles, suspended_at, suspension_reason, deleted_at)
           is distinct from (acc.first_name, acc.last_name, acc.roles, null::timestamptz, null::text, null::timestamptz);
    if 'buyer' = any(acc.roles) then
      insert into public.buyer_profiles (profile_id) values (acc.id) on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- buyer_c has declared a project and financing ("declared"); buyer_d has not.
update public.buyer_profiles
   set project = 'residence_principale', target_cities = '{Savigny-sur-Orge,Épinay-sur-Orge,Morsang-sur-Orge}',
       budget_max_cents = 38000000, down_payment_cents = 6000000, loan_needed = true,
       loan_amount_cents = 32000000, situation_note = 'Couple, un enfant, CDI tous les deux.'
 where profile_id = '5eed0000-0000-4000-8000-00000000000c'
   and (project, budget_max_cents, down_payment_cents, loan_needed, loan_amount_cents)
       is distinct from ('residence_principale'::public.buyer_project, 38000000::bigint, 6000000::bigint, true, 32000000::bigint);
