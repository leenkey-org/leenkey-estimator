import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ListingEnergy, PublicListing } from "./queries";

const t = fr.listing.energy;

/** A listing without the mentions (land, sent before L1-65 and not completed). */
export const NO_ENERGY: ListingEnergy = {
  kind: "logement",
  exempt: false,
  exemptionReason: null,
  costMinCents: null,
  costMaxCents: null,
  priceYear: null,
  kwhM2Year: null,
  gesKgM2Year: null,
  excessive: false,
};

/**
 * The mentions of the DPE of a listing for sale (L1-65, L1-66; answers of
 * Cédric to Q77), in their order: « Non soumis au DPE (motif : …) », or
 * « consommation excessive » (the classes of the rule of a home: F and G) and
 * the range of the costs with the year of their prices. Business premises
 * carry neither: their rule asks for none. Empty for land, or a listing sent
 * before L1-65 and not completed yet (what it lacks is not invented). The
 * date of the DPE is not shown: with the classes and the town, the open data
 * of ADEME gives the address. The link to Géorisques goes with every listing,
 * land too (ListingBody).
 */
export function energyMentions(listing: Pick<PublicListing, "type" | "energy">): string[] {
  if (listing.type === "terrain") return [];
  const { exempt, exemptionReason, excessive, costMinCents, costMaxCents, priceYear } =
    listing.energy;
  if (exempt) return [exemptionReason ? t.exemptFor(exemptionReason) : t.exempt];
  return [
    excessive ? t.excessive : null,
    costMinCents !== null && costMaxCents !== null && priceYear !== null
      ? t.costs(formatPrice(costMinCents), formatPrice(costMaxCents), priceYear)
      : null,
  ].filter((line): line is string => line !== null);
}
