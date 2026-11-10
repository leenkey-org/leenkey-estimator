import { describe, expect, it } from "vitest";
import {
  DEFAULT_DPE_REGISTRY_URL,
  DPE_FIXTURES,
  dpeDataset,
  dpeRegistryUrl,
  readDpeRecord,
} from "@/leenkey/properties/dpe-record";
import { DPE_NUMBER } from "@/lib/validations/property";

// L1-66: the DPE as the register of ADEME answers it, read without a network.

describe("the dataset of a number", () => {
  it("is chosen by the fifth character: existing home, new home, business premises", () => {
    expect(dpeDataset("2611E0031228S")).toMatchObject({ slug: "dpe03existant", kind: "logement" });
    expect(dpeDataset("2214N2099690G")).toMatchObject({ slug: "dpe02neuf", kind: "logement" });
    expect(dpeDataset("2618T0063102M")).toMatchObject({
      slug: "dpe01tertiaire",
      kind: "tertiaire",
    });
  });

  it("is none for another letter, or what is not a number of DPE", () => {
    expect(dpeDataset("2611A0031228S")).toBeNull();
    expect(dpeDataset("2611E00312")).toBeNull();
    expect(dpeDataset("2611e0031228s")).toBeNull();
    expect(dpeDataset("x'; drop--")).toBeNull();
  });

  it("is asked by the number, with the fields of its kind only", () => {
    const home = new URL(
      dpeRegistryUrl(DEFAULT_DPE_REGISTRY_URL, "2611E0031228S", dpeDataset("2611E0031228S")!),
    );
    expect(home.origin + home.pathname).toBe(
      "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines",
    );
    expect(home.searchParams.get("numero_dpe_eq")).toBe("2611E0031228S");
    expect(home.searchParams.get("size")).toBe("1");
    expect(home.searchParams.get("select")).toContain("conso_5_usages_par_m2_ep");
    const premises = new URL(
      dpeRegistryUrl("https://exemple.test/api/", "2618T0063102M", dpeDataset("2618T0063102M")!),
    );
    expect(premises.pathname).toBe("/api/datasets/dpe01tertiaire/lines");
    expect(premises.searchParams.get("select")).toContain("emission_ges_kg_co2_m2_an");
  });
});

describe("the answer of the register", () => {
  const home = dpeDataset("2611E0031228S")!;
  // As data.ademe.fr answered it on 2026-11-10.
  const line = {
    cout_total_5_usages: 23106.4,
    etiquette_ges: "A",
    emission_ges_5_usages_par_m2: 5,
    numero_dpe: "2611E0031228S",
    conso_5_usages_par_m2_ep: 139,
    date_fin_validite_dpe: "2036-01-06",
    date_etablissement_dpe: "2026-01-07",
    code_postal_ban: "11000",
    etiquette_dpe: "C",
    _score: null,
  };

  it("gives the classes, the date, the figures and the postal code of a home", () => {
    expect(readDpeRecord("2611E0031228S", home, { total: 1, results: [line] })).toEqual({
      number: "2611E0031228S",
      kind: "logement",
      dpe: "C",
      ges: "A",
      date: "2026-01-07",
      validUntil: "2036-01-06",
      energyKwhM2Year: 139,
      gesKgM2Year: 5,
      postalCode: "11000",
    });
  });

  it("reads business premises with their own fields, the figures rounded as on the label", () => {
    const premises = dpeDataset("2618T0063102M")!;
    expect(
      readDpeRecord("2618T0063102M", premises, {
        results: [
          {
            numero_dpe: "2618T0063102M",
            etiquette_dpe: "C",
            etiquette_ges: "C",
            date_etablissement_dpe: "2026-01-09T00:00:00Z",
            date_fin_validite_dpe: "2036-01-08",
            conso_kwhep_m2_an: 258,
            emission_ges_kg_co2_m2_an: 46.2,
            code_postal_brut: 18200,
          },
        ],
      }),
    ).toMatchObject({
      kind: "tertiaire",
      date: "2026-01-09",
      energyKwhM2Year: 258,
      gesKgM2Year: 46,
      postalCode: "18200",
    });
  });

  it("is none without a line, or for a line of another number", () => {
    expect(readDpeRecord("2611E0031228S", home, { total: 0, results: [] })).toBeNull();
    expect(readDpeRecord("2611E0031228S", home, null)).toBeNull();
    expect(readDpeRecord("2611E0031228S", home, { results: "no" })).toBeNull();
    expect(
      readDpeRecord("2611E0031228S", home, { results: [{ ...line, numero_dpe: "2611E0000000A" }] }),
    ).toBeNull();
  });

  it("reads what it does not expect as unknown, never as a value", () => {
    expect(
      readDpeRecord("2611E0031228S", home, {
        results: [
          {
            numero_dpe: "2611E0031228S",
            etiquette_dpe: "H",
            etiquette_ges: 3,
            date_etablissement_dpe: "hier",
            conso_5_usages_par_m2_ep: -4,
            emission_ges_5_usages_par_m2: "5",
            code_postal_ban: "1100",
          },
        ],
      }),
    ).toEqual({
      number: "2611E0031228S",
      kind: "logement",
      dpe: null,
      ges: null,
      date: null,
      validUntil: null,
      energyKwhM2Year: null,
      gesKgM2Year: null,
      postalCode: null,
    });
  });
});

describe("the DPE of the tests", () => {
  it("have numbers of DPE, of their kind", () => {
    for (const record of DPE_FIXTURES) {
      expect(record.number).toMatch(DPE_NUMBER);
      expect(dpeDataset(record.number)?.kind).toBe(record.kind);
    }
  });
});
