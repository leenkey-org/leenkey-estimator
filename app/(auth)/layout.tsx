import type { ReactNode } from "react";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SiteFooter } from "@/components/shared/site-footer";

// Sign-up, login, password and terms screens: G5 simplified (DESIGN.md 12.1,
// 13.1), then the footer below the fold: legal links and « Gérer mes
// cookies » (L1-36, L1-37).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <FacadeRoot className="min-h-dvh bg-lk-surface">
      {children}
      <SiteFooter />
    </FacadeRoot>
  );
}
