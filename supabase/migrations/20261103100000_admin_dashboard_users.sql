-- L1-30a: the dashboard of the back office and its users (SPEC-V2 section 17).
-- The admin already reads every profile, listing, case, report and
-- subscription through the RLS of L1-03 to L1-05 (is_admin()), and suspends
-- an account with admin_suspend_user / admin_unsuspend_user (L1-05, written
-- to audit_log). Added here, for the admin only (each function checks
-- is_admin() itself), no table:
--
-- 1. admin_counts: what waits for the admin (listings to review and the
--    oldest of them, open cases, open reports): the counters of the sidebar,
--    of the mobile header and of the dashboard.
-- 2. admin_activity: plans sold and sign-ups over the last days.
-- 3. admin_users, admin_user_counts: the list of /admin/utilisateurs, with
--    its search on the name and the email and its filters.
-- 4. admin_user_contact: the email of an account and its sign-in dates.
--
-- 1, 2 and the counts run with the caller's rights (security invoker): the
-- RLS of the tables they read is a second barrier. The list and the contact
-- need the rights of the owner for auth.users (the email), out of reach of
-- PostgREST.

create function public.admin_counts()
returns table (
  listings_pending int,
  listings_oldest_submitted_at timestamptz,
  cases_open int,
  reports_open int
)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select
      (select count(*)::int from public.listings l
        where l.status = 'pending' and l.deleted_at is null),
      (select min(l.submitted_at) from public.listings l
        where l.status = 'pending' and l.deleted_at is null),
      (select count(*)::int from public.cases c where c.status <> 'closed'),
      (select count(*)::int from public.reports r where r.resolved_at is null);
end;
$$;

-- A plan sold: paid (above 0 €), not refunded; an upgrade counts as a sale
-- (its own subscription, SPEC 11). A sign-up: an account created in the
-- period, not deleted, not the team's; an account both seller and buyer
-- counts once in the total.
create function public.admin_activity(p_days int default 30)
returns table (
  plans_sold int,
  plans_amount_cents bigint,
  signups int,
  signups_sellers int,
  signups_buyers int
)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 366 then
    raise exception 'admin_activity: from 1 to 366 days' using errcode = '22023';
  end if;
  v_since := now() - make_interval(days => p_days);
  return query
    select
      (select count(*)::int from public.subscriptions s
        where s.activated_at >= v_since and s.amount_paid_cents > 0 and s.refunded_at is null),
      (select coalesce(sum(s.amount_paid_cents), 0)::bigint from public.subscriptions s
        where s.activated_at >= v_since and s.amount_paid_cents > 0 and s.refunded_at is null),
      (select count(*)::int from public.profiles p
        where p.created_at >= v_since and p.deleted_at is null and not ('admin' = any(p.roles))),
      (select count(*)::int from public.profiles p
        where p.created_at >= v_since and p.deleted_at is null and 'seller' = any(p.roles)),
      (select count(*)::int from public.profiles p
        where p.created_at >= v_since and p.deleted_at is null and 'buyer' = any(p.roles));
end;
$$;

-- The list of /admin/utilisateurs: the most recent first; filter on a role
-- or the suspended accounts; search on the first name, the last name and
-- the email. Deleted accounts are left out (L2-10). `paid_plan`: the dearest
-- paid plan in force on one of the properties of the account (not replaced,
-- refunded nor over), null when none; `properties`: its properties not
-- deleted.
create function public.admin_users(
  p_filter text default null,
  p_query text default null,
  p_limit int default 200
)
returns table (
  id uuid, first_name text, last_name text, email text, roles public.user_role[],
  created_at timestamptz, suspended_at timestamptz, properties int,
  paid_plan public.plan_code, financing_status public.financing_status
)
language plpgsql stable security definer set search_path = '' as $$
declare
  q text := nullif(btrim(coalesce(p_query, '')), '');
  pattern text;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_filter is not null and p_filter not in ('seller', 'buyer', 'admin', 'suspended') then
    raise exception 'admin_users: unknown filter' using errcode = '22023';
  end if;
  if q is not null then
    pattern := '%' || replace(replace(replace(left(q, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return query
    select p.id, p.first_name, p.last_name, u.email::text, p.roles, p.created_at, p.suspended_at,
           (select count(*)::int from public.properties pp
             where pp.owner_id = p.id and pp.deleted_at is null),
           (select s.plan from public.subscriptions s
              join public.plans pl on pl.code = s.plan
             where s.owner_id = p.id and s.replaced_by is null and s.refunded_at is null
               and (s.ends_at is null or s.ends_at > now()) and pl.price_cents > 0
             order by pl.price_cents desc, s.activated_at desc
             limit 1),
           bp.financing_status
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.buyer_profiles bp on bp.profile_id = p.id
     where p.deleted_at is null
       and (p_filter is null
            or (p_filter = 'suspended' and p.suspended_at is not null)
            or (p_filter <> 'suspended' and p_filter::public.user_role = any(p.roles)))
       and (pattern is null
            or concat_ws(' ', p.first_name, p.last_name, u.email::text) ilike pattern escape '\')
     order by p.created_at desc, p.id
     limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

create function public.admin_user_counts()
returns table (total int, sellers int, buyers int, admins int, suspended int)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select count(*)::int,
           (count(*) filter (where 'seller' = any(p.roles)))::int,
           (count(*) filter (where 'buyer' = any(p.roles)))::int,
           (count(*) filter (where 'admin' = any(p.roles)))::int,
           (count(*) filter (where p.suspended_at is not null))::int
      from public.profiles p
     where p.deleted_at is null;
end;
$$;

create function public.admin_user_contact(p_profile_id uuid)
returns table (email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select u.email::text, u.email_confirmed_at, u.last_sign_in_at
      from auth.users u
      join public.profiles p on p.id = u.id
     where u.id = p_profile_id and p.deleted_at is null;
end;
$$;

revoke execute on function public.admin_counts() from public, anon;
revoke execute on function public.admin_activity(int) from public, anon;
revoke execute on function public.admin_users(text, text, int) from public, anon;
revoke execute on function public.admin_user_counts() from public, anon;
revoke execute on function public.admin_user_contact(uuid) from public, anon;
grant execute on function public.admin_counts() to authenticated;
grant execute on function public.admin_activity(int) to authenticated;
grant execute on function public.admin_users(text, text, int) to authenticated;
grant execute on function public.admin_user_counts() to authenticated;
grant execute on function public.admin_user_contact(uuid) to authenticated;
