import { Calendar, Check } from "lucide-react";
import { FacadeDrawing } from "@/components/shared/facade-drawing";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.site.home.space;

/** Height of each day of the example chart, the highest one on Friday (V1 page). */
const VISITS = [0.35, 0.5, 0.28, 0.62, 1, 0.78, 0.2] as const;
/** Steps of the example: 2 of 4, the file in progress. */
const STEPS = { total: 4, reached: 2 } as const;
/** The caption names the picture (one preview on the page). */
const CAPTION_ID = "espace-vendeur-apercu";

/** The status of the example, « En préparation », as the StatusBadge of a listing in review. */
const statusClass =
  "rounded-full bg-lk-warning-bg px-2.5 py-1.25 text-lk-micro font-semibold whitespace-nowrap text-lk-warning-fg";

const MARK = {
  done: "lk-step-done border-lk-success bg-lk-success text-white",
  current: "lk-step-current border-lk-blue bg-lk-surface",
  todo: "border-lk-line bg-lk-surface",
} as const;

/**
 * Preview of the seller area on the home page (#espace-vendeur), the « Votre
 * espace Leenkey » of the V1 page with its example data, said in its caption
 * (DECISIONS 2026-10-20): a window of the site with « Ma vente » as DESIGN.md
 * 10.4 draws it (SellerHeader, NextActionCard, StatTile, TaskList), the visit
 * requests of the week and the seller file. A picture for assistive
 * technologies (role img, named by its caption): nothing in it is a control.
 * Once it has risen, its bars grow, its file fills and its steps check
 * themselves (DESIGN.md 9).
 */
export function SellerSpacePreview() {
  return (
    <figure className="flex flex-col gap-4">
      <div
        role="img"
        aria-labelledby={CAPTION_ID}
        className="overflow-hidden rounded-lk-md border border-white/16 bg-lk-bg text-left text-lk-ink"
      >
        <div className="flex h-10 items-center gap-3 border-b border-lk-line bg-lk-surface px-4">
          <span className="flex gap-1.5">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="size-2.5 rounded-full bg-lk-line" />
            ))}
          </span>
          <span className="mx-auto rounded-full bg-lk-stone-2 px-3 py-1 text-lk-micro text-lk-ink-3">
            {t.address}
          </span>
        </div>

        <div className="flex flex-col gap-4 bg-lk-navy px-5 pt-5 pb-6 text-white">
          <p className="text-lk-h2 font-bold text-wide">{t.heading}</p>
          <div className="flex items-center gap-3 rounded-lk-md bg-white/8 p-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-lk-sm bg-lk-stone-2">
              <FacadeDrawing className="w-4/5 text-lk-ink-3" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span className="text-lk-compact font-semibold">{t.property.title}</span>
              <span className="text-lk-caption text-white/72">{t.property.detail}</span>
              {/* Under the texts on a phone, on their right from 640 px. */}
              <span className={cn(statusClass, "mt-1.5 sm:hidden")}>{t.property.status}</span>
            </span>
            <span className={cn(statusClass, "hidden shrink-0 sm:inline")}>
              {t.property.status}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-lk-caption text-white/72">{t.step}</span>
            <span className="grid grid-cols-4 gap-1">
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

        <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
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
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              {t.figures.map((figure) => (
                <div
                  key={figure.label}
                  className="flex flex-col gap-1 rounded-lk-md border border-lk-line bg-lk-surface px-3 py-3.5"
                >
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-lk-stat font-bold text-wide tabular">{figure.value}</span>
                    {figure.change ? (
                      <span className="text-lk-micro font-semibold text-lk-success tabular">
                        {figure.change}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-lk-micro text-lk-ink-3">{figure.label}</span>
                </div>
              ))}
            </div>
            <div className="hidden flex-col gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4 md:flex">
              <span className="text-lk-compact font-semibold">{t.chart.title}</span>
              <span className="flex h-24 items-end gap-2">
                {VISITS.map((level, index) => (
                  <span key={index} className="flex h-full flex-1 flex-col items-center gap-1.5">
                    <span className="flex w-full flex-1 items-end">
                      <span
                        style={{ height: `${level * 100}%` }}
                        className={cn(
                          "lk-bar block w-full rounded-t-lk-xs",
                          level === 1 ? "bg-lk-blue" : "bg-lk-blue-line",
                        )}
                      />
                    </span>
                    <span className="text-lk-micro text-lk-ink-3">{t.chart.days[index]}</span>
                  </span>
                ))}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="hidden flex-col gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4 md:flex">
              <span className="text-lk-compact font-semibold">{t.file.title}</span>
              <span className="flex items-baseline justify-between gap-3 text-lk-secondary">
                <span className="text-lk-ink-3">{t.file.label}</span>
                <span className="font-semibold tabular">{t.file.value}</span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-lk-line">
                <span className="lk-fill block h-full w-4/5 rounded-full bg-lk-blue" />
              </span>
              <span className="flex flex-col gap-2.5">
                {t.file.items.map((item) => (
                  <span key={item.title} className="flex items-center gap-2.5 text-lk-secondary">
                    {item.missing ? (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-lk-warning-bg text-lk-micro font-semibold text-lk-warning-fg">
                        {item.missing}
                      </span>
                    ) : (
                      <span className="lk-step-done flex size-5 shrink-0 items-center justify-center rounded-full bg-lk-success text-white">
                        <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
                      </span>
                    )}
                    <span className={item.missing ? "text-lk-ink-2" : "font-semibold"}>
                      {item.title}
                    </span>
                  </span>
                ))}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-lk-h3 font-semibold">{t.journey}</span>
              <span className="flex flex-col rounded-lk-md border border-lk-line bg-lk-surface">
                {t.steps.map((step) => (
                  <span
                    key={step.title}
                    className="flex items-start gap-3 border-b border-lk-line p-3.5 last:border-b-0"
                  >
                    <span
                      className={cn(
                        "mt-px flex size-5.5 shrink-0 items-center justify-center rounded-full border-2",
                        MARK[step.state],
                      )}
                    >
                      {step.state === "done" ? (
                        <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span
                        className={cn(
                          "text-lk-compact font-medium",
                          step.state === "done" && "text-lk-ink-3 line-through",
                        )}
                      >
                        {step.title}
                      </span>
                      <span className="text-lk-caption text-lk-ink-3">{step.text}</span>
                    </span>
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
      <figcaption id={CAPTION_ID} className="text-center text-lk-caption text-white/72">
        {t.caption}
      </figcaption>
    </figure>
  );
}
