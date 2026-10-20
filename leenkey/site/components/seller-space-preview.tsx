import { Calendar, Check } from "lucide-react";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { StatusBadge } from "@/components/shared/status-badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.site.home.space;

/** The example is at the third of the six steps of a sale (SPEC 9). */
const STEPS = { total: 6, reached: 3 } as const;

const MARK = {
  done: "lk-step-done border-lk-success bg-lk-success text-white",
  current: "lk-step-current border-lk-blue bg-lk-surface",
  todo: "border-lk-line bg-lk-surface",
} as const;

/**
 * Preview of the seller area on the home page (#espace-vendeur), as the V1
 * page had one: « Ma vente » as its mock-up draws it (Dashboard.png, DESIGN.md
 * 10.4: SellerHeader, NextActionCard, StatTile, TaskList, conversations), its
 * example data said in the address bar and the caption (DECISIONS
 * 2026-10-20). A picture for assistive technologies (role img, named by what
 * it shows): nothing in it is a control. Once it has risen, its steps fill and
 * its first task checks itself (DESIGN.md 9).
 */
export function SellerSpacePreview() {
  return (
    <figure className="flex flex-col gap-4">
      <div
        role="img"
        aria-label={t.label}
        className="overflow-hidden rounded-lk-md border border-white/16 bg-lk-bg text-left text-lk-ink"
      >
        <div className="flex h-10 items-center gap-3 border-b border-lk-line bg-lk-surface px-4">
          <span className="min-w-0 truncate rounded-lk-sm bg-lk-stone-2 px-3 py-1 text-lk-micro text-lk-ink-3">
            {t.address}
          </span>
          <span className="ml-auto text-lk-tag font-semibold text-lk-blue">{t.sample}</span>
        </div>

        <div className="flex flex-col gap-4 bg-lk-navy px-5 pt-5 pb-6 text-white">
          <span className="flex flex-col">
            <span className="text-lk-caption text-white/72">{t.greeting}</span>
            <span className="text-lk-h2 font-bold text-wide">{t.heading}</span>
          </span>
          <div className="flex items-center gap-3 rounded-lk-md bg-white/8 p-3">
            <PropertyThumb className="size-14" />
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span className="text-lk-compact font-semibold">{t.property.title}</span>
              <span className="text-lk-caption text-white/72">{t.property.detail}</span>
              {/* Under the texts on a phone, on their right from 640 px. */}
              <StatusBadge status="published" className="mt-1.5 sm:hidden" />
            </span>
            <StatusBadge status="published" className="hidden shrink-0 sm:inline-flex" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="flex items-baseline justify-between gap-3 text-lk-caption">
              <span className="text-white/72">{t.step}</span>
              <span className="font-semibold">{fr.plan.serenite}</span>
            </span>
            <span className="grid grid-cols-6 gap-1">
              {Array.from({ length: STEPS.total }, (_, index) => (
                <span key={index} className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  {index < STEPS.reached ? (
                    <span className="lk-fill block h-full rounded-full bg-lk-blue" />
                  ) : null}
                </span>
              ))}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-lk-tag font-semibold text-lk-blue">{t.next.label}</span>
              <div className="flex gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-blue">
                  <Calendar aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-lk-title font-semibold">{t.next.title}</span>
                  <span className="text-lk-secondary text-lk-ink-3">{t.next.text}</span>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {t.figures.map((figure) => (
                <div
                  key={figure.label}
                  className="flex flex-col gap-1 rounded-lk-md border border-lk-line bg-lk-surface px-3 py-3.5"
                >
                  <span className="text-lk-stat font-bold text-wide tabular">{figure.value}</span>
                  <span className="text-lk-micro text-lk-ink-3">{figure.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-lk-h3 font-semibold">{t.todo.title}</span>
            <span className="flex flex-col rounded-lk-md border border-lk-line bg-lk-surface">
              {t.todo.tasks.map((task) => (
                <span
                  key={task.title}
                  className="flex items-start gap-3 border-b border-lk-line p-3.5 last:border-b-0"
                >
                  <span
                    className={cn(
                      "mt-px flex size-5.5 shrink-0 items-center justify-center rounded-full border-2",
                      MARK[task.state],
                    )}
                  >
                    {task.state === "done" ? (
                      <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "text-lk-compact font-medium",
                        task.state === "done" && "text-lk-ink-3 line-through",
                      )}
                    >
                      {task.title}
                    </span>
                    {task.detail ? (
                      <span className="text-lk-caption text-lk-ink-3">{task.detail}</span>
                    ) : null}
                  </span>
                </span>
              ))}
            </span>
          </div>

          {/* From 768 px: on a phone, the preview stops at the tasks. */}
          <div className="hidden flex-col gap-2 md:flex lg:col-span-2">
            <span className="text-lk-h3 font-semibold">{t.conversations.title}</span>
            <span className="grid gap-2.5 lg:grid-cols-2">
              {t.conversations.items.map((item) => (
                <span
                  key={item.name}
                  className="flex items-center gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-3.5"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-lk-compact font-semibold",
                      item.unread ? "bg-lk-blue-tint text-lk-blue" : "bg-lk-stone-2 text-lk-ink-2",
                    )}
                  >
                    {item.initials}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-lk-compact font-semibold">{item.name}</span>
                      <span className="text-lk-micro text-lk-ink-3">{item.time}</span>
                    </span>
                    <span className="truncate text-lk-secondary text-lk-ink-2">{item.text}</span>
                  </span>
                  {item.unread ? (
                    <span className="size-2 shrink-0 rounded-full bg-lk-blue" />
                  ) : null}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
      <figcaption className="text-center text-lk-caption text-white/72">{t.caption}</figcaption>
    </figure>
  );
}
