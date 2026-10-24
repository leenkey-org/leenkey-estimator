"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/shared/button";
import { FilterPillButtons } from "@/components/shared/filter-pills";
import { InlineAlert } from "@/components/shared/inline-alert";
import { NotificationItem } from "@/components/shared/notification-item";
import { Skeleton } from "@/components/shared/skeleton";
import type { Notifications } from "@/core/notifications/store";
import { internalLink, type NotificationView } from "@/core/notifications/types";
import type { Space } from "@/leenkey/navigation/spaces";
import { formatNotificationTime, parisDaysAgo } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { describeNotification, FILTERS, inFilter, type NotificationFilter } from "../catalog";

const t = fr.notifications;

export type NotificationGroup = "today" | "week" | "older";

const GROUPS: readonly NotificationGroup[] = ["today", "week", "older"];

/** « Aujourd'hui », « Cette semaine » (the six days before), « Plus ancien »: in Paris. */
export function notificationGroup(createdAt: string, now: Date): NotificationGroup {
  const days = parisDaysAgo(createdAt, now);
  if (days <= 0) return "today";
  return days < 7 ? "week" : "older";
}

/**
 * The content of the notifications panel (docs/DESIGN.md 10.7) under its
 * header: filters of the space, the notifications grouped by age, « Tout
 * marquer comme lu ». A notification opened is read and closes the panel.
 * The empty state of the space for an account without any notification.
 */
export function NotificationPanel({
  notifications,
  space,
  close,
  empty,
}: {
  notifications: Notifications;
  space: Space;
  close: () => void;
  empty: ReactNode;
}) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const id = useId();
  const { status, items, unread, markRead, markAllRead, retry } = notifications;

  if (items.length === 0) {
    if (status === "ready") return empty;
    if (status === "error") {
      return (
        <div className="px-4 py-6">
          <InlineAlert
            tone="danger"
            action={
              <Button variant="ghost" size="sm" onClick={retry}>
                {t.retry}
              </Button>
            }
          >
            {t.loadError}
          </InlineAlert>
        </div>
      );
    }
    return (
      <div aria-busy="true" className="flex flex-col">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex gap-3 border-b border-lk-line px-4 py-3.5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2 pt-0.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const now = new Date();
  const filters = FILTERS[space];
  const shown = items.filter((item) => inFilter(item, filter));
  const groups = GROUPS.map((group) => ({
    group,
    items: shown.filter((item) => notificationGroup(item.createdAt, now) === group),
  })).filter((entry) => entry.items.length > 0);

  const item = (notification: NotificationView) => {
    const description = describeNotification(notification);
    return (
      <NotificationItem
        key={notification.id}
        icon={description.icon}
        tone={description.tone}
        title={description.title}
        detail={description.detail}
        time={formatNotificationTime(notification.createdAt, now)}
        dateTime={notification.createdAt}
        unread={!notification.readAt}
        href={internalLink(notification.link)}
        onSelect={() => {
          if (!notification.readAt) markRead(notification.id);
          close();
        }}
      />
    );
  };

  return (
    <>
      {filters.length > 1 ? (
        <div className="shrink-0 border-b border-lk-line px-4 py-3">
          <FilterPillButtons
            className="-mx-4 px-4"
            label={t.filtersLabel}
            items={filters.map((key) => ({ key, label: t.filters[key] }))}
            active={filter}
            onSelect={setFilter}
          />
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-lk-secondary text-lk-ink-2">{t.filterEmpty}</p>
        ) : (
          groups.map((entry) => (
            <section key={entry.group} aria-labelledby={`${id}-${entry.group}`}>
              <h3
                id={`${id}-${entry.group}`}
                className="px-4 pt-2.5 pb-1 text-lk-micro font-semibold text-lk-ink-3"
              >
                {t.groups[entry.group]}
              </h3>
              <ul>{entry.items.map(item)}</ul>
            </section>
          ))
        )}
      </div>
      <div className="flex shrink-0 items-center border-t border-lk-line px-4 py-3.5">
        {/* aria-disabled, not disabled: the focus stays on it once all is read. */}
        <Button
          variant="ghost"
          size="sm"
          aria-disabled={unread === 0}
          onClick={() => {
            if (unread > 0) markAllRead();
          }}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
        >
          {t.markAllRead}
        </Button>
      </div>
    </>
  );
}
