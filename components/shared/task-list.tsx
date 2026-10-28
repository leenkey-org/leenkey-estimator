import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskItem = {
  id: string;
  title: string;
  detail?: string;
  /** done: ticked; current: the one to do now; todo: later. */
  state: "done" | "current" | "todo";
  /** Where it is done: the whole line is a link, a chevron on its right. */
  href?: string | null;
  /** In place of the chevron: a control of the line (tick it by hand). */
  control?: ReactNode;
};

/** The round of the state (DESIGN.md 10.4): full green with a tick, a blue ring, a grey ring. */
function Mark({ state }: { state: TaskItem["state"] }) {
  return state === "done" ? (
    <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-lk-success text-white">
      <Check aria-hidden="true" strokeWidth={3} className="size-3.5" />
    </span>
  ) : (
    <span
      className={cn(
        "size-5.5 shrink-0 rounded-full border-2",
        state === "current" ? "border-lk-blue" : "border-lk-line-strong",
      )}
    />
  );
}

/**
 * The tasks of a step (docs/DESIGN.md 10.4 TaskList): one card, a line per
 * task, its state as a round (the state also said in words for screen
 * readers), a title struck through once done, a detail under it; a link to
 * where it is done, or a control to tick it by hand.
 */
export function TaskList({
  items,
  stateLabels,
  className,
}: {
  items: readonly TaskItem[];
  /** The state in words: « Fait », « À faire maintenant », « À venir ». */
  stateLabels: Record<TaskItem["state"], string>;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "flex flex-col divide-y divide-lk-line overflow-hidden rounded-lk-xl border border-lk-line bg-lk-surface",
        className,
      )}
    >
      {items.map((item) => {
        const body = (
          <>
            <Mark state={item.state} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "text-lk-compact font-medium",
                  item.state === "done" ? "text-lk-ink-3 line-through" : "text-lk-ink",
                )}
              >
                <span className="sr-only">{stateLabels[item.state]} : </span>
                {item.title}
              </span>
              {item.detail ? (
                <span className="text-lk-caption text-lk-ink-3">{item.detail}</span>
              ) : null}
            </span>
          </>
        );
        return (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className="flex min-h-15 items-center gap-3.5 px-4 py-3.5 transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
              >
                {body}
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-lk-ink-3" />
              </Link>
            ) : (
              <div className="flex min-h-15 items-center gap-3.5 px-4 py-3.5">
                {body}
                {item.control}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
