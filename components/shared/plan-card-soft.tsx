import { cn } from "@/lib/utils";

/**
 * Plan card of direction C (docs/design-handoff/SPECS.md 2): white, radius 24
 * px (18 px on a phone), its label in a pill, the name, its sentence, the
 * price in large type and its note. The plan put forward: a blue border, a
 * light blue shadow, its label in blue. Below 1 024 px, one line each: the
 * label, the name and the sentence on the left, the price on the right (three
 * columns of 218 px at 768 px left the prices out of the screen, L1-56).
 */
export function PlanCardSoft({
  tag,
  name,
  text,
  price,
  note,
  featured = false,
  nameAs: Name = "h3",
  className,
}: {
  tag: string;
  name: string;
  text: string;
  /** « Gratuit », « 990 € TTC ». */
  price: string;
  note: string;
  featured?: boolean;
  nameAs?: "h3" | "h4";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lk-2xl bg-lk-surface p-4.5 lg:flex-col lg:items-stretch lg:justify-start lg:gap-2.5 lg:rounded-lk-3xl lg:p-7.5",
        // The plan put forward in the outline of the gradient (redesign D).
        featured ? "lk-gradient-border shadow-lk-featured" : "border border-lk-line",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col lg:gap-2.5">
        <span
          className={cn(
            "self-start rounded-full px-2.5 py-0.5 text-lk-micro font-semibold lg:px-3 lg:py-1 lg:text-lk-caption",
            featured ? "lk-gradient text-white" : "bg-lk-stone-2 text-lk-ink-tag",
          )}
        >
          {tag}
        </span>
        <Name className="text-lk-c-plan font-bold text-lk-ink lg:text-[1.3125rem]">{name}</Name>
        <p className="text-lk-secondary text-lk-ink-2 lg:min-h-13 lg:text-lk-body">{text}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end lg:items-start lg:gap-2.5">
        <p className="text-lk-c-price font-bold tracking-[-0.03em] tabular text-lk-ink lg:text-[2.375rem]">
          {price}
        </p>
        <p className="hidden text-lk-secondary text-lk-ink-3 lg:block">{note}</p>
      </div>
    </div>
  );
}
