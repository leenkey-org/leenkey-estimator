import type { Progress, Step, StepTask } from "@/core/steps/types";
import type { ConversationSummary } from "@/leenkey/messaging/types";
import { formatRelative } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { NextAction } from "./next-action";
import { sellerCanDo, taskHref, type SaleSituation } from "./next-action";
import type { SellerProperty } from "./queries";

// What « Ma vente » shows of a sale (L1-24, SPEC-V2 8.7), as plain values
// (unit-tested): the property shown, its step, the next action in words,
// the tasks of the current step, the figures.

const t = fr.saleDashboard;

/** draft: still in creation; sold: the recap of the sale; sale: the dashboard. */
export type DashboardMode = "draft" | "sale" | "sold";

export function dashboardMode(property: Pick<SellerProperty, "listingStatus">): DashboardMode {
  const status = property.listingStatus;
  if (status === null || status === "draft") return "draft";
  return status === "sold" ? "sold" : "sale";
}

/** On sale first, the most recently published; then the drafts, the newest; the sold last. */
const RANK: Record<DashboardMode, number> = { sale: 0, draft: 1, sold: 2 };

/**
 * The property of the dashboard: the one asked (?bien=, the link of the
 * notifications of a step) when it is the seller's, otherwise the one the
 * sale is about.
 */
export function chooseProperty<
  P extends Pick<SellerProperty, "id" | "listingStatus" | "listing" | "createdAt">,
>(properties: readonly P[], requested?: string | null): P | null {
  const asked = properties.find((property) => property.id === requested);
  if (asked) return asked;
  const date = (property: P) => property.listing?.publishedAt ?? property.createdAt;
  return (
    [...properties].sort(
      (a, b) => RANK[dashboardMode(a)] - RANK[dashboardMode(b)] || date(b).localeCompare(date(a)),
    )[0] ?? null
  );
}

/** « Étape 3 sur 6 · Gérer mes contacts et mes visites », with its position. */
export function stepHeading(progress: Progress): { current: number; total: number; label: string } {
  const total = progress.steps.length;
  const index = progress.steps.findIndex((step) => step.code === progress.currentStepCode);
  const current = index === -1 ? 1 : index + 1;
  const title = progress.steps[index]?.title ?? "";
  return { current, total, label: t.step(current, total, title) };
}

export type ActionLink = { label: string; href: string };

/** The next action in words: an icon key, a title, a detail, its actions. */
export type NextActionView = {
  icon: "rejected" | "message" | "task" | "advice";
  title: string;
  detail: string | null;
  /** A link, or the task the seller ticks by hand. */
  primary: ActionLink | { label: string; taskId: string } | null;
  secondary: ActionLink | null;
};

export function nextActionView(
  action: NextAction,
  links: { sheet: string; steps: string; messages: string },
  now = new Date(),
): NextActionView {
  const n = t.next;
  switch (action.rule) {
    case "listingRejected":
      return {
        icon: "rejected",
        title: n.rejected.title,
        detail: action.reason ?? n.rejected.text,
        primary: { label: n.rejected.action, href: action.href },
        secondary: { label: n.rejected.secondary, href: links.sheet },
      };
    case "buyerWaiting":
      return {
        icon: "message",
        title: n.waiting.title(action.firstName),
        detail: n.waiting.text(formatRelative(action.since, now).toLocaleLowerCase("fr-FR")),
        primary: { label: n.waiting.action, href: action.href },
        secondary: { label: n.waiting.secondary, href: links.messages },
      };
    case "task":
      return {
        icon: "task",
        title: n.task.titles[action.task.code] ?? action.task.title,
        detail: n.task.text(action.step.title),
        primary: action.href
          ? { label: n.task.action, href: action.href }
          : { label: n.task.done, taskId: action.task.id },
        secondary: { label: n.task.secondary, href: links.steps },
      };
    case "advice":
      return {
        icon: "advice",
        title: action.step.title,
        detail: action.step.description || null,
        primary: { label: n.advice.action, href: links.steps },
        secondary: null,
      };
  }
}

export type TaskLine = {
  id: string;
  title: string;
  detail: string | null;
  state: "done" | "current" | "todo";
  /** Where the seller does it. */
  href: string | null;
  /** The seller ticks it by hand (or unticks it). */
  manual: boolean;
};

/** Ticked by hand by the seller: no event, and theirs (RLS: sale_task_is_seller_manual). */
function byHand(task: StepTask): boolean {
  return task.autoTrigger === null && (task.owner === "seller" || task.owner === "both");
}

/**
 * The tasks of a step, as « À faire » lists them: the next one the seller can
 * do is current; a link where it is done; a box to tick the tasks by hand;
 * who does the others.
 */
export function taskLines(
  step: Step,
  property: SaleSituation["property"],
  editable: boolean,
): TaskLine[] {
  const next = step.tasks.find((task) => task.doneAt === null && sellerCanDo(task, property));
  return step.tasks.map((task) => {
    const done = task.doneAt !== null;
    const manual = editable && byHand(task);
    const href = done || task.autoTrigger === null ? null : taskHref(task.code, property);
    const detail =
      task.owner === "leenkey"
        ? t.todo.leenkey
        : manual
          ? t.todo.manual
          : done || href
            ? null
            : t.todo.automatic;
    return {
      id: task.id,
      title: task.title,
      detail,
      state: done ? "done" : task.id === next?.id ? "current" : "todo",
      href,
      manual,
    };
  });
}

/** Financing at least declared (SPEC-V2 8.7): never the amounts, only the status. */
const QUALIFIED = new Set(["declared", "document_provided", "document_checked"]);

/** The conversations of the buyers about a property, the most recent first. */
export function propertyConversations(
  conversations: readonly ConversationSummary[],
  propertyId: string,
): ConversationSummary[] {
  return conversations
    .filter(
      (conversation) => conversation.role === "seller" && conversation.propertyId === propertyId,
    )
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export type SaleFigures = { views: number; contacts: number; qualified: number };

export function saleFigures(
  conversations: readonly ConversationSummary[],
  views: readonly { count: number }[],
): SaleFigures {
  return {
    views: views.reduce((sum, row) => sum + row.count, 0),
    contacts: conversations.length,
    qualified: conversations.filter(
      (conversation) =>
        conversation.buyerFinancingStatus !== null &&
        QUALIFIED.has(conversation.buyerFinancingStatus),
    ).length,
  };
}

/** The first day of the last seven, in Paris (« 2026-10-22 » on the 28th). */
export function weekStart(now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 6)).toISOString().slice(0, 10);
}

/** Days on sale, from its publication to its sale (at least one). */
export function daysOnSale(publishedAt: string | null, soldAt: string | null): number | null {
  if (!publishedAt || !soldAt) return null;
  const days = Math.round((Date.parse(soldAt) - Date.parse(publishedAt)) / 86_400_000);
  return Math.max(1, days);
}
