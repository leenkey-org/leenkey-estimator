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

/** Euros without cents (the range of a DPE). */
const wholeEuros = z
  .number()
  .min(0)
  .max(100_000)
  .refine((euros) => Number.isInteger(euros), "wholeEuros")
  .nullable();

/** « 2024-03-18 »: a day of the calendar, as the date input gives it. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((text) => {
    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
  }, "date");

/** The DPE of a home, or of business premises (« tertiaire »): dpe_rules has a rule for each. */
export const DPE_KINDS = ["logement", "tertiaire"] as const;
export type DpeKind = (typeof DPE_KINDS)[number];

/** The number of a DPE in the register of ADEME: « 2491E0000001A », 13 characters. */
export const DPE_NUMBER = /^\d{4}[A-Z]\d{7}[A-Z]$/;
const dpeNumber = z
  .string()
  .trim()
  .toUpperCase()
  .refine((text) => DPE_NUMBER.test(text), "dpeNumber");

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
  dpeExemptionReason: z
    .string()
    .trim()
    .max(300)
    .refine((text) => text.length >= 3, "reasonLength")
    .nullable(),
  dpeDate: isoDate.nullable(),
  energyCostMinEuros: wholeEuros,
  energyCostMaxEuros: wholeEuros,
  energyPriceYear: whole(2015, 2100),
  // L1-66: its number at ADEME (the values can be taken from its register),
  // its kind, the energy used (kWh/m²/year) and the emissions (kg CO₂/m²/year).
  dpeNumber: dpeNumber.nullable(),
  dpeKind: z.enum(DPE_KINDS),
  energyKwhM2Year: whole(0, 9999),
  gesKgM2Year: whole(0, 9999),
});

export type Characteristics = z.infer<typeof characteristicsFields>;

/** A field of step 2 that holds one value (the features are a list). */
export type CharacteristicsField = Exclude<
  keyof Characteristics,
  "propertyId" | "isNewBuild" | "features" | "dpeExempt" | "dpeKind"
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
      "dpeNumber",
      "energyKwhM2Year",
      "gesKgM2Year",
    ],
    features: PROPERTY_FEATURES,
  },
};

/**
 * The values that apply to the type, the others empty; land has 0 rooms and
 * no DPE. An exempt property keeps no DPE, a property with a DPE no motive
 * of exemption (L1-65). Only another property may be business premises,
 * whose DPE has no cost range (L1-66).
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
  if (value.type !== "autre") result.dpeKind = "logement";
  if (result.dpeExempt) {
    result.dpe = null;
    result.ges = null;
    result.dpeDate = null;
    result.dpeNumber = null;
    result.energyKwhM2Year = null;
    result.gesKgM2Year = null;
  } else {
    result.dpeExemptionReason = null;
  }
  if (result.dpeExempt || result.dpeKind === "tertiaire") {
    result.energyCostMinEuros = null;
    result.energyCostMaxEuros = null;
    result.energyPriceYear = null;
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
    // The fifth character of the number of a DPE says its kind: T, business premises.
    if (
      value.dpeNumber !== null &&
      (value.dpeNumber.charAt(4) === "T") !== (value.dpeKind === "tertiaire")
    ) {
      context.addIssue({
        code: "custom",
        path: ["dpeNumber"],
        message: value.dpeKind === "tertiaire" ? "dpeNumberHome" : "dpeNumberPremises",
      });
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

/**
 * The rule of a kind of DPE, read from the base (dpe_rules, L1-66): the rules
 * change with the regulation, not with the code.
 */
export type DpeRule = {
  /** A DPE made before this day is refused; null: no such day. */
  validFrom: string | null;
  validityYears: number;
  /** The range of the yearly energy costs and the year of their prices. */
  costsRequired: boolean;
  /** The energy used and the emissions. */
  figuresRequired: boolean;
  /** Classes shown with « Logement à consommation énergétique excessive ». */
  excessiveClasses: readonly string[];
  /**
   * The figures on the page of a listing: with the postal code, they point at
   * one DPE or a few in the open data of ADEME, so at the address (Q78).
   */
  figuresPublic: boolean;
};
export type DpeRules = Partial<Record<DpeKind, DpeRule>>;

export type DpeIssue = "dpe_missing" | "dpe_outdated" | "exemption_reason";

/**
 * What still stops the listing from being sent for review, as
 * property_dpe_issue (SQL) says it: null when nothing (land, a complete and
 * valid DPE, an exemption with its motive). A kind without a rule is not sent.
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
    dpeNumber: string | null;
    dpeKind: string;
    energyKwhM2Year: number | null;
    gesKgM2Year: number | null;
  },
  rules: DpeRules,
  today: string = parisToday(),
): DpeIssue | null {
  if (value.type === null || value.type === "terrain") return null;
  if (value.dpeExempt) return value.dpeExemptionReason ? null : "exemption_reason";
  const rule = DPE_KINDS.includes(value.dpeKind as DpeKind)
    ? rules[value.dpeKind as DpeKind]
    : undefined;
  if (!rule) return "dpe_missing";
  if (
    value.dpe === null ||
    value.ges === null ||
    value.dpeDate === null ||
    value.dpeNumber === null ||
    (rule.costsRequired &&
      (value.energyCostMinEuros === null ||
        value.energyCostMaxEuros === null ||
        value.energyPriceYear === null)) ||
    (rule.figuresRequired && (value.energyKwhM2Year === null || value.gesKgM2Year === null))
  ) {
    return "dpe_missing";
  }
  return dpeOutdated(value.dpeDate, rule, today) ? "dpe_outdated" : null;
}

/** The columns of a property that dpeIssue reads, as the base names them. */
export const PROPERTY_DPE_COLUMNS =
  "type, dpe_class, ges_class, dpe_exempt, dpe_exemption_reason, dpe_date, energy_cost_min_cents, energy_cost_max_cents, energy_price_year, dpe_number, dpe_kind, energy_kwh_m2_year, ges_kg_m2_year" as const;

/** dpeIssue of a row of properties (PROPERTY_DPE_COLUMNS). */
export function propertyDpeIssue(
  property: {
    type: string | null;
    dpe_class: string | null;
    ges_class: string | null;
    dpe_exempt: boolean;
    dpe_exemption_reason: string | null;
    dpe_date: string | null;
    energy_cost_min_cents: number | null;
    energy_cost_max_cents: number | null;
    energy_price_year: number | null;
    dpe_number: string | null;
    dpe_kind: string;
    energy_kwh_m2_year: number | null;
    ges_kg_m2_year: number | null;
  },
  rules: DpeRules,
): DpeIssue | null {
  return dpeIssue(
    {
      type: property.type,
      dpe: property.dpe_class,
      ges: property.ges_class,
      dpeExempt: property.dpe_exempt,
      dpeExemptionReason: property.dpe_exemption_reason,
      dpeDate: property.dpe_date,
      // Only whether they are known matters here, not the unit.
      energyCostMinEuros: property.energy_cost_min_cents,
      energyCostMaxEuros: property.energy_cost_max_cents,
      energyPriceYear: property.energy_price_year,
      dpeNumber: property.dpe_number,
      dpeKind: property.dpe_kind,
      energyKwhM2Year: property.energy_kwh_m2_year,
      gesKgM2Year: property.ges_kg_m2_year,
    },
    rules,
  );
}

/**
 * A DPE no longer valid, or not yet: dated before the first day of its rule,
 * its years of validity ago or more, or after today (« 2026-11-09 », as
 * property_dpe_issue).
 */
export function dpeOutdated(
  date: string,
  rule: Pick<DpeRule, "validFrom" | "validityYears">,
  today: string = parisToday(),
): boolean {
  const expired = `${Number(today.slice(0, 4)) - rule.validityYears}${today.slice(4)}`;
  return (rule.validFrom !== null && date < rule.validFrom) || date <= expired || date > today;
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
