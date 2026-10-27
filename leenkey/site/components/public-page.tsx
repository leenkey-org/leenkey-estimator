import type { ReactNode } from "react";
import { BottomNav } from "@/components/shared/bottom-nav";
import { FacadeRoot } from "@/components/shared/facade-root";
import { BOTTOM_NAV_OFFSET } from "@/components/shared/nav-items";
import { RevealOnScroll } from "@/components/shared/reveal-on-scroll";
import { SiteFooter } from "@/components/shared/site-footer";
import { getProfile } from "@/core/auth/session";
import { SiteMobileHeader } from "@/leenkey/navigation/components/site-mobile-header";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";
import { SpaceBottomNav } from "@/leenkey/navigation/components/space";
import { bottomTabs } from "@/leenkey/navigation/config";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * Shell of a public page of the site (G1, docs/DESIGN.md 11), in the charte D
 * (docs/design-handoff-d/SPECS.md 3, L1-57 and L1-58): the TopNav from
 * 768 px, the mobile header with its menu below, the content on the page
 * neutral, the white SiteFooter at the end (at the bottom of the screen on a
 * short page), and on a phone the bottom tabs of the account (SPECS.md 3,
 * item 12; a visitor, the buyer's). Its sections rise into place as they
 * enter the screen (DESIGN.md 9).
 *
 * `header="night"`: the headers on the night, for a page whose first band is
 * the night (the home page, the heroes of the showcase pages).
 */
export async function PublicPage({
  children,
  header = "light",
}: {
  children: ReactNode;
  header?: "light" | "night";
}) {
  const profile = await getProfile();
  return (
    <FacadeRoot className={cn("flex min-h-dvh flex-col bg-lk-bg", BOTTOM_NAV_OFFSET)}>
      <SiteTopNav tone={header} />
      <SiteMobileHeader tone={header} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {profile ? (
        <SpaceBottomNav roles={profile.roles} label={fr.nav.label} />
      ) : (
        <BottomNav label={fr.nav.label} items={bottomTabs("buyer", false)} />
      )}
      <RevealOnScroll />
    </FacadeRoot>
  );
}
