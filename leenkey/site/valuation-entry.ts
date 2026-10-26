// The way from the home page into the estimator with an address already
// chosen (DECISIONS 2026-10-26): its fields in the address of /estimer, read
// once by the wizard (leenkey/estimator/Wizard.tsx), which then starts a new
// analysis with them, as if the address had been picked at its step 2.

export type ValuationAddress = {
  /** « 12 Rue de la Gare 91360 Épinay-sur-Orge ». */
  label: string;
  postalCode: string;
  city: string;
  /** « 91 », from the context of the national address base. */
  department: string;
};

export const VALUATION_PARAMS = {
  label: "adresse",
  postalCode: "cp",
  city: "ville",
  department: "dep",
} as const;

/** An address of the national base: a label, 5 digits, a city, a department. */
function complete(address: ValuationAddress): boolean {
  return (
    address.label.length >= 3 &&
    address.label.length <= 200 &&
    /^\d{5}$/.test(address.postalCode) &&
    address.city.length > 0 &&
    address.city.length <= 100 &&
    /^(\d{2,3}|2[AB])$/.test(address.department)
  );
}

/**
 * « /estimer?adresse=…&cp=…&ville=…&dep=… » for an address of the national
 * base, « /estimer » otherwise (the estimator asks it again).
 */
export function valuationHref(address: ValuationAddress | null): string {
  if (!address || !complete(address)) return "/estimer";
  const params = new URLSearchParams();
  for (const [key, name] of Object.entries(VALUATION_PARAMS) as Array<
    [keyof ValuationAddress, string]
  >) {
    params.set(name, address[key]);
  }
  return `/estimer?${params.toString()}`;
}

/** The address given to /estimer, or null when it is not a whole one. */
export function readValuationAddress(params: URLSearchParams): ValuationAddress | null {
  const address = {
    label: params.get(VALUATION_PARAMS.label)?.trim() ?? "",
    postalCode: params.get(VALUATION_PARAMS.postalCode)?.trim() ?? "",
    city: params.get(VALUATION_PARAMS.city)?.trim() ?? "",
    department: params.get(VALUATION_PARAMS.department)?.trim() ?? "",
  };
  return complete(address) ? address : null;
}
