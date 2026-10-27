import { describe, expect, it } from "vitest";
import { computeEstimation } from "@/leenkey/estimator/estimation";
import { VALUATION_EXAMPLE, valuationExample } from "@/leenkey/site/valuation-example";
import { fr } from "@/lib/i18n/fr";

// L1-57: the home page in the charte of the redesign D (DECISIONS 2026-10-27).

const home = fr.site.home;

describe("carte « Exemple » du bandeau", () => {
  it("affiche la valeur que donne le moteur de l'estimateur pour cette maison, sans les ventes du secteur", () => {
    expect(valuationExample().value).toBe(computeEstimation(VALUATION_EXAMPLE).prixEstime);
  });

  // The figure given to Cédric (Q58): a new calibration of the engine changes
  // it, and DECISIONS with it.
  it("453 000 €, le chiffre écrit dans Q58", () => {
    expect(valuationExample().value).toBe(453_000);
  });

  it("décrit la maison calculée, et se dit un exemple", () => {
    expect(home.hero.example.badge).toBe("Exemple");
    expect(home.hero.example.label).toBe("Exemple de valorisation");
    expect(
      home.hero.example.detail(
        VALUATION_EXAMPLE.ville,
        VALUATION_EXAMPLE.surface_habitable,
        VALUATION_EXAMPLE.pieces,
      ),
    ).toBe("Saint-Michel-sur-Orge · 120 m² · 4 pièces");
  });
});
