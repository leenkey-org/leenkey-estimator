-- L1-09, after review: an acceptance given on /conditions always has the
-- 'update' context (only the signup trigger records 'signup', DECISIONS
-- 2026-10-16), the same version is never recorded twice, and a version dated
-- after tomorrow (Paris) is refused, so that a direct call cannot accept a
-- text in advance. The signup trigger ignores such a version too.
-- Replaces the functions of 20261016110000 in place (grants kept).

create function public.legal_version_valid(p_version text) returns boolean
language plpgsql stable set search_path = '' as $$
begin
  if p_version is null or p_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return false;
  end if;
  return p_version::date <= (now() at time zone 'Europe/Paris')::date + 1;
exception when invalid_datetime_format or datetime_field_overflow then
  -- « 2026-02-31 »
  return false;
end;
$$;

revoke execute on function public.legal_version_valid(text) from public, anon, authenticated;

create or replace function public.legal_record_signup(p_profile_id uuid, p_legal jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  doc text;
begin
  if jsonb_typeof(p_legal) is distinct from 'object' then
    return;
  end if;
  foreach doc in array array['cgu', 'privacy'] loop
    if public.legal_version_valid(p_legal->>doc) then
      insert into public.legal_acceptances (profile_id, document, version, context)
      values (p_profile_id, doc, p_legal->>doc, 'signup');
    end if;
  end loop;
end;
$$;

create or replace function public.legal_accept(p_versions jsonb) returns void
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
    if not public.legal_version_valid(ver) then
      raise exception 'invalid version' using errcode = '22023';
    end if;
    if not exists (select 1 from public.legal_acceptances
                   where profile_id = uid and document = doc and version = ver) then
      insert into public.legal_acceptances (profile_id, document, version, context)
      values (uid, doc, ver, 'update');
    end if;
  end loop;
end;
$$;
