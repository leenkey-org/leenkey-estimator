"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { InlineAlert } from "@/components/shared/inline-alert";

/**
 * Outcome of a change made from the page of a property (L1-14b), at the top
 * of its tab: it takes the focus when the tab opens, so that it is read,
 * then `?modifie=1` leaves the address, so that a reload does not say it
 * again.
 */
export function SavedNotice({ text }: { text: string }) {
  const notice = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    notice.current?.focus();
    window.history.replaceState(null, "", pathname);
  }, [pathname]);
  return (
    <div ref={notice} tabIndex={-1} className="outline-none">
      <InlineAlert tone="success" live={false}>
        {text}
      </InlineAlert>
    </div>
  );
}
