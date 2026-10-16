import { describe, expect, it } from "vitest";
import { listingKeyFacts } from "@/leenkey/listings/key-facts";
import {
  buyerSignUpHref,
  communeSearchHref,
  listingJsonLd,
  listingKeyFigures,
  listingMetaDescription,
  listingMetaTitle,
  listingSummary,
  serializeJsonLd,
} from "@/leenkey/listings/presentation";
import type { PublicListing } from "@/leenkey/listings/queries";
import {
  VIEW_COOKIE_MAX,
  parisDay,
  readViewCookie,
  writeViewCookie,
} from "@/leenkey/listings/view-cookie";

const plain = (value: unknown) => String(value).replace(/[\u00A0\u202F]/g, " ");

const flat: PublicListing = {
  id: "623efc8b-97d4-4902-ac43-406417498893",
  slug: "appartement-3-pieces-savigny-sur-orge-lk0005",
  reference: "LK-0005",
  title: "Appartement 3 pièces avec balcon, proche gare",
  description: "Au 2e étage avec ascenseur d'une résidence calme, appartement traversant.",
  priceCents: 35_000_000,
  publishedAt: "2026-10-04T08:00:00Z",
  type: "appartement",
  city: "Savigny-sur-Orge",
  postalCode: "91600",
  district: "centre",
  surfaceM2: 68,
  carrezM2: 66.5,
  rooms: 3,
  bedrooms: 2,
  floor: 2,
  floorsTotal: 4,
  hasElevator: true,
  hasBalcony: true,
  hasTerrace: false,
  hasGarden: false,
  hasParking: true,
  hasCellar: true,
  orientation: "Sud-ouest",
  buildYear: 1972,
  isNewBuild: false,
  dpe: "D",
  ges: "D",
  heating: "Collectif gaz",
  chargesMonthlyCents: 21_000,
  propertyTaxYearlyCents: 115_000,
  coproLots: 48,
  sellerFirstName: "Alice",
  accompanied: true,
};

const land: PublicListing = {
  ...flat,
  type: "terrain",
  title: "Terrain à bâtir de 620 m², viabilisé",
  surfaceM2: 620,
  carrezM2: null,
  rooms: 0,
  bedrooms: null,
  floor: null,
  floorsTotal: null,
  hasElevator: null,
  hasBalcony: null,
  hasTerrace: null,
  hasGarden: null,
  hasParking: null,
  hasCellar: null,
  orientation: null,
  buildYear: null,
  dpe: null,
  ges: null,
  heating: null,
  chargesMonthlyCents: null,
  propertyTaxYearlyCents: 45_000,
  coproLots: null,
};

describe("listing page texts", () => {
  it("writes the title of SPEC 8.5", () => {
    expect(plain(listingMetaTitle(flat))).toBe(
      "Appartement 3 pièces 68 m² à Savigny-sur-Orge · 350 000 € · Leenkey",
    );
    expect(plain(listingMetaTitle({ ...land, city: "Montlhéry", priceCents: 18_900_000 }))).toBe(
      "Terrain 620 m² à Montlhéry · 189 000 € · Leenkey",
    );
    expect(plain(listingMetaTitle({ ...flat, type: "maison", rooms: 1, surfaceM2: 30 }))).toBe(
      "Maison 1 pièce 30 m² à Savigny-sur-Orge · 350 000 € · Leenkey",
    );
  });

  it("summarises the property", () => {
    expect(plain(listingSummary(flat))).toBe("Appartement 3 pièces · 68 m²");
    expect(plain(listingSummary(land))).toBe("Terrain · 620 m²");
  });

  it("cuts the meta description on a word", () => {
    expect(listingMetaDescription("Court.")).toBe("Court.");
    const long = `${"Séjour lumineux et calme ".repeat(10)}fin`;
    const description = listingMetaDescription(long);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith("…")).toBe(true);
    expect(description).not.toMatch(/\s…$/);
  });

  it("links to the sign-up of a buyer, back to the listing", () => {
    expect(buyerSignUpHref(flat.slug)).toBe(
      "/inscription?role=buyer&next=%2Fannonce%2Fappartement-3-pieces-savigny-sur-orge-lk0005",
    );
    expect(communeSearchHref("Viry-Châtillon")).toBe("/acheter?ville=viry-chatillon");
  });
});

describe("key figures", () => {
  it("shows surface, rooms, bedrooms, floor, orientation and year of a flat", () => {
    expect(
      listingKeyFigures(flat).map((figure) => `${plain(figure.value)} ${figure.label}`),
    ).toEqual([
      "68 m² surface",
      "3 pièces",
      "2 chambres",
      "2e étage",
      "Sud-ouest exposition",
      "1972 construction",
    ]);
  });

  it("shows the levels of a house, the ground floor, and leaves unknown values out", () => {
    const house = { ...flat, type: "maison" as const, floorsTotal: 2, orientation: null };
    expect(listingKeyFigures(house).map((figure) => figure.label)).toEqual([
      "surface",
      "pièces",
      "chambres",
      "niveaux",
      "construction",
    ]);
    expect(listingKeyFigures({ ...flat, floor: 0 })[3].value).toBe("RDC");
    expect(listingKeyFigures({ ...flat, bedrooms: 1 })[2].label).toBe("chambre");
  });

  it("only gives the surface of a plot of land", () => {
    expect(
      listingKeyFigures(land).map((figure) => `${plain(figure.value)} ${figure.label}`),
    ).toEqual(["620 m² terrain"]);
  });
});

describe("Ce que vous savez avant de visiter", () => {
  const facts = (listing: PublicListing) =>
    Object.fromEntries(listingKeyFacts(listing).map((fact) => [fact.label, plain(fact.value)]));

  it("lists the characteristics of a flat, « Non renseigné » for the rest", () => {
    expect(facts(flat)).toEqual({
      "Charges de copropriété": "210 € / mois",
      "Taxe foncière": "1 150 € / an",
      "Classe énergie (DPE)": "D",
      "Émissions (GES)": "D",
      Chauffage: "Collectif gaz",
      "Type de bien": "Appartement",
      "Surface habitable": "68 m²",
      "Surface Carrez": "66,5 m²",
      Pièces: "3",
      Chambres: "2",
      Étage: "2e sur 4",
      Ascenseur: "Oui",
      Exposition: "Sud-ouest",
      Construction: "1972",
      Extérieur: "Balcon",
      Stationnement: "Oui",
      Cave: "Oui",
      "Lots de copropriété": "48",
      "Travaux votés": "Non renseigné",
      "Procédures en cours": "Non renseigné",
    });
    const muted = listingKeyFacts(flat).filter((fact) => fact.tone === "muted");
    expect(muted.map((fact) => fact.label)).toEqual(["Travaux votés", "Procédures en cours"]);
  });

  it("says « Non renseigné » for unknown values and « Aucun » for no outdoor space", () => {
    const unknown = facts({
      ...flat,
      chargesMonthlyCents: null,
      hasElevator: null,
      hasBalcony: false,
      floorsTotal: null,
      buildYear: null,
      isNewBuild: true,
    });
    expect(unknown["Charges de copropriété"]).toBe("Non renseigné");
    expect(unknown.Ascenseur).toBe("Non renseigné");
    expect(unknown.Extérieur).toBe("Aucun");
    expect(unknown.Étage).toBe("2e");
    expect(unknown.Construction).toBe("Neuf");
  });

  it("keeps the co-ownership rows for a house only when it has some", () => {
    const house = facts({ ...flat, type: "maison", chargesMonthlyCents: null, coproLots: null });
    expect(house).not.toHaveProperty("Charges de copropriété");
    expect(house).not.toHaveProperty("Travaux votés");
    expect(house).not.toHaveProperty("Ascenseur");
    expect(house.Niveaux).toBe("4");
  });

  it("keeps a plot of land short", () => {
    expect(facts(land)).toEqual({
      "Taxe foncière": "450 € / an",
      "Type de bien": "Terrain",
      "Surface du terrain": "620 m²",
    });
  });
});

describe("structured data", () => {
  const url = "https://leenkey.fr/annonce/appartement-3-pieces-savigny-sur-orge-lk0005";
  const image = "https://leenkey.fr/api/og/appartement-3-pieces-savigny-sur-orge-lk0005";

  it("describes a RealEstateListing with its Offer, without street address", () => {
    const data = listingJsonLd(flat, url, image);
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: flat.title,
      url,
      image,
      datePosted: flat.publishedAt,
      offers: {
        "@type": "Offer",
        price: 350_000,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        itemOffered: {
          "@type": "Apartment",
          numberOfRooms: 3,
          numberOfBedrooms: 2,
          floorSize: { "@type": "QuantitativeValue", value: 68, unitCode: "MTK" },
          address: {
            "@type": "PostalAddress",
            addressLocality: "Savigny-sur-Orge",
            postalCode: "91600",
            addressCountry: "FR",
          },
        },
      },
    });
    expect(JSON.stringify(data)).not.toContain("streetAddress");
    expect(listingJsonLd(land, url, image).offers.itemOffered["@type"]).toBe("Place");
  });

  it("cannot close its script tag", () => {
    const json = serializeJsonLd({ description: "</script><script>alert(1)</script>" });
    expect(json).not.toContain("<");
    expect(JSON.parse(json).description).toBe("</script><script>alert(1)</script>");
  });
});

describe("view cookie", () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  it("keeps the listings counted today only", () => {
    const today = "2026-10-16";
    const value = writeViewCookie(today, [id(1), id(2), id(1)]);
    expect(value).toBe(`2026-10-16_${id(1)}.${id(2)}`);
    expect(readViewCookie(value, today)).toEqual([id(1), id(2)]);
    expect(readViewCookie(value, "2026-10-17")).toEqual([]);
    expect(readViewCookie("garbage", today)).toEqual([]);
    expect(readViewCookie(`${today}_not-an-id.${id(3)}`, today)).toEqual([id(3)]);
    expect(readViewCookie(undefined, today)).toEqual([]);
  });

  it("forgets the oldest listings beyond the limit", () => {
    const ids = Array.from({ length: VIEW_COOKIE_MAX + 5 }, (_, n) => id(n));
    const kept = readViewCookie(writeViewCookie("2026-10-16", ids), "2026-10-16");
    expect(kept).toHaveLength(VIEW_COOKIE_MAX);
    expect(kept[0]).toBe(id(5));
    expect(writeViewCookie("2026-10-16", ids).length).toBeLessThan(4_000);
  });

  it("counts days in Paris", () => {
    expect(parisDay(new Date("2026-10-15T22:30:00Z"))).toBe("2026-10-16");
    expect(parisDay(new Date("2026-10-15T21:30:00Z"))).toBe("2026-10-15");
  });
});
