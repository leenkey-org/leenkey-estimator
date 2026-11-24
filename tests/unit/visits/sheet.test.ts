import { describe, expect, it, vi } from "vitest";
import { NO_ENERGY } from "@/leenkey/listings/energy-mentions";
import {
  buildVisitSheet,
  sheetAvailable,
  sheetShowsAddress,
  sheetVisitDate,
  visitSheetFileName,
  visitSheetPath,
  type SheetListing,
  type SheetVisit,
} from "@/leenkey/visits/sheet";
import { frEmails } from "@/lib/i18n/sections/emails";
import { frVisits } from "@/lib/i18n/sections/visits";

// The technical sheet of the property of a booked visit (DECISIONS.md
// 2026-11-24): who has one, who reads the exact address on it, and what it
// says: the listing page, only what has a value, never the number nor the
// date of the DPE.

vi.mock("server-only", () => ({}));

const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");

const flat: SheetListing = {
  reference: "LK-0001",
  title: "Appartement 3 pièces lumineux",
  priceCents: 28_500_000,
  city: "Savigny-sur-Orge",
  postalCode: "91600",
  type: "appartement",
  surfaceM2: 68,
  carrezM2: 66.4,
  rooms: 3,
  bedrooms: 2,
  floor: 2,
  floorsTotal: 4,
  hasElevator: true,
  hasBalcony: true,
  hasTerrace: false,
  hasGarden: false,
  hasParking: null,
  hasCellar: true,
  orientation: null,
  buildYear: 1998,
  isNewBuild: false,
  dpe: "D",
  ges: "C",
  heating: "Gaz, chauffage individuel",
  chargesMonthlyCents: 18_000,
  propertyTaxYearlyCents: 110_000,
  coproLots: 42,
  energy: {
    ...NO_ENERGY,
    costMinCents: 110_000,
    costMaxCents: 150_000,
    priceYear: 2023,
    kwhM2Year: 215,
    gesKgM2Year: 28,
  },
};

const visit: SheetVisit = {
  startsAt: "2026-11-28T09:30:00Z",
  endsAt: "2026-11-28T10:00:00Z",
  address: { line: "12 rue des Lilas", postalCode: "91600", city: "Savigny-sur-Orge" },
};

const NOW = new Date("2026-11-24T13:00:00Z");

/** Every row of the sheet, « label: value ». */
const rowsOf = (document: ReturnType<typeof buildVisitSheet>) =>
  document.sections.flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.kind === "rows" ? block.rows.map((row) => plain(`${row.label}: ${row.value}`)) : [],
    ),
  );

describe("who has the technical sheet of a visit", () => {
  it("a visit booked and not cancelled: confirmed or done", () => {
    expect(sheetAvailable("confirmed")).toBe(true);
    expect(sheetAvailable("done")).toBe(true);
    expect(sheetAvailable("cancelled")).toBe(false);
    expect(sheetAvailable("requested")).toBe(false);
  });

  it("the exact address as on the page of the visit: the seller, the buyer while it is confirmed", () => {
    expect(sheetShowsAddress("seller", "confirmed")).toBe(true);
    expect(sheetShowsAddress("seller", "done")).toBe(true);
    expect(sheetShowsAddress("buyer", "confirmed")).toBe(true);
    expect(sheetShowsAddress("buyer", "done")).toBe(false);
    expect(sheetShowsAddress("buyer", "cancelled")).toBe(false);
    expect(sheetShowsAddress("admin", "confirmed")).toBe(false);
  });

  it("its address on the site and the name of its file", () => {
    expect(visitSheetPath("v1")).toBe("/visites/v1/fiche-technique");
    expect(visitSheetFileName("LK-0001")).toBe("fiche-technique-LK-0001.pdf");
    // Nothing that would break the header of the response.
    expect(visitSheetFileName('LK"\r\n0002')).toBe("fiche-technique-LK0002.pdf");
  });
});

describe("what the technical sheet says", () => {
  it("the property, the visit with its year, then the characteristics of the listing page", () => {
    const document = buildVisitSheet(flat, visit, NOW);
    expect(document.title).toBe("FICHE TECHNIQUE DU BIEN");
    expect(document.meta.map(plain)).toEqual([
      "Référence de l'annonce : LK-0001",
      "Fiche établie le 24/11/2026 à 14:00",
    ]);
    expect(document.footer).toBe("LK-0001 · Fiche technique");
    expect(document.sections.map((section) => `${section.number}. ${section.title}`)).toEqual([
      "1. Le bien",
      "2. La visite",
      "3. Caractéristiques",
      "4. Énergie",
      "5. Coûts et copropriété",
    ]);
    const rows = rowsOf(document);
    expect(rows).toEqual(
      expect.arrayContaining([
        "Annonce: Appartement 3 pièces lumineux",
        "Référence: LK-0001",
        "Prix: 285 000 €",
        "Commune: 91600 Savigny-sur-Orge",
        "Date et heure: Samedi 28 novembre 2026 à 10 h 30 (10 h 30 – 11 h)",
        "Adresse: 12 rue des Lilas, 91600 Savigny-sur-Orge",
        "Chauffage: Gaz, chauffage individuel",
      ]),
    );
    const text = rows.join("\n");
    expect(text).toMatch(/68 m²/);
    expect(text).toMatch(/1998/);
    expect(text).toMatch(/42/);
    expect(text).toMatch(/180 € \/ mois/);
    // The figures of the DPE as the listing gives them, beside the classes.
    expect(text).toMatch(/D · 215 kWh/);
    expect(text).toMatch(/C · 28 kg/);
  });

  it("only what has a value: no « Non renseigné », no row waiting for a document", () => {
    const text = rowsOf(buildVisitSheet(flat, visit, NOW)).join("\n");
    expect(text).not.toContain("Non renseigné");
    expect(text).not.toMatch(/Orientation|Travaux votés|Procédures/);
    for (const section of buildVisitSheet(flat, visit, NOW).sections) {
      expect(section.blocks.every((block) => block.kind !== "rows" || block.rows.length > 0)).toBe(
        true,
      );
    }
  });

  it("without the address for who does not read it on the page of the visit", () => {
    const document = buildVisitSheet(flat, { ...visit, address: null }, NOW);
    const text = JSON.stringify(document);
    expect(text).not.toContain("rue des Lilas");
    expect(rowsOf(document).some((row) => row.startsWith("Adresse"))).toBe(false);
    expect(rowsOf(document)).toContain("Commune: 91600 Savigny-sur-Orge");
  });

  it("the figures of the DPE only when the listing has them (dpe_rules.figures_public)", () => {
    const text = rowsOf(
      buildVisitSheet(
        { ...flat, energy: { ...flat.energy, kwhM2Year: null, gesKgM2Year: null } },
        visit,
        NOW,
      ),
    ).join("\n");
    expect(text).not.toMatch(/kWh|kg CO/);
    expect(text).toMatch(/: D$/m);
  });

  it("the regulatory mentions of the listing page as its notice, and where it comes from", () => {
    const { notice } = buildVisitSheet(
      { ...flat, dpe: "F", energy: { ...flat.energy, excessive: true } },
      visit,
      NOW,
    );
    expect(notice.title).toBe("Informations réglementaires");
    const text = notice.paragraphs.map(plain);
    expect(text[0]).toBe("Logement à consommation énergétique excessive.");
    expect(text[1]).toContain("entre 1 100 € et 1 500 € par an");
    expect(text[2]).toContain("www.georisques.gouv.fr");
    expect(text[3]).toContain("l'annonce en ligne sur Leenkey");
    // Land: the link to Géorisques and the source only.
    const land = buildVisitSheet({ ...flat, type: "terrain" }, visit, NOW);
    expect(land.notice.paragraphs).toHaveLength(2);
    expect(land.sections.map((section) => section.title)).toEqual([
      "Le bien",
      "La visite",
      "Caractéristiques",
      "Coûts",
    ]);
  });

  it("never the number nor the date of the DPE, never a contact detail", () => {
    // The sheet has no field for them: what the listing type does not carry cannot be written.
    const text = JSON.stringify(buildVisitSheet(flat, visit, NOW));
    expect(text).not.toMatch(/numéro|N° ADEME|établi le \d|@|téléphone/i);
  });

  it("writes the date of the visit in Paris, with its year", () => {
    expect(plain(sheetVisitDate("2027-01-02T13:00:00Z", "2027-01-02T13:45:00Z"))).toBe(
      "Samedi 2 janvier 2027 à 14 h (14 h – 14 h 45)",
    );
  });

  it("draws a PDF with the renderer of the offer", async () => {
    const { renderOfferPdf } = await import("@/leenkey/offers/pdf");
    const pdf = await renderOfferPdf(buildVisitSheet(flat, visit, NOW));
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5000);
  }, 30_000);

  it("its texts follow the editorial rules", () => {
    const texts = JSON.stringify([frVisits.sheet, frVisits.visit.sheet, frEmails.visit.booked]);
    expect(texts).not.toMatch(/\bon\b|estimation|Prix ferme|ouvrées/i);
    expect(frVisits.visit.sheet).toBe("Fiche technique du bien (PDF)");
    expect(frEmails.visit.booked.sheetLink).toBe("Fiche technique du bien (PDF)");
  });
});
