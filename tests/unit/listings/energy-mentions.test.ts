import { describe, expect, it } from "vitest";
import { energyMentions, NO_ENERGY } from "@/leenkey/listings/energy-mentions";
import type { PublicListing } from "@/leenkey/listings/queries";

// L1-65: the mentions of the DPE on the page of a listing for sale.

const plain = (lines: string[]) => lines.map((line) => line.replace(/[\u00A0\u202F]/g, " "));

const flat: Pick<PublicListing, "type" | "dpe" | "energy"> = {
  type: "appartement",
  dpe: "D",
  energy: {
    exempt: false,
    date: "2024-03-12",
    costMinCents: 98_000,
    costMaxCents: 133_000,
    priceYear: 2023,
  },
};

describe("energyMentions", () => {
  it("gives the range of the costs, the year of the prices and the date of the DPE", () => {
    expect(plain(energyMentions(flat))).toEqual([
      "Montant estimé des dépenses annuelles d'énergie pour un usage standard : entre 980 € et 1 330 € par an. Prix moyens des énergies indexés au 1er janvier 2023 (abonnements compris).",
      "DPE réalisé le 12 mars 2024.",
    ]);
  });

  it("says « consommation excessive » for the classes F and G only", () => {
    for (const dpe of ["F", "G"] as const) {
      expect(energyMentions({ ...flat, dpe })[0]).toBe(
        "Logement à consommation énergétique excessive.",
      );
    }
    expect(energyMentions({ ...flat, dpe: "E" })).toHaveLength(2);
  });

  it("says an exempt property is not subject to the DPE, and nothing more", () => {
    expect(energyMentions({ ...flat, dpe: null, energy: { ...NO_ENERGY, exempt: true } })).toEqual([
      "Bien non soumis au DPE.",
    ]);
  });

  it("invents nothing: no line for land, nor for what a listing does not give", () => {
    expect(energyMentions({ ...flat, type: "terrain" })).toEqual([]);
    expect(energyMentions({ ...flat, energy: NO_ENERGY })).toEqual([]);
    expect(energyMentions({ ...flat, dpe: "G", energy: NO_ENERGY })).toEqual([
      "Logement à consommation énergétique excessive.",
    ]);
  });
});
