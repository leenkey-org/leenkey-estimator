import {
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Flag,
  MessageCircle,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { NotificationTone } from "@/components/shared/notification-item";
import type { NotificationView } from "@/core/notifications/types";
import type { Space } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";

// The types of notifications of Leenkey (SPEC-V2 section 10) and their
// wording, from the facts written by the database (supabase/migrations,
// L1-22): the title and the detail of the panel, the visual, the filters it
// falls under. The other types of SPEC 10 come with their events (offers L2,
// visits and alerts L3, plan with Stripe).

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
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function position(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
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
  // In the app only (SPEC-V2 section 10): « Étape 3 sur 6 · Maison 5 pièces ».
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
    };
  }
  return {
    title: notification.title ?? entry.title(notification.data),
    detail: notification.body ?? entry.detail(notification.data),
    icon: entry.icon,
    tone: entry.tone,
  };
}

/** Whether a notification is shown under a filter of the panel. */
export function inFilter(notification: NotificationView, filter: NotificationFilter): boolean {
  if (filter === "all") return true;
  return CATALOG[notification.type]?.filters.includes(filter) ?? false;
}

/** Types written by the database today: for the tests. */
export const NOTIFICATION_TYPES = Object.keys(CATALOG);
