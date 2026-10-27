"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Classes for what a page opens out of its root (menus, panels of Radix in a
 * portal): the scope of a redesign (`lk-d`, L1-57), so that the account menu
 * and the panel of the bell of the home page D wear its charte too.
 */
const PortalScopeContext = createContext<string | undefined>(undefined);

export function PortalScope({ className, children }: { className: string; children: ReactNode }) {
  return <PortalScopeContext.Provider value={className}>{children}</PortalScopeContext.Provider>;
}

/** The classes of the scope of the page, undefined outside a redesign. */
export function usePortalScope(): string | undefined {
  return useContext(PortalScopeContext);
}
