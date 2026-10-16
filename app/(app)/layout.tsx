import type { ReactNode } from "react";
import { requireProfile } from "@/core/auth/session";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SpaceHeader } from "@/components/shared/space-header";

// Signed-in seller and buyer areas: session, profile and accepted terms
// (the middleware already sends signed-out visitors to /connexion).
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireProfile();
  return (
    <FacadeRoot className="min-h-dvh bg-lk-bg">
      <SpaceHeader />
      <main>{children}</main>
    </FacadeRoot>
  );
}
