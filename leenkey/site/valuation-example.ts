import { computeEstimation } from "@/leenkey/estimator/estimation";
import { initialForm, type LeenkeyForm } from "@/leenkey/estimator/types";

// The example valuation on the photo of the hero of the home page (L1-49).
// The V1 card showed figures written by hand (« 845 000 € » for a house in
// Biarritz, « + 5,2 % vs prix agence »): here the value is the one the
// engine of the estimator gives for this house of the launch zone, from its
// reference prices only, without the sales of the area (DVF) that /estimer
// adds: the same house there gives another figure. The card says
// « Exemple » and nothing on it ties the figure to local sales (CLAUDE.md
// section 16, no invented figures; DECISIONS Q58).

/**
 * A recent contemporary house in Saint-Michel-sur-Orge (91), as on the photo:
 * a town without a demo listing, so that no listing of the seed shows the
 * same figure next to it.
 */
export const VALUATION_EXAMPLE: LeenkeyForm = {
  ...initialForm,
  type: "maison",
  code_postal: "91240",
  ville: "Saint-Michel-sur-Orge",
  departement: "91",
  surface_habitable: 120,
  surface_terrain: 600,
  // The rooms of the V1 card (« 4 pièces », « 3 chambres »).
  pieces: 4,
  chambres: 3,
  etat: "excellent",
  dpe: "B",
  annee_construction: "2018",
  exterieur: ["jardin", "terrasse"],
};

export type ValuationExample = {
  /** In euros, as the engine gives them. */
  value: number;
  low: number;
  high: number;
};

/** The value and range of the example, from the engine, without the local sales. */
export function valuationExample(): ValuationExample {
  const result = computeEstimation(VALUATION_EXAMPLE);
  return { value: result.prixEstime, low: result.prixBas, high: result.prixHaut };
}
