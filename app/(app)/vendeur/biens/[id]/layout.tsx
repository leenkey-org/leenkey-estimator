import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { PropertySheetHeader } from "@/leenkey/properties/components/property-sheet";
import { propertyForSheet } from "@/leenkey/properties/load";
import { sheetHref } from "@/leenkey/properties/sheet";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.sheet;

type Props = { children: ReactNode; params: Promise<{ id: string }> };

// L1-14: the page of a property of the seller (SPEC-V2 8.3, G9 with Tabs,
// docs/DESIGN.md 13.1), in a column of 720 px. Its top (status, figures,
// actions, tabs) is shared by the tabs Infos, Photos and Annonce.
export default async function PropertySheetLayout({ children, params }: Props) {
  const [{ id }, profile] = await Promise.all([params, requireProfile()]);
  const property = await propertyForSheet(id);
  return (
    <div className="mx-auto w-full max-w-lk-settings px-5 py-6 md:px-10 md:py-10">
      {property ? (
        <>
          <PropertySheetHeader property={property} roles={profile.roles} />
          <div className="mt-6">{children}</div>
        </>
      ) : (
        <InlineAlert
          tone="danger"
          className="mt-6"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={sheetHref(id)}>{t.retry}</Link>
            </Button>
          }
        >
          {t.loadError}
        </InlineAlert>
      )}
    </div>
  );
}
