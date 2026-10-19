import type { ReactNode } from "react";
import type { Viewport } from "next";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SiteFooter } from "@/components/shared/site-footer";
import { requireProfile } from "@/core/auth/session";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";

// A conversation of the messaging (docs/DESIGN.md 12.9, G6): on a phone, its
// header and its message field instead of the tabs, which would cover the
// field, and no footer under the field; TopNav and footer from 768 px.
// Session, profile and accepted terms as in (app). The keyboard of a phone
// shrinks the page, so that the field stays above it (Chrome, Firefox).
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default async function ConversationLayout({ children }: { children: ReactNode }) {
  await requireProfile();
  return (
    <FacadeRoot className="flex min-h-dvh flex-col bg-lk-bg">
      <SiteTopNav />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter className="hidden md:block" />
    </FacadeRoot>
  );
}
