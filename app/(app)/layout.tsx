import { Suspense, type ReactNode } from "react";
import { FacadeRoot } from "@/components/shared/facade-root";
import { BOTTOM_NAV_OFFSET } from "@/components/shared/nav-items";
import { SiteFooter } from "@/components/shared/site-footer";
import { getUser, requireProfile } from "@/core/auth/session";
import { AssistantPanel } from "@/leenkey/ai/components/assistant-panel";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";
import { SpaceBottomNav } from "@/leenkey/navigation/components/space";
import { SpaceSidebar } from "@/leenkey/navigation/components/space-sidebar";
import { accountInitial } from "@/leenkey/navigation/config";
import { frNav } from "@/lib/i18n/sections/nav";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { nav: frNav } as const;

// Signed-in seller and buyer areas: session, profile and accepted terms
// (the middleware already sends signed-out visitors to /connexion). TopNav
// from 768 px, tabs of the space below (docs/DESIGN.md 4.2, 10.6), SiteFooter
// at the end (legal links and « Gérer mes cookies », L1-36), at the bottom of
// the screen on a short page. The space (tabs, sentence of the notifications
// panel) follows the address in the browser (SpaceProvider, root layout):
// this layout is not rendered again on a client navigation. From 1 024 px,
// the column of the space on the left of the page (SpaceSidebar, DECISIONS.md
// 2026-11-26): the account (its name and its email, as on « Mon compte ») and
// the pages of the space.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  // Read once per request (cache): the email shown on « Mon compte ».
  const user = await getUser();
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  return (
    <FacadeRoot className={cn("flex min-h-dvh flex-col bg-lk-bg", BOTTOM_NAV_OFFSET)}>
      <SiteTopNav />
      <div className="group/space flex-1 lg:flex">
        <SpaceSidebar
          roles={profile.roles}
          initial={accountInitial(profile.firstName)}
          name={name || null}
          email={user?.email ?? null}
        />
        <main className="min-w-0 lg:flex-1">{children}</main>
      </div>
      <SiteFooter />
      <SpaceBottomNav roles={profile.roles} label={fr.nav.label} />
      {/* The assistant of the seller from 768 px (L1-28): its button at the bottom right. */}
      <Suspense fallback={null}>
        <AssistantPanel roles={profile.roles} />
      </Suspense>
    </FacadeRoot>
  );
}
