import { describe, expect, it } from "vitest";
import { computeEstimation } from "@/leenkey/estimator/estimation";
import { VALUATION_EXAMPLE, valuationExample } from "@/leenkey/site/valuation-example";
import { fr } from "@/lib/i18n/fr";

// L1-49 (DECISIONS 2026-10-23): the home page in the direction of the V1.

const home = fr.site.home;

describe("carte d'exemple du hero", () => {
  it("affiche la valeur que donne le moteur de l'estimateur pour ce bien, sans les ventes du secteur", () => {
    const result = computeEstimation(VALUATION_EXAMPLE);
    expect(valuationExample()).toEqual({
      value: result.prixEstime,
      low: result.prixBas,
      high: result.prixHaut,
    });
  });

  // The figures given to Cédric (DECISIONS 2026-10-23, Q58): a new calibration
  // of the engine changes them, and these documents with them.
  it("453 000 €, de 422 000 € à 484 000 € : les chiffres écrits dans DECISIONS et Q58", () => {
    expect(valuationExample()).toEqual({ value: 453_000, low: 422_000, high: 484_000 });
  });

  it("une valeur dans sa fourchette, pour la maison que décrit la carte", () => {
    const { value, low, high } = valuationExample();
    expect(low).toBeLessThan(value);
    expect(value).toBeLessThan(high);
    expect(VALUATION_EXAMPLE.type).toBe("maison");
    expect(home.hero.example.place).toBe(
      `${VALUATION_EXAMPLE.ville}, ${VALUATION_EXAMPLE.code_postal}`,
    );
    expect(home.hero.example.specs).toEqual([
      `${VALUATION_EXAMPLE.surface_habitable}\u202fm²`,
      `${VALUATION_EXAMPLE.pieces} pièces`,
      `${VALUATION_EXAMPLE.chambres} chambres`,
    ]);
  });

  it("dans une commune sans bien de démonstration : aucune annonce du seed n'affiche le même lieu", async () => {
    const { readFileSync } = await import("node:fs");
    const seed = readFileSync("supabase/seed/05_demo_data.sql", "utf8");
    expect(seed).not.toContain(VALUATION_EXAMPLE.ville);
  });

  it("dit que c'est un exemple, sans le chiffre de la V1 « + 5,2 % vs prix agence »", () => {
    expect(home.hero.example.sample).toBe("Exemple");
    expect(home.hero.example.label).toBe("Exemple de valorisation");
    const hero = JSON.stringify(home.hero);
    expect(hero).not.toMatch(/%/);
    expect(hero).not.toMatch(/prix agence/i);
  });

  // The figure of the card comes from the reference prices of the engine,
  // not from the sales of the area: nothing on the photo may say otherwise.
  it("rien sur la photo ne rattache le chiffre aux ventes du secteur", () => {
    const photo = JSON.stringify([home.hero.example, home.hero.fact]);
    expect(photo).not.toMatch(/vente|DVF|secteur|quartier/i);
  });

  it("garde l'entrée des acquéreurs sous celle des vendeurs", () => {
    expect(home.hero.action).toBe("Voir ma valorisation");
    expect(home.hero.buy).toBe("Je cherche un bien à acheter");
  });
});

describe("têtes de section de la V1", () => {
  // « En vente sur Leenkey » is new: the V1 page had no listings.
  it("le surtitre de la V1 au-dessus de chaque titre de section, et celui des derniers biens", () => {
    expect(
      [
        home.stages,
        home.steps,
        home.features,
        home.space,
        home.latest,
        home.comparison,
        home.plans,
        home.faq,
        home.contact,
      ].map((section) => section.eyebrow),
    ).toEqual([
      "Votre projet",
      "Comment ça marche",
      "Le point de départ",
      "Votre espace Leenkey",
      "En vente sur Leenkey",
      "Position de Leenkey",
      "Nos formules",
      "Questions fréquentes",
      "Une question, un projet\u00a0?",
    ]);
  });
});

describe("comparatif", () => {
  it("une coche ou une croix pour chaque valeur, Leenkey coché partout", () => {
    const { rows, columns } = home.comparison;
    for (const column of columns) {
      expect(column.values).toHaveLength(rows.length);
      expect(column.good).toHaveLength(rows.length);
    }
    expect(columns.find((column) => column.key === "leenkey")?.good).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it("dit la coche et la croix en mots aux lecteurs d'écran", () => {
    expect(home.comparison.good).toBe("Point fort\u00a0:");
    expect(home.comparison.bad).toBe("Point faible\u00a0:");
  });
});
