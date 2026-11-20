import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY,
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
// present.

export type FiledDocument = { id: string; type: DocumentType; title: string; createdAt: string };
export type Exemption = { type: DocumentType; reason: string };

export type ChecklistLine = {
  type: DocumentType;
  /** Part of the notary file of this type of property. */
  required: boolean;
  exemptible: boolean;
  state: "filed" | "exempt" | "missing";
  documents: FiledDocument[];
  reason: string | null;
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
    return {
      type,
      required: required.includes(type),
      exemptible,
      // A file wins over « Non concerné ».
      state: filed.length > 0 ? "filed" : reason !== null ? "exempt" : "missing",
      documents: filed,
      reason,
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
