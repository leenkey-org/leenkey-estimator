import type { ReactNode } from "react";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SiteFooter } from "@/components/shared/site-footer";
import { requireProfile } from "@/core/auth/session";

// Forms in steps of the signed-in areas (docs/DESIGN.md 11, G5): the
// AppHeader of the page, with its progress, instead of the TopNav and the
// tabs, which would leave the form; on a phone, the actions stay at the
// bottom of the screen, without the footer under them. Session, profile and
// accepted terms as in (app).
export default async function FormsLayout({ children }: { children: ReactNode }) {
  await requireProfile();
  return (
    <FacadeRoot className="flex min-h-dvh flex-col bg-lk-bg">
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter className="hidden md:block" />
    </FacadeRoot>
  );
}
