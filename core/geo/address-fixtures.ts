import type { Address } from "./address-search";

// Answers of the address search when GEOCODER=fixtures: the end-to-end tests,
// and an environment that cannot reach the national base (the sandbox of the
// development). Streets of the area of the seed, numbers and points made up.

const FIXTURES: ReadonlyArray<
  [line: string, postalCode: string, city: string, lat: number, lng: number]
> = [
  ["12 Rue de la Gare", "91360", "Épinay-sur-Orge", 48.6741, 2.3249],
  ["4 Rue de la Gare", "91360", "Épinay-sur-Orge", 48.6747, 2.3262],
  ["8 Avenue Carnot", "91600", "Savigny-sur-Orge", 48.6779, 2.3478],
  ["3 Rue de Paris", "91260", "Juvisy-sur-Orge", 48.6889, 2.3772],
  ["25 Avenue de la Libération", "91390", "Morsang-sur-Orge", 48.6611, 2.3519],
  ["5 Place du Marché", "91160", "Longjumeau", 48.6946, 2.2958],
  ["14 Rue Gabriel Péri", "91300", "Massy", 48.7302, 2.2769],
];

export const ADDRESS_FIXTURES: readonly Address[] = FIXTURES.map(
  ([line, postalCode, city, lat, lng]) => ({
    line,
    postalCode,
    city,
    label: `${line} ${postalCode} ${city}`,
    lat,
    lng,
  }),
);
