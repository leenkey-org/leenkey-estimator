"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { PlanCard } from "@/components/shared/plan-card";
import { SegmentedPicker } from "@/components/shared/segmented-picker";
import type { PlanView } from "@/core/billing/plan-text";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { savingCents } from "../pricing";

const t = fr.site.pricing;
type View = "price" | "savings";

/**
 * The plans of /tarifs (V1 page): their contents from the plans table
 * (SPEC-V2 11 bis), the free plan put forward during the launch, and the
 * switch « Mon économie vs agence » that shows, for a paid plan, the saving
 * on the example of the home page instead of its price.
 */
export function PricingPlans({ plans }: { plans: readonly PlanView[] }) {
  const [view, setView] = useState<View>("price");
  return (
    <div className="flex flex-col gap-10">
      <SegmentedPicker
        label={t.view}
        hideLabel
        value={view}
        onValueChange={(value) => setView(value === "savings" ? "savings" : "price")}
        options={[
          { value: "price", label: t.views.price },
          { value: "savings", label: t.views.savings },
        ]}
        className="max-w-lk-form"
      />
      <ul className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const texts = t.items[plan.code];
          const free = plan.priceCents === 0;
          const saving = view === "savings" ? savingCents(plan.priceCents) : null;
          return (
            <li key={plan.code} className="flex">
              <PlanCard
                className="flex-1"
                nameAs="h2"
                name={plan.name}
                price={
                  saving !== null
                    ? t.savings(formatPrice(saving))
                    : free
                      ? t.free
                      : formatPrice(plan.priceCents)
                }
                priceSuffix={saving === null && !free ? t.taxes : undefined}
                priceNote={
                  saving !== null ? t.savingsNote : "note" in texts ? texts.note : undefined
                }
                tagline={texts.text}
                featuresIntro={plan.intro ?? undefined}
                features={plan.features}
                featuresOutro={plan.outro ?? undefined}
                badge={"badge" in texts ? texts.badge : undefined}
                action={
                  <Button asChild size="lg" variant={free ? "primary" : "secondary"}>
                    <Link href={ROUTES.valuation}>{texts.action}</Link>
                  </Button>
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
