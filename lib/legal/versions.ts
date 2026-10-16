// Published version (date) of each legal text accepted at signup (L1-09).
// The texts are still provisional (DECISIONS Q34): when the final ones are
// published, set their date here and every user accepts them again through
// /conditions (legal_acceptances, context 'update').
export const LEGAL_VERSIONS = {
  cgu: "2026-06-28",
  privacy: "2026-10-16",
} as const;

export type LegalDocument = keyof typeof LEGAL_VERSIONS;

export const LEGAL_PATHS: Record<LegalDocument, string> = {
  cgu: "/cgu",
  privacy: "/confidentialite",
};

/** Documents whose current version is not among the versions accepted so far. */
export function missingLegalDocuments(
  accepted: ReadonlyArray<{ document: string; version: string }>,
): LegalDocument[] {
  return (Object.keys(LEGAL_VERSIONS) as LegalDocument[]).filter(
    (document) =>
      !accepted.some(
        (row) => row.document === document && row.version === LEGAL_VERSIONS[document],
      ),
  );
}
