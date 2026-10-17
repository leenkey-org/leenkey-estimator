import { z } from "zod";
import { DPE_CLASSES, PROPERTY_TYPES } from "./search";

// Creation of a property in steps (L1-11, SPEC-V2 section 8.3). Step 1: the
// address, chosen among the suggestions of the national address base and
// geocoded again on the server (the client never gives the coordinates).
// Step 2: the characteristics, saved as a draft at any time; the type, the
// surface and the rooms are needed to go on (and to send the listing for
// review, listing_submit). Amounts in euros in the form, in cents in base.

/** What is typed in the address field: the national base needs 3 characters. */
export const addressQuerySchema = z.string().trim().min(3).max(200);

/** The address chosen; propertyId when the address of a draft changes. */
export const addressChoiceSchema = z.object({
  propertyId: z.string().uuid().optional(),
  label: z.string().trim().min(5).max(200),
});

export type AddressChoice = z.infer<typeof addressChoiceSchema>;

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

const whole = (min: number, max: number) => z.number().int().min(min).max(max).nullable();
const area = z.number().positive().max(99_999).nullable();

export const characteristicsSchema = z
  .object({
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
    chargesMonthlyEuros: whole(0, 100_000),
    propertyTaxYearlyEuros: whole(0, 1_000_000),
    coproLots: whole(0, 10_000),
  })
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
  });

export type Characteristics = z.infer<typeof characteristicsSchema>;

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
