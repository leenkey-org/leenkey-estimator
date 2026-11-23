import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildChecklist, type Checklist, type FiledDocument } from "@/leenkey/sale-file/checklist";
import {
  DDT_TYPE,
  ddtDiagnostics,
  DIAGNOSTIC_TYPES,
  DOCUMENT_ORDER,
  EXEMPTIBLE_DOCUMENTS,
  guessDocumentType,
  OPTIONAL_DOCUMENTS,
  requiredDocuments,
  type DocumentType,
} from "@/lib/config/documents";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import {
  ddtCoverageSchema,
  exemptionSchema,
  fileDdtSchema,
  fileDocumentSchema,
} from "@/lib/validations/sale-file";
import { Constants } from "@/types/database";

// The DDT filed at once, level A (DECISIONS.md 2026-11-23, SPEC-V2 15): one
// file for the diagnostics, the lines its seller ticks count as provided in
// every count; removed, they go back to missing.

const PROPERTY = "11111111-1111-4111-8111-111111111111";
const DOCUMENT = "22222222-2222-4222-8222-222222222222";
const PATH = `${PROPERTY}/sale/33333333-3333-4333-8333-333333333333.pdf`;

let next = 0;
const ddt = (covers: readonly DocumentType[]): FiledDocument => ({
  id: `ddt${++next}`,
  type: DDT_TYPE,
  title: frSaleFile.types.ddt,
  createdAt: "2026-11-23T10:00:00Z",
  covers,
});
const filed = (type: DocumentType): FiledDocument => ({
  id: `d${++next}`,
  type,
  title: `${type}.pdf`,
  createdAt: "2026-11-23T10:00:00Z",
});
const lines = (checklist: Checklist) => checklist.groups.flatMap((group) => group.lines);
const line = (checklist: Checklist, type: DocumentType) =>
  lines(checklist).find((item) => item.type === type);
const group = (checklist: Checklist, category: string) =>
  checklist.groups.find((item) => item.category === category);
const stage = (checklist: Checklist, name: string) =>
  checklist.stages.find((item) => item.stage === name);

const flat = { type: "appartement", coOwnership: true } as const;
const house = { type: "maison", coOwnership: false } as const;
const FLAT_DIAGNOSTICS = ddtDiagnostics("appartement", true);
const HOUSE_DIAGNOSTICS = ddtDiagnostics("maison", false);

describe("the diagnostics a DDT may cover", () => {
  it("the diagnostic lines of the property, in the order of the checklist", () => {
    expect(FLAT_DIAGNOSTICS).toEqual([
      "dpe",
      "amiante",
      "plomb",
      "electricite",
      "gaz",
      "termites",
      "erp",
      "carrez",
    ]);
    expect(HOUSE_DIAGNOSTICS).toEqual([
      "dpe",
      "amiante",
      "plomb",
      "electricite",
      "gaz",
      "termites",
      "erp",
      "assainissement",
    ]);
    // A house in a co-ownership: its sanitation and its Carrez measurement.
    expect(ddtDiagnostics("maison", true)).toEqual([...HOUSE_DIAGNOSTICS, "carrez"]);
    expect(ddtDiagnostics("terrain")).toEqual(["erp"]);
    expect(ddtDiagnostics(null)).toEqual(HOUSE_DIAGNOSTICS);
    for (const type of Constants.public.Enums.property_type) {
      for (const covered of ddtDiagnostics(type, true)) {
        expect(DIAGNOSTIC_TYPES, covered).toContain(covered);
      }
    }
  });

  it("the DDT is a type of the database that is never a line, asked for or « Non concerné »", () => {
    expect(Constants.public.Enums.document_type).toContain(DDT_TYPE);
    expect(DOCUMENT_ORDER).not.toContain(DDT_TYPE);
    expect(DIAGNOSTIC_TYPES).not.toContain(DDT_TYPE);
    expect(EXEMPTIBLE_DOCUMENTS).not.toContain(DDT_TYPE);
    expect(OPTIONAL_DOCUMENTS).not.toContain(DDT_TYPE);
    for (const type of Constants.public.Enums.property_type) {
      expect(requiredDocuments(type, true)).not.toContain(DDT_TYPE);
    }
    expect(frSaleFile.types.ddt).toBe("Dossier de diagnostics (DDT)");
    // The deposit of one document never suggests it: the DDT has its own.
    expect(guessDocumentType("DDT_complet.pdf")).not.toBe(DDT_TYPE);
  });

  it("the constraint of the database names the same diagnostics", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20261123150100_ddt_coverage.sql"),
      "utf8",
    );
    const lists = [...sql.matchAll(/array\[([^\]]+)\]::public\.document_type\[\]/g)].map((match) =>
      [...match[1].matchAll(/'([a-z_]+)'/g)].map((name) => name[1]).sort(),
    );
    expect(lists.length).toBe(2);
    for (const list of lists) expect(list).toEqual([...DIAGNOSTIC_TYPES].sort());
  });
});

describe("the checklist with a DDT", () => {
  it("a co-owned flat, a DDT that covers every diagnostic: 8 lines provided, in every count", () => {
    const before = buildChecklist(flat, [], []);
    expect(before).toMatchObject({ done: 0, total: 18, ddt: [] });
    const file = ddt(FLAT_DIAGNOSTICS);
    const after = buildChecklist(flat, [file], []);
    // The notary file, the category and the stage move together; no total changes.
    expect(after).toMatchObject({ done: 8, total: 18, complete: false });
    expect(group(after, "property")).toMatchObject({ done: 8, total: 11 });
    expect(group(after, "coownership")).toMatchObject({ done: 0, total: 7 });
    expect(stage(after, "listing")).toMatchObject({
      done: 8,
      total: 9,
      missing: ["titre_propriete"],
    });
    expect(stage(after, "agreement")?.done).toBe(0);
    for (const type of FLAT_DIAGNOSTICS) {
      expect(line(after, type), type).toMatchObject({
        state: "filed",
        documents: [],
        coveredBy: [file],
        toRefresh: null,
      });
    }
    // The DDT is not a line: no line more, none of its type.
    expect(lines(after).map((item) => item.type)).toEqual(lines(before).map((item) => item.type));
    expect(after.ddt).toEqual([file]);
  });

  it("a DDT that covers some: only those lines, the others stay to file", () => {
    const file = ddt(["dpe", "amiante", "electricite"]);
    const checklist = buildChecklist(flat, [file], []);
    expect(checklist).toMatchObject({ done: 3, total: 18 });
    expect(line(checklist, "dpe")?.state).toBe("filed");
    expect(line(checklist, "plomb")).toMatchObject({ state: "missing", coveredBy: [] });
    expect(stage(checklist, "listing")?.missing).toEqual([
      "titre_propriete",
      "plomb",
      "gaz",
      "termites",
      "erp",
      "carrez",
    ]);
    expect(checklist.currentStage).toBe("listing");
  });

  it("a house: a DDT with its sanitation, and what it does not ask for changes nothing", () => {
    expect(buildChecklist(house, [], []).total).toBe(11);
    const all = buildChecklist(house, [ddt(HOUSE_DIAGNOSTICS)], []);
    expect(all).toMatchObject({ done: 8, total: 11 });
    expect(line(all, "assainissement")?.state).toBe("filed");
    // « carrez » ticked on a house outside a co-ownership: no line, no count.
    const more = buildChecklist(house, [ddt([...HOUSE_DIAGNOSTICS, "carrez"])], []);
    expect(more).toMatchObject({ done: 8, total: 11 });
    expect(line(more, "carrez")).toBeUndefined();
  });

  it("a DDT that covers nothing, or something that is no diagnostic, provides nothing", () => {
    expect(buildChecklist(flat, [ddt([])], [])).toMatchObject({ done: 0, total: 18 });
    // Whatever a row says: only a diagnostic is covered.
    const wrong = buildChecklist(flat, [ddt(["titre_propriete", "taxe_fonciere", "pv_ag"])], []);
    expect(wrong.done).toBe(0);
    expect(line(wrong, "titre_propriete")).toMatchObject({ state: "missing", coveredBy: [] });
    // And only a DDT covers: the `covers` of another document are not read.
    const notDdt = buildChecklist(flat, [{ ...filed("autre"), covers: ["dpe"] }], []);
    expect(line(notDdt, "dpe")?.state).toBe("missing");
  });

  it("removed, its lines go back to what they were: missing, or « Non concerné »", () => {
    const exemptions = [{ type: "gaz" as const, reason: "Pas d'installation de gaz" }];
    const own = filed("dpe");
    const withDdt = buildChecklist(flat, [own, ddt(FLAT_DIAGNOSTICS)], exemptions);
    expect(withDdt.done).toBe(8);
    // The DDT wins over « Non concerné », as a file of the line does.
    expect(line(withDdt, "gaz")).toMatchObject({
      state: "filed",
      reason: "Pas d'installation de gaz",
    });
    // A line with its own file and the DDT: both are kept, counted once.
    expect(line(withDdt, "dpe")).toMatchObject({ state: "filed", documents: [own] });
    expect(line(withDdt, "dpe")?.coveredBy).toHaveLength(1);
    const without = buildChecklist(flat, [own], exemptions);
    expect(without).toMatchObject({ done: 2, total: 18, ddt: [] });
    expect(line(without, "gaz")?.state).toBe("exempt");
    expect(line(without, "amiante")).toMatchObject({ state: "missing", coveredBy: [] });
  });

  it("the notary file is complete with a DDT for the diagnostics and the rest filed", () => {
    const rest = requiredDocuments("maison", false)
      .filter((type) => !DIAGNOSTIC_TYPES.includes(type))
      .map(filed);
    expect(buildChecklist(house, rest, []).complete).toBe(false);
    const complete = buildChecklist(house, [...rest, ddt(HOUSE_DIAGNOSTICS)], []);
    expect(complete).toMatchObject({ done: 11, total: 11, complete: true, currentStage: null });
    // One diagnostic unticked: no longer complete.
    const partial = buildChecklist(house, [...rest, ddt(HOUSE_DIAGNOSTICS.slice(1))], []);
    expect(partial).toMatchObject({ done: 10, complete: false });
  });

  it("« À actualiser » is never read from a DDT, only from the documents of the line", () => {
    const now = new Date("2026-11-23T12:00:00Z");
    const old = { ...ddt(["termites", "erp"]), documentDate: "2012-01-10" };
    const covered = buildChecklist(flat, [old], [], null, now);
    expect(line(covered, "termites")).toMatchObject({ state: "filed", toRefresh: null });
    const own = { ...filed("termites"), documentDate: "2012-01-10" };
    const both = buildChecklist(flat, [old, own], [], null, now);
    expect(line(both, "termites")?.toRefresh).toEqual({ date: "2012-01-10", months: 6 });
  });

  it("two DDT: a line is provided by either", () => {
    const first = ddt(["dpe", "amiante"]);
    const second = ddt(["amiante", "plomb"]);
    const checklist = buildChecklist(flat, [first, second], []);
    expect(checklist.done).toBe(3);
    expect(line(checklist, "amiante")?.coveredBy).toEqual([first, second]);
    expect(checklist.ddt).toEqual([first, second]);
  });
});

describe("what a seller sends about a DDT", () => {
  it("a DDT is filed with the diagnostics it covers: one at least, each once, diagnostics only", () => {
    const base = { propertyId: PROPERTY, path: PATH };
    expect(fileDdtSchema.safeParse({ ...base, covers: ["dpe", "amiante"] }).success).toBe(true);
    expect(fileDdtSchema.safeParse({ ...base, covers: [...DIAGNOSTIC_TYPES] }).success).toBe(true);
    expect(fileDdtSchema.safeParse({ ...base, covers: [] }).success).toBe(false);
    expect(fileDdtSchema.safeParse(base).success).toBe(false);
    expect(fileDdtSchema.safeParse({ ...base, covers: ["dpe", "dpe"] }).success).toBe(false);
    expect(fileDdtSchema.safeParse({ ...base, covers: ["titre_propriete"] }).success).toBe(false);
    expect(fileDdtSchema.safeParse({ ...base, covers: ["ddt"] }).success).toBe(false);
    expect(fileDdtSchema.safeParse({ ...base, covers: ["dpe", "inconnu"] }).success).toBe(false);
    expect(
      fileDdtSchema.safeParse({ ...base, path: "../autre.pdf", covers: ["dpe"] }).success,
    ).toBe(false);
  });

  it("the coverage of a DDT filed is changed the same way", () => {
    const base = { propertyId: PROPERTY, documentId: DOCUMENT };
    expect(ddtCoverageSchema.safeParse({ ...base, covers: ["erp"] }).success).toBe(true);
    expect(ddtCoverageSchema.safeParse({ ...base, covers: [] }).success).toBe(false);
    expect(ddtCoverageSchema.safeParse({ ...base, covers: ["pv_ag"] }).success).toBe(false);
    expect(
      ddtCoverageSchema.safeParse({ propertyId: PROPERTY, documentId: "x", covers: ["erp"] })
        .success,
    ).toBe(false);
  });

  it("the deposit of one document never files a DDT, and a DDT is never « Non concerné »", () => {
    const one = { propertyId: PROPERTY, path: PATH, title: "DDT" };
    expect(fileDocumentSchema.safeParse({ ...one, type: "dpe" }).success).toBe(true);
    expect(fileDocumentSchema.safeParse({ ...one, type: "ddt" }).success).toBe(false);
    // The schema knows the type; the action refuses it (EXEMPTIBLE_DOCUMENTS).
    expect(
      exemptionSchema.safeParse({ propertyId: PROPERTY, type: "ddt", reason: "Aucun" }).success,
    ).toBe(true);
    expect(EXEMPTIBLE_DOCUMENTS).not.toContain("ddt");
  });
});
