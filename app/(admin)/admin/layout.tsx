import type { ReactNode } from "react";
import { AdminShell } from "@/components/shared/admin-shell";
import { FacadeRoot } from "@/components/shared/facade-root";
import { requireAdmin } from "@/core/auth/session";
import { signOut } from "@/leenkey/auth/actions";
import { accountMenu, ADMIN_NAV_ITEMS, bottomTabs, ROUTES } from "@/leenkey/navigation/config";
import { fr } from "@/lib/i18n/fr";

// Back office: admin role required (CLAUDE.md section 3). A signed-in user
// without it gets a 404; a signed-out visitor is sent to the login page by the
// middleware. Each page checks again with requireAdmin() (see its comment).
// AdminShell: sidebar from 768 px, header and bottom tabs below (DESIGN.md 10.6).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdmin();
  return (
    <FacadeRoot className="min-h-dvh bg-lk-bg">
      <AdminShell
        label={fr.nav.adminLabel}
        homeHref={ROUTES.admin}
        items={ADMIN_NAV_ITEMS}
        tabs={bottomTabs("admin")}
        fallbackTitle={fr.nav.backOffice}
        account={{
          ...accountMenu(profile),
          signOut,
          name: profile.firstName,
          role: fr.nav.admin.role,
        }}
      >
        {children}
      </AdminShell>
    </FacadeRoot>
  );
}
