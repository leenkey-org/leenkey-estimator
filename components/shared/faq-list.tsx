import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FaqItem = { question: string; answer: ReactNode };

/**
 * Questions and answers (docs/DESIGN.md 10.8, L1-42): native disclosure
 * widgets (<details>), keyboard and screen reader support without script, a
 * 1 px line between them. Question 16 then 17 px 600 with a ChevronDown that
 * turns when open (no movement with reduced motion); answer 15 px, 640 px at
 * most. Closed at first, an answer is found by the search of the browser.
 */
export function FaqList({ items, className }: { items: readonly FaqItem[]; className?: string }) {
  return (
    <div className={cn("border-y border-lk-line", className)}>
      {items.map((item) => (
        <details key={item.question} className="group border-b border-lk-line last:border-b-0">
          <summary
            className={cn(
              "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4",
              "text-lk-h3 font-semibold text-lk-ink lg:text-lk-h3-lg [&::-webkit-details-marker]:hidden",
              "rounded-lk-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
            )}
          >
            <span>{item.question}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 text-lk-ink-3 transition-transform duration-220 ease-out-lk group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="max-w-lk-prose pb-5 text-lk-body text-pretty text-lk-ink-2">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
