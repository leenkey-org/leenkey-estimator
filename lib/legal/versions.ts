// Published version (date) of each legal text accepted at signup (L1-09).
// A change of a text is a new date here: every user accepts it again
// through /conditions (legal_acceptances, context 'update').
export const LEGAL_VERSIONS = {
  // 2.0: the texts written for the launch (DECISIONS.md 2026-11-09).
  cgu: "2026-11-09",
  privacy: "2026-11-09",
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

/**
 * Pages reached without accepting new versions of the CGU and privacy
 * policy first: a right of the consumer never waits behind them (the
 * withdrawal of a plan, « Renoncer au contrat », L1-40). An order made there
 * records the CGU and the CGV it accepts itself (L1-26).
 */
export const TERMS_EXEMPT_PATHS: readonly string[] = ["/vendeur/formule"];

/** Whether a path (« /vendeur/formule?bien=… ») skips the terms gate. */
export function termsExempt(path: string): boolean {
  const pathname = path.split(/[?#]/)[0] ?? path;
  return TERMS_EXEMPT_PATHS.includes(pathname);
}
