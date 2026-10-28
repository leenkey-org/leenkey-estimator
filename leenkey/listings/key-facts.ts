import {
  Archive,
  ArrowUpDown,
  BedDouble,
  Building2,
  Compass,
  DoorOpen,
  Factory,
  Flame,
  Hammer,
  HardHat,
  House,
  LandPlot,
  Landmark,
  Layers,
  Leaf,
  Receipt,
  Ruler,
  Scale,
  SquareDashed,
  SquareParking,
  Trees,
  type LucideIcon,
} from "lucide-react";
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

/** What the table needs of a property: its public listing, or the seller's own property (L1-14). */
export type FactsInput = Pick<
  PublicListing,
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
>;

// Groups and pictograms of the grid of the listing page (KeyFactsGrid, L1-55);
// the table of the seller's page and of the back office ignores them.
const PROPERTY = t.sections.property;
const ENERGY = t.sections.energy;
const COSTS = t.sections.costs;
const SECTIONS: readonly string[] = [PROPERTY, ENERGY, COSTS, t.sections.costsOnly];

/** « Coûts » alone for a property outside a co-ownership. */
function withoutCoOwnership(facts: KeyFact[]): KeyFact[] {
  return facts.map((fact) =>
    fact.section === COSTS ? { ...fact, section: t.sections.costsOnly } : fact,
  );
}

const PRESENTATION: Record<string, { icon: LucideIcon; section: string }> = {
  [t.charges]: { icon: Receipt, section: COSTS },
  [t.propertyTax]: { icon: Landmark, section: COSTS },
  [t.coproLots]: { icon: Building2, section: COSTS },
  [t.votedWorks]: { icon: HardHat, section: COSTS },
  [t.procedures]: { icon: Scale, section: COSTS },
  [t.dpe]: { icon: Leaf, section: ENERGY },
  [t.ges]: { icon: Factory, section: ENERGY },
  [t.heating]: { icon: Flame, section: ENERGY },
  [t.type]: { icon: House, section: PROPERTY },
  [t.surface]: { icon: Ruler, section: PROPERTY },
  [t.landSurface]: { icon: LandPlot, section: PROPERTY },
  [t.carrez]: { icon: SquareDashed, section: PROPERTY },
  [t.rooms]: { icon: DoorOpen, section: PROPERTY },
  [t.bedrooms]: { icon: BedDouble, section: PROPERTY },
  [t.floor]: { icon: Layers, section: PROPERTY },
  [t.levels]: { icon: Layers, section: PROPERTY },
  [t.elevator]: { icon: ArrowUpDown, section: PROPERTY },
  [t.orientation]: { icon: Compass, section: PROPERTY },
  [t.construction]: { icon: Hammer, section: PROPERTY },
  [t.outdoor]: { icon: Trees, section: PROPERTY },
  [t.parking]: { icon: SquareParking, section: PROPERTY },
  [t.cellar]: { icon: Archive, section: PROPERTY },
};

function fact(label: string, value: string | null | undefined): KeyFact {
  const presentation = PRESENTATION[label];
  return value
    ? { label, value, ...presentation }
    : { label, value: t.notProvided, tone: notProvided, ...presentation };
}

/**
 * What a buyer looks for before a visit first (SPEC-V2 8.5 point 6): the
 * energy, the costs, then what the line under the title does not say (L1-60).
 * The type, surface, rooms and bedrooms come last: that line gives them.
 */
const PREVIEW_ORDER: readonly string[] = [
  t.dpe,
  t.ges,
  t.heating,
  t.charges,
  t.propertyTax,
  t.carrez,
  t.outdoor,
  t.parking,
  t.elevator,
  t.floor,
  t.levels,
  t.construction,
  t.orientation,
  t.cellar,
  t.coproLots,
];

/**
 * The first `count` informed facts in that order, without their group: the
 * page shows them before « Afficher les N caractéristiques » (L1-60).
 * « Non renseigné » waits for the dialog.
 */
export function factsPreview(facts: readonly KeyFact[], count: number): KeyFact[] {
  const rank = (fact: KeyFact) => {
    const index = PREVIEW_ORDER.indexOf(fact.label);
    return index === -1 ? PREVIEW_ORDER.length : index;
  };
  return facts
    .filter((fact) => fact.tone !== "muted")
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, count)
    .map((fact) => ({ ...fact, section: undefined }));
}

/** The facts in the order of the groups of the grid: the property, its energy, its costs. */
export function bySection(facts: readonly KeyFact[]): KeyFact[] {
  const rank = (fact: KeyFact) => {
    const index = SECTIONS.indexOf(fact.section ?? "");
    return index === -1 ? SECTIONS.length : index;
  };
  return [...facts].sort((a, b) => rank(a) - rank(b));
}

function yesNo(value: boolean | null): string | null {
  if (value === null) return null;
  return value ? t.yes : t.no;
}

function floorFact(listing: FactsInput): KeyFact {
  const { floor, floorsTotal } = listing;
  if (floor === null) return fact(t.floor, null);
  const label = floor === 0 ? t.groundFloor : floor < 0 ? t.basement : fr.listing.ordinal(floor);
  return fact(t.floor, floorsTotal ? t.floorOf(label, floorsTotal) : label);
}

function outdoorValue(listing: FactsInput): string | null {
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

function constructionValue(listing: FactsInput): string | null {
  if (listing.buildYear) {
    return listing.isNewBuild ? t.buildYearNew(listing.buildYear) : String(listing.buildYear);
  }
  return listing.isNewBuild ? t.newBuild : null;
}

/**
 * `documents: false` leaves out the rows that the analysis of the documents
 * will fill (L3), « Non renseigné » until then: on the seller's page.
 */
export function listingKeyFacts(
  listing: FactsInput,
  { documents = true }: { documents?: boolean } = {},
): KeyFact[] {
  const money = (cents: number | null, format: (amount: string) => string) =>
    cents === null ? null : format(formatPrice(cents));
  const taxes = fact(t.propertyTax, money(listing.propertyTaxYearlyCents, t.propertyTaxValue));

  if (listing.type === "terrain") {
    return withoutCoOwnership([
      taxes,
      fact(t.type, fr.propertyType.terrain),
      fact(t.landSurface, formatSurface(listing.surfaceM2)),
    ]);
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
    // Any lot of a co-ownership has one, a house too: then shown when given.
    flat || listing.carrezM2 !== null
      ? fact(t.carrez, listing.carrezM2 ? formatSurface(listing.carrezM2) : null)
      : null,
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
    coOwnership && documents ? fact(t.votedWorks, null) : null,
    coOwnership && documents ? fact(t.procedures, null) : null,
  ];
  const shown = facts.filter((item): item is KeyFact => item !== null);
  return coOwnership ? shown : withoutCoOwnership(shown);
}
