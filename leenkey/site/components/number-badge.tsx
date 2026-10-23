import { cn } from "@/lib/utils";

/**
 * The number of a step or of a part in a square in the blue gradient, as in
 * the V1 (« step-n »): 40 px (the steps of the sale of the home page) or 32
 * px with two digits (the parts of the tool of /concept). Not read by screen
 * readers: a list says the order.
 */
export function NumberBadge({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center bg-linear-135 from-lk-blue to-lk-blue-mid font-extrabold text-white tabular-nums shadow-lk-cta",
        size === "md"
          ? "size-10 rounded-lk-lg text-lk-title"
          : "size-8 rounded-lk-md text-lk-secondary",
        className,
      )}
    >
      {size === "sm" ? String(value).padStart(2, "0") : value}
    </span>
  );
}
