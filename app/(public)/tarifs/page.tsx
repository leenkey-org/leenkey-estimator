import type { Metadata } from "next";
import { InlineAlert } from "@/components/shared/inline-alert";
import { MarketingSection } from "@/components/shared/marketing-section";
import { activePlans } from "@/core/billing/plans";
import { PricingPlans } from "@/leenkey/site/components/pricing-plans";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.pricing;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/tarifs" },
  openGraph: { title: t.metaTitle, description: t.metaDescription, url: "/tarifs" },
};

// /tarifs in V2 (L1-42, DECISIONS 2026-10-19): the plans read from the plans
// table, so that this page says what is sold (SPEC-V2 11 bis).
export default async function PricingPage() {
  const plans = await activePlans();
  return (
    <PublicPage>
      <MarketingSection id="tarifs" titleAs="h1" title={t.title} accent={t.accent} lead={t.lead}>
        {plans && plans.length > 0 ? (
          <PricingPlans plans={plans} />
        ) : (
          <InlineAlert tone="danger">{t.unavailable}</InlineAlert>
        )}
      </MarketingSection>
    </PublicPage>
  );
}
