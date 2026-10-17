import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page of the back office. Page title 24 px 700 wide from 768 px
 * (docs/DESIGN.md 10.6); below, the AdminMobileHeader shows the section and
 * the H1 stays for screen readers only, unless `titleOnMobile` (a page of
 * one item, whose name the header does not give). `back`: a link above.
 */
export function AdminPage({
  title,
  titleOnMobile = false,
  back,
  children,
}: {
  title: string;
  titleOnMobile?: boolean;
  back?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      {back ? <div className="-mb-4 md:-mb-5">{back}</div> : null}
      <h1
        className={cn(
          "font-bold text-wide text-lk-ink md:text-lk-h2-lg",
          titleOnMobile ? "text-lk-h2" : "sr-only md:not-sr-only",
        )}
      >
        {title}
      </h1>
      {children}
    </div>
  );
}
