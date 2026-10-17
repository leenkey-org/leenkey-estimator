import type { ReactNode } from "react";
import { BottomNav } from "@/components/shared/bottom-nav";
import { FacadeRoot } from "@/components/shared/facade-root";
import { BOTTOM_NAV_OFFSET, pathnameOf } from "@/components/shared/nav-items";
import { currentPath, requireProfile } from "@/core/auth/session";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";
import { bottomTabs, spaceFor } from "@/leenkey/navigation/config";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Signed-in seller and buyer areas: session, profile and accepted terms
// (the middleware already sends signed-out visitors to /connexion). TopNav
// from 768 px, tabs of the space below (docs/DESIGN.md 4.2, 10.6). A layout
// is not rendered again on a client navigation: the tabs keep the space the
// visit started in, the current tab follows the address.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const space = spaceFor(pathnameOf(await currentPath()), profile.roles);
  return (
    <FacadeRoot className={cn("min-h-dvh bg-lk-bg", BOTTOM_NAV_OFFSET)}>
      <SiteTopNav />
      <main>{children}</main>
      <BottomNav label={fr.nav.label} items={bottomTabs(space)} />
    </FacadeRoot>
  );
}
