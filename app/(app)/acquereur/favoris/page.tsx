import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireProfile } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/config";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../../_components/space-page";

const t = fr.placeholders.favourites;

export const metadata: Metadata = { title: t.metaTitle };

// Placeholder until the favourites (L1-18), reached from the bottom tabs and
// the TopNav.
export default async function FavouritesPage() {
  await requireProfile();
  return (
    <SpacePage title={t.title}>
      <ComingSoon
        className="mt-6"
        title={t.comingTitle}
        text={t.comingText}
        action={
          <Button asChild>
            <Link href={ROUTES.search}>{t.action}</Link>
          </Button>
        }
      />
    </SpacePage>
  );
}
