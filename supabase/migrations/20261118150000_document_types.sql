-- L3-04 (SPEC-V2 15, DECISIONS.md 2026-11-18): the types of documents the
-- mandatory lists of the sale file name and the enum did not have. In a
-- migration of their own: a new value of an enum is used only once committed.
alter type public.document_type add value if not exists 'assainissement';
alter type public.document_type add value if not exists 'carnet_entretien';
alter type public.document_type add value if not exists 'fiche_synthetique';
alter type public.document_type add value if not exists 'pre_etat_date';
alter type public.document_type add value if not exists 'certificat_urbanisme';
