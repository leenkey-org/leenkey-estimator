import type { SearchRequest } from "@/leenkey/ai/search-request";
import type { SearchFilters, SearchSort } from "@/lib/validations/search";

// L2-06, acceptance criterion of SPEC-V2 section 23: « Recherche en langage
// naturel → filtres corrects sur 10 requêtes de test ». Ten searches as a
// buyer writes them, what the model is expected to write down for each
// (search_listings), and the search of the site it must become. Read by the
// unit tests (the request → the filters, tests/unit/ai/buyer.test.ts) and by
// the evaluation against the real model (the words → the filters,
// tests/eval/search-requests.eval.test.ts, `npm run ai:eval-search`).

const NONE: SearchRequest = {
  location: "",
  radiusKm: 0,
  propertyType: "any",
  budgetMinEuros: 0,
  budgetMaxEuros: 0,
  surfaceMinM2: 0,
  surfaceMaxM2: 0,
  roomsMin: 0,
  bedroomsMin: 0,
  outdoor: [],
  parking: false,
  elevator: false,
  dpeMax: "any",
  sort: "recent",
};

export type SearchCase = {
  ask: string;
  request: SearchRequest;
  filters: SearchFilters;
  sort: SearchSort;
  /** The parameters of the search page (« Voir les biens »). */
  params: string;
};

export const SEARCH_CASES: readonly SearchCase[] = [
  {
    ask: "Je cherche un appartement de 3 pièces à Savigny-sur-Orge, 300 000 € maximum.",
    request: {
      ...NONE,
      location: "Savigny-sur-Orge",
      propertyType: "appartement",
      roomsMin: 3,
      budgetMaxEuros: 300_000,
    },
    filters: {
      location: "savigny-sur-orge",
      type: "appartement",
      priceMaxCents: 30_000_000,
      roomsMin: 3,
    },
    sort: "recent",
    params: "ville=savigny-sur-orge&type=appartement&budget_max=300000&pieces_min=3",
  },
  {
    ask: "Une maison avec jardin autour d'Épinay-sur-Orge, dans un rayon de 10 km, avec 4 chambres minimum.",
    request: {
      ...NONE,
      location: "Épinay-sur-Orge",
      radiusKm: 10,
      propertyType: "maison",
      bedroomsMin: 4,
      outdoor: ["jardin"],
    },
    filters: {
      location: "epinay-sur-orge",
      radiusKm: 10,
      type: "maison",
      bedroomsMin: 4,
      outdoor: ["jardin"],
    },
    sort: "recent",
    params: "ville=epinay-sur-orge&rayon=10&type=maison&chambres_min=4&exterieur=jardin",
  },
  {
    ask: "Un appartement T2 à Juvisy-sur-Orge avec ascenseur et parking, budget entre 150 000 et 220 000 euros.",
    request: {
      ...NONE,
      location: "Juvisy-sur-Orge",
      propertyType: "appartement",
      roomsMin: 2,
      budgetMinEuros: 150_000,
      budgetMaxEuros: 220_000,
      parking: true,
      elevator: true,
    },
    filters: {
      location: "juvisy-sur-orge",
      type: "appartement",
      priceMinCents: 15_000_000,
      priceMaxCents: 22_000_000,
      roomsMin: 2,
      parking: true,
      elevator: true,
    },
    sort: "recent",
    params:
      "ville=juvisy-sur-orge&type=appartement&budget_min=150000&budget_max=220000&pieces_min=2&parking=1&ascenseur=1",
  },
  {
    ask: "Des terrains à vendre dans le 91310, du moins cher au plus cher.",
    request: { ...NONE, location: "91310", propertyType: "terrain", sort: "prix_asc" },
    filters: { location: "91310", type: "terrain" },
    sort: "prix_asc",
    params: "ville=91310&type=terrain&tri=prix_asc",
  },
  {
    ask: "Une maison d'au moins 120 m² à Longjumeau et alentours, avec un DPE C ou mieux.",
    request: {
      ...NONE,
      location: "Longjumeau",
      radiusKm: 5,
      propertyType: "maison",
      surfaceMinM2: 120,
      dpeMax: "C",
    },
    filters: {
      location: "longjumeau",
      radiusKm: 5,
      type: "maison",
      surfaceMin: 120,
      dpeMax: "C",
    },
    sort: "recent",
    params: "ville=longjumeau&rayon=5&type=maison&surface_min=120&dpe_max=C",
  },
  {
    ask: "Un appartement avec balcon ou terrasse à Athis-Mons, 70 m² minimum, à moins de 280 k€.",
    request: {
      ...NONE,
      location: "Athis-Mons",
      propertyType: "appartement",
      surfaceMinM2: 70,
      budgetMaxEuros: 280_000,
      outdoor: ["balcon", "terrasse"],
    },
    filters: {
      location: "athis-mons",
      type: "appartement",
      priceMaxCents: 28_000_000,
      surfaceMin: 70,
      outdoor: ["balcon", "terrasse"],
    },
    sort: "recent",
    params:
      "ville=athis-mons&type=appartement&budget_max=280000&surface_min=70&exterieur=balcon%2Cterrasse",
  },
  {
    ask: "Qu'avez-vous à Morangis à moins de 400 000 € ? Les plus grandes surfaces d'abord.",
    request: { ...NONE, location: "Morangis", budgetMaxEuros: 400_000, sort: "surface" },
    filters: { location: "morangis", priceMaxCents: 40_000_000 },
    sort: "surface",
    params: "ville=morangis&budget_max=400000&tri=surface",
  },
  {
    ask: "Je cherche une maison de 5 pièces, peu importe la ville, entre 90 et 140 m².",
    request: {
      ...NONE,
      propertyType: "maison",
      roomsMin: 5,
      surfaceMinM2: 90,
      surfaceMaxM2: 140,
    },
    filters: { type: "maison", surfaceMin: 90, surfaceMax: 140, roomsMin: 5 },
    sort: "recent",
    params: "type=maison&surface_min=90&surface_max=140&pieces_min=5",
  },
  {
    ask: "Un bien avec un extérieur à Sainte-Geneviève-des-Bois, 3 chambres au moins, pas de passoire thermique.",
    request: {
      ...NONE,
      location: "Sainte-Geneviève-des-Bois",
      bedroomsMin: 3,
      outdoor: ["balcon", "terrasse", "jardin"],
      dpeMax: "E",
    },
    filters: {
      location: "sainte-genevieve-des-bois",
      bedroomsMin: 3,
      outdoor: ["balcon", "terrasse", "jardin"],
      dpeMax: "E",
    },
    sort: "recent",
    params:
      "ville=sainte-genevieve-des-bois&chambres_min=3&exterieur=balcon%2Cterrasse%2Cjardin&dpe_max=E",
  },
  {
    ask: "Montrez-moi les appartements à Grigny et à 2 km à la ronde, au meilleur prix au m².",
    request: {
      ...NONE,
      location: "Grigny",
      radiusKm: 2,
      propertyType: "appartement",
      sort: "prix_m2",
    },
    filters: { location: "grigny", radiusKm: 2, type: "appartement" },
    sort: "prix_m2",
    params: "ville=grigny&rayon=2&type=appartement&tri=prix_m2",
  },
];

export const EMPTY_SEARCH_REQUEST = NONE;
