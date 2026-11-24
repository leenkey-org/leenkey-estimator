import {
  DDT_TYPE,
  DIAGNOSTIC_TYPES,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY,
  DOCUMENT_ORDER,
  DOCUMENT_STAGE,
  DOCUMENT_STAGES,
  DOCUMENT_VALIDITY_MONTHS,
  documentToRefresh,
  EXEMPTIBLE_DOCUMENTS,
  inCoOwnership,
  NOTARY_FILE_STAGES,
  OPTIONAL_DOCUMENTS,
  requiredDocuments,
  type DocumentCategory,
  type DocumentStage,
  type DocumentType,
  type PropertyType,
} from "@/lib/config/documents";

// The checklist of the sale file (L3-04, SPEC-V2 15), pure and unit-tested:
// from the property (its type, whether it is in a co-ownership), its
// documents and its « Non concerné », the lines by category (« Documents du
// bien », « Documents de copropriété », « Documents pour le notaire »), each
// with the stage it is needed for, the progress of each category and of each
// stage (« 3 sur 5 »), the stage to work on now, the count « Dossier
// notaire : 12 / 18 pièces » and whether the notary file is complete
// (DECISIONS.md 2026-11-23). A document « Non concerné » counts as present.
// A line whose most recent dated document is older than the validity of its
// type reads « À actualiser » (L3-05): it still counts as present, and
// nothing is said of its legal validity.
//
// The DDT (DECISIONS.md 2026-11-23, level A): the one file of the
// diagnostician is never a line. Each diagnostic line it covers
// (`covers`, said by its seller) counts as filed, in every count; removed,
// its lines go back to what they were. « À actualiser » is read from the
// documents of the line itself, never from a DDT: its date is the one of a
// whole file, not of each diagnostic.

export type FiledDocument = {
  id: string;
  type: DocumentType;
  title: string;
  createdAt: string;
  /** The date the analysis read in the document (YYYY-MM-DD), when it read one. */
  documentDate?: string | null;
  /** A DDT: the diagnostics its seller says it holds. */
  covers?: readonly DocumentType[];
};
export type Exemption = { type: DocumentType; reason: string };

/** The property of a checklist: a bare type reads « in a co-ownership when a flat ». */
export type ChecklistProperty = { type: PropertyType | null; coOwnership: boolean };

/** The property of a checklist, from its type and the lots of its sheet (inCoOwnership). */
export function checklistProperty(property: {
  type: PropertyType | null;
  coproLots: number | null;
}): ChecklistProperty {
  return { type: property.type, coOwnership: inCoOwnership(property.type, property.coproLots) };
}

export type ChecklistLine = {
  type: DocumentType;
  /** Asked for this property: counted in its category and its stage. */
  required: boolean;
  exemptible: boolean;
  /** When it is needed. */
  stage: DocumentStage;
  /** `missing` on a line that is not required: offered, not asked for. */
  state: "filed" | "exempt" | "missing";
  documents: FiledDocument[];
  /** The DDT of the property that cover this line (« Fourni dans votre DDT »). */
  coveredBy: FiledDocument[];
  reason: string | null;
  /**
   * « À actualiser »: the most recent date read in the documents of the line
   * and the validity of its type in months, when that date is older; null
   * otherwise (no date read, a type that does not age, a recent document).
   */
  toRefresh: { date: string; months: number } | null;
};

/** Of the documents asked for: how many are filed or « Non concerné ». */
export type Progress = { done: number; total: number };

export type ChecklistGroup = Progress & { category: DocumentCategory; lines: ChecklistLine[] };

export type ChecklistStage = Progress & {
  stage: DocumentStage;
  /** The documents asked for at this stage, neither filed nor « Non concerné ». */
  missing: DocumentType[];
};

export type Checklist = {
  groups: ChecklistGroup[];
  /** The DDT of the property, the oldest first: one file for several diagnostic lines. */
  ddt: FiledDocument[];
  /** The three stages, in their order; `total` is 0 when nothing is asked for at one. */
  stages: ChecklistStage[];
  /** The first stage with a document to file; null once nothing is missing. */
  currentStage: DocumentStage | null;
  /** The notary file: the documents of its stages (NOTARY_FILE_STAGES) filed or « Non concerné ». */
  done: number;
  total: number;
  complete: boolean;
};

/** The progress of some lines: of those asked for, how many are filed or « Non concerné ». */
export function checklistProgress(lines: readonly ChecklistLine[]): Progress {
  const asked = lines.filter((line) => line.required);
  return { done: asked.filter((line) => line.state !== "missing").length, total: asked.length };
}

export function buildChecklist(
  property: PropertyType | null | ChecklistProperty,
  documents: readonly FiledDocument[],
  exemptions: readonly Exemption[],
  /** The property is not subject to the DPE (L1-65): its reason; the DPE counts as « Non concerné ». */
  dpeExemption: string | null = null,
  now: Date = new Date(),
): Checklist {
  const required =
    property !== null && typeof property === "object"
      ? requiredDocuments(property.type, property.coOwnership)
      : requiredDocuments(property);
  const reasonOf = new Map(exemptions.map((exemption) => [exemption.type, exemption.reason]));
  // What is asked for, then what is always offered, then what the seller
  // filed besides, each in the order of the checklist.
  const offered = OPTIONAL_DOCUMENTS.filter((type) => !required.includes(type));
  const ddt = documents.filter((document) => document.type === DDT_TYPE);
  const filedTypes = new Set(documents.map((document) => document.type));
  const extra = DOCUMENT_ORDER.filter(
    (type) => filedTypes.has(type) && !required.includes(type) && !offered.includes(type),
  );
  const lines: ChecklistLine[] = [...required, ...offered, ...extra].map((type) => {
    const filed = documents.filter((document) => document.type === type);
    // Only a diagnostic is covered, whatever a row says.
    const coveredBy = DIAGNOSTIC_TYPES.includes(type)
      ? ddt.filter((document) => document.covers?.includes(type))
      : [];
    const exemptible = EXEMPTIBLE_DOCUMENTS.includes(type) && required.includes(type);
    const reason =
      type === "dpe" && required.includes(type)
        ? dpeExemption
        : exemptible
          ? (reasonOf.get(type) ?? null)
          : null;
    // The most recent date read: one recent document is enough for the line.
    const latest = filed
      .map((document) => document.documentDate ?? null)
      .filter((date): date is string => date !== null)
      .sort()
      .at(-1);
    const months = DOCUMENT_VALIDITY_MONTHS[type];
    return {
      type,
      required: required.includes(type),
      exemptible,
      stage: DOCUMENT_STAGE[type],
      // A file, its own or the DDT, wins over « Non concerné ».
      state:
        filed.length > 0 || coveredBy.length > 0 ? "filed" : reason !== null ? "exempt" : "missing",
      documents: filed,
      coveredBy,
      reason,
      toRefresh:
        latest !== undefined && months !== undefined && documentToRefresh(type, latest, now)
          ? { date: latest, months }
          : null,
    };
  });
  const stages: ChecklistStage[] = DOCUMENT_STAGES.map((stage) => {
    const ofStage = lines.filter((line) => line.stage === stage);
    return {
      stage,
      ...checklistProgress(ofStage),
      missing: ofStage
        .filter((line) => line.required && line.state === "missing")
        .map((line) => line.type),
    };
  });
  const notary = checklistProgress(lines.filter((line) => NOTARY_FILE_STAGES.includes(line.stage)));
  return {
    groups: DOCUMENT_CATEGORIES.map((category) => {
      const ofCategory = lines.filter((line) => DOCUMENT_CATEGORY[line.type] === category);
      return { category, lines: ofCategory, ...checklistProgress(ofCategory) };
    }).filter((group) => group.lines.length > 0),
    ddt,
    stages,
    currentStage: stages.find((stage) => stage.missing.length > 0)?.stage ?? null,
    ...notary,
    complete: notary.total > 0 && notary.done === notary.total,
  };
}

/**
 * The diagnostics ticked at first in « Déposer mon DDT »: the diagnostic
 * lines of the property, without those « Non concerné » (the reason of the
 * seller, or a property not subject to the DPE): a DDT does not hold what
 * does not apply. The seller can still tick them.
 */
export function ddtInitialCoverage(
  checklist: Checklist,
  diagnostics: readonly DocumentType[],
): DocumentType[] {
  const exempt = new Set(
    checklist.groups
      .flatMap((group) => group.lines)
      .filter((line) => line.state === "exempt")
      .map((line) => line.type),
  );
  return diagnostics.filter((type) => !exempt.has(type));
}

/** The first bytes of a file say what it is, whatever its name: null when it is none of the three. */
export function sniffSaleFile(
  head: Uint8Array,
): "application/pdf" | "image/jpeg" | "image/png" | null {
  // The images first, by their signature: a picture may hold « %PDF- » in its first bytes.
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return "image/png";
  }
  const text = new TextDecoder("latin1").decode(head.subarray(0, 1024));
  return text.includes("%PDF-") ? "application/pdf" : null;
}
