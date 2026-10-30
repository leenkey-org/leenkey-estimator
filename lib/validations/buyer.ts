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
