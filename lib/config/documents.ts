import type { Database } from "@/types/database";

// The sale file (SPEC-V2 15, decision of 2026-10-08; DECISIONS.md
// 2026-11-18 and 2026-11-23): the documents asked for according to the
// property, in three categories (« Documents du bien », « Documents de
// copropriété », « Documents pour le notaire », asked by Cédric on
// 2026-11-22), each with the stage of the sale it is needed for, and those a
// seller may mark « Non concerné » (with a reason). Leenkey never says a
// diagnostic is or is not due: the list is a help, to be confirmed by the
// diagnostician and the notary.

export type DocumentType = Database["public"]["Enums"]["document_type"];
export type PropertyType = Database["public"]["Enums"]["property_type"];
export type DocumentCategory = "property" | "coownership" | "notary";

export const DOCUMENT_CATEGORIES: readonly DocumentCategory[] = [
  "property",
  "coownership",
  "notary",
];

/**
 * The category of each type, in the order of the lines of the checklist (the
 * order of the client: the title deed, the diagnostics, the Carrez
 * measurement, the tax, the works; then the co-ownership; then the notary).
 */
export const DOCUMENT_CATEGORY: Record<DocumentType, DocumentCategory> = {
  titre_propriete: "property",
  dpe: "property",
  amiante: "property",
  plomb: "property",
  electricite: "property",
  gaz: "property",
  termites: "property",
  erp: "property",
  assainissement: "property",
  carrez: "property",
  certificat_urbanisme: "property",
  taxe_fonciere: "property",
  facture_travaux: "property",
  reglement_copro: "coownership",
  pv_ag: "coownership",
  fiche_synthetique: "coownership",
  carnet_entretien: "coownership",
  plan_pluriannuel_travaux: "coownership",
  appel_charges: "coownership",
  pre_etat_date: "coownership",
  etat_date: "notary",
  autre: "notary",
};

/** Every type, in the order of the lines of the checklist. */
export const DOCUMENT_ORDER = Object.keys(DOCUMENT_CATEGORY) as DocumentType[];

/**
 * When a document is needed, so that a seller is not asked for everything at
 * once: from the listing (« Dès la mise en vente »), before the preliminary
 * sale agreement (« Avant le compromis »), before the deed (« Avant la
 * signature »).
 */
export type DocumentStage = "listing" | "agreement" | "deed";

export const DOCUMENT_STAGES: readonly DocumentStage[] = ["listing", "agreement", "deed"];

/**
 * The stage of each type (DECISIONS.md 2026-11-23, to be confirmed by Cédric,
 * Q99): the title deed, the diagnostics and the Carrez measurement from the
 * listing; the tax, the works and the documents of the co-ownership before
 * the agreement; the statement of the managing agent (« état daté ») and
 * what the notary asks besides before the deed.
 */
export const DOCUMENT_STAGE: Record<DocumentType, DocumentStage> = {
  titre_propriete: "listing",
  dpe: "listing",
  amiante: "listing",
  plomb: "listing",
  electricite: "listing",
  gaz: "listing",
  termites: "listing",
  erp: "listing",
  assainissement: "listing",
  carrez: "listing",
  certificat_urbanisme: "listing",
  taxe_fonciere: "agreement",
  facture_travaux: "agreement",
  reglement_copro: "agreement",
  pv_ag: "agreement",
  fiche_synthetique: "agreement",
  carnet_entretien: "agreement",
  plan_pluriannuel_travaux: "agreement",
  appel_charges: "agreement",
  pre_etat_date: "agreement",
  etat_date: "deed",
  autre: "deed",
};

/**
 * The stages whose documents make the notary file (« Dossier notaire : 12 /
 * 18 pièces », the task « Dossier notaire complet », documents.notary_ready):
 * what the notary needs to write the agreement. The « état daté » comes
 * after it, from the managing agent: it never holds the task back.
 */
export const NOTARY_FILE_STAGES: readonly DocumentStage[] = ["listing", "agreement"];

/** A building: its title deed and its diagnostics. */
const BUILDING: readonly DocumentType[] = [
  "titre_propriete",
  "dpe",
  "amiante",
  "plomb",
  "electricite",
  "gaz",
  "termites",
  "erp",
];
const HOUSE: readonly DocumentType[] = [
  ...BUILDING,
  "assainissement",
  "taxe_fonciere",
  "facture_travaux",
];

/** The documents asked for by type of property, whatever its co-ownership. */
export const PROPERTY_DOCUMENTS: Record<PropertyType, readonly DocumentType[]> = {
  appartement: [...BUILDING, "taxe_fonciere", "facture_travaux"],
  maison: HOUSE,
  terrain: ["titre_propriete", "erp", "certificat_urbanisme", "taxe_fonciere"],
  // No list of its own: the one of a house.
  autre: HOUSE,
};

/** Besides, for a property in a co-ownership: the Carrez measurement and the documents of the building. */
export const CO_OWNERSHIP_DOCUMENTS: readonly DocumentType[] = [
  "carrez",
  "reglement_copro",
  "pv_ag",
  "fiche_synthetique",
  "carnet_entretien",
  "plan_pluriannuel_travaux",
  "appel_charges",
  "pre_etat_date",
  "etat_date",
];

/**
 * Always offered, never counted: what the notary asks besides (« éventuels
 * documents complémentaires »).
 */
export const OPTIONAL_DOCUMENTS: readonly DocumentType[] = ["autre"];

/**
 * Whether the documents of a co-ownership are asked for: always for a flat
 * (one that is not in a co-ownership marks them « Non concerné »), for a
 * house or another property when its sheet gives a number of lots, never
 * for land. Its charges say nothing: the field is « Charges », and a house
 * outside a co-ownership may have some.
 */
export function inCoOwnership(type: PropertyType | null, coproLots: number | null): boolean {
  if (type === "appartement") return true;
  if (type === "terrain") return false;
  return (coproLots ?? 0) > 0;
}

/** The documents asked for a property, in the order of the checklist. */
export function requiredDocuments(
  type: PropertyType | null,
  coOwnership: boolean = type === "appartement",
): DocumentType[] {
  const asked = PROPERTY_DOCUMENTS[type ?? "autre"];
  const all = coOwnership && type !== "terrain" ? [...asked, ...CO_OWNERSHIP_DOCUMENTS] : asked;
  return DOCUMENT_ORDER.filter((document) => all.includes(document));
}

/**
 * May be « Non concerné »: depends on the building, its installations, its
 * place or its works; the documents of a co-ownership and the Carrez
 * measurement, for a flat that is not in one, or a plan of works the
 * co-ownership does not have.
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
  "plan_pluriannuel_travaux",
  "pre_etat_date",
  "etat_date",
  "facture_travaux",
  "certificat_urbanisme",
];

/** The diagnostics, shared together by « Partager les diagnostics ». */
export const DIAGNOSTIC_TYPES: readonly DocumentType[] = [
  "dpe",
  "amiante",
  "plomb",
  "electricite",
  "gaz",
  "termites",
  "erp",
  "assainissement",
  "carrez",
];

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
    [/etat.date/, "etat_date"],
    [/pluriannuel|\bppt\b|\bpppt\b/, "plan_pluriannuel_travaux"],
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
