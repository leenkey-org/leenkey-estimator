// The addresses of the offer screens (SPEC-V2 13): the form in seven steps and
// its review, the page of an offer, its PDF.

export type OfferFormStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | "review";

const REVIEW = "relecture";

/** « /offres/nouvelle?listing=…&etape=3 »; the first step without `step`. */
export function offerFormPath(listingId: string, step?: OfferFormStep): string {
  const params = new URLSearchParams({ listing: listingId });
  if (step !== undefined) params.set("etape", step === "review" ? REVIEW : String(step));
  return `/offres/nouvelle?${params.toString()}`;
}

/** The step named by `?etape=`, null when it names none. */
export function readOfferFormStep(value: string | undefined): OfferFormStep | null {
  if (value === REVIEW) return "review";
  const step = Number(value);
  return step === 1 ||
    step === 2 ||
    step === 3 ||
    step === 4 ||
    step === 5 ||
    step === 6 ||
    step === 7
    ? step
    : null;
}

export const offerPath = (offerId: string) => `/offres/${offerId}`;
export const offerPdfPath = (offerId: string) => `/offres/${offerId}/pdf`;
/** The acceptance screen of a seller: never an acceptance in one click. */
export const offerAcceptPath = (offerId: string) => `/offres/${offerId}/accepter`;
