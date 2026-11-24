-- DDT filed at once, level A (DECISIONS.md 2026-11-23, asked by Cédric the
-- same day): a seller receives their diagnostics as one PDF, the « dossier de
-- diagnostics techniques (DDT) ». One type more, for that one file. In a
-- migration of its own: a new value of an enum is used only once committed
-- (its column and its rules: 20261123150100_ddt_coverage.sql).
alter type public.document_type add value if not exists 'ddt';
