import { z } from "zod";
import {
  characteristicsSchema,
  type Characteristics,
  type CharacteristicsField,
  type PropertyFeature,
} from "@/lib/validations/property";
import { DPE_CLASSES, PROPERTY_TYPES } from "@/lib/validations/search";

// The answers of the wizard of the estimator (estimations.input, L1-13b)
// turned into the property of the creation: its address, to choose again at
// step 1 (the V1 keeps the label of the national address base), and its
// characteristics, checked at step 2. A value that the form would refuse is
// left out, never the whole: « Vérifiez et complétez » (SPEC-V2 8.3). Pure.

type PropertyType = (typeof PROPERTY_TYPES)[number];
export type EstimationAnswers = {
  address: string | null;
  characteristics: Omit<Characteristics, "propertyId">;
};

const section = z.record(z.unknown()).catch({});
const number = z.number().finite().nullable().catch(null);
const text = z.string().trim().nullable().catch(null);
const list = z.array(z.string()).catch([]);

/** The local, the building and the atypical property of the V1 are « autre ». */
const TYPES: Record<string, PropertyType> = {
  appartement: "appartement",
  maison: "maison",
  terrain: "terrain",
  local_commercial: "autre",
  immeuble: "autre",
  atypique: "autre",
};

const FEATURES: Record<string, PropertyFeature> = {
  balcon: "balcony",
  terrasse: "terrace",
  jardin: "garden",
  parking: "parking",
  box: "parking",
  garage: "parking",
  cave: "cellar",
  ascenseur: "elevator",
};

/** The heating of the V1 (energie.ts) in the list of step 2, when it says enough. */
function heatingOf(kind: string | null, mode: string | null): Characteristics["heating"] {
  const shared = mode === "Collectif";
  switch (kind) {
    case "Pompe à chaleur":
    case "Géothermie":
      return "Pompe à chaleur";
    case "Gaz naturel":
      return shared ? "Collectif gaz" : "Individuel gaz";
    case "Électrique":
      return "Individuel électrique";
    case "Fioul":
      return shared ? "Collectif" : "Individuel fioul";
    case "Bois":
      return "Bois ou granulés";
    case "Réseau de chaleur urbain":
      return "Collectif";
    default:
      return null;
  }
}

const letter = (value: string | null) => DPE_CLASSES.find((dpe) => dpe === value) ?? null;
const whole = (value: number | null) => (value !== null && Number.isInteger(value) ? value : null);

/** Placeholder of the check: the property does not exist yet. */
const NO_PROPERTY = "00000000-0000-4000-8000-000000000000";

export function answersFromEstimation(input: unknown): EstimationAnswers {
  const answers = section.parse(input);
  const bien = section.parse(answers.bien);
  const local = section.parse(answers.local);
  const immeuble = section.parse(answers.immeuble);
  const atypique = section.parse(answers.atypique);
  const energie = section.parse(answers.energie);
  const situation = section.parse(answers.situation);
  const v1Type = text.parse(bien.type);
  const type = (v1Type && TYPES[v1Type]) || null;

  const surface =
    v1Type === "terrain"
      ? number.parse(bien.surface_terrain)
      : v1Type === "local_commercial"
        ? number.parse(local.surface_totale)
        : v1Type === "immeuble"
          ? (number.parse(immeuble.surface_totale) ?? number.parse(immeuble.surface_habitable))
          : v1Type === "atypique"
            ? (number.parse(atypique.surface_habitable) ?? number.parse(bien.surface_habitable))
            : // An apartment may give its Carrez surface only (Wizard.tsx).
              (number.parse(bien.surface_habitable) ?? number.parse(bien.surface_carrez));
  const tax =
    v1Type === "local_commercial"
      ? number.parse(local.taxe_fonciere)
      : v1Type === "immeuble"
        ? number.parse(section.parse(immeuble.charges_annuelles).taxe_fonciere)
        : v1Type === "atypique"
          ? number.parse(section.parse(atypique.finances).taxe_fonciere)
          : null;
  const features = [
    ...new Set(
      list
        .parse(answers.exterieur)
        .map((item) => FEATURES[item])
        .filter((feature): feature is PropertyFeature => feature !== undefined),
    ),
  ];

  let candidate: Characteristics = {
    propertyId: NO_PROPERTY,
    type,
    surfaceM2: surface,
    carrezM2: v1Type === "appartement" ? number.parse(bien.surface_carrez) : null,
    rooms: whole(number.parse(bien.pieces)),
    bedrooms: whole(number.parse(bien.chambres)),
    floor: whole(number.parse(bien.etage)),
    floorsTotal: whole(
      v1Type === "maison" ? number.parse(bien.niveaux) : number.parse(bien.nb_etages_batiment),
    ),
    // The V1 asks for a period (« 1971–1990 »), never a year.
    buildYear: null,
    isNewBuild: false,
    dpe: letter(text.parse(energie.dpe)),
    ges: letter(text.parse(energie.ges)),
    heating: heatingOf(text.parse(energie.chauffage), text.parse(energie.chauffage_mode)),
    features,
    chargesMonthlyEuros: number.parse(situation.charges_copro_mensuelles),
    propertyTaxYearlyEuros: tax,
    coproLots: null,
  };
  // What step 2 would refuse is left empty, a field at a time.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const checked = characteristicsSchema.safeParse(candidate);
    if (checked.success) {
      const { propertyId: _none, ...characteristics } = checked.data;
      return { address: addressOf(text.parse(bien.adresse)), characteristics };
    }
    const refused = new Set(checked.error.issues.map((issue) => String(issue.path[0])));
    candidate = { ...candidate, features: refused.has("features") ? [] : candidate.features };
    for (const field of FIELDS) if (refused.has(field)) candidate[field] = null;
  }
  return {
    address: addressOf(text.parse(bien.adresse)),
    characteristics: { ...EMPTY, type },
  };
}

const FIELDS: readonly CharacteristicsField[] = [
  "type",
  "surfaceM2",
  "carrezM2",
  "rooms",
  "bedrooms",
  "floor",
  "floorsTotal",
  "buildYear",
  "dpe",
  "ges",
  "heating",
  "chargesMonthlyEuros",
  "propertyTaxYearlyEuros",
  "coproLots",
];

const EMPTY: Omit<Characteristics, "propertyId"> = {
  type: null,
  surfaceM2: null,
  carrezM2: null,
  rooms: null,
  bedrooms: null,
  floor: null,
  floorsTotal: null,
  buildYear: null,
  isNewBuild: false,
  dpe: null,
  ges: null,
  heating: null,
  features: [],
  chargesMonthlyEuros: null,
  propertyTaxYearlyEuros: null,
  coproLots: null,
};

/** The label to search again at step 1: 5 to 200 characters, as addressChoiceSchema. */
function addressOf(label: string | null): string | null {
  return label !== null && label.length >= 5 && label.length <= 200 ? label : null;
}
