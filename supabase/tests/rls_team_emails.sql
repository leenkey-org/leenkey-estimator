-- The emails of the team (2026-11-08): every confirmed, active admin account
-- gets them (team_email_addresses, for the service role only), and each admin
-- is told of an account once its email is confirmed (account.created), once.
begin;
\ir _helpers.psql
select plan(13);
\ir _plan.psql

-- Confirms an email as Supabase Auth does: email_confirmed_at, from which it
-- generates confirmed_at; the bare image of the CI has confirmed_at only.
create function tests.confirm_email(p_id uuid, p_at timestamptz) returns void
language plpgsql as $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'auth' and table_name = 'users'
                and column_name = 'email_confirmed_at') then
    execute 'update auth.users set email_confirmed_at = $2 where id = $1' using p_id, p_at;
  else
    execute 'update auth.users set confirmed_at = $2 where id = $1' using p_id, p_at;
  end if;
end;
$$;

-- The addresses of the team: the service role only ---------------------------------
\set who anon
\ir _as.psql
select throws_ok('select * from team_email_addresses()', '42501', null,
                 'anon: never reads the addresses of the team');
\set who seller_a
\ir _as.psql
select throws_ok('select * from team_email_addresses()', '42501', null,
                 'seller_a: never reads the addresses of the team');
\set who admin
\ir _as.psql
select throws_ok('select * from team_email_addresses()', '42501', null,
                 'admin: never reads them through the API either');

reset role;
select ok(not exists (select 1 from team_email_addresses() a where a = 'admin@rls.leenkey.test'),
          'team: an admin whose email is not confirmed gets nothing');
select tests.confirm_email(tests.uid('admin'), now());
select ok(exists (select 1 from team_email_addresses() a where a = 'admin@rls.leenkey.test'),
          'team: a confirmed admin gets the emails of the team');
select ok(not exists (select 1 from team_email_addresses() a where a = 'seller_a@rls.leenkey.test'),
          'team: never an account that is not admin');
update profiles set suspended_at = now() where id = tests.uid('admin');
select ok(not exists (select 1 from team_email_addresses() a where a = 'admin@rls.leenkey.test'),
          'team: never a suspended admin');
update profiles set suspended_at = null where id = tests.uid('admin');

-- A new account, once its email is confirmed --------------------------------------------
select tests.confirm_email(tests.uid('seller_a'), now());
select is((select count(*)::int from notifications
            where profile_id = tests.uid('admin') and type = 'account.created'
              and data->>'profile_id' = tests.uid('seller_a')::text), 1,
          'admin: told of an account once its email is confirmed');
select is((select data->>'first_name' from notifications
            where profile_id = tests.uid('admin') and type = 'account.created'
              and data->>'profile_id' = tests.uid('seller_a')::text), 'Alice',
          'admin: with its first name');
select ok((select email_after is not null and link = '/admin/utilisateurs/' || tests.uid('seller_a')
             from notifications
            where profile_id = tests.uid('admin') and type = 'account.created'
              and data->>'profile_id' = tests.uid('seller_a')::text),
          'admin: by email too, the link to the account in the back office');
select tests.confirm_email(tests.uid('seller_a'), now() + interval '1 minute');
select is((select count(*)::int from notifications
            where profile_id = tests.uid('admin') and type = 'account.created'
              and data->>'profile_id' = tests.uid('seller_a')::text), 1,
          'admin: told once, not at each change of the confirmation');
-- Made already confirmed (seed): the trigger only follows a confirmation.
do $$
begin
  execute format(
    'insert into auth.users (id, email, raw_user_meta_data, aud, role, %I) values ($1, $2, $3, $4, $4, now())',
    case when exists (select 1 from information_schema.columns
                       where table_schema = 'auth' and table_name = 'users'
                         and column_name = 'email_confirmed_at')
         then 'email_confirmed_at' else 'confirmed_at' end)
  using '00000000-0000-4000-a000-0000000000f1'::uuid, 'confirmed@rls.leenkey.test',
        '{"role":"buyer","first_name":"Eve"}'::jsonb, 'authenticated';
end;
$$;
select is((select count(*)::int from notifications
            where type = 'account.created' and data->>'profile_id' = '00000000-0000-4000-a000-0000000000f1'), 0,
          'admin: an account made already confirmed (seed) tells no one');

\set who seller_b
\ir _as.psql
select is((select count(*)::int from notifications where type = 'account.created'), 0,
          'seller_b: reads no notification of the team');

select * from finish();
rollback;
