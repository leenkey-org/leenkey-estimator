import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FaqItem = { question: string; answer: ReactNode };

/**
 * Questions and answers (docs/DESIGN.md 10.8), in the cards of the V1 public
 * pages (L1-49, L1-50): native disclosure widgets (<details>), keyboard and
 * screen reader support without script, one card of 12 px for each
 * question, the blue « + » of the V1 that becomes a « − » once open (no
 * movement with reduced motion). Light: white cards with the cool line,
 * blue line and shadow once open; dark (on navy): glass cards, white text,
 * the sign in the light blue. Closed at first, an answer is found by the
 * search of the browser. The cards rise one after the other on the public
 * pages (DESIGN.md 9).
 */
export function FaqList({
  items,
  tone = "light",
  className,
}: {
  items: readonly FaqItem[];
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <ul data-reveal-stagger="" className={cn("flex flex-col gap-3.5", className)}>
      {items.map((item) => (
        <li key={item.question}>
          <details
            className={cn(
              "group rounded-lk-lg border transition-[border-color,box-shadow] duration-220 ease-out-lk",
              dark
                ? "border-white/10 bg-white/[0.045] open:border-white/24 open:shadow-lk-raised"
                : "border-lk-mist-line bg-lk-surface open:border-lk-blue-line open:shadow-lk-card",
            )}
          >
            <summary
              className={cn(
                "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4.5 rounded-lk-lg px-5 py-5 md:px-6 md:py-5.5 [&::-webkit-details-marker]:hidden",
                "text-lk-h3 font-semibold lg:text-lk-h3-lg",
                dark ? "text-white" : "text-lk-ink",
                "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2",
                dark ? "focus-visible:outline-white" : "focus-visible:outline-lk-blue",
              )}
            >
              <span>{item.question}</span>
              <span aria-hidden="true" className="relative size-5.5 shrink-0">
                <span
                  className={cn(
                    "absolute top-1/2 left-1/2 h-0.5 w-4.25 -translate-1/2 rounded-lk-xs",
                    dark ? "bg-lk-blue-light" : "bg-lk-blue",
                  )}
                />
                <span
                  className={cn(
                    "absolute top-1/2 left-1/2 h-4.25 w-0.5 -translate-1/2 rounded-lk-xs transition-transform duration-220 ease-out-lk group-open:scale-y-0 motion-reduce:transition-none",
                    dark ? "bg-lk-blue-light" : "bg-lk-blue",
                  )}
                />
              </span>
            </summary>
            <div
              className={cn(
                "max-w-lk-prose px-5 pb-6 text-lk-body text-pretty md:px-6",
                dark ? "text-white/72" : "text-lk-ink-2",
              )}
            >
              {item.answer}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
