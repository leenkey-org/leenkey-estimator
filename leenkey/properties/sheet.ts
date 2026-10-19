import type { KeyFact } from "@/components/shared/key-facts-table";
import type { KeyFigure } from "@/components/shared/key-figures";
import { listingKeyFacts } from "@/leenkey/listings/key-facts";
import { listingSummary } from "@/leenkey/listings/presentation";
import { formatPrice, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { missingCharacteristics } from "@/lib/validations/property";
import type { Database } from "@/types/database";
import { creationStep } from "./creation";
import type { SellerProperty } from "./queries";

// Rules of the page of a property (L1-14, SPEC-V2 8.3): its tabs, its key
// figures and the actions its status allows. Pure: unit tested.

type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type SheetTab = "infos" | "photos" | "annonce";

/** Address of a tab of the page of a property; Infos is the page itself. */
export function sheetHref(propertyId: string, tab: SheetTab = "infos"): string {
  const base = `/vendeur/biens/${propertyId}`;
  return tab === "infos" ? base : `${base}/${tab}`;
}

export function sheetTabs(propertyId: string): { href: string; label: string }[] {
  const t = fr.properties.sheet.tabs;
  return [
    { href: sheetHref(propertyId), label: t.infos },
    { href: sheetHref(propertyId, "photos"), label: t.photos },
    { href: sheetHref(propertyId, "annonce"), label: t.listing },
  ];
}

/**
 * What the seller can do from the page (SPEC-V2 8.3), by status: a draft
 * resumes or is deleted, a rejected listing is corrected through the steps
 * of the creation, an online one is paused or marked as sold, a paused one
 * goes back online or is sold. Sent for review, suspended by Leenkey or
 * sold: nothing (the SQL functions refuse it too).
 */
export type StatusAction = "resume" | "fix" | "view" | "pause" | "publish" | "sold" | "delete";

export function statusActions(status: ListingStatus | null): StatusAction[] {
  switch (status) {
    case null:
    case "draft":
      return ["resume", "delete"];
    case "rejected":
      return ["fix"];
    case "published":
      return ["view", "pause", "sold"];
    case "paused":
      return ["publish", "sold"];
    case "pending":
    case "suspended":
    case "sold":
      return [];
  }
}

/** Where the creation resumes: the step after the last one filled. */
export function creationHref(property: Pick<SellerProperty, "id" | "characteristics" | "listing">) {
  return `/vendeur/biens/${property.id}/${creationStep(property.characteristics, property.listing)}`;
}

/** Name of a property: the title of its listing, or « Appartement 3 pièces · 68 m² ». */
export function propertyName(property: Pick<SellerProperty, "characteristics" | "listing">) {
  if (property.listing) return property.listing.title;
  const { type, rooms, surfaceM2 } = property.characteristics;
  return type !== null && rooms !== null && surfaceM2 !== null
    ? listingSummary({ type, rooms, surfaceM2 })
    : fr.properties.list.untitled;
}

/** Price per square metre, whole euros (in cents); null without a surface. */
export function pricePerM2Cents(priceCents: number, surfaceM2: number | null): number | null {
  if (surfaceM2 === null || surfaceM2 <= 0) return null;
  return Math.round(priceCents / surfaceM2 / 100) * 100;
}

function floorValue(floor: number): string {
  const k = fr.listing.keyFigures;
  if (floor === 0) return k.groundFloor;
  if (floor < 0) return k.basement;
  return fr.listing.ordinal(floor);
}

/**
 * Key figures at the top of the page (SPEC-V2 8.3): surface, rooms, floor
 * (levels for a house), price per m². Unknown values are left out: a draft
 * just started has none.
 */
export function sheetFigures(
  property: Pick<SellerProperty, "characteristics" | "listing">,
): KeyFigure[] {
  const k = fr.listing.keyFigures;
  const { type, surfaceM2, rooms, floor, floorsTotal } = property.characteristics;
  const perM2 = property.listing ? pricePerM2Cents(property.listing.priceCents, surfaceM2) : null;
  const figures: Array<KeyFigure | null> = [
    surfaceM2 !== null
      ? { value: formatSurface(surfaceM2), label: type === "terrain" ? k.land : k.surface }
      : null,
    type !== "terrain" && rooms !== null && rooms > 0
      ? { value: String(rooms), label: k.rooms(rooms) }
      : null,
    type === "appartement"
      ? floor !== null
        ? { value: floorValue(floor), label: k.floor }
        : null
      : type === "maison" && floorsTotal
        ? { value: String(floorsTotal), label: k.levels(floorsTotal) }
        : null,
    perM2 !== null ? { value: formatPrice(perM2), label: fr.properties.sheet.pricePerM2 } : null,
  ];
  return figures.filter((figure): figure is KeyFigure => figure !== null);
}

/**
 * The characteristics of the Infos tab, in the table of the public page,
 * without the rows the documents will fill (L3); null while the type, the
 * surface or the rooms are missing (a draft).
 */
export function sellerFacts(
  property: Pick<SellerProperty, "characteristics" | "orientation">,
): KeyFact[] | null {
  const c = property.characteristics;
  if (missingCharacteristics(c).length > 0 || c.type === null || c.surfaceM2 === null) return null;
  const has = (feature: (typeof c.features)[number]) => c.features.includes(feature);
  const cents = (euros: number | null) => (euros === null ? null : Math.round(euros * 100));
  return listingKeyFacts(
    {
      type: c.type,
      surfaceM2: c.surfaceM2,
      carrezM2: c.carrezM2,
      rooms: c.rooms ?? 0,
      bedrooms: c.bedrooms,
      floor: c.floor,
      floorsTotal: c.floorsTotal,
      hasElevator: has("elevator"),
      hasBalcony: has("balcony"),
      hasTerrace: has("terrace"),
      hasGarden: has("garden"),
      hasParking: has("parking"),
      hasCellar: has("cellar"),
      orientation: property.orientation,
      buildYear: c.buildYear,
      isNewBuild: c.isNewBuild,
      dpe: c.dpe,
      ges: c.ges,
      heating: c.heating,
      chargesMonthlyCents: cents(c.chargesMonthlyEuros),
      propertyTaxYearlyCents: cents(c.propertyTaxYearlyEuros),
      coproLots: c.coproLots,
    },
    { documents: false },
  );
}
