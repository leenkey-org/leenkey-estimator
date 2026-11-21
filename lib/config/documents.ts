import type { Database } from "@/types/database";

// The sale file (SPEC-V2 15, decision of 2026-10-08; DECISIONS.md
// 2026-11-18): the documents asked for by type of property, their category,
// and those a seller may mark « Non concerné » (with a reason). Leenkey never
// says a diagnostic is or is not due: the list is a help, to be confirmed by
// the diagnostician and the notary.

export type DocumentType = Database["public"]["Enums"]["document_type"];
export type PropertyType = Database["public"]["Enums"]["property_type"];
export type DocumentCategory = "diagnostics" | "ownership" | "coownership" | "works" | "other";

export const DOCUMENT_CATEGORIES: readonly DocumentCategory[] = [
  "diagnostics",
  "ownership",
  "coownership",
  "works",
  "other",
];

export const DOCUMENT_CATEGORY: Record<DocumentType, DocumentCategory> = {
  dpe: "diagnostics",
  amiante: "diagnostics",
  plomb: "diagnostics",
  electricite: "diagnostics",
  gaz: "diagnostics",
  termites: "diagnostics",
  erp: "diagnostics",
  carrez: "diagnostics",
  assainissement: "diagnostics",
  titre_propriete: "ownership",
  taxe_fonciere: "ownership",
  certificat_urbanisme: "ownership",
  pv_ag: "coownership",
  reglement_copro: "coownership",
  appel_charges: "coownership",
  carnet_entretien: "coownership",
  fiche_synthetique: "coownership",
  pre_etat_date: "coownership",
  facture_travaux: "works",
  autre: "other",
};

/** The documents of the notary file, in the order of the checklist. */
export const REQUIRED_DOCUMENTS: Record<PropertyType, readonly DocumentType[]> = {
  appartement: [
    "dpe",
    "amiante",
    "plomb",
    "electricite",
    "gaz",
    "erp",
    "termites",
    "carrez",
    "titre_propriete",
    "taxe_fonciere",
    "pv_ag",
    "reglement_copro",
    "appel_charges",
    "carnet_entretien",
    "fiche_synthetique",
    "pre_etat_date",
  ],
  maison: [
    "dpe",
    "amiante",
    "plomb",
    "electricite",
    "gaz",
    "erp",
    "termites",
    "assainissement",
    "titre_propriete",
    "taxe_fonciere",
    "facture_travaux",
  ],
  terrain: ["erp", "titre_propriete", "taxe_fonciere", "certificat_urbanisme"],
  // No list of its own: the one of a house.
  autre: [
    "dpe",
    "amiante",
    "plomb",
    "electricite",
    "gaz",
    "erp",
    "termites",
    "assainissement",
    "titre_propriete",
    "taxe_fonciere",
    "facture_travaux",
  ],
};

/**
 * May be « Non concerné »: depends on the building, its installations, its
 * place or its works; the documents of a co-ownership and the Carrez
 * measurement, for a flat that is not in one.
 */
export const EXEMPTIBLE_DOCUMENTS: readonly DocumentType[] = [
  "amiante",
  "plomb",
  "electricite",
  "gaz",
  "termites",
  "assainissement",
  "carrez",
  "pv_ag",
  "reglement_copro",
  "appel_charges",
  "carnet_entretien",
  "fiche_synthetique",
  "pre_etat_date",
  "facture_travaux",
  "certificat_urbanisme",
];

/** The diagnostics, shared together by « Partager les diagnostics ». */
export const DIAGNOSTIC_TYPES = (Object.keys(DOCUMENT_CATEGORY) as DocumentType[]).filter(
  (type) => DOCUMENT_CATEGORY[type] === "diagnostics",
);

/**
 * After how many months a document is shown « À actualiser » (L3-05, asked by
 * Cédric on 2026-11-20), counted from the date the analysis read in it.
 * Provisional values, to be confirmed by Cédric (DECISIONS.md, Q93); no
 * entry: the document does not age. A help only: Leenkey never says a
 * diagnostic is valid or not, the seller checks with a professional.
 */
export const DOCUMENT_VALIDITY_MONTHS: Partial<Record<DocumentType, number>> = {
  dpe: 120,
  electricite: 36,
  gaz: 36,
  assainissement: 36,
  plomb: 12,
  termites: 6,
  erp: 6,
  pre_etat_date: 1,
};

/**
 * Whether a document dated `date` (YYYY-MM-DD) is older than the validity of
 * its type on `now`; false for a type that does not age or a date that is none.
 */
export function documentToRefresh(type: DocumentType, date: string | null, now: Date): boolean {
  const months = DOCUMENT_VALIDITY_MONTHS[type];
  if (months === undefined || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const end = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return false;
  end.setUTCMonth(end.getUTCMonth() + months);
  return end.getTime() < now.getTime();
}

/** Analysed documents per property at most (cost; also in document_analysis_claim). */
export const ANALYSED_DOCUMENTS_MAX = 25;

export const SALE_FILE_MAX_BYTES = 20 * 1024 * 1024;
export const SALE_FILE_EXTENSIONS = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;
export type SaleFileMime = keyof typeof SALE_FILE_EXTENSIONS;

/** The type a file name suggests (« DPE_2025.pdf »), to preselect it; null when none. */
export function guessDocumentType(fileName: string): DocumentType | null {
  const name = fileName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const rules: [RegExp, DocumentType][] = [
    [/\bdpe\b|performance.energ/, "dpe"],
    [/amiante/, "amiante"],
    [/plomb|crep/, "plomb"],
    [/electri/, "electricite"],
    [/\bgaz\b/, "gaz"],
    [/termite/, "termites"],
    [/\berp\b|risques/, "erp"],
    [/carrez|mesurage/, "carrez"],
    [/assainissement|spanc/, "assainissement"],
    [/titre|acte.de.vente|\bpropriete/, "titre_propriete"],
    [/taxe.fonciere|fonciere/, "taxe_fonciere"],
    [/urbanisme|bornage/, "certificat_urbanisme"],
    [/pre.?etat/, "pre_etat_date"],
    [/pv|proces.verbal|\bag\b|assemblee/, "pv_ag"],
    [/reglement/, "reglement_copro"],
    [/appel|charges/, "appel_charges"],
    [/carnet/, "carnet_entretien"],
    [/fiche.synthetique|synthetique/, "fiche_synthetique"],
    [/facture|travaux|devis/, "facture_travaux"],
  ];
  // Separators count as word limits.
  const spaced = name.replace(/[_\-.]+/g, " ");
  return rules.find(([pattern]) => pattern.test(spaced))?.[1] ?? null;
}
