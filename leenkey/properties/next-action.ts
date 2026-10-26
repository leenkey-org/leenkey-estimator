import { stepAction } from "@/core/steps/next-action";
import type { Progress, Step, StepTask } from "@/core/steps/types";
import { inCreation } from "./creation";
import type { SellerProperty } from "./queries";
import { creationHref, editHref, photosEditable, sheetHref, statusActions } from "./sheet";

// The next action of a sale (SPEC-V2 8.7, L1-23), first rule that applies:
// 1) listing refused, to correct; 2) offer received not read (L2);
// 3) message of the advisor not read (with the advisor's conversation,
// L1-29); 4) visit to confirm (L3); 5) a buyer waiting for an answer for more
// than 24 h; 6) the first task not done of the current step that the seller
// can do; 7) else the advice of that step. The same for the three plans:
// only the tasks change. Nothing once sold: the summary of the sale takes
// its place (SPEC-V2 section 9).

/** A buyer whose last message has had no answer yet. */
export type WaitingBuyer = { conversationId: string; firstName: string | null; since: string };

export type SaleSituation = {
  property: Pick<SellerProperty, "id" | "listingStatus" | "characteristics" | "listing">;
  progress: Progress;
  waitingBuyers: readonly WaitingBuyer[];
};

export type NextAction =
  | { rule: "listingRejected"; href: string; reason: string | null }
  | { rule: "buyerWaiting"; href: string; firstName: string | null; since: string }
  /** href null: a task ticked by hand, from the list of the tasks (L1-24). */
  | { rule: "task"; step: Step; task: StepTask; href: string | null }
  | { rule: "advice"; step: Step };

const ANSWER_WITHIN_MS = 24 * 60 * 60 * 1000;

/**
 * Where the seller does a task ticked by an event; null when nothing they do
 * on a screen ticks it: the analysis of value is made before the property
 * (L1-13b), the documents come with lot 3, the visits with lot 3, the offers
 * with lot 2, the contacts and the publication are not their doing.
 */
function taskHref(code: string, property: SaleSituation["property"]): string | null {
  switch (code) {
    case "property_complete":
      return editHref(property, "characteristics");
    case "photos_min6":
      return photosEditable(property.listingStatus) ? sheetHref(property.id, "photos") : null;
    case "listing_written":
      return editHref(property, "listing");
    case "listing_submitted":
      return inCreation(property.listingStatus) ? creationHref(property) : null;
    case "deed_signed":
      return statusActions(property.listingStatus).includes("sold") ? sheetHref(property.id) : null;
    default:
      return null;
  }
}

/** The seller does the tasks that are theirs (or shared): by hand, or where taskHref leads. */
function sellerCanDo(task: StepTask, property: SaleSituation["property"]): boolean {
  if (task.owner !== "seller" && task.owner !== "both") return false;
  return task.autoTrigger === null || taskHref(task.code, property) !== null;
}

export function getNextAction(situation: SaleSituation, now = new Date()): NextAction | null {
  const { property, progress } = situation;
  if (property.listingStatus === "sold") return null;

  if (property.listingStatus === "rejected") {
    return {
      rule: "listingRejected",
      href: creationHref(property),
      reason: property.listing?.rejectionReason ?? null,
    };
  }

  // The one waiting the longest first.
  const waiting = situation.waitingBuyers
    .filter((buyer) => now.getTime() - new Date(buyer.since).getTime() > ANSWER_WITHIN_MS)
    .sort((a, b) => a.since.localeCompare(b.since))[0];
  if (waiting) {
    return {
      rule: "buyerWaiting",
      href: `/messages/${waiting.conversationId}`,
      firstName: waiting.firstName,
      since: waiting.since,
    };
  }

  const action = stepAction(progress, (task) => sellerCanDo(task, property));
  if (!action) return null;
  if (action.kind === "advice") return { rule: "advice", step: action.step };
  return {
    rule: "task",
    step: action.step,
    task: action.task,
    href: action.task.autoTrigger === null ? null : taskHref(action.task.code, property),
  };
}
