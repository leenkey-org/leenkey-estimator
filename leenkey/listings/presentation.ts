import type { PublicListing } from "./queries";
import type { GalleryPhoto } from "@/components/shared/gallery";
import type { KeyFigure } from "@/components/shared/key-figures";
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
 * Contact and visit need a buyer account (SPEC 8.5): sign-up with the return
 * to the listing. The conversation itself comes with L1-21.
 */
export function buyerSignUpHref(slug: string): string {
  const params = new URLSearchParams({ role: "buyer", next: `/annonce/${slug}` });
  return `/inscription?${params.toString()}`;
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
