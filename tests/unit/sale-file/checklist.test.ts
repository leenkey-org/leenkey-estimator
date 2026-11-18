import { describe, expect, it } from "vitest";
import {
  buildChecklist,
  sniffSaleFile,
  type Exemption,
  type FiledDocument,
} from "@/leenkey/sale-file/checklist";
import {
  EXEMPTIBLE_DOCUMENTS,
  REQUIRED_DOCUMENTS,
  type DocumentType,
} from "@/lib/config/documents";

// L3-04: the checklist of the sale file (SPEC-V2 15), from the type of the
// property, its documents and its « Non concerné »; and what the first bytes
// of a file say it is.

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

function line(checklist: ReturnType<typeof buildChecklist>, type: DocumentType) {
  return checklist.groups.flatMap((group) => group.lines).find((item) => item.type === type);
}

describe("buildChecklist", () => {
  it("counts the notary file of each type of property", () => {
    expect(buildChecklist("appartement", [], [])).toMatchObject({
      done: 0,
      total: 16,
      complete: false,
    });
    expect(buildChecklist("maison", [], []).total).toBe(11);
    expect(buildChecklist("terrain", [], []).total).toBe(4);
    // No list of its own, or no type yet: the one of a house.
    expect(buildChecklist("autre", [], []).total).toBe(11);
    expect(buildChecklist(null, [], []).total).toBe(11);
  });

  it("groups the lines by category, in the order of the list, each missing at first", () => {
    const flat = buildChecklist("appartement", [], []);
    expect(flat.groups.map((group) => group.category)).toEqual([
      "diagnostics",
      "ownership",
      "coownership",
    ]);
    expect(flat.groups.map((group) => group.lines.length)).toEqual([8, 2, 6]);
    expect(flat.groups.flatMap((group) => group.lines).map((item) => item.type)).toEqual(
      REQUIRED_DOCUMENTS.appartement,
    );
    for (const item of flat.groups.flatMap((group) => group.lines)) {
      expect(item).toMatchObject({ required: true, state: "missing", documents: [], reason: null });
    }
    expect(buildChecklist("maison", [], []).groups.map((group) => group.category)).toEqual([
      "diagnostics",
      "ownership",
      "works",
    ]);
    expect(buildChecklist("terrain", [], []).groups.map((group) => group.category)).toEqual([
      "diagnostics",
      "ownership",
    ]);
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
        // Not in the list of a house at all.
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
  });

  it("the lines that may be « Non concerné » are the exemptible ones of the list", () => {
    for (const type of ["appartement", "maison", "terrain", "autre"] as const) {
      const lines = buildChecklist(type, [], []).groups.flatMap((group) => group.lines);
      expect(lines.filter((item) => item.exemptible).map((item) => item.type)).toEqual(
        REQUIRED_DOCUMENTS[type].filter((item) => EXEMPTIBLE_DOCUMENTS.includes(item)),
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
    expect(checklist.groups.map((group) => group.category)).toEqual([
      "diagnostics",
      "ownership",
      "coownership",
      "other",
    ]);
    // After the mandatory ones of its category.
    expect(checklist.groups[0].lines.map((item) => item.type)).toEqual(["erp", "dpe"]);
    expect(line(checklist, "dpe")).toMatchObject({ required: false, state: "filed" });
    expect(line(checklist, "pv_ag")).toMatchObject({
      required: false,
      exemptible: false,
      state: "filed",
      reason: null,
    });
    expect(line(checklist, "autre")?.documents.map((item) => item.title)).toEqual([
      "Plan.pdf",
      "Notice.pdf",
    ]);
  });

  it("is complete when every mandatory document is filed or « Non concerné »", () => {
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

    const flat = buildChecklist(
      "appartement",
      REQUIRED_DOCUMENTS.appartement
        .filter((type) => !EXEMPTIBLE_DOCUMENTS.includes(type))
        .map((type) => filed(type)),
      REQUIRED_DOCUMENTS.appartement
        .filter((type) => EXEMPTIBLE_DOCUMENTS.includes(type))
        .map((type) => exempt(type)),
    );
    expect(flat).toMatchObject({ done: 16, total: 16, complete: true });
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
