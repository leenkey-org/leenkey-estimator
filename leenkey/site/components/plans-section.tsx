import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { PlanCard } from "@/components/shared/plan-card";
import { activePlans } from "@/core/billing/plans";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.home.plans;

/**
 * « Un forfait fixe. Jamais de commission. » (#tarifs), the dark section of
 * the V1 home page (L1-48, L1-49): its label and title centred on navy, the
 * three plans in the glass cards of the V1 with their price in large type,
 * names and prices read from the plans table (reference data), the short
 * texts of the home page, then the way to /tarifs. Without the plans
 * (database unreachable: CI build, PR previews), the way alone.
 */
export async function PlansSection() {
  const plans = await activePlans();
  return (
    <MarketingSection
      id="tarifs"
      look="showcase"
      tone="navy"
      eyebrow={t.eyebrow}
      title={t.title}
      accent={t.accent}
      lead={t.lead}
      revealContent={false}
    >
      {plans && plans.length > 0 ? (
        <ul data-reveal-stagger="" className="mx-auto grid max-w-250 gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <li key={plan.code} className="flex">
              <PlanCard
                className="flex-1"
                name={plan.name}
                price={plan.priceCents === 0 ? t.free : formatPrice(plan.priceCents)}
                priceSuffix={plan.priceCents === 0 ? undefined : t.taxes}
                priceSize="large"
                tone="dark"
                tagline={t.items[plan.code].text}
                note={t.items[plan.code].note}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <div data-reveal="" className="mt-10 flex justify-center lg:mt-12">
        <Button
          asChild
          variant="cta"
          size="lg"
          trailingIcon={ArrowRight}
          className="focus-visible:outline-white"
        >
          <Link href={ROUTES.pricing}>{t.all}</Link>
        </Button>
      </div>
    </MarketingSection>
  );
}
