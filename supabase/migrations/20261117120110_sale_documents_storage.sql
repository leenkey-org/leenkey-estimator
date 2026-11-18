-- L3-01: who reads and sends the files of the sale file in the bucket
-- 'documents' (20261117120100_sale_documents.sql): the owner of the property
-- sends (its property editable, 200 files at most) and reads; the team reads;
-- a buyer reads the file of a document shared with them and not removed.
-- No update policy: a file once sent is never written again.
create policy documents_sale_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.sale_file_property(name) is not null
         and (public.owns_property(public.sale_file_property(name)) or public.is_admin()
              or public.sale_file_shared(name)));
create policy documents_sale_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.sale_file_property(name) is not null
              and public.is_active_user()
              and public.property_is_editable(public.sale_file_property(name))
              and public.sale_files_room(public.sale_file_property(name)));
