-- L1-33: has_entitlement(property, feature), the one test of a right of a
-- plan from the application (SPEC-V2 11 bis, CLAUDE.md 14): the plan in
-- force of the property (property_current_plan) and the rows of
-- plan_entitlements, never the name of the plan. Answered for the owner of
-- the property and the admins; false for anyone else, so that the plan of a
-- property is not read through it. SQL functions of the webhooks and crons
-- read plan_entitlements themselves.

create function public.has_entitlement(p_property uuid, p_feature public.plan_feature)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
      select 1 from public.properties pr
       where pr.id = p_property
         and pr.deleted_at is null
         and (pr.owner_id = (select auth.uid()) or public.is_admin())
    )
    and exists (
      select 1 from public.plan_entitlements e
       where e.plan = public.property_current_plan(p_property)
         and e.feature = p_feature
    );
$$;

revoke execute on function public.has_entitlement(uuid, public.plan_feature) from public, anon;
grant execute on function public.has_entitlement(uuid, public.plan_feature) to authenticated;
