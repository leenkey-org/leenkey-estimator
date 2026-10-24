import { describe, expect, it, vi } from "vitest";
import {
  applyNotificationChange,
  EMPTY_NOTIFICATIONS,
  LIST_LIMIT,
  withAllRead,
  withRead,
  type NotificationsState,
} from "@/core/notifications/state";
import { internalLink, type NotificationRow } from "@/core/notifications/types";
import { isCronRequest } from "@/core/cron/auth";
import { formatNotificationTime } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import {
  describeNotification,
  FILTERS,
  inFilter,
  NOTIFICATION_TYPES,
} from "@/leenkey/notifications/catalog";
import { notificationGroup } from "@/leenkey/notifications/components/notification-panel";

vi.mock("server-only", () => ({}));

// L1-22: the bell (its list, its count, its wording) and the door of the cron.

const t = fr.notifications.types;

function row(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: "n1",
    profile_id: "p1",
    type: "message.new",
    title: null,
    body: null,
    data: { sender_first_name: "Chloé", excerpt: "Bonjour", truncated: false },
    link: "/messages/c1",
    created_at: "2026-10-24T09:00:00.000Z",
    read_at: null,
    ...overrides,
  };
}

const ready = (items: NotificationRow[], unread: number): NotificationsState => ({
  profileId: "p1",
  status: "ready",
  unread,
  items: items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    data: item.data as Record<string, unknown>,
    link: item.link,
    createdAt: item.created_at,
    readAt: item.read_at,
  })),
});

describe("the list of the bell", () => {
  it("a new notification goes on top and counts as unread", () => {
    const state = ready([row({ id: "old", created_at: "2026-10-24T08:00:00.000Z" })], 1);
    const next = applyNotificationChange(state, { event: "INSERT", row: row({ id: "new" }) });
    expect(next?.items.map((item) => item.id)).toEqual(["new", "old"]);
    expect(next?.unread).toBe(2);
    // Twice the same event (a reconnection): once.
    expect(applyNotificationChange(next!, { event: "INSERT", row: row({ id: "new" }) })).toBe(next);
  });

  it("an older message notified late finds its place by date", () => {
    const state = ready([row({ id: "recent", created_at: "2026-10-24T09:30:00.000Z" })], 1);
    const next = applyNotificationChange(state, { event: "INSERT", row: row({ id: "older" }) });
    expect(next?.items.map((item) => item.id)).toEqual(["recent", "older"]);
  });

  it("read elsewhere (the conversation opened, another tab): the count goes down", () => {
    const state = ready([row()], 1);
    const next = applyNotificationChange(state, {
      event: "UPDATE",
      row: row({ read_at: "2026-10-24T09:05:00.000Z" }),
    });
    expect(next?.unread).toBe(0);
    expect(next?.items[0].readAt).toBe("2026-10-24T09:05:00.000Z");
  });

  it("a change beyond the list is read again; another account is ignored", () => {
    const state = ready([row()], 3);
    expect(applyNotificationChange(state, { event: "UPDATE", row: row({ id: "far" }) })).toBeNull();
    expect(
      applyNotificationChange(state, { event: "INSERT", row: row({ id: "x", profile_id: "p2" }) }),
    ).toBe(state);
  });

  it("keeps the latest ones only", () => {
    const many = Array.from({ length: LIST_LIMIT }, (_, index) =>
      row({
        id: `n${index}`,
        created_at: `2026-10-${String((index % 20) + 1).padStart(2, "0")}T08:00:00.000Z`,
      }),
    );
    const next = applyNotificationChange(ready(many, 0), {
      event: "INSERT",
      row: row({ id: "latest", created_at: "2026-10-25T08:00:00.000Z" }),
    });
    expect(next?.items).toHaveLength(LIST_LIMIT);
    expect(next?.items[0].id).toBe("latest");
  });

  it("one read, then all read", () => {
    const state = ready([row({ id: "a" }), row({ id: "b" })], 2);
    const one = withRead(state, "a", "2026-10-24T10:00:00.000Z");
    expect(one.unread).toBe(1);
    expect(withRead(one, "a", "2026-10-24T10:01:00.000Z")).toBe(one);
    const all = withAllRead(one, "2026-10-24T10:02:00.000Z");
    expect(all.unread).toBe(0);
    expect(all.items.every((item) => item.readAt)).toBe(true);
    expect(EMPTY_NOTIFICATIONS.items).toEqual([]);
  });
});

describe("wording of the notifications (from type and data)", () => {
  const view = (overrides: Partial<NotificationRow>) => ready([row(overrides)], 0).items[0];

  it("each type written by the database has its words", () => {
    expect(NOTIFICATION_TYPES.sort()).toEqual(
      ["listing.pending", "listing.published", "listing.rejected", "message.new"].sort(),
    );
    expect(describeNotification(view({}))).toMatchObject({
      title: "Nouveau message de Chloé",
      detail: "« Bonjour »",
      tone: "blue",
    });
    expect(
      describeNotification(view({ data: { excerpt: "Long", truncated: true } })),
    ).toMatchObject({ title: "Nouveau message", detail: "« Long… »" });
    expect(
      describeNotification(
        view({
          type: "listing.pending",
          data: { title: "Maison 5 pièces", reference: "LK-0042", city: "Savigny-sur-Orge" },
        }),
      ),
    ).toMatchObject({
      title: t.listingPending.title,
      detail: "Maison 5 pièces · LK-0042 · Savigny-sur-Orge",
    });
    // The town once, when the title carries it already.
    expect(
      describeNotification(
        view({
          type: "listing.pending",
          data: {
            title: "Appartement 3 pièces · Épinay-sur-Orge",
            reference: "LK-0018",
            city: "Épinay-sur-Orge",
          },
        }),
      ).detail,
    ).toBe("Appartement 3 pièces · Épinay-sur-Orge · LK-0018");
    expect(
      describeNotification(view({ type: "listing.published", data: { title: "Maison" } })),
    ).toMatchObject({ title: t.listingPublished.title, tone: "success" });
    expect(
      describeNotification(view({ type: "listing.rejected", data: { title: "Maison" } })),
    ).toMatchObject({ title: t.listingRejected.title, tone: "warning" });
  });

  it("a row written with its own words keeps them; an unknown type has a default", () => {
    expect(
      describeNotification(view({ title: "Votre annonce est en ligne", body: "Bravo" })),
    ).toMatchObject({ title: "Votre annonce est en ligne", detail: "Bravo" });
    expect(describeNotification(view({ type: "visit.booked", data: {} }))).toMatchObject({
      title: t.fallback,
      detail: null,
      tone: "stone",
    });
  });

  it("filters of each space (DESIGN.md 10.7)", () => {
    expect(FILTERS.seller).toEqual(["all", "messages", "offersVisits"]);
    expect(FILTERS.buyer).toEqual(["all", "searches", "visitsOffers"]);
    expect(FILTERS.admin).toEqual(["all"]);
    expect(inFilter(view({}), "messages")).toBe(true);
    expect(inFilter(view({ type: "listing.published" }), "messages")).toBe(false);
    expect(inFilter(view({ type: "listing.published" }), "all")).toBe(true);
  });

  it("groups and times, in Paris", () => {
    const now = new Date("2026-10-24T10:00:00Z");
    expect(notificationGroup("2026-10-24T09:48:00Z", now)).toBe("today");
    expect(notificationGroup("2026-10-23T21:59:00Z", now)).toBe("week"); // 23:59 in Paris
    expect(notificationGroup("2026-10-23T22:01:00Z", now)).toBe("today"); // 00:01 in Paris
    expect(notificationGroup("2026-10-18T10:00:00Z", now)).toBe("week");
    expect(notificationGroup("2026-10-17T10:00:00Z", now)).toBe("older");
    expect(formatNotificationTime("2026-10-24T09:48:00Z", now)).toBe("Il y a 12 min");
    expect(formatNotificationTime("2026-10-23T09:00:00Z", now)).toBe("Hier");
    expect(formatNotificationTime("2026-10-20T09:00:00Z", now)).toBe("Mardi");
    expect(formatNotificationTime("2026-10-03T09:00:00Z", now)).toBe("3 oct.");
  });
});

describe("words and links of the bell", () => {
  it("« d'Alice », « de David »", () => {
    expect(t.messageNew.title("Alice")).toBe("Nouveau message d'Alice");
    expect(t.messageNew.title("Émilie")).toBe("Nouveau message d'Émilie");
    expect(t.messageNew.title("Hugo")).toBe("Nouveau message d'Hugo");
    expect(t.messageNew.title("David")).toBe("Nouveau message de David");
    expect(t.messageNew.title("Yann")).toBe("Nouveau message de Yann");
    expect(fr.emails.newMessages.subject("Alice", 3)).toBe("3 nouveaux messages d'Alice");
  });

  it("a date ahead of the clock of the device is « À l'instant »", () => {
    const now = new Date("2026-10-24T10:00:00Z");
    expect(formatNotificationTime("2026-10-24T10:00:40Z", now)).toBe("À l'instant");
  });

  it("a notification leads inside the site only", () => {
    expect(internalLink("/messages/c1")).toBe("/messages/c1");
    expect(internalLink("//hote-tiers.example/x")).toBeNull();
    expect(internalLink("/\\hote-tiers.example")).toBeNull();
    expect(internalLink("https://hote-tiers.example")).toBeNull();
    expect(internalLink(null)).toBeNull();
  });
});

describe("the door of the cron", () => {
  it("only « Bearer <CRON_SECRET> », compared in full; nothing without a secret", () => {
    expect(isCronRequest("Bearer s3cret", "s3cret")).toBe(true);
    expect(isCronRequest("Bearer s3cre", "s3cret")).toBe(false);
    expect(isCronRequest("s3cret", "s3cret")).toBe(false);
    expect(isCronRequest(null, "s3cret")).toBe(false);
    expect(isCronRequest("Bearer ", "")).toBe(false);
    expect(isCronRequest("Bearer anything", undefined)).toBe(false);
  });
});
