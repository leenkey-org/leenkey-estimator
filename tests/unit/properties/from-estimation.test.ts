import { afterEach, describe, expect, it, vi } from "vitest";
import {
  claimFor,
  forgetClaim,
  listingFromEstimationHref,
  rememberClaim,
} from "@/leenkey/estimator/listing-link";
import { answersFromEstimation } from "@/leenkey/properties/from-estimation";
import { estimationPayloadSchema, estimationRecordArgs } from "@/lib/validations/estimation";

// L1-13b: from the analysis of value of the estimator to the property of the
// creation. The answers are those the wizard sends (Wizard.tsx, buildPayload).

const estimationId = "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27";
const token = "a".repeat(48);

const apartment = {
  bien: {
    type: "appartement",
    adresse: "12 Rue de la Gare 91360 Épinay-sur-Orge",
    code_postal: "91360",
    ville: "Épinay-sur-Orge",
    surface_habitable: 68.5,
    surface_carrez: 66,
    pieces: 3,
    chambres: 2,
    etage: 3,
    nb_etages_batiment: 5,
    niveaux: null,
  },
  exterieur: ["balcon", "box", "cave", "ascenseur", "digicode"],
  energie: {
    dpe: "C",
    ges: "inconnu",
    chauffage: "Gaz naturel",
    chauffage_mode: "Collectif",
    annee_construction: "1971–1990",
  },
  situation: { charges_copro_mensuelles: 180.5 },
};

describe("answers of the estimator", () => {
  it("takes over an apartment: surfaces, rooms, floor, energy, features, charges", () => {
    const { address, characteristics } = answersFromEstimation(apartment);
    expect(address).toBe("12 Rue de la Gare 91360 Épinay-sur-Orge");
    expect(characteristics).toEqual({
      type: "appartement",
      surfaceM2: 68.5,
      carrezM2: 66,
      rooms: 3,
      bedrooms: 2,
      floor: 3,
      floorsTotal: 5,
      buildYear: null,
      isNewBuild: false,
      dpe: "C",
      ges: null,
      heating: "Collectif gaz",
      features: ["balcony", "parking", "cellar", "elevator"],
      chargesMonthlyEuros: 180.5,
      propertyTaxYearlyEuros: null,
      coproLots: null,
    });
  });

  it("gives a house its levels, never a floor nor a lift", () => {
    const { characteristics } = answersFromEstimation({
      bien: { type: "maison", surface_habitable: 110, pieces: 5, etage: 2, niveaux: 2 },
      exterieur: ["jardin", "garage", "ascenseur", "piscine"],
      energie: { chauffage: "Fioul", chauffage_mode: "Individuel" },
    });
    expect(characteristics).toMatchObject({
      type: "maison",
      floor: null,
      floorsTotal: 2,
      heating: "Individuel fioul",
      features: ["garden", "parking"],
    });
  });

  it("gives land its surface and no rooms", () => {
    const { characteristics } = answersFromEstimation({
      bien: { type: "terrain", surface_terrain: 1250, pieces: 4 },
      energie: { dpe: "B" },
    });
    expect(characteristics).toMatchObject({
      type: "terrain",
      surfaceM2: 1250,
      rooms: 0,
      dpe: null,
    });
  });

  it("makes the local, the building and the atypical property « autre »", () => {
    expect(
      answersFromEstimation({
        bien: { type: "local_commercial" },
        local: { surface_totale: 85, taxe_fonciere: 1200 },
      }).characteristics,
    ).toMatchObject({ type: "autre", surfaceM2: 85, propertyTaxYearlyEuros: 1200 });
    expect(
      answersFromEstimation({
        bien: { type: "immeuble" },
        immeuble: { surface_totale: 420, charges_annuelles: { taxe_fonciere: 6400 } },
      }).characteristics,
    ).toMatchObject({ type: "autre", surfaceM2: 420, propertyTaxYearlyEuros: 6400 });
    expect(
      answersFromEstimation({
        bien: { type: "atypique", surface_habitable: 640, pieces: 14 },
        atypique: { finances: { taxe_fonciere: 9000 } },
      }).characteristics,
    ).toMatchObject({ type: "autre", surfaceM2: 640, rooms: 14, propertyTaxYearlyEuros: 9000 });
  });

  it("leaves out what step 2 would refuse, a field at a time", () => {
    const { characteristics } = answersFromEstimation({
      bien: {
        type: "appartement",
        surface_habitable: 40,
        surface_carrez: 52,
        pieces: 2,
        chambres: 3,
        etage: 9,
        nb_etages_batiment: 4,
      },
      energie: { dpe: "H", chauffage: "Autre" },
    });
    expect(characteristics).toMatchObject({
      surfaceM2: 40,
      rooms: 2,
      carrezM2: null,
      bedrooms: null,
      floor: null,
      floorsTotal: 4,
      dpe: null,
      heating: null,
    });
  });

  it("reads anything else as nothing to take over", () => {
    for (const input of [null, "maison", [], { bien: "appartement" }]) {
      const { address, characteristics } = answersFromEstimation(input);
      expect(address).toBeNull();
      expect(characteristics.type).toBeNull();
      expect(characteristics.surfaceM2).toBeNull();
    }
    expect(
      answersFromEstimation({ bien: { type: "maison", adresse: "Rue", pieces: 2.5 } }),
    ).toMatchObject({ address: null, characteristics: { rooms: null } });
  });
});

describe("analysis kept by /api/estimate", () => {
  const payload = {
    meta: { source: "formulaire_leenkey", session_id: "x" },
    ...apartment,
    estimation: { prix_estime: 342000, prix_bas: 325000.4, prix_haut: 360000, facteurs: [] },
    comparables_dvf: null,
    contact: { prenom: "Alice", nom: "Martin", email: "alice@exemple.test", telephone: "0600" },
  };

  it("keeps the answers without who asked, the figures in cents", () => {
    const args = estimationRecordArgs(estimationPayloadSchema.parse(payload));
    expect(Object.keys(args.p_input).sort()).toEqual(["bien", "energie", "exterieur", "situation"]);
    expect(args.p_result).toEqual({ estimation: payload.estimation, comparables_dvf: null });
    expect([args.p_value_cents, args.p_low_cents, args.p_high_cents]).toEqual([
      34_200_000, 32_500_040, 36_000_000,
    ]);
    expect(args.p_email).toBe("alice@exemple.test");
    const anonymous = estimationRecordArgs(
      estimationPayloadSchema.parse({ ...payload, contact: { email: "" } }),
    );
    expect(anonymous.p_email).toBeUndefined();
  });

  it("refuses a payload without its figures", () => {
    expect(estimationPayloadSchema.safeParse({ bien: {} }).success).toBe(false);
    expect(
      estimationPayloadSchema.safeParse({ bien: {}, estimation: { prix_estime: -1 } }).success,
    ).toBe(false);
    expect(estimationPayloadSchema.safeParse(null).success).toBe(false);
  });
});

describe("from the result to the creation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("goes to the creation when signed in, through the sign-up otherwise", () => {
    expect(listingFromEstimationHref({ id: estimationId, claimToken: null })).toBe(
      `/vendeur/biens/nouveau?estimation=${estimationId}`,
    );
    expect(listingFromEstimationHref({ id: estimationId, claimToken: token })).toBe(
      `/inscription?role=seller&next=${encodeURIComponent(`/vendeur/biens/nouveau?estimation=${estimationId}`)}`,
    );
    // Never the token in the address.
    expect(listingFromEstimationHref({ id: estimationId, claimToken: token })).not.toContain(token);
    expect(listingFromEstimationHref(null)).toBe("/vendeur/biens/nouveau");
  });

  it("keeps the token in this browser for this analysis only", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    rememberClaim({ id: estimationId, claimToken: token });
    expect(claimFor(estimationId)).toBe(token);
    expect(claimFor("5eed1000-0000-4000-8000-000000000001")).toBeNull();
    forgetClaim();
    expect(claimFor(estimationId)).toBeNull();
    // Signed in: nothing to keep.
    rememberClaim({ id: estimationId, claimToken: null });
    expect(store.size).toBe(0);
  });

  it("works without storage (private browsing)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => rememberClaim({ id: estimationId, claimToken: token })).not.toThrow();
    expect(claimFor(estimationId)).toBeNull();
  });
});
