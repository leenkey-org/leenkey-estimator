import { describe, expect, it } from "vitest";
import {
  floorLabel,
  highlights,
  listingHref,
  placeLabel,
  publishedNote,
  toPropertyCard,
} from "@/leenkey/search/cards";
import {
  bedroomsLabel,
  budgetLabel,
  dpeLabel,
  outdoorLabel,
  roomsLabel,
  surfaceLabel,
} from "@/leenkey/search/filter-labels";
import { filtersFromForm, formFromFilters, wholeNumberInput } from "@/leenkey/search/filters-form";
import type { SearchListing } from "@/leenkey/search/queries";
import { fr } from "@/lib/i18n/fr";
import { SearchFilters } from "@/lib/validations/search";

// Spaces of the French number format (lib/format.ts).
const plain = (value: string | undefined) => value?.replace(/[\u00A0\u202F]/g, " ");

describe("filters panel", () => {
  it("turns the typed values into filters, in cents", () => {
    const form = formFromFilters({});
    const { filters, errors } = filtersFromForm(
      {
        ...form,
        radius: "5",
        type: "maison",
        priceMin: "200 000",
        priceMax: "450000",
        surfaceMin: "90",
        roomsMin: "4",
        bedroomsMin: "3",
        outdoor: ["jardin", "balcon"],
        parking: true,
        dpeMax: "D",
      },
      { location: "epinay-sur-orge" },
    );
    expect(errors).toEqual({});
    expect(filters).toEqual({
      location: "epinay-sur-orge",
      radiusKm: 5,
      type: "maison",
      priceMinCents: 20_000_000,
      priceMaxCents: 45_000_000,
      surfaceMin: 90,
      roomsMin: 4,
      bedroomsMin: 3,
      outdoor: ["balcon", "jardin"],
      parking: true,
      dpeMax: "D",
    });
    expect(SearchFilters.safeParse(filters).success).toBe(true);
  });

  it("gives back the same filters after a round trip, and no undefined keys", () => {
    const filters: SearchFilters = {
      location: "91600",
      radiusKm: 10,
      priceMaxCents: 30_000_000,
      surfaceMax: 70,
      elevator: true,
    };
    const result = filtersFromForm(formFromFilters(filters), filters).filters;
    expect(result).toEqual(filters);
    expect(Object.values(result).some((value) => value === undefined)).toBe(false);
  });

  it("drops the radius without a commune and « Ville seule »", () => {
    expect(filtersFromForm({ ...formFromFilters({}), radius: "5" }, {}).filters).toEqual({});
    expect(
      filtersFromForm(formFromFilters({ location: "grigny" }), { location: "grigny" }).filters,
    ).toEqual({ location: "grigny" });
  });

  it("reports a minimum above its maximum", () => {
    const form = { ...formFromFilters({}), priceMin: "400000", priceMax: "300000" };
    expect(filtersFromForm(form, {}).errors).toEqual({ price: true });
    const surface = { ...formFromFilters({}), surfaceMin: "90", surfaceMax: "40" };
    expect(filtersFromForm(surface, {}).errors).toEqual({ surface: true });
  });

  it("reads whole numbers typed with spaces, 0 and empty mean no limit", () => {
    expect(wholeNumberInput("400 000")).toBe(400_000);
    expect(wholeNumberInput("1\u202F250")).toBe(1_250);
    expect(wholeNumberInput("")).toBeUndefined();
    expect(wholeNumberInput("0")).toBeUndefined();
    expect(wholeNumberInput("abc")).toBeUndefined();
  });
});

describe("chip labels", () => {
  it("shortens the active filters", () => {
    expect(plain(budgetLabel({ priceMaxCents: 40_000_000 }))).toBe("≤ 400 k€");
    expect(plain(budgetLabel({ priceMinCents: 20_000_000 }))).toBe("≥ 200 k€");
    expect(plain(budgetLabel({ priceMinCents: 20_000_000, priceMaxCents: 125_000_000 }))).toBe(
      "200 k€ – 1,25 M€",
    );
    expect(budgetLabel({})).toBeUndefined();
    expect(plain(surfaceLabel({ surfaceMin: 60 }))).toBe("≥ 60 m²");
    expect(plain(surfaceLabel({ surfaceMin: 60, surfaceMax: 120 }))).toBe("60 – 120 m²");
    expect(plain(roomsLabel({ roomsMin: 3 }))).toBe("3 pièces +");
    expect(roomsLabel({ roomsMin: 1 })).toBe("1 pièce +");
    expect(plain(bedroomsLabel({ bedroomsMin: 2 }))).toBe("2 chambres +");
    expect(dpeLabel({ dpeMax: "D" })).toBe("DPE A à D");
    expect(dpeLabel({ dpeMax: "A" })).toBe("DPE A");
  });

  it("names the outdoor spaces chosen", () => {
    expect(outdoorLabel({})).toBe("Extérieur");
    expect(outdoorLabel({ outdoor: ["balcon", "terrasse", "jardin"] })).toBe("Extérieur");
    expect(outdoorLabel({ outdoor: ["jardin"] })).toBe("Jardin");
    expect(outdoorLabel({ outdoor: ["balcon", "terrasse"] })).toBe("Balcon, terrasse");
  });
});

const flat: SearchListing = {
  id: "623efc8b-97d4-4902-ac43-406417498893",
  slug: "appartement-3-pieces-savigny-sur-orge-lk0005",
  title: "Appartement 3 pièces avec balcon, proche gare",
  priceCents: 23_900_000,
  publishedAt: "2026-10-04T08:00:00Z",
  type: "appartement",
  city: "Savigny-sur-Orge",
  postalCode: "91600",
  district: "centre",
  lat: 48.681,
  lng: 2.35,
  surfaceM2: 68,
  rooms: 3,
  bedrooms: 2,
  floor: 2,
  hasElevator: true,
  hasBalcony: true,
  hasTerrace: false,
  hasGarden: false,
  hasParking: true,
  hasCellar: true,
  dpe: "D",
};

describe("search cards", () => {
  const now = new Date("2026-10-16T10:00:00Z");

  it("dates the publication in calendar days, in Paris", () => {
    expect(publishedNote("2026-10-16T05:00:00Z", now)).toBe("Publié aujourd'hui");
    // 23:30 in Paris on the 15th is yesterday, even 10 hours before.
    expect(publishedNote("2026-10-15T21:30:00Z", now)).toBe("Publié hier");
    expect(plain(publishedNote("2026-10-13T10:00:00Z", now))).toBe("Publié il y a 3 jours");
    expect(publishedNote("2026-10-04T08:00:00Z", now)).toBe("Publié le 4 oct.");
    expect(publishedNote(null, now)).toBeUndefined();
  });

  it("describes the floor of a flat only", () => {
    expect(floorLabel(flat)).toBe("2e étage avec ascenseur");
    expect(floorLabel({ ...flat, floor: 1, hasElevator: false })).toBe("1er étage");
    expect(floorLabel({ ...flat, floor: 0 })).toBe(fr.search.card.groundFloor);
    expect(floorLabel({ ...flat, floor: null })).toBeUndefined();
    expect(floorLabel({ ...flat, type: "maison" })).toBeUndefined();
  });

  it("keeps three strengths", () => {
    expect(highlights(flat).map(plain)).toEqual(["2 chambres", "Balcon", "Stationnement"]);
    expect(highlights({ ...flat, bedrooms: 0, hasBalcony: false })).toEqual([
      "Stationnement",
      "Cave",
    ]);
  });

  it("builds the card of a result", () => {
    const card = toPropertyCard(flat, now);
    expect(card).toMatchObject({
      href: listingHref(flat.slug),
      priceCents: 23_900_000,
      propertyType: "appartement",
      rooms: 3,
      surfaceM2: 68,
      locationDetail: "2e étage avec ascenseur",
      dpe: "D",
      photo: null,
      note: { text: "Publié le 4 oct." },
    });
    expect(plain(card.location)).toBe("Savigny-sur-Orge · centre");
    expect(placeLabel("Grigny", null)).toBe("Grigny");
    expect(toPropertyCard({ ...flat, type: "terrain", rooms: 0 }, now).rooms).toBeNull();
  });
});
