import type { DpeClass } from "@/components/shared/dpe-badge";
import { DPE_NUMBER, type DpeKind } from "@/lib/validations/property";
import { DPE_CLASSES } from "@/lib/validations/search";

// The DPE as the register of ADEME knows it (L1-66): every DPE made since
// July 2021 is published in its open data (Licence Ouverte 2.0), by its
// number. Three datasets: existing homes, new homes, business premises; the
// fifth character of the number says which. The answer of the register is
// read here, without a network (dpe-registry.ts asks it).

export const DEFAULT_DPE_REGISTRY_URL = "https://data.ademe.fr/data-fair/api/v1";

export type DpeRecord = {
  number: string;
  kind: DpeKind;
  dpe: DpeClass | null;
  ges: DpeClass | null;
  /** « 2024-03-12 »: the day the DPE was made. */
  date: string | null;
  /** Its last day of validity, as ADEME computes it. */
  validUntil: string | null;
  /** Primary energy, kWh per m² and year, rounded as on the label. */
  energyKwhM2Year: number | null;
  /** Emissions, kg of CO₂ per m² and year, rounded as on the label. */
  gesKgM2Year: number | null;
  /** Of the address of the DPE: a number typed for another property shows. */
  postalCode: string | null;
};

type Dataset = { slug: string; kind: DpeKind; energy: string; emissions: string };

/** By the letter of the number: E existing home, N new home, T business premises. */
const DATASETS: Record<string, Dataset> = {
  E: {
    slug: "dpe03existant",
    kind: "logement",
    energy: "conso_5_usages_par_m2_ep",
    emissions: "emission_ges_5_usages_par_m2",
  },
  N: {
    slug: "dpe02neuf",
    kind: "logement",
    energy: "conso_5_usages_par_m2_ep",
    emissions: "emission_ges_5_usages_par_m2",
  },
  T: {
    slug: "dpe01tertiaire",
    kind: "tertiaire",
    energy: "conso_kwhep_m2_an",
    emissions: "emission_ges_kg_co2_m2_an",
  },
};

const SHARED = [
  "numero_dpe",
  "etiquette_dpe",
  "etiquette_ges",
  "date_etablissement_dpe",
  "date_fin_validite_dpe",
  "code_postal_ban",
  "code_postal_brut",
];

/** The dataset of a number; null: not a number of DPE (an audit, a typo). */
export function dpeDataset(number: string): Dataset | null {
  return DPE_NUMBER.test(number) ? (DATASETS[number.charAt(4)] ?? null) : null;
}

/** The request for one DPE by its number. */
export function dpeRegistryUrl(base: string, number: string, dataset: Dataset): string {
  const url = new URL(`${base.replace(/\/$/, "")}/datasets/${dataset.slug}/lines`);
  url.searchParams.set("size", "1");
  url.searchParams.set("numero_dpe_eq", number);
  url.searchParams.set("select", [...SHARED, dataset.energy, dataset.emissions].join(","));
  return url.toString();
}

const DAY = /^\d{4}-\d{2}-\d{2}/;
const day = (value: unknown) =>
  typeof value === "string" && DAY.test(value) ? value.slice(0, 10) : null;
const energyClass = (value: unknown): DpeClass | null =>
  DPE_CLASSES.find((letter) => letter === value) ?? null;
/** A figure of the label: a whole number, never negative nor absurd. */
const figure = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 9999
    ? Math.round(value)
    : null;
const postalCode = (value: unknown) => {
  const text = typeof value === "number" ? String(value).padStart(5, "0") : value;
  return typeof text === "string" && /^\d{5}$/.test(text) ? text : null;
};

/**
 * The DPE of the answer, null when the register has none for this number.
 * Anything unexpected in a line is read as unknown, never guessed.
 */
export function readDpeRecord(number: string, dataset: Dataset, body: unknown): DpeRecord | null {
  const results = (body as { results?: unknown } | null)?.results;
  const line = Array.isArray(results)
    ? (results.find(
        (entry): entry is Record<string, unknown> =>
          typeof entry === "object" && entry !== null && "numero_dpe" in entry,
      ) ?? null)
    : null;
  if (!line || line.numero_dpe !== number) return null;
  return {
    number,
    kind: dataset.kind,
    dpe: energyClass(line.etiquette_dpe),
    ges: energyClass(line.etiquette_ges),
    date: day(line.date_etablissement_dpe),
    validUntil: day(line.date_fin_validite_dpe),
    energyKwhM2Year: figure(line[dataset.energy]),
    gesKgM2Year: figure(line[dataset.emissions]),
    postalCode: postalCode(line.code_postal_ban) ?? postalCode(line.code_postal_brut),
  };
}

/**
 * Answers when DPE_REGISTRY=fixtures (end-to-end tests, environment without
 * access to ADEME): numbers made up, at the addresses of the address
 * fixtures (core/geo/address-fixtures.ts).
 */
export const DPE_FIXTURES: readonly DpeRecord[] = [
  {
    number: "2491E0000001A",
    kind: "logement",
    dpe: "C",
    ges: "B",
    date: "2024-03-12",
    validUntil: "2034-03-11",
    energyKwhM2Year: 148,
    gesKgM2Year: 21,
    postalCode: "91360",
  },
  {
    // Made before July 2021, and for another postal code.
    number: "2175E0000002B",
    kind: "logement",
    dpe: "D",
    ges: "D",
    date: "2021-05-10",
    validUntil: "2024-12-31",
    energyKwhM2Year: 231,
    gesKgM2Year: 48,
    postalCode: "75011",
  },
  {
    number: "2091T0000003C",
    kind: "tertiaire",
    dpe: "F",
    ges: "E",
    date: "2020-03-02",
    validUntil: "2030-03-01",
    energyKwhM2Year: 310,
    gesKgM2Year: 46,
    postalCode: "91360",
  },
];
