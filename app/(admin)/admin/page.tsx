import type { Metadata } from "next";
import { requireProfile } from "@/core/auth/session";
import { EmptyState } from "@/components/shared/empty-state";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.spaces.admin.metaTitle };

// Placeholder until the back office (L1-19).
export default async function AdminHomePage() {
  const profile = await requireProfile();
  return (
    <div className="mx-auto w-full max-w-lk-settings px-5 py-10">
      <h1 className="text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h1-lg">
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
