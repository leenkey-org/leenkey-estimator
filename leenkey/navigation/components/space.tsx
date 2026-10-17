"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/shared/bottom-nav";
import {
  NotificationBell,
  type NotificationBellProps,
} from "@/components/shared/notification-bell";
import { bottomTabs, followSpace, notificationBell, spaceFor, type Space } from "../config";

const SpaceContext = createContext<Space | null>(null);

/**
 * Space of the signed-in areas, read from the address at each navigation: a
 * layout is not rendered again on a client navigation, so it cannot compute
 * it on the server. A shared page (messages, account, assistant) keeps the
 * space the visitor came from; opened first, the one of the account's roles.
 */
export function SpaceProvider({
  roles,
  children,
}: {
  roles: readonly string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [space, setSpace] = useState<Space>(() => spaceFor(pathname, roles));
  const next = followSpace(space, pathname);
  // Adjusted while rendering (react.dev, « Storing information from previous
  // renders »): no frame with the tabs of the previous space.
  if (next !== space) setSpace(next);
  return <SpaceContext.Provider value={next}>{children}</SpaceContext.Provider>;
}

/** Space of the page: the one of SpaceProvider, otherwise from the address and the roles. */
export function useSpace(roles: readonly string[]): Space {
  const pathname = usePathname();
  return useContext(SpaceContext) ?? spaceFor(pathname, roles);
}

/** The four tabs of the current space (DESIGN.md 10.6). */
export function SpaceBottomNav({ roles, label }: { roles: readonly string[]; label: string }) {
  return <BottomNav label={label} items={bottomTabs(useSpace(roles))} />;
}

/** Bell with the empty-panel sentence of the current space (DESIGN.md 10.7). */
export function SpaceNotificationBell({
  roles,
  ...props
}: { roles: readonly string[] } & Pick<NotificationBellProps, "size" | "tone" | "className">) {
  return <NotificationBell {...notificationBell(useSpace(roles))} {...props} />;
}
