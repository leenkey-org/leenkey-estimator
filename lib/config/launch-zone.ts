// Launch zone (SPEC-V2 section 20, client decision of 2026-10-01): about
// 10 km around Épinay-sur-Orge (91). Used for the city suggestions of the
// search and the centre of its radius; later the default view of the map
// (L1-16) and the buyer profile.
//
// TODO(L1-15): INSEE codes, postal codes and centres to be fetched and checked
// with the API Géo (geo.api.gouv.fr), unreachable from the development
// environment. Centres are approximate (town centres, about 500 m), enough
// for a radius of 2 to 20 km. Listings outside the zone stay accepted.

import { slugify } from "@/lib/slug";

export type LaunchZoneCommune = {
  name: string;
  postalCodes: readonly string[];
  /** 1: core market, 2: immediate extension. */
  zone: 1 | 2;
  /** Approximate town centre (WGS 84). */
  centre: { lat: number; lng: number };
};

/** Default centre of the search map (docs/DESIGN.md section 8). */
export const LAUNCH_ZONE_CENTRE = { lat: 48.6736, lng: 2.3256 } as const;
export const LAUNCH_ZONE_RADIUS_KM = 10;

// prettier-ignore
const COMMUNES: ReadonlyArray<[name: string, postalCode: string, zone: 1 | 2, lat: number, lng: number]> = [
  // Zone 1, core market
  ["Épinay-sur-Orge",           "91360", 1, 48.6736, 2.3256],
  ["Villemoisson-sur-Orge",     "91360", 1, 48.6663, 2.3331],
  ["Morsang-sur-Orge",          "91390", 1, 48.6617, 2.3528],
  ["Savigny-sur-Orge",          "91600", 1, 48.6769, 2.3486],
  ["Longjumeau",                "91160", 1, 48.6942, 2.2964],
  ["Ballainvilliers",           "91160", 1, 48.6761, 2.2983],
  ["Villiers-sur-Orge",         "91700", 1, 48.6561, 2.3022],
  ["Sainte-Geneviève-des-Bois", "91700", 1, 48.6461, 2.3194],
  // Zone 2, immediate extension
  ["Viry-Châtillon",            "91170", 2, 48.6708, 2.3750],
  ["Juvisy-sur-Orge",           "91260", 2, 48.6892, 2.3781],
  ["Athis-Mons",                "91200", 2, 48.7092, 2.3892],
  ["Morangis",                  "91420", 2, 48.7053, 2.3369],
  ["Chilly-Mazarin",            "91380", 2, 48.7050, 2.3131],
  ["Saulx-les-Chartreux",       "91160", 2, 48.6892, 2.2669],
  ["La Ville-du-Bois",          "91620", 2, 48.6589, 2.2681],
  ["Montlhéry",                 "91310", 2, 48.6394, 2.2708],
  ["Linas",                     "91310", 2, 48.6308, 2.2689],
  ["Longpont-sur-Orge",         "91310", 2, 48.6422, 2.2928],
  ["Fleury-Mérogis",            "91700", 2, 48.6347, 2.3631],
  ["Grigny",                    "91350", 2, 48.6542, 2.3936],
];

export const LAUNCH_ZONE: readonly LaunchZoneCommune[] = COMMUNES.map(
  ([name, postalCode, zone, lat, lng]) => ({
    name,
    postalCodes: [postalCode],
    zone,
    centre: { lat, lng },
  }),
);

/** « 91360 epinay-sur-orge »: a commune by its postal code and its name. */
const zoneKey = (postalCode: string, city: string) => `${postalCode.trim()} ${slugify(city)}`;
const ZONE_KEYS = new Set(
  LAUNCH_ZONE.flatMap((commune) =>
    commune.postalCodes.map((postalCode) => zoneKey(postalCode, commune.name)),
  ),
);

/**
 * Whether a town is in the launch zone, by its name and its postal code: a
 * postal code alone covers other communes too (91160 is also Champlan). A
 * listing outside stays accepted; the back office flags it « Hors zone »
 * (SPEC-V2 section 20).
 */
export function isInLaunchZone(postalCode: string, city: string): boolean {
  return ZONE_KEYS.has(zoneKey(postalCode, city));
}
