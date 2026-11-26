import type { ReactNode } from "react";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SiteFooter } from "@/components/shared/site-footer";
import { AuthBrandPanel } from "./_components/auth-brand-panel";

// Sign-up, login, password and terms screens: G5 simplified (DESIGN.md 12.1,
// 13.1) on the page background, the form in a card; from 1 024 px the brand
// panel beside it (design pass of 2026-11-26). Then the footer below the
// fold: legal links and « Gérer mes cookies » (L1-36, L1-37).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <FacadeRoot className="min-h-dvh bg-lk-bg">
      <div className="lg:lk-frame lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-12">
        <div className="min-w-0">{children}</div>
        <AuthBrandPanel />
      </div>
      <SiteFooter />
    </FacadeRoot>
  );
}
