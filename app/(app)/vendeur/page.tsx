import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/core/auth/session";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { PropertyList } from "@/leenkey/properties/components/property-list";
import { sellerProperties } from "@/leenkey/properties/queries";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../_components/space-page";

export const metadata: Metadata = { title: fr.spaces.seller.metaTitle };

// Until the seller dashboard (L1-24): the properties of the seller, each one
// opening its page (L1-14), and « Créer mon annonce » (L1-11). The bell sits
// at the top of the page on mobile (SPEC-V2 section 10, DECISIONS Q26), in
// the TopNav from 768 px.
export default async function SellerHomePage() {
  const profile = await requireProfile();
  const t = fr.spaces.seller;
  const list = fr.properties.list;
  const result = await sellerProperties(profile.id);

  return (
    <SpacePage title={fr.spaces.greeting(profile.firstName)} roles={profile.roles}>
      {!result.ok ? (
        <InlineAlert tone="danger" className="mt-6">
          {list.error}
        </InlineAlert>
      ) : result.data.length === 0 ? (
        <EmptyState
          className="mt-12"
          title={t.title}
          description={t.text}
          action={
            <Button asChild>
              <Link href={ROUTES.newProperty}>{list.create}</Link>
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="vos-biens" className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="vos-biens" className="text-lk-h3 font-semibold text-lk-ink">
              {list.title}
            </h2>
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.newProperty}>{list.create}</Link>
            </Button>
          </div>
          <PropertyList properties={result.data} />
        </section>
      )}
    </SpacePage>
  );
}
