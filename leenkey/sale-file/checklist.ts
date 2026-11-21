import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY,
  DOCUMENT_VALIDITY_MONTHS,
  documentToRefresh,
  EXEMPTIBLE_DOCUMENTS,
  REQUIRED_DOCUMENTS,
  type DocumentCategory,
  type DocumentType,
  type PropertyType,
} from "@/lib/config/documents";

// The checklist of the sale file (L3-04, SPEC-V2 15), pure and unit-tested:
// from the type of the property, its documents and its « Non concerné », the
// lines by category, the count « Dossier notaire : 12 / 15 pièces » and
// whether the notary file is complete. A document « Non concerné » counts as
// present. A line whose most recent dated document is older than the
// validity of its type reads « À actualiser » (L3-05): it still counts as
// present, and nothing is said of its legal validity.

export type FiledDocument = {
  id: string;
  type: DocumentType;
  title: string;
  createdAt: string;
  /** The date the analysis read in the document (YYYY-MM-DD), when it read one. */
  documentDate?: string | null;
};
export type Exemption = { type: DocumentType; reason: string };

export type ChecklistLine = {
  type: DocumentType;
  /** Part of the notary file of this type of property. */
  required: boolean;
  exemptible: boolean;
  state: "filed" | "exempt" | "missing";
  documents: FiledDocument[];
  reason: string | null;
  /**
   * « À actualiser »: the most recent date read in the documents of the line
   * and the validity of its type in months, when that date is older; null
   * otherwise (no date read, a type that does not age, a recent document).
   */
  toRefresh: { date: string; months: number } | null;
};

export type ChecklistGroup = { category: DocumentCategory; lines: ChecklistLine[] };

export type Checklist = {
  groups: ChecklistGroup[];
  /** Mandatory documents filed or « Non concerné ». */
  done: number;
  total: number;
  complete: boolean;
};

export function buildChecklist(
  propertyType: PropertyType | null,
  documents: readonly FiledDocument[],
  exemptions: readonly Exemption[],
  /** The property is not subject to the DPE (L1-65): its reason; the DPE counts as « Non concerné ». */
  dpeExemption: string | null = null,
  now: Date = new Date(),
): Checklist {
  const required = REQUIRED_DOCUMENTS[propertyType ?? "autre"];
  const reasonOf = new Map(exemptions.map((exemption) => [exemption.type, exemption.reason]));
  // The mandatory ones in their order, then what the seller filed besides.
  const extra = [...new Set(documents.map((document) => document.type))].filter(
    (type) => !required.includes(type),
  );
  const lines: ChecklistLine[] = [...required, ...extra].map((type) => {
    const filed = documents.filter((document) => document.type === type);
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
      // A file wins over « Non concerné ».
      state: filed.length > 0 ? "filed" : reason !== null ? "exempt" : "missing",
      documents: filed,
      reason,
      toRefresh:
        latest !== undefined && months !== undefined && documentToRefresh(type, latest, now)
          ? { date: latest, months }
          : null,
    };
  });
  const mandatory = lines.filter((line) => line.required);
  const done = mandatory.filter((line) => line.state !== "missing").length;
  return {
    groups: DOCUMENT_CATEGORIES.map((category) => ({
      category,
      lines: lines.filter((line) => DOCUMENT_CATEGORY[line.type] === category),
    })).filter((group) => group.lines.length > 0),
    done,
    total: mandatory.length,
    complete: mandatory.length > 0 && done === mandatory.length,
  };
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
