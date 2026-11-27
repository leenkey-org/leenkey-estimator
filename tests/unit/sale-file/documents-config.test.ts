import { describe, expect, it } from "vitest";
import {
  CO_OWNERSHIP_DOCUMENTS,
  coOwnershipOf,
  DIAGNOSTIC_TYPES,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY,
  DOCUMENT_ORDER,
  DOCUMENT_STAGE,
  DOCUMENT_STAGES,
  ENERGY_AUDIT_CLASSES,
  ENERGY_AUDIT_TYPE,
  energyAuditAsked,
  EXEMPTIBLE_DOCUMENTS,
  guessDocumentType,
  inCoOwnership,
  NOTARY_FILE_STAGES,
  offeredDocuments,
  OPTIONAL_DOCUMENTS,
  PROPERTY_DOCUMENTS,
  requiredDocuments,
  SALE_FILE_EXTENSIONS,
  SALE_FILE_MAX_BYTES,
  type DocumentType,
} from "@/lib/config/documents";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { Constants } from "@/types/database";

// L3-04: the lists of the sale file (SPEC-V2 15) against the types of the
// database, and the type a file name suggests. The categories and the stages
// asked by Cédric on 2026-11-22 (DECISIONS.md 2026-11-23).

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
    expect(DOCUMENT_CATEGORIES).toEqual(["property", "coownership", "notary"]);
  });

  it("the three categories of the client, in his order", () => {
    const of = (category: string) =>
      DOCUMENT_ORDER.filter((type) => DOCUMENT_CATEGORY[type] === category);
    expect(of("property")).toEqual([
      "titre_propriete",
      "dpe",
      "amiante",
      "plomb",
      "electricite",
      "gaz",
      "termites",
      "erp",
      "assainissement",
      "carrez",
      // DECISIONS.md 2026-11-26: after the diagnostics, not one a DDT covers.
      "audit_energetique",
      "certificat_urbanisme",
      "taxe_fonciere",
      "facture_travaux",
    ]);
    expect(of("coownership")).toEqual([
      "reglement_copro",
      "pv_ag",
      "fiche_synthetique",
      "carnet_entretien",
      "plan_pluriannuel_travaux",
      "appel_charges",
      "pre_etat_date",
    ]);
    expect(of("notary")).toEqual(["etat_date", "autre"]);
  });

  it("every type has a stage: the listing, the agreement or the deed", () => {
    expect(Object.keys(DOCUMENT_STAGE).sort()).toEqual([...TYPES].sort());
    expect(DOCUMENT_STAGES).toEqual(["listing", "agreement", "deed"]);
    const at = (stage: string) => DOCUMENT_ORDER.filter((type) => DOCUMENT_STAGE[type] === stage);
    // The title deed, the diagnostics and the Carrez measurement from the listing.
    expect(at("listing")).toEqual([
      "titre_propriete",
      ...DOCUMENT_ORDER.filter((type) => DIAGNOSTIC_TYPES.includes(type)),
      "audit_energetique",
      "certificat_urbanisme",
    ]);
    // The tax, the works and the co-ownership before the agreement.
    expect(at("agreement")).toEqual([
      "taxe_fonciere",
      "facture_travaux",
      ...DOCUMENT_ORDER.filter((type) => DOCUMENT_CATEGORY[type] === "coownership"),
    ]);
    // The « état daté » and what the notary asks besides before the deed.
    expect(at("deed")).toEqual(["etat_date", "autre"]);
    // The notary file: what is asked for up to the agreement.
    expect(NOTARY_FILE_STAGES).toEqual(["listing", "agreement"]);
  });

  it("every type, category and stage has its name", () => {
    expect(Object.keys(frSaleFile.types).sort()).toEqual([...TYPES].sort());
    expect(Object.keys(frSaleFile.categories).sort()).toEqual([...DOCUMENT_CATEGORIES].sort());
    expect(Object.keys(frSaleFile.stages).sort()).toEqual([...DOCUMENT_STAGES].sort());
    // The words of the client.
    expect(frSaleFile.categories).toEqual({
      property: "Documents du bien",
      coownership: "Documents de copropriété",
      notary: "Documents pour le notaire",
    });
    expect(frSaleFile.stages).toEqual({
      listing: "Dès la mise en vente",
      agreement: "Avant le compromis",
      deed: "Avant la signature",
    });
  });

  it("the documents to file of a stage: three named at most, « maintenant » up to the agreement", () => {
    const t = frSaleFile.seller;
    expect(t.missingNames([])).toBe("");
    expect(t.missingNames(["DPE"])).toBe("DPE");
    expect(t.missingNames(["DPE", "Titre de propriété", "Taxe foncière"])).toBe(
      "DPE, Titre de propriété, Taxe foncière",
    );
    expect(t.missingNames(["A", "B", "C", "D"])).toBe("A, B, C et 1 autre");
    expect(t.missingNames(["A", "B", "C", "D", "E", "F"])).toBe("A, B, C et 3 autres");
    expect(t.stageProgress(0, 1)).toBe("0 sur 1 pièce");
    expect(t.stageProgress(3, 9)).toBe("3 sur 9 pièces");
    expect(t.stageMissing("3 sur 9 pièces", "DPE", true)).toBe(
      "3 sur 9 pièces · À déposer maintenant : DPE",
    );
    // Before the deed: the « état daté » comes after the agreement, not now.
    expect(t.stageMissing("0 sur 1 pièce", frSaleFile.types.etat_date, false)).toBe(
      "0 sur 1 pièce · À déposer : État daté fourni par le syndic",
    );
    // The line offered and the type of the deposit share one name; no identity document in it.
    expect(frSaleFile.types.autre).toBe("Documents complémentaires");
    expect(t.lineHelp.autre).toContain("(hors pièces d'identité)");
  });

  it("every type of property has its list, of known types, each once", () => {
    expect(Object.keys(PROPERTY_DOCUMENTS).sort()).toEqual([...PROPERTY_TYPES].sort());
    for (const type of PROPERTY_TYPES) {
      for (const coOwnership of [false, true]) {
        const list = requiredDocuments(type, coOwnership);
        expect(new Set(list).size, type).toBe(list.length);
        for (const document of list) expect(TYPES, `${type}: ${document}`).toContain(document);
        // « Documents complémentaires » is never asked for: it is offered.
        expect(list, type).not.toContain("autre");
        // In the order of the checklist.
        expect(list).toEqual(DOCUMENT_ORDER.filter((document) => list.includes(document)));
      }
    }
    expect(OPTIONAL_DOCUMENTS).toEqual(["autre"]);
    expect(PROPERTY_DOCUMENTS.autre).toEqual(PROPERTY_DOCUMENTS.maison);
  });

  it("a flat is in a co-ownership; a house when its sheet gives lots; land never", () => {
    expect(inCoOwnership("appartement", null)).toBe(true);
    expect(inCoOwnership("maison", null)).toBe(false);
    expect(inCoOwnership("maison", 0)).toBe(false);
    expect(inCoOwnership("maison", 12)).toBe(true);
    expect(inCoOwnership("autre", 4)).toBe(true);
    expect(inCoOwnership(null, null)).toBe(false);
    expect(inCoOwnership("terrain", 12)).toBe(false);

    // A flat: 19 documents, the Carrez measurement and the co-ownership among them.
    expect(requiredDocuments("appartement")).toHaveLength(19);
    expect(requiredDocuments("appartement")).toEqual(requiredDocuments("appartement", true));
    expect(requiredDocuments("appartement")).toEqual(
      expect.arrayContaining([...CO_OWNERSHIP_DOCUMENTS]),
    );
    // A house: 11, and 20 in a co-ownership (the sanitation besides).
    expect(requiredDocuments("maison")).toHaveLength(11);
    expect(requiredDocuments("maison", true)).toHaveLength(20);
    expect(requiredDocuments("maison", false)).not.toEqual(
      expect.arrayContaining(["reglement_copro"]),
    );
    expect(requiredDocuments(null)).toEqual(requiredDocuments("maison"));
    // Land: 4, whatever is said of a co-ownership.
    expect(requiredDocuments("terrain")).toEqual([
      "titre_propriete",
      "erp",
      "certificat_urbanisme",
      "taxe_fonciere",
    ]);
    expect(requiredDocuments("terrain", true)).toEqual(requiredDocuments("terrain"));
  });

  // DECISIONS.md 2026-11-26 (when it is asked for: to be validated by Cédric).
  it("the energy audit: asked for a building in single ownership in class E, F or G, never for land", () => {
    expect(ENERGY_AUDIT_TYPE).toBe("audit_energetique");
    expect(ENERGY_AUDIT_CLASSES).toEqual(["E", "F", "G"]);
    const house = { type: "maison", coOwnership: false, dpe: "F" } as const;
    expect(energyAuditAsked(house)).toBe(true);
    expect(energyAuditAsked({ ...house, type: "autre" })).toBe(true);
    expect(energyAuditAsked({ ...house, dpe: "D" })).toBe(false);
    expect(energyAuditAsked({ ...house, dpe: null })).toBe(false);
    expect(energyAuditAsked({ ...house, coOwnership: true })).toBe(false);
    expect(energyAuditAsked({ ...house, type: "appartement", coOwnership: true })).toBe(false);
    expect(energyAuditAsked({ ...house, type: "terrain" })).toBe(false);
    expect(energyAuditAsked({ ...house, type: null })).toBe(false);
    expect(energyAuditAsked({ ...house, dpeExempt: true })).toBe(false);
    expect(energyAuditAsked({ ...house, type: "autre", dpeKind: "tertiaire" })).toBe(false);

    expect(requiredDocuments("maison", false, true)).toHaveLength(12);
    expect(requiredDocuments("maison", false, true)).toContain("audit_energetique");
    expect(requiredDocuments("maison", false)).not.toContain("audit_energetique");
    expect(requiredDocuments("terrain", false, true)).toEqual(requiredDocuments("terrain"));
    // Offered to a building, before what the notary asks besides; never to land.
    expect(offeredDocuments("maison")).toEqual(["audit_energetique", "autre"]);
    expect(offeredDocuments("appartement")).toEqual(["audit_energetique", "autre"]);
    expect(offeredDocuments(null)).toEqual(["audit_energetique", "autre"]);
    expect(offeredDocuments("terrain")).toEqual(["autre"]);
    // Not a diagnostic a DDT covers (the constraint documents_covers), filed alone.
    expect(DIAGNOSTIC_TYPES).not.toContain("audit_energetique");
    expect(EXEMPTIBLE_DOCUMENTS).toContain("audit_energetique");
    expect(guessDocumentType("Audit_energetique_2026.pdf")).toBe("audit_energetique");
    expect(guessDocumentType("audit-énergétique maison.pdf")).toBe("audit_energetique");
    expect(guessDocumentType("DPE_2025.pdf")).toBe("dpe");
  });

  it("what the seller says of the co-ownership: a flat always, land never", () => {
    expect(coOwnershipOf("maison", true)).toBe(true);
    expect(coOwnershipOf("maison", false)).toBe(false);
    expect(coOwnershipOf("autre", true)).toBe(true);
    expect(coOwnershipOf("appartement", false)).toBe(true);
    expect(coOwnershipOf("terrain", true)).toBe(false);
    expect(coOwnershipOf(null, true)).toBe(true);
  });

  it("every exemptible type is asked for at least one property", () => {
    expect(new Set(EXEMPTIBLE_DOCUMENTS).size).toBe(EXEMPTIBLE_DOCUMENTS.length);
    const asked = new Set(PROPERTY_TYPES.flatMap((type) => requiredDocuments(type, true, true)));
    for (const type of EXEMPTIBLE_DOCUMENTS) expect(asked, type).toContain(type);
    // Always asked for, whatever the property.
    for (const type of ["dpe", "erp", "titre_propriete", "taxe_fonciere"] as const) {
      expect(EXEMPTIBLE_DOCUMENTS, type).not.toContain(type);
    }
    // Every document of a co-ownership may be « Non concerné » (a flat that is not in one).
    for (const type of CO_OWNERSHIP_DOCUMENTS) expect(EXEMPTIBLE_DOCUMENTS, type).toContain(type);
  });

  it("the diagnostics shared together: the DDT and the measurement", () => {
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
    ["Plan pluriannuel de travaux 2025.pdf", "plan_pluriannuel_travaux"],
    ["PPT_copropriete.pdf", "plan_pluriannuel_travaux"],
    // The notary.
    ["État daté syndic.pdf", "etat_date"],
    ["etat_date.pdf", "etat_date"],
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

  it("only suggests types of the database, never « Documents complémentaires »", () => {
    for (const [name] of cases) {
      const type = guessDocumentType(name);
      if (type !== null) expect(Constants.public.Enums.document_type).toContain(type);
      expect(type).not.toBe("autre");
    }
  });
});
