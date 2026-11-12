import type { Metadata } from "next";
import { HorizontalScroller } from "@/components/shared/horizontal-scroller";
import { InlineAlert } from "@/components/shared/inline-alert";
import { TaskList } from "@/components/shared/task-list";
import { stepCount } from "@/core/steps/progress";
import { TaskDoneButton } from "@/leenkey/properties/components/task-done-button";
import { saleEditable, stepTickable, taskLines } from "@/leenkey/properties/dashboard";
import { propertyForSheet } from "@/leenkey/properties/load";
import { saleProgress } from "@/leenkey/properties/sale";
import { frProperties } from "@/lib/i18n/sections/properties";
import { frSaleDashboard } from "@/lib/i18n/sections/saleDashboard";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { properties: frProperties, saleDashboard: frSaleDashboard } as const;

const t = fr.saleDashboard;

export const metadata: Metadata = { title: t.steps.metaTitle };

type Props = { params: Promise<{ id: string }> };

// « Toutes les étapes » of a sale (L1-24, the extended view of « À faire »,
// SPEC-V2 8.7 and section 9): the steps of its plan in order, side by side
// in a row swiped sideways that opens on the current one (Younes,
// DECISIONS 2026-11-07), each with its tasks; the tasks without event where
// the seller acts are ticked by hand here as on « Ma vente », up to the
// current step.
export default async function PropertyStepsPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForSheet(id);
  if (!property) return null;
  const progress = await saleProgress(property.id);
  if (!progress.ok || !progress.data) {
    return (
      <InlineAlert tone="danger" live={false}>
        {fr.properties.list.error}
      </InlineAlert>
    );
  }
  const sale = progress.data;
  const editable = saleEditable(property.listingStatus);
  const currentIndex = sale.steps.findIndex((step) => step.code === sale.currentStepCode);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">{t.steps.title}</h2>
      <HorizontalScroller
        label={t.steps.region}
        start={Math.max(0, currentIndex)}
        previousLabel={t.steps.previous}
        nextLabel={t.steps.next}
        // To the edges of the page on a phone; the next step shows at the edge.
        className="-mx-5 scroll-px-5 px-5 md:-mx-10 md:scroll-px-10 md:px-10"
        itemClassName="w-[85%] md:w-74"
      >
        {sale.steps.map((step, index) => {
          const current = step.code === sale.currentStepCode;
          const count = stepCount(step);
          // « Terminée »: a step passed with all its tasks done (a task skipped
          // on the way stays to do, DECISIONS 2026-10-26).
          const finished = currentIndex >= 0 && index < currentIndex && count.done === count.total;
          // Ticked by hand up to the current step: the later ones wait for it.
          const lines = taskLines(step, property, editable && stepTickable(sale, step));
          return (
            <section
              key={step.code}
              aria-labelledby={`etape-${step.code}`}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex w-full flex-col gap-3 rounded-lk-xl border p-3.5 md:p-4",
                current ? "border-lk-blue bg-lk-blue-tint" : "border-lk-line bg-lk-mist",
              )}
            >
              <div className="flex flex-col gap-1">
                <h3
                  id={`etape-${step.code}`}
                  className={cn(
                    "text-lk-h3 font-bold text-wide",
                    current ? "text-lk-blue" : "text-lk-ink",
                  )}
                >
                  {t.step(index + 1, sale.steps.length, step.title)}
                </h3>
                <span className="text-lk-caption tabular text-lk-ink-3">
                  {current ? `${t.steps.current} · ` : finished ? `${t.steps.done} · ` : ""}
                  {t.steps.count(count.done, count.total)}
                </span>
              </div>
              {step.description ? (
                <p className="text-lk-compact text-lk-ink-3">{step.description}</p>
              ) : null}
              <TaskList
                stateLabels={t.todo.states}
                items={lines.map((line) => ({
                  ...line,
                  // Only the current step has a task to do now.
                  state: line.state === "current" && !current ? "todo" : line.state,
                  detail: line.detail ?? undefined,
                  control: line.manual ? (
                    <TaskDoneButton
                      propertyId={property.id}
                      taskId={line.id}
                      title={line.title}
                      done={line.state === "done"}
                    />
                  ) : undefined,
                }))}
              />
            </section>
          );
        })}
      </HorizontalScroller>
    </div>
  );
}
