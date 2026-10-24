"use client";

import { BottomNav } from "@/components/shared/bottom-nav";
import {
  NotificationBell,
  type NotificationBellProps,
} from "@/components/shared/notification-bell";
import { useNotifications } from "@/core/notifications/store";
import { NotificationPanel } from "@/leenkey/notifications/components/notification-panel";
import { bottomTabs, notificationBell } from "../config";
import { useSpace } from "./space-context";

/** The four tabs of the current space (DESIGN.md 10.6). */
export function SpaceBottomNav({ roles, label }: { roles: readonly string[]; label: string }) {
  return <BottomNav label={label} items={bottomTabs(useSpace(roles))} />;
}

/**
 * Bell of the account (DESIGN.md 10.7, L1-22): its unread count in real time,
 * the panel of its notifications with the filters and the empty state of the
 * current space, the back office included.
 */
export function SpaceNotificationBell({
  roles,
  profileId,
  ...props
}: {
  roles: readonly string[];
  /** The account the page is rendered for. */
  profileId: string;
} & Pick<NotificationBellProps, "size" | "tone" | "className">) {
  const space = useSpace(roles);
  const notifications = useNotifications(profileId);
  return (
    <NotificationBell
      {...notificationBell(space)}
      {...props}
      count={notifications.unread}
      panel={({ close, empty }) => (
        <NotificationPanel
          notifications={notifications}
          space={space}
          close={close}
          empty={empty}
        />
      )}
    />
  );
}
