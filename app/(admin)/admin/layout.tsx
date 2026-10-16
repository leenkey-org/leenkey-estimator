import type { ReactNode } from "react";
import { requireAdmin } from "@/core/auth/session";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SpaceHeader } from "@/components/shared/space-header";

// Back office: admin role required (CLAUDE.md section 3). A signed-in user
// without it gets a 404; a signed-out visitor is sent to the login page by the
// middleware. Each page checks again with requireAdmin() (see its comment).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <FacadeRoot className="min-h-dvh bg-lk-bg">
      <SpaceHeader />
      <main>{children}</main>
    </FacadeRoot>
  );
}
