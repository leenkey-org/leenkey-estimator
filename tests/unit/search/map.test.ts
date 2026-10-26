import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEENKEY_MAP_STYLE, MAP_TOKENS } from "@/components/shared/map-style";
import { headingTo } from "@/core/maps/geometry";
import { googleMapsScriptUrl } from "@/core/maps/loader";
import { mapCentre, toMapListings } from "@/leenkey/search/map-listings";
import type { SearchListing } from "@/leenkey/search/queries";
import { LAUNCH_ZONE_CENTRE } from "@/lib/config/launch-zone";

// L1-16: the maps of Google Maps (docs/DESIGN.md 8).

const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");

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

describe("the results on the map", () => {
  const now = new Date("2026-10-26T10:00:00Z");

  it("a price pill at the public location, its name starting with its text", () => {
    const [pill] = toMapListings([flat], now);
    expect(pill?.id).toBe(flat.id);
    expect(pill?.position).toEqual({ lat: 48.681, lng: 2.35 });
    expect(plain(pill?.label ?? "")).toBe("239 k€");
    expect(plain(pill?.name ?? "")).toBe(
      "239 k€, Appartement 3 pièces · 68 m², Savigny-sur-Orge · centre",
    );
    expect(pill?.card.href).toBe("/annonce/appartement-3-pieces-savigny-sur-orge-lk0005");
  });

  it("a listing without public location stays in the list only", () => {
    const listings = toMapListings(
      [flat, { ...flat, id: "b", lat: null }, { ...flat, id: "c", lng: null }],
      now,
    );
    expect(listings.map((listing) => listing.id)).toEqual([flat.id]);
  });

  it("without results, the map opens on the place searched, else on the launch zone", () => {
    expect(mapCentre({ centre: { lat: 48.7, lng: 2.3 } })).toEqual({ lat: 48.7, lng: 2.3 });
    expect(mapCentre({})).toEqual(LAUNCH_ZONE_CENTRE);
    expect(mapCentre(null)).toEqual({ lat: 48.6736, lng: 2.3256 });
  });
});

describe("the script of Google Maps", () => {
  it("French names, France seen from France, loaded asynchronously, the key given", () => {
    const url = new URL(googleMapsScriptUrl("a-public-key"));
    expect(url.origin + url.pathname).toBe("https://maps.googleapis.com/maps/api/js");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      key: "a-public-key",
      v: "weekly",
      loading: "async",
      language: "fr",
      region: "FR",
      callback: "__lkGoogleMapsReady",
    });
  });
});

describe("the street turned towards the area", () => {
  const here = { lat: 48.681, lng: 2.35 };
  it("north, east, south and west in degrees from the north", () => {
    expect(headingTo(here, { lat: 48.682, lng: 2.35 })).toBeCloseTo(0, 5);
    expect(headingTo(here, { lat: 48.681, lng: 2.351 })).toBeCloseTo(90, 1);
    expect(headingTo(here, { lat: 48.68, lng: 2.35 })).toBeCloseTo(180, 5);
    expect(headingTo(here, { lat: 48.681, lng: 2.349 })).toBeCloseTo(270, 1);
  });
});

describe("the style of the maps", () => {
  const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");

  it("draws with the colours of the tokens", () => {
    for (const [name, value] of Object.entries(MAP_TOKENS)) {
      const match = css.match(new RegExp(`--color-lk-${name}:\\s*(#[0-9a-f]{6});`, "i"));
      expect(match?.[1]?.toLowerCase(), name).toBe(value);
    }
  });

  it("hides shops and businesses, keeps the water of DESIGN.md 8", () => {
    expect(LEENKEY_MAP_STYLE).toContainEqual({
      featureType: "poi.business",
      stylers: [{ visibility: "off" }],
    });
    expect(LEENKEY_MAP_STYLE).toContainEqual({
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#cfe0f0" }],
    });
  });
});
