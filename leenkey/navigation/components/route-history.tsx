"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordRoute } from "../route-history";

/** Records each page of the visit (route-history.ts); renders nothing. In the root layout. */
export function RouteHistory() {
  const pathname = usePathname();
  useEffect(() => recordRoute(pathname), [pathname]);
  return null;
}
