"use client";

import { useState } from "react";
import { NotificationBell } from "@/components/shared/notification-bell";
import { NotificationItem } from "@/components/shared/notification-item";
import type { Notifications } from "@/core/notifications/store";
import type { NotificationView } from "@/core/notifications/types";
import { describeNotification } from "@/leenkey/notifications/catalog";
import { NotificationPanel } from "@/leenkey/notifications/components/notification-panel";
import { notificationBell } from "@/leenkey/navigation/config";

type Sample = { sender: string; excerpt: string; listing: string; reference: string; city: string };

const HOUR = 3_600_000;

/** The events of the catalogue, as the database writes them (L1-22). */
function samples(sample: Sample, now: number): NotificationView[] {
  const listing = { title: sample.listing, reference: sample.reference, city: sample.city };
  const at = (hours: number) => new Date(now - hours * HOUR).toISOString();
  return [
    {
      id: "message",
      type: "message.new",
      title: null,
      body: null,
      data: { sender_first_name: sample.sender, excerpt: sample.excerpt, truncated: false },
      link: "/design#notifications",
      createdAt: at(0.2),
      readAt: null,
    },
    {
      id: "published",
      type: "listing.published",
      title: null,
      body: null,
      data: listing,
      link: "/design#notifications",
      createdAt: at(26),
      readAt: null,
    },
    {
      id: "rejected",
      type: "listing.rejected",
      title: null,
      body: null,
      data: listing,
      link: "/design#notifications",
      createdAt: at(80),
      readAt: null,
    },
    {
      id: "pending",
      type: "listing.pending",
      title: null,
      body: null,
      data: listing,
      link: "/design#notifications",
      createdAt: at(24 * 20),
      readAt: at(24 * 19),
    },
  ];
}

/** The bell with 3 unread and its panel, filters of the seller (L1-22). */
export function NotificationsDemo({ sample, count }: { sample: Sample; count: number }) {
  const [items, setItems] = useState<NotificationView[]>([]);
  const unread = items.length ? items.filter((item) => !item.readAt).length : count;
  const notifications: Notifications = {
    profileId: "demo",
    status: "ready",
    unread,
    items,
    markRead: (id) =>
      setItems((list) =>
        list.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
      ),
    markAllRead: () =>
      setItems((list) =>
        list.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      ),
    retry: () => {},
  };
  return (
    <NotificationBell
      {...notificationBell("seller")}
      count={unread}
      size="nav"
      // The dates of the samples are those of the opening: nothing rendered by the server.
      onOpenChange={(open) => {
        if (open && items.length === 0) setItems(samples(sample, Date.now()));
      }}
      panel={({ close, empty }) => (
        <NotificationPanel
          notifications={notifications}
          space="seller"
          close={close}
          empty={empty}
        />
      )}
    />
  );
}

/** NotificationItem in its four tones, three unread then one read, outside the panel. */
export function NotificationItemsDemo({
  sample,
  times,
}: {
  sample: Sample;
  times: readonly string[];
}) {
  const list = samples(sample, Date.parse("2026-10-24T10:00:00Z"));
  return (
    <ul className="max-w-105 overflow-hidden rounded-lk-md border border-lk-line">
      {list.map((notification, index) => {
        const description = describeNotification(notification);
        return (
          <NotificationItem
            key={notification.id}
            icon={description.icon}
            tone={description.tone}
            title={description.title}
            detail={description.detail}
            time={times[index] ?? ""}
            dateTime={notification.createdAt}
            unread={!notification.readAt}
          />
        );
      })}
    </ul>
  );
}
