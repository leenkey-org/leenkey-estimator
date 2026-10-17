import type { Metadata } from "next";
import { requireAdmin } from "@/core/auth/session";
import { EmptyState } from "@/components/shared/empty-state";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.spaces.admin.metaTitle };

// Placeholder until the back office dashboard (L1-30).
export default async function AdminHomePage() {
  const profile = await requireAdmin();
  return (
    <div>
      <h1 className="text-lk-h1 font-bold text-wide text-lk-ink md:text-lk-h2-lg">
        {fr.spaces.greeting(profile.firstName)}
      </h1>
      <EmptyState
        className="mt-12"
        title={fr.spaces.admin.title}
        description={fr.spaces.admin.text}
      />
    </div>
  );
}
