// Texts of the interface, part « financingStatus » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// Labels of SPEC-V2 section 7 (StatusBadge mapping), colours in DESIGN.md 10.2.
// Exact labels of FinancingBadge (DESIGN.md 10.2, SPEC-V2 13): never « validé ».

export const frFinancingStatus = {
  not_provided: "Financement non renseigné",
  declared: "Informations déclarées",
  document_provided: "Justificatif fourni",
  document_checked: "Justificatif vérifié",
} as const;
