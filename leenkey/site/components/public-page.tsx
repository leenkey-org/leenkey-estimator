import type { ReactNode } from "react";
import { FacadeRoot } from "@/components/shared/facade-root";
import { RevealOnScroll } from "@/components/shared/reveal-on-scroll";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteMobileHeader } from "@/leenkey/navigation/components/site-mobile-header";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";

/**
 * Shell of a public page of the site (G1, docs/DESIGN.md 11): the TopNav from
 * 768 px, the mobile header with its menu below, the content on white, the
 * SiteFooter at the end (at the bottom of the screen on a short page). Its
 * sections rise into place as they enter the screen (DESIGN.md 9).
 */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <FacadeRoot className="flex min-h-dvh flex-col bg-lk-surface">
      <SiteTopNav />
      <SiteMobileHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <RevealOnScroll />
    </FacadeRoot>
  );
}
