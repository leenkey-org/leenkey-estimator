import "server-only";
import type { TextCall } from "@/core/ai/generate";
import { mockAnswer } from "@/leenkey/ai/mock";
import type { DocumentType } from "@/lib/config/documents";
import {
  readPublicFacts,
  type DocumentAnalysis,
  type DocumentQuality,
} from "@/lib/validations/document-analysis";

// The analysis of the end-to-end tests (AI_MOCK=1, L3-05): the same analysis
// for the same type and title, no call to the API, the file not read. The
// title of the document plays the scenarios: « illisible », « incomplet »,
// « mauvais type » give a document to check; « ancien » a document dated
// 2012 (« À actualiser » for a type that ages).

const plain = (value: string) =>
  value.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[̀-ͯ]/g, "");

function mockQuality(title: string): DocumentQuality {
  const words = plain(title);
  if (words.includes("illisible")) return "illegible";
  if (words.includes("incomplet")) return "incomplete";
  if (words.includes("mauvais type")) return "wrong_type";
  return "ok";
}

const NOTES: Record<Exclude<DocumentQuality, "ok">, string> = {
  illegible: "Le fichier de test est illisible.",
  incomplete: "Le fichier de test semble incomplet.",
  wrong_type: "Le fichier de test ne correspond pas au type annoncé.",
};

/** A value for every public fact: the model of the tests keeps those of the type. */
const MOCK_PUBLIC_FACTS = {
  amiante: "absence",
  plomb: "absence",
  termites: "absence",
  electricite: "anomalies",
  gaz: "sans_anomalie",
  assainissement: "sans_anomalie",
  surface_carrez: 66.5,
  travaux_votes: "oui",
  destination: "habitation",
  charges: { montant: 450, periode: "trimestre" },
  fonds_travaux: { montant: 60, periode: "trimestre" },
  taxe_fonciere: { montant: 1150, annee: 2025 },
} as const;

/** The analysis the model of the tests writes for a document. */
export function mockAnalysis(type: DocumentType, title: string): DocumentAnalysis {
  const quality = mockQuality(title);
  return {
    type_detected: quality === "wrong_type" ? "autre" : type,
    date: plain(title).includes("ancien") ? "2012-01-10" : "2025-03-14",
    key_facts: [
      { label: "Document", value: `Document de test de type ${type}` },
      { label: "Conclusion", value: "Relevée par l'assistant de test" },
    ],
    points_of_attention:
      quality === "ok" ? [{ level: "info", text: "Point relevé par l'assistant de test." }] : [],
    summary_seller: `Résumé de l'assistant de test pour le vendeur (${type}).`,
    summary_buyer: `Résumé de l'assistant de test pour l'acquéreur (${type}).`,
    public_facts: quality === "ok" ? readPublicFacts(type, MOCK_PUBLIC_FACTS) : {},
    quality,
    quality_note: quality === "ok" ? null : NOTES[quality],
  };
}

/** The model of the tests for one document: its analysis, as the JSON the real one writes. */
export function mockDocumentAnalysis(document: { type: DocumentType; title: string }): TextCall {
  return async () => mockAnswer(JSON.stringify(mockAnalysis(document.type, document.title)));
}
