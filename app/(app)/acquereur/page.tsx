import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/core/auth/session";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../_components/space-page";

export const metadata: Metadata = { title: fr.spaces.buyer.metaTitle };

// Placeholder until the buyer home (DESIGN.md 12.10). The bell sits at the
// top of the page on mobile (SPEC-V2 section 10, DECISIONS Q26), in the
// TopNav from 768 px.
export default async function BuyerHomePage() {
  const profile = await requireProfile();
  const t = fr.spaces.buyer;
  return (
    <SpacePage title={fr.spaces.greeting(profile.firstName)} roles={profile.roles}>
      <EmptyState
        className="mt-12"
        title={t.title}
        description={t.text}
        action={
          <Button asChild>
            <Link href="/acheter">{t.action}</Link>
          </Button>
        }
      />
    </SpacePage>
  );
}
