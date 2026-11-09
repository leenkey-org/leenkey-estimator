import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ListingEnergy, PublicListing } from "./queries";

const t = fr.listing.energy;

/** A listing without the mentions (land, sent before L1-65 and not completed). */
export const NO_ENERGY: ListingEnergy = {
  exempt: false,
  date: null,
  costMinCents: null,
  costMaxCents: null,
  priceYear: null,
};

const DAY = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * The mentions of the DPE of a listing for sale (L1-65, DECISIONS Q77), in
 * their order: « non soumis », or « consommation excessive » (classes F and
 * G), the range of the costs with the year of their prices, the date of the
 * DPE. Empty for land, or a listing sent before L1-65 and not completed yet
 * (what it lacks is not invented). The link to Géorisques goes with every
 * listing, land too (ListingBody).
 */
export function energyMentions(listing: Pick<PublicListing, "type" | "dpe" | "energy">): string[] {
  if (listing.type === "terrain") return [];
  const { exempt, date, costMinCents, costMaxCents, priceYear } = listing.energy;
  if (exempt) return [t.exempt];
  return [
    listing.dpe === "F" || listing.dpe === "G" ? t.excessive : null,
    costMinCents !== null && costMaxCents !== null && priceYear !== null
      ? t.costs(formatPrice(costMinCents), formatPrice(costMaxCents), priceYear)
      : null,
    date ? t.date(DAY.format(new Date(`${date}T00:00:00Z`))) : null,
  ].filter((line): line is string => line !== null);
}
