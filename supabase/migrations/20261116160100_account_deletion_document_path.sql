-- L2-10: a financing document an offer refers to keeps its row once its
-- file is erased by account_anonymize (20261116160000_account_deletion.sql):
-- its path is then empty. The check of the path accepts it; any other path
-- keeps the shape of before.

alter table public.financing_documents
  drop constraint financing_documents_path,
  add constraint financing_documents_path check (
    storage_path = ''
    or storage_path ~ ('^' || buyer_id::text
                       || '/financing/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg)$'));
