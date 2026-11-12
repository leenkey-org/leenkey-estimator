import { ComingSoon } from "@/components/shared/coming-soon";
import { requireAdmin } from "@/core/auth/session";
import { adminMetadata } from "@/leenkey/admin/metadata";
import { frPlaceholders } from "@/lib/i18n/sections/placeholders";
import { AdminPage } from "../_components/admin-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { placeholders: frPlaceholders } as const;

const t = fr.placeholders.admin.offers;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

// Placeholder until the offers (L2-07). The page checks the admin role itself,
// not only the layout (see app/(admin)/admin/layout.tsx).
export default async function AdminOffersPage() {
  await requireAdmin();
  return (
    <AdminPage title={t.title}>
      <ComingSoon title={t.comingTitle} text={t.comingText} />
    </AdminPage>
  );
}
