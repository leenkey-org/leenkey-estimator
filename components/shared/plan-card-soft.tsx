import { cn } from "@/lib/utils";

/**
 * Plan card of direction C (docs/design-handoff/SPECS.md 2): white, radius 24
 * px (18 px on a phone), its label in a pill, the name, its sentence, the
 * price in large type and its note. The plan put forward: a blue border, a
 * light blue shadow, its label in blue. On a phone, one line each: the label,
 * the name and the sentence on the left, the price on the right.
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
        "flex items-center justify-between gap-3 rounded-[18px] border bg-lk-surface p-4.5 md:flex-col md:items-stretch md:justify-start md:gap-2.5 md:rounded-lk-3xl md:p-7.5",
        featured ? "border-lk-blue shadow-lk-featured" : "border-lk-line",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col md:gap-2.5">
        <span
          className={cn(
            "text-lk-caption font-bold md:self-start md:rounded-full md:px-3 md:py-1 md:text-lk-label",
            featured
              ? "text-lk-blue-dark md:bg-lk-blue-tint"
              : "text-lk-ink-2 md:bg-lk-sand md:text-lk-ink",
          )}
        >
          {tag}
        </span>
        <Name className="text-[1.125rem] font-extrabold text-lk-ink md:text-[1.375rem]">
          {name}
        </Name>
        <p className="text-lk-secondary text-lk-ink-2 md:min-h-13 md:text-lk-body">{text}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end md:items-start md:gap-2.5">
        <p className="text-[1.375rem] leading-tight tabular text-heavy text-lk-ink md:text-[2.5rem]">
          {price}
        </p>
        <p className="hidden text-lk-compact text-lk-ink-2 md:block">{note}</p>
      </div>
    </div>
  );
}
