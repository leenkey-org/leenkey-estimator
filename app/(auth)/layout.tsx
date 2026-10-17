import type { ReactNode } from "react";
import { FacadeRoot } from "@/components/shared/facade-root";

// Sign-up, login, password and terms screens: G5 simplified (DESIGN.md 12.1, 13.1).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <FacadeRoot className="min-h-dvh bg-lk-surface">{children}</FacadeRoot>;
}
