"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { followSpace, pageSpace, type Space } from "../spaces";

const SpaceContext = createContext<Space | null>(null);

/**
 * Last space visited in this tab (DECISIONS 2026-10-17): a page without a
 * space of its own (messages, account, assistant, a listing) keeps the one
 * the visitor came from, the search included. In the root layout, which a
 * client navigation never unmounts. Nothing of Façade nor of the texts here:
 * the V1 pages load this file too.
 */
export function SpaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [last, setLast] = useState<Space | null>(() => followSpace(null, pathname));
  const next = followSpace(last, pathname);
  // Adjusted while rendering (react.dev, « Storing information from previous
  // renders »): no frame with the tabs of the previous space.
  if (next !== last) setLast(next);
  return <SpaceContext.Provider value={next}>{children}</SpaceContext.Provider>;
}

/**
 * Space of the page: its own, the last one visited, otherwise the one of the
 * roles. Never the back office for an account without the admin role: the
 * provider, which does not know the roles, keeps it after the 404 of /admin.
 */
export function useSpace(roles: readonly string[]): Space {
  const pathname = usePathname();
  return pageSpace(useContext(SpaceContext), pathname, roles);
}
