import { describe, expect, it } from "vitest";
import {
  buildChecklist,
  checklistProgress,
  checklistProperty,
  sniffSaleFile,
  type Exemption,
  type FiledDocument,
} from "@/leenkey/sale-file/checklist";
import {
  EXEMPTIBLE_DOCUMENTS,
  requiredDocuments,
  type DocumentStage,
  type DocumentType,
} from "@/lib/config/documents";

// L3-04: the checklist of the sale file (SPEC-V2 15), from the property, its
// documents and its « Non concerné »: its three categories, the stage of
// each line, the progress of each category and of each stage, the stage to
// work on now, the notary file (DECISIONS.md 2026-11-23); and what the first
// bytes of a file say it is.

let next = 0;
const filed = (type: DocumentType, title = `${type}.pdf`): FiledDocument => ({
  id: `d${++next}`,
  type,
  title,
  createdAt: "2026-11-18T10:00:00Z",
});
const exempt = (type: DocumentType, reason = "Pas d'installation"): Exemption => ({
  type,
  reason,
});

type Built = ReturnType<typeof buildChecklist>;
const allLines = (checklist: Built) => checklist.groups.flatMap((group) => group.lines);
function line(checklist: Built, type: DocumentType) {
  return allLines(checklist).find((item) => item.type === type);
}
const group = (checklist: Built, category: string) =>
  checklist.groups.find((item) => item.category === category);
const stage = (checklist: Built, name: DocumentStage) =>
  checklist.stages.find((item) => item.stage === name);
const house = { type: "maison", coOwnership: false } as const;
const houseInCoOwnership = { type: "maison", coOwnership: true } as const;

describe("buildChecklist", () => {
  it("counts the notary file of each property: what is asked for up to the agreement", () => {
    // A flat: 19 documents asked for, the « état daté » outside the notary file.
    expect(buildChecklist("appartement", [], [])).toMatchObject({
      done: 0,
      total: 18,
      complete: false,
    });
    expect(buildChecklist("maison", [], []).total).toBe(11);
    expect(buildChecklist(house, [], []).total).toBe(11);
    expect(buildChecklist(houseInCoOwnership, [], []).total).toBe(19);
    expect(buildChecklist("terrain", [], []).total).toBe(4);
    // No list of its own, or no type yet: the one of a house.
    expect(buildChecklist("autre", [], []).total).toBe(11);
    expect(buildChecklist(null, [], []).total).toBe(11);
  });

  it("the property of a checklist: a house is in a co-ownership when its sheet gives lots", () => {
    const none = { energyAudit: false };
    expect(checklistProperty({ type: "maison", coproLots: null })).toEqual({ ...house, ...none });
    expect(checklistProperty({ type: "maison", coproLots: 0 })).toEqual({ ...house, ...none });
    expect(checklistProperty({ type: "maison", coproLots: 12 })).toEqual({
      ...houseInCoOwnership,
      ...none,
    });
    expect(checklistProperty({ type: "appartement", coproLots: null })).toEqual({
      type: "appartement",
      coOwnership: true,
      ...none,
    });
    expect(checklistProperty({ type: "terrain", coproLots: 3 }).coOwnership).toBe(false);
    expect(checklistProperty({ type: null, coproLots: null })).toEqual({
      type: null,
      coOwnership: false,
      ...none,
    });
    // A house with charges and no lots keeps its 11 documents.
    expect(
      buildChecklist(checklistProperty({ type: "maison", coproLots: null }), [], []).total,
    ).toBe(11);
  });

  // DECISIONS.md 2026-11-26: « Ce bien est-il en copropriété ? » at step 2.
  it("the property of a checklist: what its seller says wins over its lots", () => {
    // « Oui » without a number of lots: the documents of the co-ownership are asked for.
    const yes = checklistProperty({ type: "maison", coproLots: null, coOwnership: true });
    expect(yes.coOwnership).toBe(true);
    expect(buildChecklist(yes, [], []).total).toBe(19);
    // « Non »: none of them, whatever its sheet still holds.
    const no = checklistProperty({ type: "maison", coproLots: 12, coOwnership: false });
    expect(no.coOwnership).toBe(false);
    const alone = buildChecklist(no, [], []);
    expect(alone.total).toBe(11);
    expect(alone.groups.map((item) => item.category)).toEqual(["property", "notary"]);
    for (const type of [
      "carrez",
      "reglement_copro",
      "pv_ag",
      "fiche_synthetique",
      "carnet_entretien",
      "plan_pluriannuel_travaux",
      "appel_charges",
      "pre_etat_date",
      "etat_date",
    ] as const) {
      expect(line(alone, type), type).toBeUndefined();
    }
    // A flat always, land never, whatever is said.
    expect(
      checklistProperty({ type: "appartement", coproLots: null, coOwnership: false }).coOwnership,
    ).toBe(true);
    expect(
      checklistProperty({ type: "terrain", coproLots: null, coOwnership: true }).coOwnership,
    ).toBe(false);
    // Another property (a building, business premises) as a house.
    expect(
      buildChecklist(
        checklistProperty({ type: "autre", coproLots: null, coOwnership: false }),
        [],
        [],
      ).total,
    ).toBe(11);
  });

  // DECISIONS.md 2026-11-26: the energy audit (when it is asked for: to be validated by Cédric).
  it("the energy audit: asked for a house outside a co-ownership in class E, F or G, offered otherwise", () => {
    const of = (property: Parameters<typeof checklistProperty>[0]) =>
      buildChecklist(checklistProperty({ coOwnership: false, ...property }), [], []);
    for (const dpe of ["E", "F", "G"]) {
      const asked = of({ type: "maison", coproLots: null, dpe });
      expect(line(asked, "audit_energetique"), dpe).toMatchObject({
        required: true,
        exemptible: true,
        stage: "listing",
        state: "missing",
      });
      // One document more in the notary file, to file from the listing.
      expect(asked.total, dpe).toBe(12);
      expect(stage(asked, "listing")?.missing, dpe).toContain("audit_energetique");
    }
    for (const dpe of ["A", "B", "C", "D", null]) {
      const offered = of({ type: "maison", coproLots: null, dpe });
      expect(line(offered, "audit_energetique"), String(dpe)).toMatchObject({
        required: false,
        exemptible: false,
        state: "missing",
      });
      expect(offered.total, String(dpe)).toBe(11);
      expect(stage(offered, "listing")?.missing).not.toContain("audit_energetique");
    }
    // A building in single ownership as a house; never in a co-ownership, a
    // flat, a property not subject to the DPE or business premises.
    expect(
      line(of({ type: "autre", coproLots: null, dpe: "G" }), "audit_energetique")?.required,
    ).toBe(true);
    for (const property of [
      { type: "maison", coproLots: null, dpe: "G", coOwnership: true },
      { type: "appartement", coproLots: null, dpe: "G" },
      { type: "maison", coproLots: null, dpe: "G", dpeExempt: true },
      { type: "autre", coproLots: null, dpe: "G", dpeKind: "tertiaire" },
    ] as const) {
      expect(line(of(property), "audit_energetique"), JSON.stringify(property)).toMatchObject({
        required: false,
      });
    }
    // Land: neither asked for nor offered.
    expect(
      line(of({ type: "terrain", coproLots: null, dpe: "G" }), "audit_energetique"),
    ).toBeUndefined();
    expect(line(buildChecklist("terrain", [], []), "audit_energetique")).toBeUndefined();
    // A reader that gives no DPE (the lots alone): never asked for.
    expect(checklistProperty({ type: "maison", coproLots: null }).energyAudit).toBe(false);

    // Filed, or « Non concerné » with its reason: the line counts; the notary file can be complete.
    const g = checklistProperty({ type: "maison", coproLots: null, coOwnership: false, dpe: "G" });
    expect(
      line(buildChecklist(g, [filed("audit_energetique")], []), "audit_energetique")?.state,
    ).toBe("filed");
    const exempted = buildChecklist(g, [], [exempt("audit_energetique", "Bien non concerné")]);
    expect(line(exempted, "audit_energetique")).toMatchObject({
      state: "exempt",
      reason: "Bien non concerné",
    });
    expect(exempted.done).toBe(1);
    // « Non concerné » means nothing on a line that is only offered.
    const d = checklistProperty({ type: "maison", coproLots: null, coOwnership: false, dpe: "D" });
    expect(
      line(buildChecklist(d, [], [exempt("audit_energetique")]), "audit_energetique")?.state,
    ).toBe("missing");
  });

  it("groups the lines in three categories, in the order of the list, each missing at first", () => {
    const flat = buildChecklist("appartement", [], []);
    expect(flat.groups.map((item) => item.category)).toEqual(["property", "coownership", "notary"]);
    // The property (the Carrez measurement among it), the co-ownership, the
    // « état daté » and the line always offered; the energy audit is offered
    // among the documents of the property, after those asked for.
    expect(flat.groups.map((item) => item.lines.length)).toEqual([12, 7, 2]);
    expect(group(flat, "property")?.lines.at(-1)?.type).toBe("audit_energetique");
    expect(
      allLines(flat)
        .map((item) => item.type)
        .filter((type) => type !== "audit_energetique"),
    ).toEqual([...requiredDocuments("appartement"), "autre"]);
    for (const item of allLines(flat)) {
      expect(item).toMatchObject({
        required: item.type !== "autre" && item.type !== "audit_energetique",
        state: "missing",
        documents: [],
        reason: null,
      });
    }
    // A house that is not in a co-ownership: no category for it.
    const alone = buildChecklist(house, [], []);
    expect(alone.groups.map((item) => item.category)).toEqual(["property", "notary"]);
    expect(group(alone, "notary")?.lines.map((item) => item.type)).toEqual(["autre"]);
    // In one: the same three categories as a flat.
    const shared = buildChecklist(houseInCoOwnership, [], []);
    expect(shared.groups.map((item) => item.category)).toEqual([
      "property",
      "coownership",
      "notary",
    ]);
    expect(group(shared, "property")?.lines.map((item) => item.type)).toContain("carrez");
    expect(group(shared, "coownership")?.lines).toHaveLength(7);
    expect(line(shared, "etat_date")).toMatchObject({ required: true, exemptible: true });
    expect(line(alone, "carrez")).toBeUndefined();
    expect(line(alone, "etat_date")).toBeUndefined();
    // Land: its four documents, nothing of a co-ownership even when one is said.
    const land = buildChecklist({ type: "terrain", coOwnership: true }, [], []);
    expect(land.groups.map((item) => item.category)).toEqual(["property", "notary"]);
    expect(group(land, "property")?.lines).toHaveLength(4);
  });

  it("each line has the stage it is needed for", () => {
    const flat = buildChecklist("appartement", [], []);
    expect(line(flat, "titre_propriete")?.stage).toBe("listing");
    expect(line(flat, "dpe")?.stage).toBe("listing");
    expect(line(flat, "carrez")?.stage).toBe("listing");
    expect(line(flat, "taxe_fonciere")?.stage).toBe("agreement");
    expect(line(flat, "facture_travaux")?.stage).toBe("agreement");
    expect(line(flat, "pv_ag")?.stage).toBe("agreement");
    expect(line(flat, "plan_pluriannuel_travaux")?.stage).toBe("agreement");
    expect(line(flat, "etat_date")?.stage).toBe("deed");
    expect(line(flat, "autre")?.stage).toBe("deed");
  });

  it("the progress of each category and of each stage, « Non concerné » and optional lines apart", () => {
    const flat = buildChecklist(
      "appartement",
      [
        filed("titre_propriete"),
        filed("dpe"),
        filed("taxe_fonciere", "2024.pdf"),
        filed("taxe_fonciere", "2025.pdf"),
        filed("pv_ag"),
        // Offered, never counted.
        filed("autre", "Plan.pdf"),
      ],
      [exempt("gaz", "Pas de gaz"), exempt("plan_pluriannuel_travaux", "Aucun plan voté")],
    );
    expect(flat.groups.map(({ category, done, total }) => ({ category, done, total }))).toEqual([
      // The title deed, the DPE, the gas « Non concerné », the tax.
      { category: "property", done: 4, total: 11 },
      // The minutes, the plan « Non concerné ».
      { category: "coownership", done: 2, total: 7 },
      // The « état daté » only: the offered line is not counted.
      { category: "notary", done: 0, total: 1 },
    ]);
    expect(flat.stages).toEqual([
      {
        stage: "listing",
        done: 3,
        total: 9,
        missing: ["amiante", "plomb", "electricite", "termites", "erp", "carrez"],
      },
      {
        stage: "agreement",
        done: 3,
        total: 9,
        missing: [
          "facture_travaux",
          "reglement_copro",
          "fiche_synthetique",
          "carnet_entretien",
          "appel_charges",
          "pre_etat_date",
        ],
      },
      { stage: "deed", done: 0, total: 1, missing: ["etat_date"] },
    ]);
    // The notary file: the first two stages.
    expect(flat).toMatchObject({ done: 6, total: 18, complete: false });
    // The same count for any lines (a category filtered by stage).
    expect(checklistProgress(allLines(flat).filter((item) => item.stage === "agreement"))).toEqual({
      done: 3,
      total: 9,
    });
    expect(checklistProgress([])).toEqual({ done: 0, total: 0 });
  });

  it("a stage nothing is asked for has no count; the three stages are always there", () => {
    const alone = buildChecklist(house, [], []);
    expect(alone.stages.map(({ stage: name, total }) => [name, total])).toEqual([
      ["listing", 9],
      ["agreement", 2],
      // Only the offered line: nothing asked for.
      ["deed", 0],
    ]);
    expect(stage(alone, "deed")?.missing).toEqual([]);
    expect(buildChecklist("terrain", [], []).stages.map((item) => item.total)).toEqual([3, 1, 0]);
  });

  it("the stage to work on now is the first with a document to file", () => {
    const listing = requiredDocuments("maison").filter(
      (type) => !["taxe_fonciere", "facture_travaux"].includes(type),
    );
    expect(buildChecklist(house, [], []).currentStage).toBe("listing");
    // A document of a later stage does not move it.
    expect(buildChecklist(house, [filed("taxe_fonciere")], []).currentStage).toBe("listing");
    // Everything of the listing filed or « Non concerné »: the agreement.
    const second = buildChecklist(
      house,
      listing.filter((type) => !EXEMPTIBLE_DOCUMENTS.includes(type)).map((type) => filed(type)),
      listing.filter((type) => EXEMPTIBLE_DOCUMENTS.includes(type)).map((type) => exempt(type)),
    );
    expect(second.currentStage).toBe("agreement");
    expect(stage(second, "listing")).toMatchObject({ done: 9, total: 9, missing: [] });
    expect(stage(second, "agreement")?.missing).toEqual(["taxe_fonciere", "facture_travaux"]);
    // Nothing missing: no stage to work on.
    const notConcerned: DocumentType[] = [
      ...listing.filter((type) => EXEMPTIBLE_DOCUMENTS.includes(type)),
      "facture_travaux",
    ];
    const done = buildChecklist(
      house,
      [...allLines(second).flatMap((item) => item.documents), filed("taxe_fonciere")],
      notConcerned.map((type) => exempt(type)),
    );
    expect(done).toMatchObject({ currentStage: null, complete: true });
    // A document removed (it is no longer given): its line is to file again.
    const removed = buildChecklist(
      house,
      allLines(done)
        .flatMap((item) => item.documents)
        .filter((document) => document.type !== "dpe"),
      notConcerned.map((type) => exempt(type)),
    );
    expect(removed).toMatchObject({ currentStage: "listing", complete: false, done: 10 });
    expect(stage(removed, "listing")?.missing).toEqual(["dpe"]);
  });

  it("a filed document counts once, however many files its line holds", () => {
    const checklist = buildChecklist(
      "maison",
      [filed("dpe"), filed("taxe_fonciere", "2024.pdf"), filed("taxe_fonciere", "2025.pdf")],
      [],
    );
    expect(checklist).toMatchObject({ done: 2, total: 11, complete: false });
    expect(line(checklist, "taxe_fonciere")).toMatchObject({ state: "filed", required: true });
    expect(line(checklist, "taxe_fonciere")?.documents.map((item) => item.title)).toEqual([
      "2024.pdf",
      "2025.pdf",
    ]);
    expect(line(checklist, "amiante")?.state).toBe("missing");
  });

  it("« Non concerné » counts as present, for an exemptible document of the list only", () => {
    const checklist = buildChecklist(
      "maison",
      [],
      [
        exempt("gaz", "Pas de gaz"),
        // Not exemptible: the DPE and the title deed are always asked for.
        exempt("dpe"),
        exempt("titre_propriete"),
        // Exemptible, but not asked for a house: no line, no count.
        exempt("certificat_urbanisme"),
        // Not in the list of a house that is not in a co-ownership.
        exempt("pv_ag"),
      ],
    );
    expect(checklist).toMatchObject({ done: 1, total: 11 });
    expect(line(checklist, "gaz")).toMatchObject({
      state: "exempt",
      exemptible: true,
      reason: "Pas de gaz",
      documents: [],
    });
    expect(line(checklist, "dpe")).toMatchObject({
      state: "missing",
      exemptible: false,
      reason: null,
    });
    expect(line(checklist, "titre_propriete")?.state).toBe("missing");
    expect(line(checklist, "certificat_urbanisme")).toBeUndefined();
    expect(line(checklist, "pv_ag")).toBeUndefined();

    // The same reason on a plot of land, where the certificate is asked for.
    const land = buildChecklist("terrain", [], [exempt("certificat_urbanisme", "Aucun projet")]);
    expect(land).toMatchObject({ done: 1, total: 4 });
    expect(line(land, "certificat_urbanisme")).toMatchObject({
      state: "exempt",
      reason: "Aucun projet",
    });

    // A flat that is not in a co-ownership: its documents « Non concerné ».
    const flat = buildChecklist(
      "appartement",
      [],
      [exempt("pv_ag", "Pas de copropriété"), exempt("etat_date", "Pas de copropriété")],
    );
    expect(group(flat, "coownership")).toMatchObject({ done: 1, total: 7 });
    expect(group(flat, "notary")).toMatchObject({ done: 1, total: 1 });
    expect(stage(flat, "deed")).toMatchObject({ done: 1, total: 1, missing: [] });
  });

  it("the lines that may be « Non concerné » are the exemptible ones of the list", () => {
    for (const type of ["appartement", "maison", "terrain", "autre"] as const) {
      const lines = allLines(buildChecklist(type, [], []));
      expect(lines.filter((item) => item.exemptible).map((item) => item.type)).toEqual(
        requiredDocuments(type).filter((item) => EXEMPTIBLE_DOCUMENTS.includes(item)),
      );
    }
  });

  it("a filed document wins over « Non concerné »", () => {
    const checklist = buildChecklist("maison", [filed("gaz")], [exempt("gaz", "Pas de gaz")]);
    expect(line(checklist, "gaz")).toMatchObject({ state: "filed", reason: "Pas de gaz" });
    expect(line(checklist, "gaz")?.documents).toHaveLength(1);
    // Counted once, not twice.
    expect(checklist.done).toBe(1);
  });

  it("a document outside the list shows in its category and changes no count", () => {
    const checklist = buildChecklist(
      "terrain",
      [filed("autre", "Plan.pdf"), filed("pv_ag"), filed("dpe"), filed("autre", "Notice.pdf")],
      [exempt("pv_ag")],
    );
    expect(checklist).toMatchObject({ done: 0, total: 4, complete: false });
    expect(checklist.groups.map((item) => item.category)).toEqual([
      "property",
      "coownership",
      "notary",
    ]);
    // After the documents asked for of its category.
    expect(checklist.groups[0].lines.map((item) => item.type)).toEqual([
      "titre_propriete",
      "erp",
      "certificat_urbanisme",
      "taxe_fonciere",
      "dpe",
    ]);
    expect(line(checklist, "dpe")).toMatchObject({ required: false, state: "filed" });
    expect(line(checklist, "pv_ag")).toMatchObject({
      required: false,
      exemptible: false,
      state: "filed",
      reason: null,
    });
    expect(group(checklist, "coownership")).toMatchObject({ done: 0, total: 0 });
    expect(line(checklist, "autre")?.documents.map((item) => item.title)).toEqual([
      "Plan.pdf",
      "Notice.pdf",
    ]);
    expect(line(checklist, "autre")).toMatchObject({ required: false, state: "filed" });
  });

  it("the notary file is complete when everything asked for up to the agreement is filed or « Non concerné »", () => {
    const documents = [filed("erp"), filed("titre_propriete"), filed("taxe_fonciere")];
    expect(buildChecklist("terrain", documents, [])).toMatchObject({
      done: 3,
      total: 4,
      complete: false,
    });
    expect(buildChecklist("terrain", documents, [exempt("certificat_urbanisme")])).toMatchObject({
      done: 4,
      total: 4,
      complete: true,
    });
    expect(
      buildChecklist("terrain", [...documents, filed("certificat_urbanisme")], []).complete,
    ).toBe(true);
    // Extra documents do not complete a file.
    expect(
      buildChecklist("terrain", [...documents, filed("autre"), filed("dpe")], []).complete,
    ).toBe(false);

    // A flat without its « état daté » (asked for before the deed): the notary
    // file is complete, the deed still has a document to file.
    const asked = requiredDocuments("appartement").filter((type) => type !== "etat_date");
    const flat = buildChecklist(
      "appartement",
      asked.filter((type) => !EXEMPTIBLE_DOCUMENTS.includes(type)).map((type) => filed(type)),
      asked.filter((type) => EXEMPTIBLE_DOCUMENTS.includes(type)).map((type) => exempt(type)),
    );
    expect(flat).toMatchObject({ done: 18, total: 18, complete: true, currentStage: "deed" });
    expect(stage(flat, "deed")).toMatchObject({ done: 0, total: 1, missing: ["etat_date"] });
    // The « état daté » alone does not make it.
    expect(buildChecklist("appartement", [filed("etat_date")], [])).toMatchObject({
      done: 0,
      total: 18,
      complete: false,
    });
  });
});

describe("sniffSaleFile", () => {
  const bytes = (...values: number[]) => Uint8Array.from(values);
  const ascii = (value: string) => new TextEncoder().encode(value);

  it("knows a PDF, a JPEG and a PNG from their first bytes", () => {
    expect(sniffSaleFile(ascii("%PDF-1.7\n%âãÏÓ\n1 0 obj"))).toBe("application/pdf");
    expect(sniffSaleFile(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46))).toBe("image/jpeg");
    expect(sniffSaleFile(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
  });

  it("finds the header of a PDF after a few bytes, within the first 1 024 only", () => {
    expect(sniffSaleFile(ascii("\n\n  %PDF-1.4"))).toBe("application/pdf");
    const late = new Uint8Array(1100).fill(0x20);
    late.set(ascii("%PDF-1.4"), 1024);
    expect(sniffSaleFile(late)).toBeNull();
    const edge = new Uint8Array(1100).fill(0x20);
    edge.set(ascii("%PDF-1.4"), 1019);
    expect(sniffSaleFile(edge)).toBe("application/pdf");
  });

  it("refuses the rest, whatever its name says", () => {
    expect(sniffSaleFile(new Uint8Array())).toBeNull();
    expect(sniffSaleFile(bytes(0xff, 0xd8))).toBeNull();
    expect(sniffSaleFile(bytes(0x89, 0x50, 0x4e))).toBeNull();
    // GIF, ZIP (a .docx), a Windows program, a page of HTML, a WebP.
    expect(sniffSaleFile(ascii("GIF89a"))).toBeNull();
    expect(sniffSaleFile(bytes(0x50, 0x4b, 0x03, 0x04))).toBeNull();
    expect(sniffSaleFile(ascii("MZ\x90\x00"))).toBeNull();
    expect(sniffSaleFile(ascii("<!doctype html><script>alert(1)</script>"))).toBeNull();
    expect(sniffSaleFile(ascii("RIFF\x00\x00\x00\x00WEBP"))).toBeNull();
  });
});

describe("review of L3-04", () => {
  it("a property not subject to the DPE counts its DPE as « Non concerné », with its reason", async () => {
    const { buildChecklist } = await import("@/leenkey/sale-file/checklist");
    const without = buildChecklist("maison", [], []);
    const exempt = buildChecklist("maison", [], [], "Bâtiment non chauffé");
    const dpe = exempt.groups.flatMap((group) => group.lines).find((line) => line.type === "dpe");
    expect(dpe).toMatchObject({ state: "exempt", reason: "Bâtiment non chauffé" });
    expect(exempt.done).toBe(without.done + 1);
  });

  it("a picture is read by its signature, even with « %PDF- » in its first bytes", async () => {
    const { sniffSaleFile } = await import("@/leenkey/sale-file/checklist");
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, ...new TextEncoder().encode(" %PDF-1.4")]);
    expect(sniffSaleFile(jpeg)).toBe("image/jpeg");
  });
});
