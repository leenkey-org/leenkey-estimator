-- The emails of the team go to every admin account (Younes, 2026-11-08:
-- « toutes les demandes type validation de bien vont aux 2 comptes admin »),
-- and the team is told of each new account once its email is confirmed.
--
-- 1. team_email_addresses: the confirmed emails of the active admin accounts,
--    for the emails of the team (an annonce to review, a report, a plan
--    bought), sent by the cron and the Stripe webhook with the service role
--    only; ADMIN_NOTIFICATION_EMAIL is added to them when set.
-- 2. accounts_notify: an account whose email is confirmed (auth.users
--    email_confirmed_at set) tells each admin (account.created, in the app and
--    by email through the cron of L1-22, grouped). An account created already
--    confirmed (seed, made by hand) tells no one.

create function public.team_email_addresses() returns setof text
language sql stable security definer set search_path = '' as $$
  select distinct u.email::text
    from auth.users u
    join public.profiles p on p.id = u.id
   where 'admin' = any(p.roles) and p.deleted_at is null and p.suspended_at is null
     and u.email is not null and u.email_confirmed_at is not null
   order by 1;
$$;

create function public.accounts_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_info jsonb;
  v_admin uuid;
begin
  if old.email_confirmed_at is not null or new.email_confirmed_at is null then
    return null;
  end if;
  -- entity_id: the same event for each admin (one email for the team).
  select jsonb_build_object(
           'entity_id', p.id,
           'profile_id', p.id,
           'first_name', p.first_name,
           'last_initial', left(p.last_name, 1),
           'roles', to_jsonb(p.roles))
    into v_info
    from public.profiles p
   where p.id = new.id;
  if v_info is null then
    return null;
  end if;
  for v_admin in
    select p.id from public.profiles p
     where 'admin' = any(p.roles) and p.deleted_at is null and p.suspended_at is null
       and p.id <> new.id
  loop
    perform public.notification_add(
      v_admin, 'account.created', v_info, '/admin/utilisateurs/' || new.id, 'accounts:new', now());
  end loop;
  return null;
end;
$$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.accounts_notify();

revoke execute on function public.team_email_addresses() from public, anon, authenticated;
grant execute on function public.team_email_addresses() to service_role;
revoke execute on function public.accounts_notify() from public, anon, authenticated;
