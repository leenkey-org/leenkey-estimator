"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Sends a GA4 page_view on every client-side navigation, as the V1 did
// with the TanStack router. The first load is counted by gtag('config').
export function GaPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      if (typeof window.gtag !== "function") return;
      const search = searchParams.toString();
      window.gtag("event", "page_view", {
        page_path: pathname + (search ? `?${search}` : ""),
        page_location: window.location.href,
        page_title: document.title,
      });
    } catch {
      // analytics must never break the UI
    }
  }, [pathname, searchParams]);

  return null;
}
