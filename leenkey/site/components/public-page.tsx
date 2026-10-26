import type { ReactNode } from "react";
import { FacadeRoot } from "@/components/shared/facade-root";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "@/components/shared/reveal-on-scroll";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteMobileHeader } from "@/leenkey/navigation/components/site-mobile-header";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";

/**
 * Shell of a public page of the site (G1, docs/DESIGN.md 11): the TopNav from
 * 768 px, the mobile header with its menu below, the content on white (warm:
 * the neutral of direction C, its sections and cards white on it), the
 * SiteFooter at the end (at the bottom of the screen on a short page). Its
 * sections rise into place as they enter the screen (DESIGN.md 9).
 */
export function PublicPage({
  children,
  tone = "white",
}: {
  children: ReactNode;
  tone?: "white" | "warm";
}) {
  return (
    <FacadeRoot
      className={cn("flex min-h-dvh flex-col", tone === "warm" ? "bg-lk-bg" : "bg-lk-surface")}
    >
      <SiteTopNav />
      <SiteMobileHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <RevealOnScroll />
    </FacadeRoot>
  );
}
