import type { Metadata } from "next";
import { requireAdmin } from "@/core/auth/session";
import { EmptyState } from "@/components/shared/empty-state";
import { fr } from "@/lib/i18n/fr";
import { AdminPage } from "./_components/admin-page";

export const metadata: Metadata = { title: fr.spaces.admin.metaTitle };

// Placeholder until the back office dashboard (L1-30). Below 768 px, the
// AdminMobileHeader shows « Tableau de bord » and the H1 is for screen readers.
export default async function AdminHomePage() {
  const profile = await requireAdmin();
  return (
    <AdminPage title={fr.spaces.greeting(profile.firstName)}>
      <EmptyState
        className="mt-6"
        title={fr.spaces.admin.title}
        description={fr.spaces.admin.text}
      />
    </AdminPage>
  );
}
