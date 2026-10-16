import type { PublicListing } from "./queries";
import type { KeyFact } from "@/components/shared/key-facts-table";
import { formatPrice, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

// « Ce que vous savez avant de visiter » (SPEC-V2 8.5): one table with the
// complete characteristics and what helps before a visit. Votes of works and
// procedures come from the analysis of the documents (L3): « Non renseigné »
// until then. Documents and « Demander l'accès » come with L3-04.

const t = fr.listing.facts;
const notProvided: KeyFact["tone"] = "muted";

function fact(label: string, value: string | null | undefined): KeyFact {
  return value ? { label, value } : { label, value: t.notProvided, tone: notProvided };
}

function yesNo(value: boolean | null): string | null {
  if (value === null) return null;
  return value ? t.yes : t.no;
}

function floorFact(listing: PublicListing): KeyFact {
  const { floor, floorsTotal } = listing;
  if (floor === null) return fact(t.floor, null);
  const label = floor === 0 ? t.groundFloor : floor < 0 ? t.basement : fr.listing.ordinal(floor);
  return fact(t.floor, floorsTotal ? t.floorOf(label, floorsTotal) : label);
}

function outdoorValue(listing: PublicListing): string | null {
  const spaces = [
    [listing.hasBalcony, fr.search.outdoor.balcon],
    [listing.hasTerrace, fr.search.outdoor.terrasse],
    [listing.hasGarden, fr.search.outdoor.jardin],
  ] as const;
  if (spaces.every(([value]) => value === null)) return null;
  const present = spaces.filter(([value]) => value).map(([, label]) => label);
  if (present.length === 0) return t.none;
  return [present[0], ...present.slice(1).map((label) => label.toLowerCase())].join(", ");
}

function constructionValue(listing: PublicListing): string | null {
  if (listing.buildYear) {
    return listing.isNewBuild ? t.buildYearNew(listing.buildYear) : String(listing.buildYear);
  }
  return listing.isNewBuild ? t.newBuild : null;
}

export function listingKeyFacts(listing: PublicListing): KeyFact[] {
  const money = (cents: number | null, format: (amount: string) => string) =>
    cents === null ? null : format(formatPrice(cents));
  const taxes = fact(t.propertyTax, money(listing.propertyTaxYearlyCents, t.propertyTaxValue));

  if (listing.type === "terrain") {
    return [
      taxes,
      fact(t.type, fr.propertyType.terrain),
      fact(t.landSurface, formatSurface(listing.surfaceM2)),
    ];
  }

  const flat = listing.type === "appartement";
  // A house in a co-ownership also has charges, lots, votes and procedures.
  const coOwnership = flat || listing.coproLots !== null || listing.chargesMonthlyCents !== null;
  const facts: Array<KeyFact | null> = [
    coOwnership ? fact(t.charges, money(listing.chargesMonthlyCents, t.chargesValue)) : null,
    taxes,
    fact(t.dpe, listing.dpe),
    fact(t.ges, listing.ges),
    fact(t.heating, listing.heating),
    fact(t.type, fr.search.types[listing.type]),
    fact(t.surface, formatSurface(listing.surfaceM2)),
    flat ? fact(t.carrez, listing.carrezM2 ? formatSurface(listing.carrezM2) : null) : null,
    listing.rooms > 0 ? fact(t.rooms, String(listing.rooms)) : null,
    fact(t.bedrooms, listing.bedrooms === null ? null : String(listing.bedrooms)),
    flat
      ? floorFact(listing)
      : fact(t.levels, listing.floorsTotal ? String(listing.floorsTotal) : null),
    flat ? fact(t.elevator, yesNo(listing.hasElevator)) : null,
    fact(t.orientation, listing.orientation),
    fact(t.construction, constructionValue(listing)),
    fact(t.outdoor, outdoorValue(listing)),
    fact(t.parking, yesNo(listing.hasParking)),
    fact(t.cellar, yesNo(listing.hasCellar)),
    coOwnership
      ? fact(t.coproLots, listing.coproLots === null ? null : String(listing.coproLots))
      : null,
    coOwnership ? fact(t.votedWorks, null) : null,
    coOwnership ? fact(t.procedures, null) : null,
  ];
  return facts.filter((item): item is KeyFact => item !== null);
}
