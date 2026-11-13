import {
  Bell,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Eye,
  FileSignature,
  Flag,
  Folder,
  type LucideIcon,
  MessageCircle,
  PencilLine,
  UserPlus,
} from "lucide-react";
import type { NotificationTone } from "@/components/shared/notification-item";
import type { NotificationView } from "@/core/notifications/types";
import type { Space } from "@/leenkey/navigation/spaces";
import { legalDate } from "@/leenkey/billing/withdrawal";
import { formatAmount, formatPrice } from "@/lib/format";
import { frAdminUsers } from "@/lib/i18n/sections/adminUsers";
import { frNotifications } from "@/lib/i18n/sections/notifications";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminUsers: frAdminUsers, notifications: frNotifications } as const;

// The types of notifications of Leenkey (SPEC-V2 section 10) and their
// wording, from the facts written by the database (supabase/migrations,
// L1-22): the title and the detail of the panel, the visual, the filters it
// falls under. The other types of SPEC 10 come with their events (offers L2,
// visits and alerts L3).

const t = fr.notifications.types;

/** The filters of the panel (docs/DESIGN.md 10.7), per space. */
export type NotificationFilter = "all" | "searches" | "visitsOffers" | "messages" | "offersVisits";

export const FILTERS: Record<Space, readonly NotificationFilter[]> = {
  buyer: ["all", "searches", "visitsOffers"],
  seller: ["all", "messages", "offersVisits"],
  admin: ["all"],
};

type Entry = {
  icon: LucideIcon;
  tone: NotificationTone;
  /** The filters besides « Toutes » that show it. */
  filters: readonly NotificationFilter[];
  title: (data: Record<string, unknown>) => string;
  detail: (data: Record<string, unknown>) => string | null;
  /** A link from its facts, more precise than the one written with it (L1-30c). */
  link?: (data: Record<string, unknown>) => string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The sheet of a case of the back office, from its id. */
function caseLink(data: Record<string, unknown>): string | null {
  return typeof data.case_id === "string" && UUID.test(data.case_id)
    ? `/admin/dossiers/${data.case_id}`
    : null;
}

/** A case asked by a user (create_case), not the case of a plan paid. */
function isRequest(data: Record<string, unknown>): boolean {
  return data.source === "assistant_handoff" || data.source === "manual";
}

/** « Alice D. »: who asks, « Sans nom » without a first name. */
function accountLabel(data: Record<string, unknown>): string {
  const first = text(data.first_name);
  if (!first) return fr.adminUsers.noName;
  const initial = text(data.last_initial);
  return initial ? `${first} ${initial}.` : first;
}

/** « Vendeur, Acquéreur »: the roles of an account, as the back office names them. */
export function roleLabels(roles: unknown): string {
  const labels = fr.adminUsers.roles;
  return (Array.isArray(roles) ? (roles as unknown[]) : [])
    .map((role) =>
      role === "seller" || role === "buyer" || role === "admin" ? labels[role] : null,
    )
    .filter((label): label is (typeof labels)[keyof typeof labels] => label !== null)
    .join(", ");
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function position(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function amount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

const CATALOG: Record<string, Entry> = {
  "message.new": {
    icon: MessageCircle,
    tone: "blue",
    filters: ["messages"],
    title: (data) => t.messageNew.title(text(data.sender_first_name)),
    detail: (data) => {
      const excerpt = text(data.excerpt);
      return excerpt ? t.messageNew.detail(excerpt, data.truncated === true) : null;
    },
  },
  // L1-34: the conversation with the adviser.
  "advisor.message": {
    icon: MessageCircle,
    tone: "blue",
    filters: ["messages"],
    title: () => t.advisorMessage.title,
    detail: (data) => {
      const excerpt = text(data.excerpt);
      return excerpt ? t.messageNew.detail(excerpt, data.truncated === true) : null;
    },
  },
  "advisor.message_from_client": {
    icon: MessageCircle,
    tone: "blue",
    filters: [],
    title: (data) =>
      data.handoff === true
        ? t.advisorFromClient.handoff(text(data.sender_first_name))
        : t.advisorFromClient.title(text(data.sender_first_name)),
    detail: (data) =>
      t.advisorFromClient.detail(
        text(data.reference),
        text(data.excerpt),
        data.truncated === true,
      ) || null,
  },
  "listing.pending": {
    icon: ClipboardList,
    tone: "stone",
    filters: [],
    title: () => t.listingPending.title,
    detail: (data) => {
      const title = text(data.title);
      const city = text(data.city);
      // The town once: the titles often carry it already (« … · Épinay-sur-Orge »).
      const place =
        city && !title?.toLocaleLowerCase("fr-FR").includes(city.toLocaleLowerCase("fr-FR"));
      return t.listingPending.detail([title, text(data.reference), place ? city : null]);
    },
  },
  // L1-35: a listing online changed by its seller (in the app only, SPEC 10).
  "listing.revised": {
    icon: PencilLine,
    tone: "stone",
    filters: [],
    title: () => t.listingRevised.title,
    detail: (data) => {
      const fields = (Array.isArray(data.fields) ? (data.fields as unknown[]) : []).flatMap(
        (field) =>
          typeof field === "string" && t.listingRevised.fields[field]
            ? [t.listingRevised.fields[field]]
            : [],
      );
      const before = typeof data.old_price_cents === "number" ? data.old_price_cents : null;
      const after = typeof data.price_cents === "number" ? data.price_cents : null;
      return (
        t.listingRevised.detail([
          text(data.title),
          text(data.reference),
          t.listingRevised.changed(fields),
          before !== null && after !== null && before !== after
            ? t.listingRevised.price(formatPrice(before), formatPrice(after))
            : null,
        ]) || null
      );
    },
  },
  "listing.published": {
    icon: CircleCheck,
    tone: "success",
    filters: [],
    title: () => t.listingPublished.title,
    detail: (data) => {
      const title = text(data.title);
      return title ? t.listingPublished.detail(title) : null;
    },
  },
  "listing.rejected": {
    icon: CircleAlert,
    tone: "warning",
    filters: [],
    title: () => t.listingRejected.title,
    detail: (data) => {
      const title = text(data.title);
      return title ? t.listingRejected.detail(title) : null;
    },
  },
  // L1-40: a plan ending within 30 days (the seller), a withdrawal to refund (the team).
  "plan.ending": {
    icon: CalendarClock,
    tone: "warning",
    filters: [],
    title: (data) => t.planEnding.title(text(data.plan_name)),
    detail: (data) => {
      const endsAt = text(data.ends_at);
      return t.planEnding.detail(endsAt ? legalDate(endsAt) : null);
    },
  },
  "plan.withdrawn": {
    icon: CircleAlert,
    tone: "warning",
    filters: [],
    title: () => t.planWithdrawn.title,
    link: caseLink,
    detail: (data) => t.planWithdrawn.detail(text(data.plan_name), text(data.reference)),
  },
  // L1-26: a plan paid (the seller), its case and its refunds (the team).
  "plan.activated": {
    icon: CircleCheck,
    tone: "success",
    filters: [],
    title: (data) => t.planActivated.title(text(data.plan_name)),
    detail: (data) => t.planActivated.detail(text(data.reference)),
  },
  "case.created": {
    icon: Folder,
    tone: "blue",
    filters: [],
    // A plan paid (L1-26), or a request of a user to the team (create_case, L1-31).
    title: (data) =>
      isRequest(data)
        ? t.caseCreated.requestTitle
        : data.check === true
          ? t.caseCreated.checkTitle(data.held === true)
          : t.caseCreated.title(text(data.plan_name), data.upgrade === true),
    // Written with the list (L1-26): the sheet of the case since L1-30c.
    link: caseLink,
    detail: (data) =>
      isRequest(data)
        ? t.caseCreated.requestDetail(text(data.subject), accountLabel(data), text(data.reference))
        : t.caseCreated.detail(text(data.reference)),
  },
  "plan.refunded": {
    icon: CircleAlert,
    tone: "warning",
    filters: [],
    title: (data) =>
      data.check === true ? t.planRefunded.checkTitle : t.planRefunded.title(data.full === true),
    detail: (data) =>
      t.planRefunded.detail(
        typeof data.amount_cents === "number" ? formatAmount(data.amount_cents) : null,
        text(data.reference),
      ),
  },
  // 2026-11-08: an account confirmed, to each admin (and by email, grouped).
  "account.created": {
    icon: UserPlus,
    tone: "stone",
    filters: [],
    title: () => t.accountCreated.title,
    detail: (data) => {
      const initial = text(data.last_initial);
      const name = [text(data.first_name), initial ? `${initial}.` : null]
        .filter(Boolean)
        .join(" ");
      return t.accountCreated.detail(name || null, roleLabels(data.roles) || null);
    },
  },
  // L1-30c: a conversation reported, to each admin (and by email, grouped).
  "report.created": {
    icon: Flag,
    tone: "warning",
    filters: [],
    title: () => t.reportCreated.title,
    detail: (data) => {
      const excerpt = text(data.excerpt);
      return t.reportCreated.detail(
        excerpt ? `${excerpt}${data.truncated === true ? "…" : ""}` : null,
        text(data.reference),
      );
    },
  },
  // In the app only (SPEC-V2 section 10): « Étape 3 sur 6 · Maison 5 pièces ».
  // L2-04a: an offer received by its seller; read, then answered, for its buyer.
  "offer.received": {
    icon: FileSignature,
    tone: "blue",
    filters: ["offersVisits"],
    title: (data) => t.offerReceived.title(text(data.buyer_first_name)),
    detail: (data) => {
      const price = amount(data.price_cents);
      return t.offerReceived.detail(price ? formatPrice(price) : null, text(data.title));
    },
  },
  "offer.viewed": {
    icon: Eye,
    tone: "stone",
    filters: ["visitsOffers"],
    title: () => t.offerViewed.title,
    detail: (data) => {
      const title = text(data.title);
      return title ? t.offerViewed.detail(title) : null;
    },
  },
  "offer.answered": {
    icon: FileSignature,
    tone: "blue",
    filters: ["visitsOffers"],
    title: (data) => (data.accepted === true ? t.offerAnswered.accepted : t.offerAnswered.declined),
    detail: (data) => {
      const title = text(data.title);
      return title ? t.offerAnswered.detail(title) : null;
    },
  },
  "step.advanced": {
    icon: Flag,
    tone: "stone",
    filters: [],
    title: (data) => t.stepAdvanced.title(text(data.step_title)),
    detail: (data) => {
      const step = position(data.step_position);
      const total = position(data.steps_total);
      return (
        t.stepAdvanced.detail([
          step && total ? t.stepAdvanced.position(step, total) : null,
          text(data.title) ?? text(data.city),
        ]) || null
      );
    },
  },
};

export type NotificationDescription = {
  title: string;
  detail: string | null;
  icon: LucideIcon;
  tone: NotificationTone;
  /** Where it leads: from its facts when its type says so, else the link written with it. */
  link: string | null;
};

/** Title, detail and visual of a notification: written at its creation, or from its type. */
export function describeNotification(notification: NotificationView): NotificationDescription {
  const entry = CATALOG[notification.type];
  if (!entry) {
    return {
      title: notification.title ?? t.fallback,
      detail: notification.body,
      icon: Bell,
      tone: "stone",
      link: notification.link,
    };
  }
  return {
    title: notification.title ?? entry.title(notification.data),
    detail: notification.body ?? entry.detail(notification.data),
    icon: entry.icon,
    tone: entry.tone,
    link: entry.link?.(notification.data) ?? notification.link,
  };
}

/** Whether a notification is shown under a filter of the panel. */
export function inFilter(notification: NotificationView, filter: NotificationFilter): boolean {
  if (filter === "all") return true;
  return CATALOG[notification.type]?.filters.includes(filter) ?? false;
}

/** Types written by the database today: for the tests. */
export const NOTIFICATION_TYPES = Object.keys(CATALOG);
