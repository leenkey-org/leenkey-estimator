import { ComingSoon } from "@/components/shared/coming-soon";
import { requireAdmin } from "@/core/auth/session";
import { adminMetadata } from "@/leenkey/admin/metadata";
import { fr } from "@/lib/i18n/fr";
import { AdminPage } from "../_components/admin-page";

const t = fr.placeholders.admin.assistant;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

// Placeholder until the knowledge base and the assistant log (L1-30). The page
// checks the admin role itself, not only the layout (see
// app/(admin)/admin/layout.tsx).
export default async function AdminAssistantPage() {
  await requireAdmin();
  return (
    <AdminPage title={t.title}>
      <ComingSoon title={t.comingTitle} text={t.comingText} />
    </AdminPage>
  );
}
