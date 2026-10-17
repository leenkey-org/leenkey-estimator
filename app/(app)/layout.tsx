import type { ReactNode } from "react";
import { FacadeRoot } from "@/components/shared/facade-root";
import { BOTTOM_NAV_OFFSET } from "@/components/shared/nav-items";
import { SiteFooter } from "@/components/shared/site-footer";
import { requireProfile } from "@/core/auth/session";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";
import { SpaceBottomNav, SpaceProvider } from "@/leenkey/navigation/components/space";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Signed-in seller and buyer areas: session, profile and accepted terms
// (the middleware already sends signed-out visitors to /connexion). TopNav
// from 768 px, tabs of the space below (docs/DESIGN.md 4.2, 10.6), SiteFooter
// at the end (legal links and « Gérer mes cookies », L1-36). The space (tabs,
// sentence of the notifications panel) follows the address on the client
// (SpaceProvider): this layout is not rendered again on a client navigation.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  return (
    <FacadeRoot className={cn("min-h-dvh bg-lk-bg", BOTTOM_NAV_OFFSET)}>
      <SpaceProvider roles={profile.roles}>
        <SiteTopNav />
        <main>{children}</main>
        <SiteFooter />
        <SpaceBottomNav roles={profile.roles} label={fr.nav.label} />
      </SpaceProvider>
    </FacadeRoot>
  );
}
