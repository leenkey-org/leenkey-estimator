"use client";

import { BottomNav } from "@/components/shared/bottom-nav";
import {
  NotificationBell,
  type NotificationBellProps,
} from "@/components/shared/notification-bell";
import { bottomTabs, notificationBell } from "../config";
import { useSpace } from "./space-context";

/** The four tabs of the current space (DESIGN.md 10.6). */
export function SpaceBottomNav({ roles, label }: { roles: readonly string[]; label: string }) {
  return <BottomNav label={label} items={bottomTabs(useSpace(roles))} />;
}

/**
 * Bell with the empty-panel sentence of the current space (DESIGN.md 10.7).
 * None in the back office yet (DECISIONS 2026-10-17, with L1-22).
 */
export function SpaceNotificationBell({
  roles,
  ...props
}: { roles: readonly string[] } & Pick<NotificationBellProps, "size" | "tone" | "className">) {
  const space = useSpace(roles);
  if (space === "admin") return null;
  return <NotificationBell {...notificationBell(space)} {...props} />;
}
