import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { BuyerProfileForm } from "@/leenkey/buyers/components/buyer-profile-form";
import { buyerProfile, type BuyerProfile } from "@/leenkey/buyers/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../../_components/space-page";

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
};

// The buying project of the buyer (L1-25, SPEC-V2 8.9): its status, what the
// seller sees of it, and the form. The proof of financing comes with L2-02.
export default async function BuyerProfilePage() {
  const profile = await requireProfile();
  const result = await buyerProfile(profile.id);
  return (
    <SpacePage
      title={t.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: ROUTES.buyer, label: t.back }}
    >
      {result.ok ? (
        <BuyerProfileForm initial={result.data ?? EMPTY} />
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
