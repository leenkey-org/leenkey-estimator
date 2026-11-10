import { describe, expect, it } from "vitest";
import { energyMentions, NO_ENERGY } from "@/leenkey/listings/energy-mentions";
import type { PublicListing } from "@/leenkey/listings/queries";

// L1-65, L1-66: the mentions of the DPE on the page of a listing for sale.

const plain = (lines: string[]) => lines.map((line) => line.replace(/[\u00A0\u202F]/g, " "));

const flat: Pick<PublicListing, "type" | "energy"> = {
  type: "appartement",
  energy: {
    ...NO_ENERGY,
    costMinCents: 98_000,
    costMaxCents: 133_000,
    priceYear: 2023,
    kwhM2Year: 215,
    gesKgM2Year: 40,
  },
};

describe("energyMentions", () => {
  it("gives the range of the costs and the year of the prices, never the date of the DPE", () => {
    expect(plain(energyMentions(flat))).toEqual([
      "Montant estimé des dépenses annuelles d'énergie pour un usage standard : entre 980 € et 1 330 € par an. Prix moyens des énergies indexés au 1er janvier 2023 (abonnements compris).",
    ]);
  });

  it("says « consommation excessive » when the rule of the DPE says so", () => {
    expect(energyMentions({ ...flat, energy: { ...flat.energy, excessive: true } })[0]).toBe(
      "Logement à consommation énergétique excessive.",
    );
    expect(energyMentions(flat)).toHaveLength(1);
  });

  it("says an exempt property is not subject to the DPE, with the motive the team has read", () => {
    expect(
      energyMentions({
        ...flat,
        energy: { ...NO_ENERGY, exempt: true, exemptionReason: "Lieu de culte" },
      }),
    ).toEqual(["Non soumis au DPE (motif : Lieu de culte)."]);
    expect(energyMentions({ ...flat, energy: { ...NO_ENERGY, exempt: true } })).toEqual([
      "Non soumis au DPE.",
    ]);
  });

  it("gives business premises neither a cost range nor « excessive »", () => {
    expect(
      energyMentions({
        type: "autre",
        energy: { ...NO_ENERGY, kind: "tertiaire", kwhM2Year: 310, gesKgM2Year: 46 },
      }),
    ).toEqual([]);
  });

  it("invents nothing: no line for land, nor for what a listing does not give", () => {
    expect(energyMentions({ ...flat, type: "terrain" })).toEqual([]);
    expect(energyMentions({ ...flat, energy: NO_ENERGY })).toEqual([]);
  });
});
