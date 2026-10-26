// « Combien vous économisez avec Leenkey » (docs/design-handoff/SPECS.md 3,
// item 6): the fees of an agency taken as 5 % of the price, a hypothesis said
// on the page (the top of the « 3 à 5 % » of /concept; DECISIONS Q61), against
// the price of the Accompagné plan. Amounts in cents (CLAUDE.md section 9).

/** The agency fees of the comparison: 5 %, in basis points. */
export const AGENCY_RATE_BASIS_POINTS = 500;

/** The sale prices offered, in euros (SPECS.md 3). */
export const SAVINGS_PRICES_EUROS = [250_000, 340_000, 450_000, 600_000] as const;
export const DEFAULT_SAVINGS_PRICE_EUROS = 340_000;

/** Accompagné when the plans table cannot be read (990 € TTC, CLAUDE.md section 1). */
export const FALLBACK_ACCOMPANIED_CENTS = 99_000;

export type Savings = {
  agencyCents: number;
  savedCents: number;
  /** Width of the bar of the plan against the one of the agency, in %, 2 at least. */
  planBarPercent: number;
};

export function savings(priceCents: number, planCents: number): Savings {
  const agencyCents = Math.round((priceCents * AGENCY_RATE_BASIS_POINTS) / 10_000);
  const savedCents = Math.max(0, agencyCents - planCents);
  const planBarPercent =
    agencyCents > 0 ? Math.max(2, Math.min(100, (planCents / agencyCents) * 100)) : 100;
  return { agencyCents, savedCents, planBarPercent };
}
