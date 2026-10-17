import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireProfile } from "@/core/auth/session";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../../_components/space-page";

const t = fr.placeholders.sellerFile;

export const metadata: Metadata = { title: t.metaTitle };

// Placeholder until the property file and its documents (L1-14, L3-04),
// reached from the « Dossier » tab of the seller.
export default async function SellerFilePage() {
  const profile = await requireProfile();
  return (
    <SpacePage title={t.title} roles={profile.roles}>
      <ComingSoon className="mt-6" title={t.comingTitle} text={t.comingText} />
    </SpacePage>
  );
}
