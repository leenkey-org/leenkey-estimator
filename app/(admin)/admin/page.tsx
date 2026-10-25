import { requireAdmin } from "@/core/auth/session";
import { adminMetadata } from "@/leenkey/admin/metadata";
import { EmptyState } from "@/components/shared/empty-state";
import { fr } from "@/lib/i18n/fr";
import { AdminPage } from "./_components/admin-page";

export const generateMetadata = adminMetadata({ title: fr.spaces.admin.metaTitle });

// Placeholder until the back office dashboard (L1-30). The title is the one
// of the sidebar and of the AdminMobileHeader, which shows it below 768 px.
export default async function AdminHomePage() {
  const profile = await requireAdmin();
  return (
    <AdminPage title={fr.nav.admin.dashboard}>
      <p className="text-lk-title font-semibold text-lk-ink">
        {fr.spaces.greeting(profile.firstName)}
      </p>
      <EmptyState
        className="mt-6"
        title={fr.spaces.admin.title}
        description={fr.spaces.admin.text}
      />
    </AdminPage>
  );
}
