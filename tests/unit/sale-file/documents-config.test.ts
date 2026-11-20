import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_TYPES,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY,
  EXEMPTIBLE_DOCUMENTS,
  guessDocumentType,
  REQUIRED_DOCUMENTS,
  SALE_FILE_EXTENSIONS,
  SALE_FILE_MAX_BYTES,
  type DocumentType,
  type PropertyType,
} from "@/lib/config/documents";
import { Constants } from "@/types/database";

// L3-04: the lists of the sale file (SPEC-V2 15) against the types of the
// database, and the type a file name suggests.

const TYPES = Constants.public.Enums.document_type;
const PROPERTY_TYPES = Constants.public.Enums.property_type;

describe("the documents of the sale file", () => {
  it("every type of document of the database has a category, and no other has", () => {
    expect(Object.keys(DOCUMENT_CATEGORY).sort()).toEqual([...TYPES].sort());
    for (const type of TYPES) {
      expect(DOCUMENT_CATEGORIES, type).toContain(DOCUMENT_CATEGORY[type]);
    }
    // No category without a document.
    expect([...new Set(Object.values(DOCUMENT_CATEGORY))].sort()).toEqual(
      [...DOCUMENT_CATEGORIES].sort(),
    );
  });

  it("every type of property has its list, of known types, each once", () => {
    expect(Object.keys(REQUIRED_DOCUMENTS).sort()).toEqual([...PROPERTY_TYPES].sort());
    for (const type of PROPERTY_TYPES) {
      const list = REQUIRED_DOCUMENTS[type];
      expect(new Set(list).size, type).toBe(list.length);
      for (const document of list) expect(TYPES, `${type}: ${document}`).toContain(document);
      // « Autre document » is never asked for.
      expect(list, type).not.toContain("autre");
    }
    expect(REQUIRED_DOCUMENTS.appartement).toHaveLength(16);
    expect(REQUIRED_DOCUMENTS.maison).toHaveLength(11);
    expect(REQUIRED_DOCUMENTS.terrain).toHaveLength(4);
    expect(REQUIRED_DOCUMENTS.autre).toEqual(REQUIRED_DOCUMENTS.maison);
  });

  it("every exemptible type is asked for at least one type of property", () => {
    expect(new Set(EXEMPTIBLE_DOCUMENTS).size).toBe(EXEMPTIBLE_DOCUMENTS.length);
    for (const type of EXEMPTIBLE_DOCUMENTS) {
      const askedFor = (Object.keys(REQUIRED_DOCUMENTS) as PropertyType[]).filter((property) =>
        REQUIRED_DOCUMENTS[property].includes(type),
      );
      expect(askedFor.length, type).toBeGreaterThan(0);
    }
    // Always asked for, whatever the property.
    for (const type of ["dpe", "erp", "titre_propriete", "taxe_fonciere"] as const) {
      expect(EXEMPTIBLE_DOCUMENTS, type).not.toContain(type);
    }
  });

  it("the diagnostics shared together are those of the category", () => {
    expect([...DIAGNOSTIC_TYPES].sort()).toEqual(
      [
        "amiante",
        "assainissement",
        "carrez",
        "dpe",
        "electricite",
        "erp",
        "gaz",
        "plomb",
        "termites",
      ].sort(),
    );
  });

  it("a file: 20 Mo at most (CLAUDE.md 11), PDF, JPEG or PNG", () => {
    expect(SALE_FILE_MAX_BYTES).toBe(20 * 1024 * 1024);
    expect(SALE_FILE_EXTENSIONS).toEqual({
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
    });
  });
});

describe("guessDocumentType", () => {
  const cases: [string, DocumentType | null][] = [
    // The diagnostics.
    ["DPE_2025.pdf", "dpe"],
    ["dpe.pdf", "dpe"],
    ["Diagnostic de performance énergétique.pdf", "dpe"],
    ["diag-amiante.pdf", "amiante"],
    ["Rapport Amiante avant vente.PDF", "amiante"],
    ["constat_plomb.pdf", "plomb"],
    ["CREP 2024.pdf", "plomb"],
    ["Diagnostic électricité.pdf", "electricite"],
    ["diag_electrique.pdf", "electricite"],
    ["diagnostic-gaz.pdf", "gaz"],
    ["Etat termites.pdf", "termites"],
    ["ERP_Savigny.pdf", "erp"],
    ["État des risques et pollutions.pdf", "erp"],
    ["attestation loi Carrez.pdf", "carrez"],
    ["mesurage_surface.pdf", "carrez"],
    ["Contrôle assainissement SPANC.pdf", "assainissement"],
    // The property.
    ["Titre de propriété.pdf", "titre_propriete"],
    ["acte-de-vente-2012.pdf", "titre_propriete"],
    ["taxe_fonciere_2025.pdf", "taxe_fonciere"],
    ["Avis taxe foncière 2024.pdf", "taxe_fonciere"],
    ["certificat d'urbanisme.pdf", "certificat_urbanisme"],
    // The co-ownership.
    ["PV AG 2024.pdf", "pv_ag"],
    ["pv_ag_2023.pdf", "pv_ag"],
    ["Procès-verbal assemblée générale 2022.pdf", "pv_ag"],
    ["Règlement de copropriété.pdf", "reglement_copro"],
    ["reglement-copro.pdf", "reglement_copro"],
    ["Appel de charges T3 2025.pdf", "appel_charges"],
    ["Carnet d'entretien.pdf", "carnet_entretien"],
    ["fiche_synthetique_copropriete.pdf", "fiche_synthetique"],
    ["Pré-état daté.pdf", "pre_etat_date"],
    ["pre_etat_date.pdf", "pre_etat_date"],
    // The works.
    ["Facture toiture 2021.pdf", "facture_travaux"],
    ["devis_chaudiere.pdf", "facture_travaux"],
    // Nothing to tell.
    ["photo.jpg", null],
    ["IMG_4521.png", null],
    ["scan0001.pdf", null],
    ["document.pdf", null],
    ["", null],
  ];

  it.each(cases)("%s → %s", (name, type) => {
    expect(guessDocumentType(name)).toBe(type);
  });

  it("a short word inside another one tells nothing", () => {
    // « dpe », « gaz », « erp », « ag » are whole words.
    expect(guessDocumentType("gazette.pdf")).toBeNull();
    expect(guessDocumentType("image.png")).toBeNull();
    expect(guessDocumentType("interphone.pdf")).toBeNull();
  });

  it("only suggests types of the database, never « Autre document »", () => {
    for (const [name] of cases) {
      const type = guessDocumentType(name);
      if (type !== null) expect(Constants.public.Enums.document_type).toContain(type);
      expect(type).not.toBe("autre");
    }
  });
});
