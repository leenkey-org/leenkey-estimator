import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireAdmin } from "@/core/auth/session";
import { fr } from "@/lib/i18n/fr";
import { AdminPage } from "../_components/admin-page";

const t = fr.placeholders.admin.offers;

export const metadata: Metadata = { title: t.metaTitle };

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
