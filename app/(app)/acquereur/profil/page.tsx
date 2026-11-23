import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { BuyerProfileForm } from "@/leenkey/buyers/components/buyer-profile-form";
import { FinancingDocumentCard } from "@/leenkey/buyers/components/financing-document-card";
import { IdentityDocumentCard } from "@/leenkey/buyers/components/identity-document-card";
import { buyerIdentity } from "@/leenkey/buyers/identity";
import { buyerProfile, type BuyerProfile } from "@/leenkey/buyers/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frBuyerSpace } from "@/lib/i18n/sections/buyerSpace";
import { frIdentityDocument } from "@/lib/i18n/sections/identityDocument";
import { frProperties } from "@/lib/i18n/sections/properties";
import { SpacePage } from "../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = {
  buyerSpace: frBuyerSpace,
  identityDocument: frIdentityDocument,
  properties: frProperties,
} as const;

const t = fr.buyerSpace.profile;

export const metadata: Metadata = { title: t.metaTitle };

/** An account that never bought: an empty project (its row comes with the first save). */
const EMPTY: BuyerProfile = {
  project: null,
  targetCities: [],
  budgetMaxEuros: null,
  downPaymentEuros: null,
  loanNeeded: null,
  loanAmountEuros: null,
  situationNote: "",
  financingStatus: "not_provided",
  financingDocument: null,
  financingCheckedAt: null,
};

// The buying project of the buyer (L1-25, SPEC-V2 8.9): its status, what the
// seller sees of it, the form, then the proof of financing (L2-02) and the
// identity document asked before a visit (DECISIONS.md 2026-11-23).
export default async function BuyerProfilePage() {
  const profile = await requireProfile();
  const [result, identity] = await Promise.all([
    buyerProfile(profile.id),
    buyerIdentity(profile.id),
  ]);
  return (
    <SpacePage
      title={t.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: ROUTES.buyer, label: t.back }}
    >
      {result.ok ? (
        <>
          <BuyerProfileForm initial={result.data ?? EMPTY} />
          <FinancingDocumentCard
            initial={result.data?.financingDocument ?? null}
            checkedAt={result.data?.financingCheckedAt ?? null}
            declared={(result.data?.financingStatus ?? "not_provided") !== "not_provided"}
          />
          {identity.ok ? (
            <IdentityDocumentCard initial={identity.data} className="mt-10" />
          ) : (
            <InlineAlert tone="danger" className="mt-10">
              {fr.identityDocument.errors.loadError}
            </InlineAlert>
          )}
        </>
      ) : (
        <InlineAlert
          tone="danger"
          className="mt-6"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.buyerProfile}>{fr.properties.sheet.retry}</Link>
            </Button>
          }
        >
          {t.errors.loadError}
        </InlineAlert>
      )}
    </SpacePage>
  );
}
