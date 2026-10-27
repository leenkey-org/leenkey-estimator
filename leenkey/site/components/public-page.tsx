import type { ReactNode } from "react";
import { FacadeRoot } from "@/components/shared/facade-root";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "@/components/shared/reveal-on-scroll";
import { BottomNav } from "@/components/shared/bottom-nav";
import { GradientDefs } from "@/components/shared/gradient-defs";
import { BOTTOM_NAV_OFFSET } from "@/components/shared/nav-items";
import { PortalScope } from "@/components/shared/portal-scope";
import { SiteFooter } from "@/components/shared/site-footer";
import { getProfile } from "@/core/auth/session";
import { SpaceBottomNav } from "@/leenkey/navigation/components/space";
import { bottomTabs } from "@/leenkey/navigation/config";
import { fr } from "@/lib/i18n/fr";
import { SiteMobileHeader } from "@/leenkey/navigation/components/site-mobile-header";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";

/**
 * Shell of a public page of the site (G1, docs/DESIGN.md 11): the TopNav from
 * 768 px, the mobile header with its menu below, the content on white (warm:
 * the neutral of direction C, its sections and cards white on it), the
 * SiteFooter at the end (at the bottom of the screen on a short page). Its
 * sections rise into place as they enter the screen (DESIGN.md 9).
 *
 * Redesign D (`redesign`, docs/design-handoff-d/SPECS.md, L1-57): the charte
 * on the page (`lk-d`: Sora and its colours), the headers on the night of
 * the first band, the white footer, and on a phone the bottom tabs of the
 * account (SPECS.md 3, item 12).
 */
export async function PublicPage({
  children,
  tone = "white",
  redesign = false,
}: {
  children: ReactNode;
  tone?: "white" | "warm";
  redesign?: boolean;
}) {
  if (redesign) {
    const profile = await getProfile();
    return (
      <FacadeRoot className={cn("lk-d flex min-h-dvh flex-col bg-lk-bg", BOTTOM_NAV_OFFSET)}>
        {/* Its menus and panels, opened out of this root, in the charte too. */}
        <PortalScope className="lk-d">
          <GradientDefs />
          <SiteTopNav tone="night" />
          <SiteMobileHeader tone="night" />
          <main className="flex-1">{children}</main>
          <SiteFooter tone="white" />
          {/* The tabs of the space of the account, as in its pages; a visitor, the buyer's. */}
          {profile ? (
            <SpaceBottomNav roles={profile.roles} label={fr.nav.label} />
          ) : (
            <BottomNav label={fr.nav.label} items={bottomTabs("buyer", false)} />
          )}
          <RevealOnScroll />
        </PortalScope>
      </FacadeRoot>
    );
  }
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
