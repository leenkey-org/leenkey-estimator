-- P-01 (docs/SECURITE.md, « Fichier d'une photo remplacé après l'envoi »):
-- the public reads only a photo file never written again after its upload.
-- A signed upload URL of Supabase Storage is checked against the policies
-- when it is made, not when it is used, and an upload with « upsert »
-- overwrites the file in place: its created_at stays, its updated_at moves
-- (measured on the local stack, 2026-11-17). The files of a photo are
-- uploaded once by the server, converted (leenkey/properties/photo-actions.ts),
-- before its row; a file written again could be anything the seller sent
-- after the review of the listing. The owner and the team still read it.

create or replace function public.photo_file_readable(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  p uuid := public.photo_file_property(p_name);
begin
  if p is null then
    return false;
  end if;
  if public.owns_property(p) or public.is_admin() then
    return true;
  end if;
  return exists (
    select 1
      from public.photos ph
      join public.properties pr on pr.id = ph.property_id
      join public.listings l on l.property_id = pr.id
     where ph.property_id = p
       and ph.storage_path = regexp_replace(p_name, '-(400|800|1600)\.webp$', '')
       and l.status = 'published' and l.deleted_at is null and pr.deleted_at is null)
    and exists (
      select 1 from storage.objects o
       where o.bucket_id = 'photos' and o.name = p_name
         and o.updated_at <= o.created_at + interval '1 second');
end;
$$;
