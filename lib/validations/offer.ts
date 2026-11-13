import { z } from "zod";

// The purchase offer as its buyer fills it (L2-03, SPEC-V2 13, model of Cédric
// of 2026-10-05): one schema per step of the form. Amounts in euros here, in
// cents in the database (offers). The database checks the same rules again
// when the offer is sent (offer_submit): these give the messages of the form.

export const ACQUISITION_MODES = ["own_name", "joint", "sci", "other"] as const;
export type AcquisitionMode = (typeof ACQUISITION_MODES)[number];

export const SCI_STATUSES = ["registered", "in_formation"] as const;
export type SciStatus = (typeof SCI_STATUSES)[number];

export const FINANCING_MODES = ["loan", "no_loan"] as const;
export type FinancingMode = (typeof FINANCING_MODES)[number];

export const FINANCING_PROGRESS = [
  "not_presented",
  "simulation_done",
  "broker_consulted",
  "agreement_in_principle",
  "other",
] as const;
export type FinancingProgress = (typeof FINANCING_PROGRESS)[number];

/** The steps of the form, in their order (SPEC 13). */
export const OFFER_STEPS = [
  "buyer",
  "property",
  "price",
  "financing",
  "conditions",
  "validity",
  "declarations",
] as const;
export type OfferStep = (typeof OFFER_STEPS)[number];

export const OFFER_CO_BUYERS_MAX = 3;
export const OFFER_NAME_MAX = 80;
export const OFFER_ADDRESS_MAX = 200;
export const OFFER_OTHER_MAX = 200;
export const OFFER_LENDER_MAX = 120;
export const OFFER_DETAILS_MAX = 500;
/** A billion euros: beyond, a typing error. */
export const OFFER_AMOUNT_MAX_EUROS = 1_000_000_000;
export const OFFER_LOAN_YEARS_MAX = 40;
/** Decision of Cédric of 2026-10-01: 5 days by default, from 2 to 10. */
export const OFFER_VALIDITY_MIN_DAYS = 2;
export const OFFER_VALIDITY_MAX_DAYS = 10;
export const OFFER_VALIDITY_DEFAULT_DAYS = 5;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
const euros = z.number().int().min(0).max(OFFER_AMOUNT_MAX_EUROS);

/** « 2026-02-31 » is read as the 3rd of March: refused. */
function isRealDay(value: string): boolean {
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

/** A person who buys: the buyer, or a co-buyer (same fields, SPEC 13 step 1). */
export const offerIdentitySchema = z.object({
  lastName: text(OFFER_NAME_MAX),
  firstName: text(OFFER_NAME_MAX),
  // A day of the past, after 1900.
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (value) =>
        isRealDay(value) && value >= "1900-01-01" && value < new Date().toISOString().slice(0, 10),
    ),
  addressLine: text(OFFER_ADDRESS_MAX),
  postalCode: text(12),
  city: text(OFFER_NAME_MAX),
  email: z.string().trim().email().max(254),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^\+?[\d\s().-]{6,}$/),
});
export type OfferIdentityInput = z.infer<typeof offerIdentitySchema>;
export type OfferIdentityField = keyof OfferIdentityInput;

export const offerSciSchema = z.object({
  name: optionalText(OFFER_ADDRESS_MAX),
  status: z.enum(SCI_STATUSES).nullable(),
  siren: z.string().trim().max(20),
  seatAddress: optionalText(OFFER_ADDRESS_MAX),
  representative: optionalText(OFFER_ADDRESS_MAX),
});
export type OfferSciInput = z.infer<typeof offerSciSchema>;

/** A SIREN as typed (« 123 456 789 »), its nine digits. */
export const sirenDigits = (value: string) => value.replace(/[\s.]/g, "");

/** Step 1: the buyer, the co-buyers, how they buy. */
export const offerBuyerSchema = z
  .object({
    identity: offerIdentitySchema,
    coBuyers: z.array(offerIdentitySchema).max(OFFER_CO_BUYERS_MAX),
    acquisitionMode: z.enum(ACQUISITION_MODES),
    acquisitionModeOther: optionalText(OFFER_OTHER_MAX),
    sci: offerSciSchema,
  })
  .superRefine((value, context) => {
    const issue = (path: (string | number)[]) =>
      context.addIssue({ code: z.ZodIssueCode.custom, path });
    // « À deux / indivision »: one co-buyer at least.
    if (value.acquisitionMode === "joint" && value.coBuyers.length === 0) issue(["coBuyers"]);
    if (value.acquisitionMode === "other" && value.acquisitionModeOther === "") {
      issue(["acquisitionModeOther"]);
    }
    if (value.acquisitionMode === "sci") {
      if (value.sci.name === "") issue(["sci", "name"]);
      if (value.sci.status === null) issue(["sci", "status"]);
      if (value.sci.representative === "") issue(["sci", "representative"]);
      // Its SIREN and its seat once the company exists.
      if (value.sci.status === "registered") {
        if (!/^\d{9}$/.test(sirenDigits(value.sci.siren))) issue(["sci", "siren"]);
        if (value.sci.seatAddress === "") issue(["sci", "seatAddress"]);
      }
    }
  });
export type OfferBuyerInput = z.infer<typeof offerBuyerSchema>;

/** Step 3: the price, in whole euros. */
export const offerPriceSchema = z.object({
  priceEuros: z.number().int().min(1).max(OFFER_AMOUNT_MAX_EUROS),
});
export type OfferPriceInput = z.infer<typeof offerPriceSchema>;

/** Step 4: with or without a loan; the loan, when there is one. */
export const offerFinancingSchema = z
  .object({
    mode: z.enum(FINANCING_MODES),
    downPaymentEuros: euros.nullable(),
    loanAmountEuros: euros.nullable(),
    loanDurationYears: z.number().int().min(1).max(OFFER_LOAN_YEARS_MAX).nullable(),
    // « 3,85 »: two decimals at most.
    loanRateMaxPct: z
      .number()
      .min(0)
      .max(99.99)
      .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6)
      .nullable(),
    lenderName: optionalText(OFFER_LENDER_MAX),
    progress: z.enum(FINANCING_PROGRESS).nullable(),
    progressOther: optionalText(OFFER_OTHER_MAX),
  })
  .superRefine((value, context) => {
    if (value.mode !== "loan") return;
    const issue = (path: string) => context.addIssue({ code: z.ZodIssueCode.custom, path: [path] });
    if (value.downPaymentEuros === null) issue("downPaymentEuros");
    if (value.loanAmountEuros === null || value.loanAmountEuros === 0) issue("loanAmountEuros");
    if (value.loanDurationYears === null) issue("loanDurationYears");
    if (value.loanRateMaxPct === null) issue("loanRateMaxPct");
    if (value.progress === null) issue("progress");
    if (value.progress === "other" && value.progressOther === "") issue("progressOther");
  })
  // Without a loan, nothing of a loan is kept, never hidden.
  .transform((value) =>
    value.mode === "loan"
      ? value
      : {
          ...value,
          downPaymentEuros: null,
          loanAmountEuros: null,
          loanDurationYears: null,
          loanRateMaxPct: null,
          lenderName: "",
          progress: null,
          progressOther: "",
        },
  );
export type OfferFinancingInput = z.input<typeof offerFinancingSchema>;
export type OfferFinancingField = keyof OfferFinancingInput;

/** Step 5: boxes and details, no free clause. */
export const offerConditionsSchema = z
  .object({
    priorSale: z.boolean(),
    authorization: z.boolean(),
    other: z.boolean(),
    details: optionalText(OFFER_DETAILS_MAX),
  })
  // « Autre situation à préciser »: said in the details.
  .refine((value) => !value.other || value.details !== "", { path: ["details"] });
export type OfferConditionsInput = z.infer<typeof offerConditionsSchema>;

/**
 * Step 6: until when the offer stands. From 2 to 10 days from now, with the
 * hour of margin the database gives (offer_submit) for the time between this
 * step and the sending.
 */
export function offerValiditySchema(now: Date = new Date()) {
  return z.object({
    validityUntil: z
      .string()
      .datetime({ offset: true })
      .refine((value) => isValidityInRange(value, now)),
  });
}

export function isValidityInRange(validityUntil: string, now: Date = new Date()): boolean {
  const time = Date.parse(validityUntil);
  return (
    Number.isFinite(time) &&
    time >= now.getTime() + OFFER_VALIDITY_MIN_DAYS * DAY - HOUR &&
    time <= now.getTime() + OFFER_VALIDITY_MAX_DAYS * DAY + HOUR
  );
}

/**
 * The end of an offer valid `days` days: the same hour of the clock, without
 * its minutes (« jusqu'au 18/11/2026 à 14:00 »).
 */
export function validityAfterDays(days: number, now: Date = new Date()): string {
  const end = new Date(now.getTime() + days * DAY);
  end.setUTCMinutes(0, 0, 0);
  return end.toISOString();
}

/** The number of days a saved validity stands for, within the range. */
export function validityDays(validityUntil: string | null, now: Date = new Date()): number {
  if (!validityUntil) return OFFER_VALIDITY_DEFAULT_DAYS;
  const days = Math.round((Date.parse(validityUntil) - now.getTime()) / DAY);
  if (!Number.isFinite(days)) return OFFER_VALIDITY_DEFAULT_DAYS;
  return Math.min(OFFER_VALIDITY_MAX_DAYS, Math.max(OFFER_VALIDITY_MIN_DAYS, days));
}

/** Step 7: the visit, said one way or the other, and the four declarations. */
export const offerDeclarationsSchema = z.object({
  visited: z.boolean(),
  accuracy: z.literal(true),
  priceAndFinancingChecked: z.literal(true),
  legalEffectsUnderstood: z.literal(true),
  infoRead: z.literal(true),
});
export type OfferDeclarationsInput = z.infer<typeof offerDeclarationsSchema>;

/** The dotted paths of the fields in error (« coBuyers.0.email », « sci.siren »). */
export function issuePaths(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((issue) => issue.path.join(".")))];
}
