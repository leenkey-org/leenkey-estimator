-- Analyses of value made without an account (L1-13b) are kept 12 months,
-- as the privacy policy says (DECISIONS.md 2026-11-09, Q49): every night,
-- those still without an account after 12 months are deleted. One taken
-- by an account (estimation_claim) or used to create a property stays.

create function public.estimations_purge() returns int
language sql security definer set search_path = '' as $$
  with gone as (
    delete from public.estimations e
     where e.profile_id is null
       and e.created_at < now() - interval '12 months'
       and not exists (select 1 from public.properties p where p.estimation_id = e.id)
    returning 1)
  select count(*)::int from gone;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-estimations';
    perform cron.schedule('purge-estimations', '53 3 * * *', $job$select public.estimations_purge()$job$);
  end if;
end;
$$;

revoke execute on function public.estimations_purge() from public, anon, authenticated;
