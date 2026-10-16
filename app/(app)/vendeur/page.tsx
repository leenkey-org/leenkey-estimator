import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/core/auth/session";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.spaces.seller.metaTitle };

// Placeholder until the seller dashboard (L1-24).
export default async function SellerHomePage() {
  const profile = await requireProfile();
  const t = fr.spaces.seller;
  return (
    <div className="mx-auto w-full max-w-lk-settings px-5 py-10">
      <h1 className="text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h1-lg">
        {fr.spaces.greeting(profile.firstName)}
      </h1>
      <EmptyState
        className="mt-12"
        title={t.title}
        description={t.text}
        action={
          <Button asChild>
            <Link href="/estimer">{t.action}</Link>
          </Button>
        }
      />
    </div>
  );
}
