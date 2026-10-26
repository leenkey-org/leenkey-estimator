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
        "flex items-center justify-between gap-3 rounded-lk-2xl border bg-lk-surface p-4.5 lg:flex-col lg:items-stretch lg:justify-start lg:gap-2.5 lg:rounded-lk-3xl lg:p-7.5",
        featured ? "border-lk-blue shadow-lk-featured" : "border-lk-line",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col lg:gap-2.5">
        <span
          className={cn(
            "text-lk-caption font-bold lg:self-start lg:rounded-full lg:px-3 lg:py-1 lg:text-lk-label",
            featured
              ? "text-lk-blue-dark lg:bg-lk-blue-tint"
              : "text-lk-ink-2 lg:bg-lk-sand lg:text-lk-ink",
          )}
        >
          {tag}
        </span>
        <Name className="text-lk-c-plan font-extrabold text-lk-ink lg:text-lk-c-plan-lg">
          {name}
        </Name>
        <p className="text-lk-secondary text-lk-ink-2 lg:min-h-13 lg:text-lk-body">{text}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end lg:items-start lg:gap-2.5">
        <p className="text-lk-c-price tabular text-heavy text-lk-ink lg:text-lk-c-price-lg">
          {price}
        </p>
        <p className="hidden text-lk-compact text-lk-ink-2 lg:block">{note}</p>
      </div>
    </div>
  );
}
