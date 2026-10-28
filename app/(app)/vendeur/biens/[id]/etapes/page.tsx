import type { Metadata } from "next";
import { InlineAlert } from "@/components/shared/inline-alert";
import { TaskList } from "@/components/shared/task-list";
import { stepCount } from "@/core/steps/progress";
import { TaskDoneButton } from "@/leenkey/properties/components/task-done-button";
import { taskLines } from "@/leenkey/properties/dashboard";
import { propertyForSheet } from "@/leenkey/properties/load";
import { saleProgress } from "@/leenkey/properties/sale";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.saleDashboard;

export const metadata: Metadata = { title: t.steps.metaTitle };

type Props = { params: Promise<{ id: string }> };

// « Toutes les étapes » of a sale (L1-24, the extended view of « À faire »,
// SPEC-V2 8.7 and section 9): the steps of its plan in order, the current one
// marked, each with its tasks; the tasks without event where the seller acts
// are ticked by hand here as on « Ma vente ».
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
  const editable = property.listingStatus !== "suspended" && property.listingStatus !== "sold";
  return (
    <div className="flex flex-col gap-8">
      <h2 className="sr-only">{t.steps.title}</h2>
      {progress.data.steps.map((step) => {
        const current = step.code === progress.data?.currentStepCode;
        const count = stepCount(step);
        const lines = taskLines(step, property, editable);
        return (
          <section
            key={step.code}
            aria-labelledby={`etape-${step.code}`}
            aria-current={current ? "step" : undefined}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3
                id={`etape-${step.code}`}
                className={cn(
                  "text-lk-h3 font-bold text-wide",
                  current ? "text-lk-blue" : "text-lk-ink",
                )}
              >
                {t.step(step.position, progress.data?.steps.length ?? 0, step.title)}
              </h3>
              <span className="text-lk-caption tabular text-lk-ink-3">
                {current ? `${t.steps.current} · ` : ""}
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
    </div>
  );
}
