import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The messaging (docs/DESIGN.md 13.1, G6): from 1024 px, the list of the
 * conversations on the left (360 px, its own scroll, under the TopNav) and
 * the open conversation on the right; below 1024 px, one of the two only
 * (`show`). The page scrolls: the header and the message field of a
 * conversation stay in view (sticky), and the preprod banner scrolls away.
 * From 1024 px, a bordered panel in the frame of the page (L1-56): as wide
 * as the screen, inside its gutters, aligned on the TopNav.
 */
export function MessagesLayout({
  list,
  children,
  show,
}: {
  list: ReactNode;
  children: ReactNode;
  show: "list" | "detail";
}) {
  return (
    <div className="flex flex-1 flex-col lg:lk-frame">
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[22.5rem_minmax(0,1fr)] lg:border-x lg:border-lk-line">
        <div
          className={cn(
            show === "list" ? "block" : "hidden",
            // 4.5rem: the TopNav (h-18).
            "lg:sticky lg:top-18 lg:block lg:h-[calc(100dvh-4.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:border-lk-line",
          )}
        >
          {list}
        </div>
        <div
          className={cn(
            show === "detail" ? "flex" : "hidden",
            "min-w-0 flex-1 flex-col md:min-h-[calc(100dvh-4.5rem)] lg:flex",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
