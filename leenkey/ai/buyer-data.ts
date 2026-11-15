import "server-only";
import { buyerProfile } from "@/leenkey/buyers/queries";
import { buyerOffers } from "@/leenkey/offers/queries";
import { withdrawalPeriodEnd } from "@/leenkey/offers/withdrawal";
import { frFinancingStatus } from "@/lib/i18n/sections/financingStatus";
import { frOffer } from "@/lib/i18n/sections/offer";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { BuyerProject } from "@/lib/validations/buyer";
import { DPE_CLASSES } from "@/lib/validations/search";
import type { Database } from "@/types/database";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { financingStatus: frFinancingStatus, offer: frOffer } as const;

// What the assistant reads of the file of a buyer (L2-06): their buying
// project and the status of their financing file (never its amounts beyond
// the budget, never the proof: SPEC-V2 section 12, principle 6), their
// offers, with their session (RLS: their own only), and the listings online
// as anyone reads them (public_listings, no session). Used by the tools and
// by the summary of the file given to the model with each message
// (context.ts).

type PropertyType = Database["public"]["Enums"]["property_type"];

/** 10 offers at most in the file given to the model. */
export const BUYER_OFFERS_MAX = 10;

export type BuyerOfferFact = {
  offerId: string;
  reference: string;
  listingId: string;
  listingTitle: string;
  city: string;
  /** Label of the status, read expired as soon as its validity is past. */
  status: string;
  priceEuros: number | null;
  sentOn: string | null;
  validUntil: string | null;
  precontractSignedOn: string | null;
  /** The day the withdrawal period starts from, when the seller recorded it. */
  withdrawalStart: string | null;
  /** Its indicative last day, as the page of the offer shows it. */
  withdrawalEnd: string | null;
};

/** A listing online, as anyone reads it. */
export type ListingFacts = {
  listingId: string;
  slug: string;
  reference: string;
  title: string;
  description: string;
  priceEuros: number;
  publishedOn: string | null;
  type: PropertyType;
  city: string;
  postalCode: string;
  district: string | null;
  livingAreaM2: number;
  carrezM2: number | null;
  rooms: number;
  bedrooms: number | null;
  floor: number | null;
  floorsTotal: number | null;
  features: string[];
  orientation: string | null;
  buildYear: number | null;
  isNewBuild: boolean | null;
  dpeClass: string | null;
  gesClass: string | null;
  heating: string | null;
  chargesMonthlyEuros: number | null;
  propertyTaxYearlyEuros: number | null;
  coproLots: number | null;
  sellerFirstName: string | null;
  /** Two sentences written by the assistant for its public page (L2-05). */
  summary: string | null;
};

export type BuyerFile = {
  project: {
    kind: BuyerProject | null;
    cities: string[];
    budgetMaxEuros: number | null;
    /** Label of the status of the financing file. */
    financing: string;
    /** Declared at least: the buyer may prepare an offer. */
    declared: boolean;
    financingCheckedOn: string | null;
  } | null;
  offers: BuyerOfferFact[];
  /** All the offers of the buyer (the file shows 10 at most). */
  offersTotal: number;
  /** The listing the buyer is reading, when it is online. */
  listing: Pick<ListingFacts, "listingId" | "title" | "city" | "priceEuros"> | null;
};

/** A day as the model reads it: the day in Paris (« 2026-10-22 »). */
function parisDay(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(iso));
}

const euros = (cents: number | null) => (cents === null ? null : Math.round(cents / 100));

const LISTING_COLUMNS =
  "id, slug, reference, title, description, price_cents, published_at, type, city, postal_code, district, surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total, has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar, orientation, build_year, is_new_build, dpe_class, ges_class, heating, charges_monthly_cents, property_tax_yearly_cents, copro_lots, seller_first_name";

/** A listing online by its id; null: none (unknown, off line). */
export async function listingFacts(
  listingId: string,
): Promise<{ ok: true; data: ListingFacts | null } | { ok: false }> {
  const supabase = createPublicClient();
  const [listing, summary] = await Promise.all([
    supabase.from("public_listings").select(LISTING_COLUMNS).eq("id", listingId).maybeSingle(),
    supabase.rpc("public_listing_summary", { p_listing_id: listingId }),
  ]);
  if (listing.error) {
    console.error("[ai] listing read failed", { entity_id: listingId, code: listing.error.code });
    return { ok: false };
  }
  const row = listing.data;
  if (!row?.id || !row.slug || !row.type || !row.city || !row.price_cents) {
    return { ok: true, data: null };
  }
  const features = [
    row.has_elevator ? "ascenseur" : null,
    row.has_balcony ? "balcon" : null,
    row.has_terrace ? "terrasse" : null,
    row.has_garden ? "jardin" : null,
    row.has_parking ? "stationnement" : null,
    row.has_cellar ? "cave" : null,
  ].filter((value): value is string => value !== null);
  const energy = (value: string | null) => DPE_CLASSES.find((letter) => letter === value) ?? null;
  return {
    ok: true,
    data: {
      listingId: row.id,
      slug: row.slug,
      reference: row.reference ?? "",
      title: row.title ?? "",
      description: row.description ?? "",
      priceEuros: Math.round(Number(row.price_cents) / 100),
      publishedOn: parisDay(row.published_at),
      type: row.type,
      city: row.city,
      postalCode: row.postal_code ?? "",
      district: row.district,
      livingAreaM2: Number(row.surface_m2 ?? 0),
      carrezM2: row.carrez_m2 === null ? null : Number(row.carrez_m2),
      rooms: row.rooms ?? 0,
      bedrooms: row.bedrooms,
      floor: row.floor,
      floorsTotal: row.floors_total,
      features,
      orientation: row.orientation,
      buildYear: row.build_year,
      isNewBuild: row.is_new_build,
      dpeClass: energy(row.dpe_class),
      gesClass: energy(row.ges_class),
      heating: row.heating,
      chargesMonthlyEuros: euros(row.charges_monthly_cents),
      propertyTaxYearlyEuros: euros(row.property_tax_yearly_cents),
      coproLots: row.copro_lots,
      sellerFirstName: row.seller_first_name,
      // Without its summary the listing is still read.
      summary: summary.error ? null : (summary.data ?? null),
    },
  };
}

/** The offers of the buyer as the model reads them, the most recent first. */
async function offerFacts(
  profileId: string,
): Promise<{ facts: BuyerOfferFact[]; total: number } | null> {
  const lines = await buyerOffers(profileId);
  if (!lines.ok) return null;
  const shown = lines.data.slice(0, BUYER_OFFERS_MAX);
  if (shown.length === 0) return { facts: [], total: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("id, reference, validity_until, precontract_signed_at, withdrawal_period_start")
    .in(
      "id",
      shown.map((line) => line.id),
    );
  if (error) {
    console.error("[ai] offers read failed", { user_id: profileId, code: error.code });
    return null;
  }
  const more = new Map(data.map((row) => [row.id, row]));
  return {
    total: lines.data.length,
    facts: shown.map((line) => {
      const row = more.get(line.id);
      const start = row?.withdrawal_period_start ?? null;
      return {
        offerId: line.id,
        reference: row?.reference ?? "",
        listingId: line.listingId,
        listingTitle: line.title,
        city: line.city,
        status: fr.offer.status[line.status],
        priceEuros: euros(line.priceCents),
        sentOn: parisDay(line.submittedAt),
        validUntil: parisDay(row?.validity_until ?? null),
        precontractSignedOn: row?.precontract_signed_at ?? null,
        withdrawalStart: start,
        withdrawalEnd: start ? withdrawalPeriodEnd(start) : null,
      };
    }),
  };
}

/** The file of a buyer, and the listing they are reading; null: unreadable. */
export async function buyerFile(
  profileId: string,
  listingId: string | null,
): Promise<BuyerFile | null> {
  const [project, offers, listing] = await Promise.all([
    buyerProfile(profileId),
    offerFacts(profileId),
    listingId ? listingFacts(listingId) : null,
  ]);
  if (!project.ok || !offers) return null;
  const read = project.data;
  // A listing that cannot be read is no reason to refuse the message.
  const viewed = listing?.ok ? listing.data : null;
  return {
    project: read
      ? {
          kind: read.project,
          cities: read.targetCities,
          budgetMaxEuros: read.budgetMaxEuros,
          financing: fr.financingStatus[read.financingStatus],
          declared: read.financingStatus !== "not_provided",
          financingCheckedOn: parisDay(read.financingCheckedAt),
        }
      : null,
    offers: offers.facts,
    offersTotal: offers.total,
    listing: viewed
      ? {
          listingId: viewed.listingId,
          title: viewed.title,
          city: viewed.city,
          priceEuros: viewed.priceEuros,
        }
      : null,
  };
}
