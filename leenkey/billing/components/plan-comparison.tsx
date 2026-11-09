import { Check, ChevronDown, Minus } from "lucide-react";
import type { PlanCode } from "@/core/billing/plans";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.billing.comparison;

type ComparedPlan = { code: PlanCode; name: string };

/**
 * The comparison table of the plans (SPEC-V2 8.8 and 11 bis, L1-33): a row
 * per feature, a column per plan in the order of the plans table, « Inclus »
 * or « Non inclus » told to screen readers. Content of fr.billing.comparison,
 * never a right (rights: hasEntitlement).
 */
export function PlanComparisonTable({
  plans,
  className,
}: {
  plans: readonly ComparedPlan[];
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-lk-md border border-lk-line bg-lk-surface", className)}
    >
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">{t.caption}</caption>
        <colgroup>
          <col />
          {plans.map((plan) => (
            <col key={plan.code} className="w-19 md:w-32" />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-lk-line bg-lk-stone-2">
            <th
              scope="col"
              className="px-3 py-3 text-lk-caption font-semibold text-lk-ink-2 md:px-4"
            >
              {t.feature}
            </th>
            {plans.map((plan) => (
              <th
                key={plan.code}
                scope="col"
                className="px-1 py-3 text-center text-lk-caption font-semibold text-lk-ink md:text-lk-label"
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((row) => (
            <tr key={row.label} className="border-t border-lk-line first:border-t-0">
              <th
                scope="row"
                className="px-3 py-2.5 text-lk-caption font-medium text-lk-ink md:px-4 md:text-lk-secondary"
              >
                {row.label}
              </th>
              {plans.map((plan) => {
                const included = (row.plans as readonly string[]).includes(plan.code);
                return (
                  <td key={plan.code} className="px-1 py-2.5 text-center">
                    {included ? (
                      <Check aria-hidden="true" className="mx-auto size-4.5 text-lk-success" />
                    ) : (
                      <Minus aria-hidden="true" className="mx-auto size-4 text-lk-ink-3" />
                    )}
                    <span className="sr-only">{included ? t.included : t.notIncluded}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Under the plans of /vendeur/formule (SPEC-V2 8.8): folded on a phone, so
 * that the summary of the order stays near; open from 768 px.
 */
export function PlanComparison({ plans }: { plans: readonly ComparedPlan[] }) {
  return (
    <section aria-labelledby="comparer-formules" className="flex flex-col gap-3">
      <h2
        id="comparer-formules"
        className="sr-only md:not-sr-only md:text-lk-h3 md:font-semibold md:text-lk-ink lg:text-lk-h3-lg"
      >
        {t.title}
      </h2>
      <details className="group md:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lk-md border border-lk-line bg-lk-surface px-4 text-lk-label font-semibold text-lk-ink focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue [&::-webkit-details-marker]:hidden">
          {t.toggle}
          <ChevronDown
            aria-hidden="true"
            className="size-4.5 shrink-0 text-lk-ink-3 transition-transform duration-140 group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <PlanComparisonTable plans={plans} className="mt-3" />
      </details>
      <PlanComparisonTable plans={plans} className="hidden md:block" />
    </section>
  );
}
