import { MarketingSection } from "@/components/shared/marketing-section";
import { MoreLink } from "@/components/shared/more-link";
import { PlanCard } from "@/components/shared/plan-card";
import { activePlans } from "@/core/billing/plans";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.home.plans;

/**
 * « Un forfait fixe. Jamais de commission. » (#tarifs, V1 home page): the
 * three plans, their names and prices read from the plans table (reference
 * data), the short texts of the home page, and the way to /tarifs. Without
 * the plans (database unreachable), the link alone.
 */
export async function PlansSection() {
  const plans = await activePlans();
  return (
    <MarketingSection
      id="tarifs"
      title={t.title}
      lead={t.lead}
      action={<MoreLink href={ROUTES.pricing}>{t.all}</MoreLink>}
    >
      {plans && plans.length > 0 ? (
        <ul className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <li key={plan.code} className="flex">
              <PlanCard
                className="flex-1"
                name={plan.name}
                price={plan.priceCents === 0 ? t.free : formatPrice(plan.priceCents)}
                priceSuffix={plan.priceCents === 0 ? undefined : t.taxes}
                tagline={t.items[plan.code].text}
                note={t.items[plan.code].note}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </MarketingSection>
  );
}
