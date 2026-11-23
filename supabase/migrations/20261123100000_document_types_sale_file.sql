-- Sale file by categories and stages (DECISIONS.md 2026-11-23, asked by
-- Cédric on 2026-11-22): the two documents of his list the enum did not
-- have, the multi-year plan of works of a co-ownership (« plan pluriannuel
-- de travaux ») and the statement the managing agent gives the notary before
-- the deed (« état daté », not the « pré-état daté » of the agreement).
-- Nothing else: the categories and the stages are configuration
-- (lib/config/documents.ts).
alter type public.document_type add value if not exists 'plan_pluriannuel_travaux';
alter type public.document_type add value if not exists 'etat_date';
