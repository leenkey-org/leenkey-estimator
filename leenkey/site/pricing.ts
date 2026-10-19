// « Mon économie vs agence » of /tarifs (V1 page): the saving of a paid plan
// against the agency fee of the example of the comparison of the home page
// (« Sur une vente à 350 000 € », « ≈ 15 000 € »). An indication, said as
// such on the page. Pure, for the tests.

/** Sale price of the example. */
export const EXAMPLE_SALE_CENTS = 35_000_000;
/** Agency fee of the example, about 4.3 % of it. */
export const EXAMPLE_AGENCY_FEE_CENTS = 1_500_000;

/** Saving of a plan against the agency, never below zero; none for a free plan. */
export function savingCents(priceCents: number): number | null {
  if (priceCents <= 0) return null;
  return Math.max(0, EXAMPLE_AGENCY_FEE_CENTS - priceCents);
}
