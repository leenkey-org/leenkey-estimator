import { energyMentions } from "@/leenkey/listings/energy-mentions";
import { bySection, listingKeyFacts } from "@/leenkey/listings/key-facts";
import type { PublicListing } from "@/leenkey/listings/queries";
import { formatNumericDateTime, type OfferDocument } from "@/leenkey/offers/document";
import { capitalize, formatHour, formatPrice } from "@/lib/format";
import { frListing } from "@/lib/i18n/sections/listing";
import { frVisits } from "@/lib/i18n/sections/visits";
import type { Database } from "@/types/database";
import { visitRange } from "./dates";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { listing: frListing, visits: frVisits } as const;

// The technical sheet of a property for a booked visit (DECISIONS.md
// 2026-11-24, request of Cédric of 2026-11-19): what the public page of the
// listing says (its characteristics with a value, its regulatory mentions),
// the date of the visit and, for who already reads it on the page of the
// visit, the exact address. Nothing the listing does not show: never the
// number nor the date of the DPE, never a document, never a contact detail.
// Drawn on demand like the PDF of an offer (leenkey/offers/pdf.tsx), from the
// same kind of document; nothing is stored.

const t = fr.visits.sheet;

type VisitStatus = Database["public"]["Enums"]["visit_status"];

export type SheetRole = "buyer" | "seller" | "admin";

/** A visit booked and not cancelled has its sheet: confirmed, or done. */
export function sheetAvailable(status: VisitStatus): boolean {
  return status === "confirmed" || status === "done";
}

/**
 * The exact address is written for who reads it on the page of the visit
 * (visit_address): the seller, and the buyer while the visit is confirmed.
 */
export function sheetShowsAddress(role: SheetRole, status: VisitStatus): boolean {
  return role === "seller" || (role === "buyer" && status === "confirmed");
}

export const visitSheetPath = (visitId: string) => `/visites/${visitId}/fiche-technique`;

/** « fiche-technique-LK-0001.pdf »: of the reference, its letters, digits and hyphens. */
export const visitSheetFileName = (reference: string) =>
  `fiche-technique-${reference.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;

export type SheetListing = Pick<
  PublicListing,
  | "reference"
  | "title"
  | "priceCents"
  | "city"
  | "postalCode"
  | "type"
  | "surfaceM2"
  | "carrezM2"
  | "rooms"
  | "bedrooms"
  | "floor"
  | "floorsTotal"
  | "hasElevator"
  | "hasBalcony"
  | "hasTerrace"
  | "hasGarden"
  | "hasParking"
  | "hasCellar"
  | "orientation"
  | "buildYear"
  | "isNewBuild"
  | "dpe"
  | "ges"
  | "heating"
  | "chargesMonthlyCents"
  | "propertyTaxYearlyCents"
  | "coproLots"
  | "energy"
>;

export type SheetVisit = {
  startsAt: string;
  endsAt: string;
  /** Null for who does not read it on the page of the visit. */
  address: { line: string; postalCode: string; city: string } | null;
};

type Row = { label: string; value: string };

// With its year: the sheet is a file its reader keeps.
const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** « Samedi 21 novembre 2026 à 10 h 30 (10 h 30 – 11 h) » */
export function sheetVisitDate(startsAt: string, endsAt: string): string {
  const day = capitalize(dayFormat.format(new Date(startsAt)));
  return `${day} ${t.at} ${formatHour(startsAt)} (${visitRange(startsAt, endsAt)})`;
}

/**
 * The sheet as a document: the property, the visit, then the characteristics
 * of the listing page in its groups (only those with a value), and the
 * regulatory mentions of the listing page as its notice.
 */
export function buildVisitSheet(
  listing: SheetListing,
  visit: SheetVisit,
  now: Date = new Date(),
): OfferDocument {
  const property: Row[] = [
    { label: t.listing, value: listing.title },
    { label: t.reference, value: listing.reference },
    { label: t.price, value: formatPrice(listing.priceCents) },
    { label: t.town, value: `${listing.postalCode} ${listing.city}`.trim() },
  ];
  const visitRows: Row[] = [
    { label: fr.visits.visit.when, value: sheetVisitDate(visit.startsAt, visit.endsAt) },
  ];
  if (visit.address) {
    visitRows.push({
      label: fr.visits.visit.where,
      value: `${visit.address.line}, ${visit.address.postalCode} ${visit.address.city}`,
    });
  }
  // The table of the listing page, without « Non renseigné » nor the rows the
  // analysis of the documents will fill.
  const groups = new Map<string, Row[]>();
  for (const fact of bySection(listingKeyFacts(listing, { documents: false }))) {
    if (fact.tone === "muted" || typeof fact.value !== "string") continue;
    const title = fact.section ?? fr.listing.facts.sections.property;
    groups.set(title, [...(groups.get(title) ?? []), { label: fact.label, value: fact.value }]);
  }
  const sections = [
    { title: t.sections.property, rows: property },
    { title: t.sections.visit, rows: visitRows },
    ...[...groups].map(([title, rows]) => ({ title, rows })),
  ];
  return {
    title: t.title,
    meta: [t.referenceLine(listing.reference), t.issued(formatNumericDateTime(now))],
    sections: sections.map((section, index) => ({
      number: index + 1,
      title: section.title,
      blocks: [{ kind: "rows", rows: section.rows }],
    })),
    notice: {
      title: fr.listing.energy.label,
      paragraphs: [
        ...energyMentions(listing),
        `${fr.listing.energy.risks} ${fr.listing.energy.risksLink}`,
        t.source,
      ],
    },
    footer: t.footer(listing.reference),
  };
}
