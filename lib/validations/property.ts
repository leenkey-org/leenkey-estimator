import { z } from "zod";
import { DPE_CLASSES, PROPERTY_TYPES } from "./search";

// Creation of a property in steps (L1-11, SPEC-V2 section 8.3). Step 1: the
// address, chosen among the suggestions of the national address base and
// geocoded again on the server (the client never gives the coordinates).
// Step 2: the characteristics, saved as a draft at any time; the type, the
// surface and the rooms are needed to go on (and to send the listing for
// review, listing_submit). Amounts in euros in the form, in cents in base.

/**
 * What is typed in the address field: the national base needs 3 characters
 * and a letter or a digit first (« , 12 rue » is searched as « 12 rue »).
 */
export const addressQuerySchema = z
  .string()
  .transform((text) => text.trim().replace(/^[^\p{L}\p{N}]+/u, ""))
  .pipe(z.string().min(3).max(200));

/** The address chosen; propertyId when the address of a draft changes. */
export const addressChoiceSchema = z.object({
  propertyId: z.string().uuid().optional(),
  label: z.string().trim().min(5).max(200),
  /** A new property from this analysis of value of the seller (L1-13b). */
  estimationId: z.string().uuid().optional(),
});

export type AddressChoice = z.infer<typeof addressChoiceSchema>;

/** An address that a property can hold (the checks of the table), and be chosen by its label. */
export function storableAddress(address: { label: string; line: string; city: string }): boolean {
  return (
    address.line.trim().length >= 3 &&
    address.line.length <= 200 &&
    address.city.length <= 100 &&
    addressChoiceSchema.shape.label.safeParse(address.label).success
  );
}

export const PROPERTY_FEATURES = [
  "balcony",
  "terrace",
  "garden",
  "parking",
  "cellar",
  "elevator",
] as const;
export type PropertyFeature = (typeof PROPERTY_FEATURES)[number];

/** Values of `heating`, stored as shown (the seed uses the same). */
export const HEATING_OPTIONS = [
  "Individuel gaz",
  "Individuel électrique",
  "Individuel fioul",
  "Pompe à chaleur",
  "Bois ou granulés",
  "Collectif gaz",
  "Collectif",
  "Aucun",
] as const;

type PropertyType = (typeof PROPERTY_TYPES)[number];

const whole = (min: number, max: number) => z.number().int().min(min).max(max).nullable();
const area = z.number().positive().max(99_999).nullable();
/** Euros, with cents at most (« 120,50 »). */
const money = (max: number) =>
  z
    .number()
    .min(0)
    .max(max)
    .refine((euros) => Math.abs(euros * 100 - Math.round(euros * 100)) < 1e-6, "cents")
    .nullable();

/** « 2024-03-18 »: a day of the calendar, as the date input gives it. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((text) => {
    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
  }, "date");

const characteristicsFields = z.object({
  propertyId: z.string().uuid(),
  type: z.enum(PROPERTY_TYPES).nullable(),
  surfaceM2: area,
  carrezM2: area,
  rooms: whole(0, 100),
  bedrooms: whole(0, 100),
  floor: whole(-5, 200),
  floorsTotal: whole(0, 200),
  buildYear: whole(1000, 2100),
  isNewBuild: z.boolean(),
  dpe: z.enum(DPE_CLASSES).nullable(),
  ges: z.enum(DPE_CLASSES).nullable(),
  heating: z.enum(HEATING_OPTIONS).nullable(),
  features: z.array(z.enum(PROPERTY_FEATURES)).max(PROPERTY_FEATURES.length),
  chargesMonthlyEuros: money(100_000),
  propertyTaxYearlyEuros: money(1_000_000),
  coproLots: whole(0, 10_000),
  // The DPE (L1-65): its date, the range of the yearly energy costs and the
  // year of the prices, or an exemption and its motive. Optional in a draft;
  // asked to send the listing for review (dpeIssue, listing_submit).
  dpeExempt: z.boolean(),
  dpeExemptionReason: z.string().trim().min(3).max(300).nullable(),
  dpeDate: isoDate.nullable(),
  energyCostMinEuros: whole(0, 100_000),
  energyCostMaxEuros: whole(0, 100_000),
  energyPriceYear: whole(2015, 2100),
});

export type Characteristics = z.infer<typeof characteristicsFields>;

/** A field of step 2 that holds one value (the features are a list). */
export type CharacteristicsField = Exclude<
  keyof Characteristics,
  "propertyId" | "isNewBuild" | "features" | "dpeExempt"
>;

type NotForType = {
  fields: readonly CharacteristicsField[];
  features: readonly PropertyFeature[];
};

const HOUSE: NotForType = { fields: ["floor"], features: ["elevator"] };

/**
 * Fields and features that a type does not have, as the listing page shows
 * it (leenkey/listings): hidden in the form, saved empty. A house (and any
 * other property) has levels, and in a co-ownership lots, charges and a
 * Carrez surface, but no floor nor lift; land, its surface and its tax.
 */
export const NOT_FOR_TYPE: Partial<Record<PropertyType, NotForType>> = {
  maison: HOUSE,
  autre: HOUSE,
  terrain: {
    fields: [
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
      "coproLots",
      "dpeExemptionReason",
      "dpeDate",
      "energyCostMinEuros",
      "energyCostMaxEuros",
      "energyPriceYear",
    ],
    features: PROPERTY_FEATURES,
  },
};

/**
 * The values that apply to the type, the others empty; land has 0 rooms and
 * no DPE. An exempt property keeps no DPE, a property with a DPE no motive
 * of exemption (L1-65).
 */
export function forType(value: Characteristics): Characteristics {
  const hidden = value.type ? NOT_FOR_TYPE[value.type] : undefined;
  const result: Characteristics = hidden
    ? {
        ...value,
        features: value.features.filter((feature) => !hidden.features.includes(feature)),
      }
    : { ...value };
  for (const field of hidden?.fields ?? []) result[field] = null;
  if (value.type === "terrain") {
    result.rooms = 0;
    result.dpeExempt = false;
  }
  if (result.dpeExempt) {
    result.dpe = null;
    result.ges = null;
    result.dpeDate = null;
    result.energyCostMinEuros = null;
    result.energyCostMaxEuros = null;
    result.energyPriceYear = null;
  } else {
    result.dpeExemptionReason = null;
  }
  return result;
}

/** Checked after forType: a hidden field never stops the form. */
export const characteristicsSchema = characteristicsFields
  .transform(forType)
  .superRefine((value, context) => {
    if (value.carrezM2 !== null && value.surfaceM2 !== null && value.carrezM2 > value.surfaceM2) {
      context.addIssue({ code: "custom", path: ["carrezM2"], message: "carrezAboveSurface" });
    }
    if (value.bedrooms !== null && value.rooms !== null && value.bedrooms > value.rooms) {
      context.addIssue({ code: "custom", path: ["bedrooms"], message: "bedroomsAboveRooms" });
    }
    if (value.floor !== null && value.floorsTotal !== null && value.floor > value.floorsTotal) {
      context.addIssue({ code: "custom", path: ["floor"], message: "floorAboveTotal" });
    }
    if (
      value.energyCostMinEuros !== null &&
      value.energyCostMaxEuros !== null &&
      value.energyCostMinEuros > value.energyCostMaxEuros
    ) {
      context.addIssue({ code: "custom", path: ["energyCostMaxEuros"], message: "costRange" });
    }
    // A DPE is dated today at the latest (an outdated one is saved, then refused at the sending).
    if (value.dpeDate !== null && value.dpeDate > parisToday()) {
      context.addIssue({ code: "custom", path: ["dpeDate"], message: "dateFuture" });
    }
    // A home has one room at least (a studio); land and other properties may have none.
    if ((value.type === "appartement" || value.type === "maison") && value.rooms === 0) {
      context.addIssue({ code: "custom", path: ["rooms"], message: "roomsAtLeastOne" });
    }
  });

/** Today in Paris, « 2026-11-09 »: the day a DPE is dated at the latest. */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

/** A DPE made before this day is no longer valid (DPE reform of 1 July 2021). */
export const DPE_VALID_FROM = "2021-07-01";
/** A DPE is valid for 10 years. */
export const DPE_VALID_YEARS = 10;

export type DpeIssue = "dpe_missing" | "dpe_outdated" | "exemption_reason";

/**
 * What still stops the listing from being sent for review, as
 * property_dpe_issue (SQL) says it: null when nothing (land, a complete and
 * valid DPE, an exemption with its motive).
 */
export function dpeIssue(
  value: {
    type: string | null;
    dpe: string | null;
    ges: string | null;
    dpeExempt: boolean;
    dpeExemptionReason: string | null;
    dpeDate: string | null;
    energyCostMinEuros: number | null;
    energyCostMaxEuros: number | null;
    energyPriceYear: number | null;
  },
  today: string = parisToday(),
): DpeIssue | null {
  if (value.type === null || value.type === "terrain") return null;
  if (value.dpeExempt) return value.dpeExemptionReason ? null : "exemption_reason";
  if (
    value.dpe === null ||
    value.ges === null ||
    value.dpeDate === null ||
    value.energyCostMinEuros === null ||
    value.energyCostMaxEuros === null ||
    value.energyPriceYear === null
  ) {
    return "dpe_missing";
  }
  return dpeOutdated(value.dpeDate, today) ? "dpe_outdated" : null;
}

/**
 * A DPE no longer valid, or not yet: dated before 1 July 2021, 10 years ago
 * or more, or after today (« 2026-11-09 », as property_dpe_issue).
 */
export function dpeOutdated(date: string, today: string = parisToday()): boolean {
  const expired = `${Number(today.slice(0, 4)) - DPE_VALID_YEARS}${today.slice(4)}`;
  return date < DPE_VALID_FROM || date <= expired || date > today;
}

/** Intent of a save of step 2: a draft as it is, or the step after. */
export const characteristicsIntentSchema = z.enum(["save", "next"]);

/** To go on to the next step: what a listing needs (listing_submit checks it too). */
export const REQUIRED_CHARACTERISTICS = ["type", "surfaceM2", "rooms"] as const;

export function missingCharacteristics(
  value: Pick<Characteristics, (typeof REQUIRED_CHARACTERISTICS)[number]>,
): (typeof REQUIRED_CHARACTERISTICS)[number][] {
  return REQUIRED_CHARACTERISTICS.filter((field) => value[field] === null);
}

/**
 * A number typed in French (« 68,5 », « 1 250 »): null when empty, NaN when
 * not a number. Spaces of any kind are thousands separators.
 */
export function parseFrenchNumber(text: string): number | null {
  const compact = text.replace(/[\s\u00A0\u202F]/g, "").replace(",", ".");
  if (compact === "") return null;
  return /^-?\d+(\.\d+)?$/.test(compact) ? Number(compact) : Number.NaN;
}
