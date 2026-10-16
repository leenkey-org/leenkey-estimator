import type { SearchListing } from "./queries";
import type { PropertyCardData } from "@/components/shared/property-card";
import { NBSP, formatDateShort, parisDaysAgo } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

// Search result → PropertyCard (docs/DESIGN.md 10.3). Without photos until
// L1-12: the card shows facade.svg on stone.

const t = fr.search.card;
const SEPARATOR = `${NBSP}· `;

export function listingHref(slug: string): string {
  return `/annonce/${slug}`;
}

/** « Savigny-sur-Orge · centre ». */
export function placeLabel(city: string, district: string | null): string {
  return district ? `${city}${SEPARATOR}${district}` : city;
}

/** « 3e étage avec ascenseur », « Rez-de-chaussée »; nothing for a house or an unknown floor. */
export function floorLabel(listing: Pick<SearchListing, "type" | "floor" | "hasElevator">) {
  if (listing.type !== "appartement" || listing.floor === null) return undefined;
  if (listing.floor <= 0) return t.groundFloor;
  const floor = t.floor(fr.listing.ordinal(listing.floor));
  return listing.hasElevator ? t.withElevator(floor) : floor;
}

/** Up to three strengths: bedrooms, outdoor spaces, parking, cellar. */
export function highlights(listing: SearchListing): string[] {
  return [
    listing.bedrooms ? t.bedrooms(listing.bedrooms) : null,
    listing.hasBalcony ? fr.search.outdoor.balcon : null,
    listing.hasTerrace ? fr.search.outdoor.terrasse : null,
    listing.hasGarden ? fr.search.outdoor.jardin : null,
    listing.hasParking ? t.parking : null,
    listing.hasCellar ? t.cellar : null,
  ]
    .filter((value): value is string => value !== null)
    .slice(0, 3);
}

/** « Publié aujourd'hui », « Publié hier », « Publié il y a 3 jours », « Publié le 18 sept. ». */
export function publishedNote(publishedAt: string | null, now: Date = new Date()) {
  if (!publishedAt) return undefined;
  const days = parisDaysAgo(publishedAt, now);
  if (days <= 0) return t.publishedToday;
  if (days === 1) return t.publishedYesterday;
  if (days < 7) return t.publishedDaysAgo(days);
  return t.publishedOn(formatDateShort(publishedAt, now));
}

export function toPropertyCard(listing: SearchListing, now: Date = new Date()): PropertyCardData {
  const note = publishedNote(listing.publishedAt, now);
  return {
    href: listingHref(listing.slug),
    priceCents: listing.priceCents,
    propertyType: listing.type,
    rooms: listing.type === "terrain" ? null : listing.rooms,
    surfaceM2: listing.surfaceM2,
    location: placeLabel(listing.city, listing.district),
    locationDetail: floorLabel(listing),
    dpe: listing.dpe,
    photo: null,
    highlights: highlights(listing),
    note: note ? { text: note } : undefined,
  };
}
