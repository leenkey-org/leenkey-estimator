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

/** May be « Non concerné »: depends on the building, its installations, its place or its works. */
export const EXEMPTIBLE_DOCUMENTS: readonly DocumentType[] = [
  "amiante",
  "plomb",
  "electricite",
  "gaz",
  "termites",
  "assainissement",
  "facture_travaux",
  "certificat_urbanisme",
];

/** The diagnostics, shared together by « Partager les diagnostics ». */
export const DIAGNOSTIC_TYPES = (Object.keys(DOCUMENT_CATEGORY) as DocumentType[]).filter(
  (type) => DOCUMENT_CATEGORY[type] === "diagnostics",
);

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
    [/titre|acte.de.vente|propriete/, "titre_propriete"],
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
