import type { Metadata } from "next";
import Link from "next/link";
import { ChartLine, FilePlus2 } from "lucide-react";
import { ChoiceCard } from "@/components/shared/choice-card";
import { InlineAlert } from "@/components/shared/inline-alert";
import { MarketingSection } from "@/components/shared/marketing-section";
import { getProfile } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { sellerProperties } from "@/leenkey/properties/queries";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { fr } from "@/lib/i18n/fr";

const t = fr.sellStart;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.description,
  alternates: { canonical: "/vendre" },
  openGraph: { title: t.metaTitle, description: t.description, url: "/vendre" },
};

/** The listing straight away: the seller sign-up first when signed out. */
function directHref(signedIn: boolean): string {
  if (signedIn) return ROUTES.newProperty;
  return `${ROUTES.sellerSignUp}&next=${encodeURIComponent(ROUTES.newProperty)}`;
}

/** Whether a signed-in account already has a property: its sale to resume. */
async function hasSale(profileId: string | null): Promise<boolean> {
  if (!profileId) return false;
  const result = await sellerProperties(profileId);
  return result.ok && result.data.length > 0;
}

// /vendre (Younes, DECISIONS 2026-10-26): « Vendre » and « Vendre mon bien »
// lead here, to the two ways to start: the free analysis of value (the
// estimator, then « Créer mon annonce » from its result, L1-13b) or the
// listing straight away (the creation of the property, L1-11). A seller who
// has a property already finds the way back to their sale first.
export default async function SellStartPage() {
  const profile = await getProfile();
  const resume = await hasSale(profile?.id ?? null);
  return (
    <PublicPage>
      <MarketingSection id="vendre" title={t.title} titleAs="h1" lead={t.lead}>
        {resume ? (
          <InlineAlert
            className="mb-6"
            action={
              <Link
                href={ROUTES.seller}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {t.resume.action}
              </Link>
            }
          >
            {t.resume.text}
          </InlineAlert>
        ) : null}
        <ul className="grid gap-4 md:grid-cols-2 md:gap-6">
          <ChoiceCard
            icon={ChartLine}
            title={t.valuation.title}
            text={t.valuation.text}
            action={{ href: ROUTES.valuation, label: t.valuation.action }}
            primary
          />
          <ChoiceCard
            icon={FilePlus2}
            title={t.direct.title}
            text={t.direct.text}
            action={{ href: directHref(profile !== null), label: t.direct.action }}
          />
        </ul>
      </MarketingSection>
    </PublicPage>
  );
}
