import { z } from "zod";

// The buying project of a buyer (L1-25, SPEC-V2 8.9): what they look for and
// how they finance it, declared by themselves. Amounts in euros here, in
// cents in the database (buyer_profiles); its status follows in the database
// (buyer_profiles_compute_status): « declared » once project, budget, down
// payment and loan need are given.

export const BUYER_PROJECTS = [
  "residence_principale",
  "residence_secondaire",
  "investissement",
] as const;
export type BuyerProject = (typeof BUYER_PROJECTS)[number];

/** Checks of buyer_profiles (L1-03). */
export const BUYER_CITIES_MAX = 20;
export const BUYER_CITY_MAX = 80;
export const BUYER_SITUATION_MAX = 280;
/** A billion euros: beyond, a typing error. */
export const BUYER_AMOUNT_MAX_EUROS = 1_000_000_000;

const euros = z.number().int().min(0).max(BUYER_AMOUNT_MAX_EUROS).nullable();

export const buyerProfileSchema = z
  .object({
    project: z.enum(BUYER_PROJECTS).nullable(),
    targetCities: z.array(z.string().trim().min(1).max(BUYER_CITY_MAX)).max(BUYER_CITIES_MAX),
    budgetMaxEuros: euros,
    downPaymentEuros: euros,
    loanNeeded: z.boolean().nullable(),
    loanAmountEuros: euros,
    situationNote: z.string().trim().max(BUYER_SITUATION_MAX),
  })
  // A loan amount without a loan is dropped, never kept hidden.
  .transform((profile) => ({
    ...profile,
    loanAmountEuros: profile.loanNeeded ? profile.loanAmountEuros : null,
  }));

export type BuyerProfileInput = z.input<typeof buyerProfileSchema>;
export type BuyerProfileField = keyof BuyerProfileInput;

/** « Savigny-sur-Orge, Épinay-sur-Orge » : the cities, once each, in the order typed. */
export function parseCities(text: string): string[] {
  const seen = new Set<string>();
  const cities: string[] = [];
  for (const part of text.split(/[,;\n]/)) {
    const city = part.trim().replace(/\s+/g, " ");
    const key = city.toLocaleLowerCase("fr-FR");
    if (city && !seen.has(key)) {
      seen.add(key);
      cities.push(city);
    }
  }
  return cities;
}

// The proof of financing (L2-02, SPEC-V2 4 and 8.9): its type among those
// Leenkey accepts, the date written on it, a PDF or an image.

export const FINANCING_DOCUMENT_TYPES = [
  "accord_principe",
  "attestation_courtier",
  "simulation_bancaire",
  "preuve_fonds_propres",
  "autre",
] as const;
export type FinancingDocumentType = (typeof FINANCING_DOCUMENT_TYPES)[number];

/** Kept at most (SPEC 8.9: 5 Mo), as the database checks it. */
export const FINANCING_FILE_MAX_BYTES = 5 * 1024 * 1024;
/**
 * Sent at most in one request: the host takes 4.5 MB, the server action 4 MB
 * (next.config.ts). A heavier image is reduced in the browser first; a
 * heavier PDF is refused (DECISIONS.md 2026-11-13).
 */
export const FINANCING_UPLOAD_MAX_BYTES = 3_800_000;
/** Beyond, the document is said old (SPEC 4: « de moins de 3 mois environ »), never refused. */
export const FINANCING_DOCUMENT_OLD_DAYS = 92;
const TEN_YEARS_DAYS = 3650;
const DAY = 86_400_000;

/** Today in Paris, YYYY-MM-DD. */
export function todayInParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

const isoDay = (value: string) => Date.parse(`${value}T00:00:00Z`);

export function financingDocumentSchema(now: Date = new Date()) {
  return z.object({
    type: z.enum(FINANCING_DOCUMENT_TYPES),
    documentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const day = isoDay(value);
        const today = isoDay(todayInParis(now));
        return Number.isFinite(day) && day <= today && day >= today - TEN_YEARS_DAYS * DAY;
      }),
  });
}

export type FinancingDocumentField = "type" | "documentDate" | "file";

/** A document dated more than about three months ago: an alert, never a refusal. */
export function isFinancingDocumentOld(documentDate: string, now: Date = new Date()): boolean {
  return isoDay(todayInParis(now)) - isoDay(documentDate) > FINANCING_DOCUMENT_OLD_DAYS * DAY;
}
