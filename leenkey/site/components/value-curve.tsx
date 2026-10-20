import { ChartLine, ChartNoAxesColumn, FileText, MapPin, type LucideIcon } from "lucide-react";

/**
 * The curve of the V1 home page through its four points, ten times wider
 * than its height (viewBox 0 0 1000 130): about as stretched as the screen,
 * so that the line keeps its thickness.
 */
const CURVE =
  "M0,110 C50,104 80,99 125,96 C220,89 280,80 375,72 C470,64 530,55 625,46 C720,37 780,30 875,24 C920,21 960,18 1000,16";
/** Height of each point from the top of the curve (96, 72, 46 and 24 out of 130). */
const POINTS = ["73.8%", "55.4%", "35.4%", "18.5%"] as const;
/** In the order of the items: the range, the sales of the area, the criteria, the report. */
const ICONS: readonly LucideIcon[] = [ChartLine, MapPin, ChartNoAxesColumn, FileText];

/**
 * « Ce que vous obtenez en quelques minutes. » (#fonctionnalites) as in the
 * V1 home page, on navy: from 1024 px, a curve rising from left to right, an
 * icon of each item on it, the items under their icon; below, one under the
 * other along a line. The curve traces itself when it enters the screen and
 * the items come one after the other (DESIGN.md 9). No numbering: the items
 * are not the steps of a journey (DESIGN.md 1).
 */
export function ValueCurve({ items }: { items: readonly { title: string; text: string }[] }) {
  return (
    <div className="relative">
      <svg
        data-reveal-draw=""
        viewBox="0 0 1000 130"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        className="lk-drawing pointer-events-none absolute inset-x-0 top-0 hidden h-36 w-full text-lk-blue-light lg:block xl:h-40"
      >
        <path
          d={CURVE}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
        />
      </svg>
      <ul data-reveal-stagger="slow" className="relative grid gap-8 lg:grid-cols-4 lg:gap-0">
        {items.map((item, index) => {
          const Icon = ICONS[index] ?? FileText;
          return (
            <li
              key={item.title}
              className={
                // Below 1024 px, a line joins each icon to the next one.
                "relative flex gap-4 not-last:before:absolute not-last:before:top-12 not-last:before:-bottom-7 not-last:before:left-5.25 not-last:before:w-0.5 not-last:before:bg-lk-blue-light/40 not-last:before:content-[''] lg:flex-col lg:items-center lg:gap-0 lg:px-3 lg:text-center lg:not-last:before:hidden"
              }
            >
              <div className="relative shrink-0 lg:h-36 lg:w-full xl:h-40">
                <span
                  // On the curve from 1024 px: `top` only places it there.
                  style={{ top: POINTS[index] }}
                  className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-lk-blue-light bg-lk-navy text-white lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2"
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pt-2 lg:pt-6">
                <h3 className="text-lk-h3 font-semibold text-balance text-white lg:text-lk-h3-lg">
                  {item.title}
                </h3>
                <p className="text-lk-compact text-pretty text-white/72">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
