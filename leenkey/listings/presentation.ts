import {
  ArrowUpDown,
  Euro,
  Leaf,
  Sparkles,
  SquareParking,
  Sun,
  Trees,
  type LucideIcon,
} from "lucide-react";
import type { PublicListing } from "./queries";
import type { GalleryPhoto } from "@/components/shared/gallery";
import type { KeyFigure } from "@/components/shared/key-figures";
import { newConversationPath } from "@/leenkey/messaging/presentation";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { floorLabel, placeLabel } from "@/leenkey/search/cards";
import { NBSP, formatPrice, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { slugify } from "@/lib/slug";
import { searchHref } from "@/lib/validations/search";

// What the listing page shows of a listing, as plain values (unit-tested):
// summary, key figures, place, SEO title, structured data, action links.

const t = fr.listing;
const SEPARATOR = `${NBSP}· `;

/** « Appartement 3 pièces », « Terrain », « Maison 5 pièces ». */
function kindLabel(listing: Pick<PublicListing, "type" | "rooms">): string {
  const type = fr.propertyType[listing.type];
  const withRooms = listing.type !== "terrain" && listing.rooms > 0;
  return withRooms ? `${type} ${t.summary.rooms(listing.rooms)}` : type;
}

/** « Appartement 3 pièces · 68 m² » (Open Graph image, alt texts). */
export function listingSummary(listing: Pick<PublicListing, "type" | "rooms" | "surfaceM2">) {
  return `${kindLabel(listing)}${SEPARATOR}${formatSurface(listing.surfaceM2)}`;
}

/**
 * Alternative text of a photo (docs/DESIGN.md 7.1): « Séjour, appartement 3
 * pièces à Savigny-sur-Orge », or « Photo 2 sur 12, appartement 3 pièces à
 * Savigny-sur-Orge » without a caption.
 */
export function photoAlt(
  listing: Pick<PublicListing, "type" | "rooms" | "city">,
  caption: string | null,
  index: number,
  total: number,
): string {
  const kind = kindLabel(listing);
  const subject = `${kind.charAt(0).toLocaleLowerCase("fr-FR")}${kind.slice(1)} ${fr.search.place.at(listing.city)}`;
  return caption ? `${caption}, ${subject}` : t.photoAlt(index + 1, total, subject);
}

/** The photos of the gallery, in their order, with their alternative text. */
export function galleryPhotos(
  listing: Pick<PublicListing, "type" | "rooms" | "city" | "photos">,
): GalleryPhoto[] {
  return listing.photos.map((photo, index) => ({
    src: photoUrl(photo.path),
    alt: photoAlt(listing, photo.caption, index, listing.photos.length),
  }));
}

/** SPEC 8.5: « Appartement 3 pièces 68 m² à Savigny-sur-Orge · 350 000 € · Leenkey ». */
export function listingMetaTitle(
  listing: Pick<PublicListing, "type" | "rooms" | "surfaceM2" | "city" | "priceCents">,
): string {
  return t.metaTitle(
    `${kindLabel(listing)} ${formatSurface(listing.surfaceM2)}`,
    fr.search.place.at(listing.city),
    formatPrice(listing.priceCents),
  );
}

/** First sentences of the description, about 155 characters, for the meta description. */
export function listingMetaDescription(description: string): string {
  const text = description.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 100 ? cut.lastIndexOf(" ") : 157)}…`;
}

/** « Savigny-sur-Orge · centre », then « · 3e étage avec ascenseur » on desktop. */
export function listingPlace(listing: PublicListing) {
  return {
    place: placeLabel(listing.city, listing.district),
    detail: floorLabel(listing),
  };
}

function floorValue(floor: number): string {
  if (floor === 0) return t.keyFigures.groundFloor;
  if (floor < 0) return t.keyFigures.basement;
  return t.ordinal(floor);
}

/**
 * « Appartement à Juvisy-sur-Orge · centre »: the type and the place, its
 * district when given (SPEC-V2 8.5), over the facts line (L1-60).
 */
export function listingOverview(
  listing: Pick<PublicListing, "type" | "city" | "district">,
): string {
  const place = fr.search.place.at(listing.city);
  return t.overview(
    fr.propertyType[listing.type],
    listing.district ? `${place}${SEPARATOR}${listing.district}` : place,
  );
}

/**
 * « 82 m² · 4 pièces · 3 chambres »: the surface, the rooms, then the
 * bedrooms, or the floor (levels of a house) without them, in one line under
 * the type and the place (L1-60, in the way of Airbnb). Three at most: two
 * separators (docs/DESIGN.md 1); never the orientation nor the year.
 */
export function listingFactsLine(listing: PublicListing): string {
  const k = t.keyFigures;
  return listingKeyFigures(listing)
    .filter(({ label }) => label !== k.orientation && label !== k.buildYear)
    .slice(0, 3)
    .map(({ value, label }) => {
      if (label === k.surface || label === k.land) return value;
      if (label === k.floor) {
        if (value === k.groundFloor) return t.facts.groundFloor;
        if (value === k.basement) return t.facts.basement;
      }
      return `${value}${NBSP}${label}`;
    })
    .join(SEPARATOR);
}

export type ListingHighlight = { key: string; icon: LucideIcon; title: string; text: string };

/**
 * The strong points of a listing (L1-60, the « points forts » of Airbnb),
 * three at most and from its data only: no commission first (the promise of
 * Leenkey to a buyer), then the outdoor space, the lift from the 2nd floor,
 * the parking, a good energy class (A to C) and a new build.
 */
export function listingHighlights(listing: PublicListing): ListingHighlight[] {
  const h = t.highlights;
  const outdoor = listing.hasGarden
    ? { title: h.garden, icon: Trees }
    : listing.hasTerrace
      ? { title: h.terrace, icon: Sun }
      : listing.hasBalcony
        ? { title: h.balcony, icon: Sun }
        : null;
  const candidates: Array<ListingHighlight | null> = [
    { key: "commission", icon: Euro, ...h.commission },
    outdoor ? { key: "outdoor", ...outdoor, text: h.outdoorText } : null,
    listing.hasElevator && listing.floor !== null && listing.floor >= 2
      ? {
          key: "elevator",
          icon: ArrowUpDown,
          title: h.elevator.title,
          text: h.elevator.text(t.ordinal(listing.floor)),
        }
      : null,
    listing.hasParking
      ? { key: "parking", icon: SquareParking, title: h.parking.title, text: h.parking.text }
      : null,
    listing.dpe && ["A", "B", "C"].includes(listing.dpe)
      ? {
          key: "energy",
          icon: Leaf,
          title: h.energy.title(listing.dpe),
          text: h.energy.text,
        }
      : null,
    listing.isNewBuild
      ? {
          key: "new",
          icon: Sparkles,
          title: h.newBuild.title,
          text: h.newBuild.text(listing.buildYear),
        }
      : null,
  ];
  return candidates.filter((item): item is ListingHighlight => item !== null).slice(0, 3);
}

/**
 * Key figures (docs/DESIGN.md 10.2, 12.7, 12.8): surface, rooms, bedrooms,
 * floor (levels for a house), then orientation and year from 1024 px. Unknown
 * values are left out; a plot of land only has its surface.
 */
export function listingKeyFigures(listing: PublicListing): KeyFigure[] {
  if (listing.type === "terrain") {
    return [{ value: formatSurface(listing.surfaceM2), label: t.keyFigures.land }];
  }
  const k = t.keyFigures;
  const figures: Array<KeyFigure | null> = [
    { value: formatSurface(listing.surfaceM2), label: k.surface },
    listing.rooms > 0 ? { value: String(listing.rooms), label: k.rooms(listing.rooms) } : null,
    listing.bedrooms !== null
      ? { value: String(listing.bedrooms), label: k.bedrooms(listing.bedrooms) }
      : null,
    listing.type === "appartement"
      ? listing.floor !== null
        ? { value: floorValue(listing.floor), label: k.floor }
        : null
      : listing.floorsTotal
        ? { value: String(listing.floorsTotal), label: k.levels(listing.floorsTotal) }
        : null,
    listing.orientation ? { value: listing.orientation, label: k.orientation } : null,
    listing.buildYear ? { value: String(listing.buildYear), label: k.buildYear } : null,
  ];
  return figures.filter((figure): figure is KeyFigure => figure !== null);
}

/** Search of the commune of the listing (breadcrumb). */
export function communeSearchHref(city: string): string {
  return searchHref({ filters: { location: slugify(city) } });
}

/**
 * A buyer account is needed (SPEC 8.5): the sign-up, then back to the listing
 * (the favourite) or to `next`.
 */
export function buyerSignUpHref(slug: string, next = `/annonce/${slug}`): string {
  const params = new URLSearchParams({ role: "buyer", next });
  return `/inscription?${params.toString()}`;
}

export type ContactLinks = { contact: string; visit: string; signedIn: boolean };

/**
 * « Contacter le vendeur » and « Demander une visite » (SPEC 8.5, 8.6): the
 * first message to the seller, about a visit for the second (until the
 * visits of L3); without a session, the sign-up first, then that message.
 */
export function contactLinks(
  listing: Pick<PublicListing, "id" | "slug">,
  signedIn: boolean,
): ContactLinks {
  const contact = newConversationPath(listing.id);
  const visit = newConversationPath(listing.id, { visit: true });
  return signedIn
    ? { contact, visit, signedIn }
    : {
        contact: buyerSignUpHref(listing.slug, contact),
        visit: buyerSignUpHref(listing.slug, visit),
        signedIn,
      };
}

const SCHEMA_TYPE: Record<PublicListing["type"], string> = {
  appartement: "Apartment",
  maison: "House",
  terrain: "Place",
  autre: "Accommodation",
};

/**
 * Structured data RealEstateListing + Offer (SPEC 8.5, schema.org). No street
 * address: the town and its postal code only.
 */
export function listingJsonLd(listing: PublicListing, url: string, image: string) {
  const place = {
    "@type": "PostalAddress",
    addressLocality: listing.city,
    postalCode: listing.postalCode,
    addressCountry: "FR",
  };
  const itemOffered =
    listing.type === "terrain"
      ? { "@type": SCHEMA_TYPE.terrain, name: listingSummary(listing), address: place }
      : {
          "@type": SCHEMA_TYPE[listing.type],
          name: listingSummary(listing),
          address: place,
          floorSize: { "@type": "QuantitativeValue", value: listing.surfaceM2, unitCode: "MTK" },
          ...(listing.rooms > 0 ? { numberOfRooms: listing.rooms } : {}),
          ...(listing.bedrooms !== null ? { numberOfBedrooms: listing.bedrooms } : {}),
        };
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description,
    url,
    image,
    ...(listing.publishedAt ? { datePosted: listing.publishedAt } : {}),
    offers: {
      "@type": "Offer",
      price: Math.round(listing.priceCents / 100),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url,
      itemOffered,
    },
  };
}

/** JSON for a <script type="application/ld+json">: « < » escaped, the text cannot close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
