import { describe, expect, it } from "vitest";
import {
  floorLabel,
  highlights,
  listingHref,
  placeLabel,
  publishedNote,
  toPropertyCard,
  toShowcaseCard,
} from "@/leenkey/search/cards";
import { categoryOn, toggleCategory } from "@/leenkey/search/categories";
import { activeChips, budgetLabel } from "@/leenkey/search/filter-labels";
import {
  BUDGET_CAP_EUROS,
  budgetError,
  budgetFromThumbs,
  budgetPreset,
  budgetThumbs,
  filtersFromForm,
  formFromFilters,
  wholeNumberInput,
} from "@/leenkey/search/filters-form";
import { groupPhotos } from "@/leenkey/search/photos";
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
    expect(filtersFromForm(form, {}).errors).toEqual({ price: "minAboveMax" });
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

describe("budget label", () => {
  it("shortens the budget of the bar", () => {
    expect(plain(budgetLabel({ priceMaxCents: 40_000_000 }))).toBe("≤ 400 k€");
    expect(plain(budgetLabel({ priceMinCents: 20_000_000 }))).toBe("≥ 200 k€");
    expect(plain(budgetLabel({ priceMinCents: 20_000_000, priceMaxCents: 125_000_000 }))).toBe(
      "200 k€ – 1,25 M€",
    );
    expect(budgetLabel({})).toBeUndefined();
  });
});

describe("categories under the bar", () => {
  it("presses a type, the garden or the parking, keeping the other filters", () => {
    const base = { priceMaxCents: 40_000_000, roomsMin: 3 };
    expect(categoryOn("all", base)).toBe(true);
    const houses = toggleCategory("maison", base);
    expect(houses).toEqual({ ...base, type: "maison" });
    expect(categoryOn("maison", houses)).toBe(true);
    expect(categoryOn("all", houses)).toBe(false);
    // Another type replaces it; pressed again, it goes.
    expect(toggleCategory("appartement", houses).type).toBe("appartement");
    expect(toggleCategory("maison", houses).type).toBeUndefined();

    const parking = toggleCategory("parking", houses);
    expect(parking.parking).toBe(true);
    expect(toggleCategory("parking", parking).parking).toBeUndefined();
  });

  it("« Avec jardin » is the garden alone: it never widens an OR of outdoor spaces", () => {
    // A balcony chosen in « Filtres »: the garden replaces it, never adds to it.
    const balcony: SearchFilters = { outdoor: ["balcon"] };
    expect(categoryOn("jardin", balcony)).toBe(false);
    expect(toggleCategory("jardin", balcony).outdoor).toEqual(["jardin"]);
    // Any outdoor space (the three): not « Avec jardin ».
    expect(categoryOn("jardin", { outdoor: ["balcon", "terrasse", "jardin"] })).toBe(false);
    const garden = toggleCategory("jardin", {});
    expect(categoryOn("jardin", garden)).toBe(true);
    expect(toggleCategory("jardin", garden).outdoor).toBeUndefined();
  });

  it("« Tous les biens » clears the type, the garden alone and the parking, nothing else", () => {
    const filters: SearchFilters = {
      type: "maison",
      outdoor: ["jardin"],
      parking: true,
      priceMaxCents: 40_000_000,
    };
    expect(toggleCategory("all", filters)).toEqual({
      type: undefined,
      outdoor: undefined,
      parking: undefined,
      priceMaxCents: 40_000_000,
    });
    // A terrace and a garden chosen in « Filtres » stay: removing one would narrow.
    expect(
      toggleCategory("all", { type: "maison", outdoor: ["terrasse", "jardin"] }).outdoor,
    ).toEqual(["terrasse", "jardin"]);
    // On already: the same filters, nothing to navigate to.
    const plain = { roomsMin: 3 };
    expect(toggleCategory("all", plain)).toBe(plain);
    // « Autre bien » has no category: « Tous les biens » is not on, and clears it.
    expect(categoryOn("all", { type: "autre" })).toBe(false);
    expect(toggleCategory("all", { type: "autre" }).type).toBeUndefined();
  });
});

describe("active filters of a phone", () => {
  it("lists what no category shows, each with the filters without it", () => {
    const filters: SearchFilters = {
      type: "maison",
      priceMaxCents: 40_000_000,
      roomsMin: 3,
      outdoor: ["jardin"],
      parking: true,
      dpeMax: "D",
      elevator: true,
    };
    const chips = activeChips(filters);
    expect(chips.map((chip) => plain(chip.label))).toEqual([
      "≤ 400 k€",
      "3 pièces +",
      "Ascenseur",
      "DPE A à D",
    ]);
    expect(chips[0]?.without.priceMaxCents).toBeUndefined();
    expect(chips[0]?.without.roomsMin).toBe(3);
    // An outdoor space other than the garden alone, « Autre bien », the surface.
    expect(
      activeChips({ type: "autre", outdoor: ["balcon", "terrasse"], surfaceMin: 60 }).map((chip) =>
        plain(chip.label),
      ),
    ).toEqual(["Autre bien", "≥ 60 m²", "Balcon, terrasse"]);
    expect(activeChips({})).toEqual([]);
  });
});

describe("budget slider", () => {
  it("places the thumbs, an amount beyond the top at the top", () => {
    expect(budgetThumbs({ min: "", max: "" })).toEqual([0, BUDGET_CAP_EUROS]);
    expect(budgetThumbs({ min: "200 000", max: "400000" })).toEqual([200_000, 400_000]);
    expect(budgetThumbs({ min: "", max: "2000000" })).toEqual([0, BUDGET_CAP_EUROS]);
    expect(budgetThumbs({ min: "2000000", max: "" })).toEqual([BUDGET_CAP_EUROS, BUDGET_CAP_EUROS]);
  });

  it("writes only the side that moved, an end meaning no limit", () => {
    // The maximum typed beyond the top stays while the minimum moves.
    const typed = { min: "", max: "2000000" };
    expect(budgetFromThumbs(typed, [100_000, BUDGET_CAP_EUROS])).toEqual({
      min: "100\u202F000",
      max: "2000000",
    });
    expect(budgetFromThumbs({ min: "", max: "" }, [0, 495_000])).toEqual({
      min: "",
      max: "495\u202F000",
    });
    expect(budgetFromThumbs({ min: "100000", max: "300000" }, [0, 300_000])).toEqual({
      min: "",
      max: "300000",
    });
    expect(budgetFromThumbs({ min: "", max: "300000" }, [0, BUDGET_CAP_EUROS])).toEqual({
      min: "",
      max: "",
    });
  });

  it("keeps the minimum under a usual budget, and tells an amount out of reach", () => {
    expect(budgetPreset({ min: "150000", max: "" }, 300_000)).toEqual({
      min: "150000",
      max: "300\u202F000",
    });
    expect(budgetPreset({ min: "350000", max: "" }, 300_000).min).toBe("");
    expect(budgetError({ min: "400000", max: "300000" })).toBe("minAboveMax");
    expect(budgetError({ min: "", max: "2000000000" })).toBe("tooHigh");
    expect(budgetError({ min: "", max: "1000000000" })).toBeUndefined();
    const form = { ...formFromFilters({}), priceMax: "5 000 000 000" };
    expect(filtersFromForm(form, {}).errors).toEqual({ price: "tooHigh" });
  });
});

const flat: SearchListing = {
  cover: null,
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

describe("cards of the search with their photos (L1-55)", () => {
  const now = new Date("2026-10-16T10:00:00Z");

  it("five photos at most per listing, in their order, and how many there are", () => {
    const rows = [3, 1, 6, 2, 5, 4].map((position) => ({
      listing_id: "a",
      path: `a/${position}`,
      position,
      total: 6,
    }));
    rows.push({ listing_id: "b", path: "b/1", position: 1, total: 1 });
    const photos = groupPhotos(rows);
    expect(photos.get("a")).toEqual({ paths: ["a/1", "a/2", "a/3", "a/4", "a/5"], total: 6 });
    expect(photos.get("b")).toEqual({ paths: ["b/1"], total: 1 });
    expect(photos.has("c")).toBe(false);
  });

  it("the card: its photos, the commune and its district, « Nouveau » for a week", () => {
    const card = toShowcaseCard(
      { ...flat, photos: ["p/1", "p/2"], publishedAt: "2026-10-14T08:00:00Z" },
      now,
    );
    expect(card.href).toBe("/annonce/appartement-3-pieces-savigny-sur-orge-lk0005");
    expect(card.city).toBe("Savigny-sur-Orge\u00A0· centre");
    expect(card.photos.map((photo) => photo.alt)).toEqual(["", ""]);
    expect(card.photos[0]?.src).toContain("p/1");
    expect(card.badge).toBe("Nouveau");
    expect(
      toShowcaseCard({ ...flat, publishedAt: "2026-09-01T08:00:00Z" }, now).badge,
    ).toBeUndefined();
  });

  it("without photos read for it, its cover; without either, the drawing", () => {
    expect(toShowcaseCard({ ...flat, cover: { path: "c/1", total: 3 } }, now).photos).toHaveLength(
      1,
    );
    expect(toShowcaseCard(flat, now).photos).toEqual([]);
  });
});
