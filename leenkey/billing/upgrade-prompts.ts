import { UPGRADE_THRESHOLDS } from "@/lib/config/upgrade";
import { UPGRADE_TRIGGERS } from "@/lib/validations/billing";
import type { Database } from "@/types/database";

// The upgrade prompts (SPEC-V2 section 11 bis): at most one at a time, the
// first of the list whose condition holds, never hidden for this property
// (or for this offer), and whose plan is above the plan in force: never
// under Sérénité. The choice only: what the page reads is in
// upgrade-queries.ts, what the seller sees in components/upgrade-prompt.tsx.
// In leenkey/ and not core/ (SPEC 11 bis says core/billing): the conditions
// know offers, contacts and listings (CLAUDE.md section 3).
//
// A prompt never stands in the way: it is shown after the useful content of
// the page, never in a dialog, never before an action (accept an offer,
// publish, answer). Nothing here blocks anything: an error reads no prompt.

type PlanCode = Database["public"]["Enums"]["plan_code"];
type OfferStatus = Database["public"]["Enums"]["offer_status"];
type ListingStatus = Database["public"]["Enums"]["listing_status"];

export { UPGRADE_TRIGGERS };

export type UpgradeTrigger = (typeof UPGRADE_TRIGGERS)[number];

/** The plan each prompt proposes. */
export const UPGRADE_TARGET: Record<UpgradeTrigger, PlanCode> = {
  offer_accepted: "serenite",
  offer_received: "accompagne",
  visits_no_offer: "accompagne",
  contacts_no_visit: "accompagne",
  low_contacts: "accompagne",
  file_incomplete: "serenite",
  listing_ready: "accompagne",
  valuation_done: "accompagne",
};

/** The prompts of an offer: one per offer, they come back for a new one. */
export const OFFER_TRIGGERS: readonly UpgradeTrigger[] = ["offer_accepted", "offer_received"];

/**
 * Where a prompt is shown: the dashboard of the sale; the preview before
 * « Envoyer en validation » (listing_ready); the price step, where the
 * valuation is recalled (valuation_done); the page of an offer received.
 */
export type UpgradePlace =
  | { kind: "dashboard" }
  | { kind: "submit" }
  | { kind: "price"; fromValuation: boolean }
  | { kind: "offer"; offerId: string };

const PLACES: Record<UpgradePlace["kind"], readonly UpgradeTrigger[]> = {
  dashboard: [
    "offer_accepted",
    "offer_received",
    "visits_no_offer",
    "contacts_no_visit",
    "low_contacts",
    "file_incomplete",
  ],
  submit: ["listing_ready"],
  price: ["valuation_done"],
  offer: OFFER_TRIGGERS,
};

export type UpgradeOffer = {
  id: string;
  status: OfferStatus;
  priceCents: number | null;
  askingPriceCents: number | null;
  validityUntil: string | null;
};

export type UpgradeFacts = {
  /** The plan in force on the property (an ended plan is Autonomie). */
  currentPlan: PlanCode;
  /** The plans in their order (`plans.position`), with their price and whether they are on sale. */
  plans: readonly { code: PlanCode; priceCents: number; active: boolean }[];
  /** A paid plan can be ordered (in production, once the mediator is there: Q32). */
  orderable: boolean;
  listingStatus: ListingStatus | null;
  publishedAt: string | null;
  /** Conversations of buyers about the listing. */
  contacts: number;
  /** Visits done; null until visits are counted (lot 3, L3-02). */
  visits: number | null;
  /** Documents required still missing; null until the sale file exists (lot 3, L3-04). */
  missingDocuments: number | null;
  /** The offers sent on the property, the most recent first. */
  offers: readonly UpgradeOffer[];
  /** The property was created from a valuation of the estimator. */
  fromValuation: boolean;
  /** The step of the sale in progress (`sale_steps.code`). */
  stepCode: string | null;
  /** The prompts hidden on this property. */
  dismissed: readonly { trigger: string; subjectId: string | null }[];
};

export type UpgradeChoice = {
  trigger: UpgradeTrigger;
  /** The offer of an offer prompt, null for the others. */
  subjectId: string | null;
  targetPlan: PlanCode;
  /** The offer the prompt speaks of. */
  offer: UpgradeOffer | null;
  /** What the plan aimed at costs on top of the plan in force, when one is paid. */
  upgradeCents: number | null;
};

const DAY = 86_400_000;

function daysOnline(facts: UpgradeFacts, now: Date): number {
  if (facts.listingStatus !== "published" || !facts.publishedAt) return -1;
  return (now.getTime() - Date.parse(facts.publishedAt)) / DAY;
}

function waiting(offer: UpgradeOffer, now: Date): boolean {
  if (offer.status !== "submitted" && offer.status !== "viewed") return false;
  return offer.validityUntil === null || Date.parse(offer.validityUntil) > now.getTime();
}

/** The subjects a prompt may take on this page, the most recent first; [null] for the others. */
function subjects(
  trigger: UpgradeTrigger,
  facts: UpgradeFacts,
  place: UpgradePlace,
  now: Date,
): (UpgradeOffer | null)[] {
  const t = UPGRADE_THRESHOLDS;
  const online = daysOnline(facts, now);
  const onPage = (offer: UpgradeOffer) => place.kind !== "offer" || offer.id === place.offerId;
  switch (trigger) {
    case "offer_accepted":
      return facts.offers.filter((offer) => offer.status === "accepted" && onPage(offer));
    case "offer_received":
      return facts.offers.filter((offer) => waiting(offer, now) && onPage(offer));
    case "visits_no_offer":
      return facts.visits !== null &&
        facts.visits >= t.visitsNoOffer.visits &&
        facts.offers.length === 0
        ? [null]
        : [];
    // A listing that already brought an offer does not lack contacts.
    case "contacts_no_visit":
      return facts.offers.length === 0 &&
        facts.visits === 0 &&
        facts.contacts >= t.contactsNoVisit.contacts &&
        online >= t.contactsNoVisit.days
        ? [null]
        : [];
    case "low_contacts":
      return facts.offers.length === 0 &&
        facts.contacts < t.lowContacts.below &&
        online >= t.lowContacts.days
        ? [null]
        : [];
    case "file_incomplete":
      return facts.missingDocuments !== null &&
        // « Étape 05 atteinte »: the notary, or the step after it.
        (facts.stepCode === "notary" ||
          facts.stepCode === "closing" ||
          (facts.missingDocuments >= t.fileIncomplete.missing && online >= t.fileIncomplete.days))
        ? [null]
        : [];
    case "listing_ready":
      return place.kind === "submit" ? [null] : [];
    case "valuation_done":
      return place.kind === "price" && place.fromValuation && facts.stepCode === "prepare"
        ? [null]
        : [];
  }
}

/** The prompt of this page, or null (SPEC 11 bis). */
export function chooseUpgradePrompt(
  facts: UpgradeFacts,
  place: UpgradePlace,
  now: Date = new Date(),
): UpgradeChoice | null {
  if (!facts.orderable) return null;
  const rank = (code: PlanCode) => facts.plans.findIndex((plan) => plan.code === code);
  const current = rank(facts.currentPlan);
  if (current < 0) return null;
  const hidden = new Set(facts.dismissed.map((row) => `${row.trigger}:${row.subjectId ?? ""}`));
  for (const trigger of PLACES[place.kind]) {
    const target = UPGRADE_TARGET[trigger];
    const targetPlan = facts.plans[rank(target)];
    // Above the plan in force, and on sale.
    if (!targetPlan || !targetPlan.active || rank(target) <= current) continue;
    for (const offer of subjects(trigger, facts, place, now)) {
      const subjectId = offer?.id ?? null;
      if (hidden.has(`${trigger}:${subjectId ?? ""}`)) continue;
      const currentPrice = facts.plans[current].priceCents;
      return {
        trigger,
        subjectId,
        targetPlan: target,
        offer,
        upgradeCents: currentPrice > 0 ? targetPlan.priceCents - currentPrice : null,
      };
    }
  }
  return null;
}
