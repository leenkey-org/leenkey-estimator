import { ROUTES } from "@/leenkey/navigation/spaces";

// From an analysis of value to its listing (L1-13b, SPEC-V2 8.2 and 8.3):
// the creation of the property with ?estimation=, through the sign-up for an
// anonymous visitor. Their token stays in this browser, never in an address:
// the creation attaches the analysis with it (estimation_claim).

export type KeptEstimation = { id: string; claimToken: string | null };

const CLAIM_KEY = "lk_estimation_claim";

export function listingFromEstimationHref(kept: KeptEstimation | null | undefined): string {
  // Not kept (database out of reach): the creation without its answers.
  if (!kept) return ROUTES.newProperty;
  const creation = `${ROUTES.newProperty}?estimation=${kept.id}`;
  return kept.claimToken ? `${ROUTES.sellerSignUp}&next=${encodeURIComponent(creation)}` : creation;
}

/** The token of the last anonymous analysis, until the creation uses it. */
export function rememberClaim(kept: KeptEstimation): void {
  if (!kept.claimToken) return;
  try {
    localStorage.setItem(CLAIM_KEY, JSON.stringify({ id: kept.id, token: kept.claimToken }));
  } catch {
    // Private browsing: the creation goes on without the answers.
  }
}

/** The token kept for this analysis, if this browser has it. */
export function claimFor(estimationId: string): string | null {
  try {
    const raw = localStorage.getItem(CLAIM_KEY);
    const kept: unknown = raw ? JSON.parse(raw) : null;
    if (
      typeof kept === "object" &&
      kept !== null &&
      "id" in kept &&
      "token" in kept &&
      kept.id === estimationId &&
      typeof kept.token === "string"
    ) {
      return kept.token;
    }
  } catch {
    // Unreadable: as if absent.
  }
  return null;
}

export function forgetClaim(): void {
  try {
    localStorage.removeItem(CLAIM_KEY);
  } catch {
    // Nothing to do.
  }
}
