import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatHour } from "@/lib/format";
import { frVisits } from "@/lib/i18n/sections/visits";
import type { BuyerVisit } from "../queries";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.home;

const parts = (value: string) => {
  const date = new Date(value);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...options }).format(date);
  return { weekday: format({ weekday: "short" }), day: format({ day: "numeric" }) };
};

/**
 * The visits to come of a buyer on their home (docs/DESIGN.md 12.10, « Vos
 * visites et offres »): one card per visit, a date block of 52 px (« SAM. /
 * 3 ») on --lk-blue-tint, the property, the time; the whole card a link.
 */
export function BuyerVisitsList({ visits }: { visits: readonly BuyerVisit[] }) {
  return (
    <ul aria-label={t.label} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {visits.map((visit) => {
        const title = [visit.title ?? t.offline, visit.city].filter(Boolean).join(" · ");
        const date = parts(visit.startsAt);
        return (
          <li key={visit.id} className="min-w-0">
            <Link
              href={`/visites/${visit.id}`}
              className="flex min-h-11 items-center gap-3 rounded-lk-xl border border-lk-line bg-lk-surface p-3.5 hover:border-lk-ink-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
            >
              <span
                aria-hidden="true"
                className="flex size-13 shrink-0 flex-col items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-blue"
              >
                <span className="text-lk-micro font-semibold uppercase">{date.weekday}</span>
                <span className="text-lk-body leading-none font-bold tabular">{date.day}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="max-w-full truncate text-lk-compact font-semibold text-lk-ink">
                  {title}
                </span>
                <span className="text-lk-caption text-lk-ink-3 tabular first-letter:uppercase">
                  {new Intl.DateTimeFormat("fr-FR", {
                    timeZone: "Europe/Paris",
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(visit.startsAt))}
                  {" · "}
                  {formatHour(visit.startsAt)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-lk-label font-semibold text-lk-blue">
                {t.open}
                <span className="sr-only"> ({t.about(title)})</span>
                <ChevronRight aria-hidden="true" className="size-4" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
