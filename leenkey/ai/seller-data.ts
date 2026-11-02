import "server-only";
import { activePlans, type ActivePlan } from "@/core/billing/plans";
import type { Progress } from "@/core/steps/types";
import { stepHeading } from "@/leenkey/properties/dashboard";
import { sellerProperties, type SellerProperty } from "@/leenkey/properties/queries";
import { saleProgress } from "@/leenkey/properties/sale";
import { propertyName } from "@/leenkey/properties/sheet";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// What the assistant reads of the file of a seller (L1-28), with their
// session (RLS: their own properties only): the properties, their listing,
// their plan and their step. Used by the tools and by the summary of the
// file given to the model with each message (context.ts).

/** 10 properties at most in the file given to the model (a seller has a few). */
export const OVERVIEW_MAX = 10;

export type PlanSummary = { code: string; name: string; priceEuros: number; paid: boolean };

export type PropertyOverview = {
  propertyId: string;
  name: string;
  city: string;
  postalCode: string;
  /** Label of the status of the listing, null before the listing exists. */
  listingStatus: string | null;
  priceEuros: number | null;
  plan: PlanSummary | null;
  step: { position: number; total: number; title: string } | null;
  /** The tasks of the current step not done yet, in order. */
  tasksToDo: string[];
};

/** A plan as the assistant says it: paid when it has a price (never its name compared). */
export function planSummary(code: string, plans: readonly ActivePlan[] | null): PlanSummary | null {
  const plan = plans?.find((candidate) => candidate.code === code);
  if (!plan) return null;
  return {
    code: plan.code,
    name: plan.name,
    priceEuros: plan.priceCents / 100,
    paid: plan.priceCents > 0,
  };
}

export function overviewOf(
  property: SellerProperty,
  progress: Progress | null,
  plans: readonly ActivePlan[] | null,
): PropertyOverview {
  const current = progress?.steps.find((step) => step.code === progress.currentStepCode) ?? null;
  const heading = progress && current ? stepHeading(progress) : null;
  return {
    propertyId: property.id,
    name: propertyName(property),
    city: property.address.city,
    postalCode: property.address.postalCode,
    listingStatus: property.listingStatus ? fr.listingStatus[property.listingStatus] : null,
    priceEuros: property.listing ? property.listing.priceCents / 100 : null,
    plan: progress ? planSummary(progress.template, plans) : null,
    step:
      heading && current
        ? { position: heading.current, total: heading.total, title: current.title }
        : null,
    tasksToDo:
      current?.tasks.filter((task) => task.doneAt === null).map((task) => task.title) ?? [],
  };
}

export type SellerFile = {
  properties: SellerProperty[];
  overview: PropertyOverview[];
  plans: ActivePlan[] | null;
  /** At least one property under a paid plan, among all of them (the daily limit). */
  hasPaidPlan: boolean;
};

/** The properties of the seller (the most recent first) with their sale; null: unreadable. */
export async function sellerFile(profileId: string): Promise<SellerFile | null> {
  const [properties, plans] = await Promise.all([sellerProperties(profileId), activePlans()]);
  if (!properties.ok) return null;
  const shown = properties.data.slice(0, OVERVIEW_MAX);
  const supabase = await createClient();
  const [progresses, sales] = await Promise.all([
    Promise.all(shown.map((property) => saleProgress(property.id))),
    properties.data.length > 0
      ? supabase
          .from("sale_progress")
          .select("plan")
          .in(
            "property_id",
            properties.data.map((property) => property.id),
          )
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (progresses.some((progress) => !progress.ok) || sales.error) return null;
  return {
    hasPaidPlan: sales.data.some((sale) => planSummary(sale.plan, plans)?.paid === true),
    properties: properties.data,
    overview: shown.map((property, index) => {
      const progress = progresses[index];
      return overviewOf(property, progress.ok ? progress.data : null, plans);
    }),
    plans,
  };
}

/** One property of the seller, or null (unknown, someone else's, deleted). */
export async function sellerPropertyById(
  profileId: string,
  propertyId: string,
): Promise<{ ok: true; data: SellerProperty | null } | { ok: false }> {
  const properties = await sellerProperties(profileId);
  if (!properties.ok) return { ok: false };
  return { ok: true, data: properties.data.find((property) => property.id === propertyId) ?? null };
}

/** A property the model asked about that the seller does not have: what it reads. */
export const PROPERTY_NOT_FOUND = "No property of this seller has this id. Call get_my_properties.";
