import type { Metadata } from "next";
import { InlineAlert } from "@/components/shared/inline-alert";
import { MarketingSection } from "@/components/shared/marketing-section";
import { activePlans, planFeatures } from "@/core/billing/plans";
import { PlanComparisonTable } from "@/leenkey/billing/components/plan-comparison";
import { PricingPlans } from "@/leenkey/site/components/pricing-plans";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { frBilling } from "@/lib/i18n/sections/billing";
import { frSitePricing } from "@/lib/i18n/sections/site/pricing";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { billing: frBilling, site: { pricing: frSitePricing } } as const;

const t = fr.site.pricing;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/tarifs" },
  openGraph: { title: t.metaTitle, description: t.metaDescription, url: "/tarifs" },
};

// /tarifs in V2 (L1-42, DECISIONS 2026-10-19): the plans read from the plans
// table, so that this page says what is sold (SPEC-V2 11 bis); on the navy
// of the V1 page, its label above the title, since L1-50.
export default async function PricingPage() {
  const [plans, features] = await Promise.all([activePlans(), planFeatures()]);
  return (
    <PublicPage assistant header="night">
      <MarketingSection
        id="tarifs"
        titleAs="h1"
        look="showcase"
        tone="navy"
        eyebrow={t.eyebrow}
        title={t.title}
        accent={t.accent}
        lead={t.lead}
      >
        {plans && plans.length > 0 ? (
          <PricingPlans plans={plans} />
        ) : (
          <InlineAlert tone="danger" className="mx-auto max-w-lk-form">
            {t.unavailable}
          </InlineAlert>
        )}
      </MarketingSection>
      {plans && plans.length > 0 && features ? (
        // The comparison table of SPEC-V2 11 bis (L1-33), under the plans.
        <MarketingSection id="comparer" title={fr.billing.comparison.title}>
          <PlanComparisonTable plans={plans} features={features} className="mx-auto max-w-200" />
        </MarketingSection>
      ) : null}
    </PublicPage>
  );
}
