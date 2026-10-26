// The way from the home page into the estimator with an address already
// chosen (DECISIONS 2026-10-26): its fields in the address of /estimer, read
// once by the wizard (leenkey/estimator/Wizard.tsx), which then starts a new
// analysis with them, as if the address had been picked at its step 2.

export type ValuationAddress = {
  /** « 12 Rue de la Gare 91360 Épinay-sur-Orge ». */
  label: string;
  postalCode: string;
  city: string;
  /** « 91 », from the postal code (the engine of the estimator reads it). */
  department: string;
};

export const VALUATION_PARAMS = {
  label: "adresse",
  postalCode: "cp",
  city: "ville",
} as const;

/**
 * The department of a French postal code: its two first digits, three for
 * the overseas departments (971 to 976), 2A or 2B for Corsica.
 */
export function departmentOf(postalCode: string): string | null {
  if (!/^\d{5}$/.test(postalCode)) return null;
  if (postalCode.startsWith("97")) return postalCode.slice(0, 3);
  if (postalCode.startsWith("20")) return Number(postalCode) < 20200 ? "2A" : "2B";
  if (postalCode.startsWith("00")) return null;
  return postalCode.slice(0, 2);
}

/**
 * An address of the national base: a label that ends with its postal code
 * and its city, the department taken from the postal code, never from the
 * address of the page (it sets the prices of the estimator).
 */
function whole(label: string, postalCode: string, city: string): ValuationAddress | null {
  const department = departmentOf(postalCode);
  if (!department || label.length < 3 || label.length > 200) return null;
  if (city.length === 0 || city.length > 100 || !label.endsWith(`${postalCode} ${city}`)) {
    return null;
  }
  return { label, postalCode, city, department };
}

/**
 * « /estimer?adresse=…&cp=…&ville=… » for an address of the national base,
 * « /estimer » otherwise (the estimator asks it again).
 */
export function valuationHref(address: ValuationAddress | null): string {
  const checked = address ? whole(address.label, address.postalCode, address.city) : null;
  if (!checked) return "/estimer";
  const params = new URLSearchParams({
    [VALUATION_PARAMS.label]: checked.label,
    [VALUATION_PARAMS.postalCode]: checked.postalCode,
    [VALUATION_PARAMS.city]: checked.city,
  });
  return `/estimer?${params.toString()}`;
}

/** The address given to /estimer, or null when it is not a whole one. */
export function readValuationAddress(params: URLSearchParams): ValuationAddress | null {
  return whole(
    params.get(VALUATION_PARAMS.label)?.trim() ?? "",
    params.get(VALUATION_PARAMS.postalCode)?.trim() ?? "",
    params.get(VALUATION_PARAMS.city)?.trim() ?? "",
  );
}
