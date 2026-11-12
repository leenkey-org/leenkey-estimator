import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { PropertyList } from "@/leenkey/properties/components/property-list";
import { sellerProperties } from "@/leenkey/properties/queries";
import { sheetHref } from "@/leenkey/properties/sheet";
import { frPlaceholders } from "@/lib/i18n/sections/placeholders";
import { frProperties } from "@/lib/i18n/sections/properties";
import { frSpaces } from "@/lib/i18n/sections/spaces";
import { SpacePage } from "../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { placeholders: frPlaceholders, properties: frProperties, spaces: frSpaces } as const;

const t = fr.placeholders.sellerFile;

export const metadata: Metadata = { title: t.metaTitle };

// « Dossier » tab of the seller (L1-14): the page of their property, or the
// list when they sell several; its documents come with L3-04.
export default async function SellerFilePage() {
  const profile = await requireProfile();
  const result = await sellerProperties(profile.id);
  if (result.ok && result.data.length === 1) redirect(sheetHref(result.data[0].id));
  return (
    <SpacePage title={t.title} roles={profile.roles} profileId={profile.id}>
      {!result.ok ? (
        <InlineAlert tone="danger" className="mt-6">
          {fr.properties.list.error}
        </InlineAlert>
      ) : result.data.length === 0 ? (
        <EmptyState
          className="mt-12"
          title={fr.spaces.seller.title}
          description={fr.spaces.seller.text}
          action={
            <Button asChild>
              <Link href={ROUTES.newProperty}>{fr.properties.list.create}</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-8">
          <PropertyList properties={result.data} />
        </div>
      )}
    </SpacePage>
  );
}
