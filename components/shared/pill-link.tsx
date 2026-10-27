import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Service pill of direction C (docs/design-handoff/SPECS.md 2): a link in a
 * white pill, strong border, its icon in blue, 44 px high then 48 px from
 * 768 px. Selected (a filter): blue tint, border and text in blue.
 */
export function PillLink({
  href,
  icon: Icon,
  children,
  selected = false,
  className,
}: {
  href: string;
  icon: LucideIcon;
  children: string;
  selected?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-lk-secondary font-medium shadow-[0_1px_2px_rgb(15_23_42/0.04)] md:h-12 md:gap-2.5 md:px-5 md:text-lk-compact",
        "transition-colors duration-140 ease-out-lk",
        selected
          ? "border-lk-blue bg-lk-blue-tint text-lk-blue-dark"
          : "border-lk-line bg-lk-surface text-lk-ink hover:border-lk-blue-border hover:bg-lk-blue-tint",
        className,
      )}
    >
      {/* In the gradient of the charte (GradientDefs on the page). */}
      <Icon aria-hidden="true" strokeWidth={1.9} className="lk-icon-gradient size-4.5 md:size-5" />
      {children}
    </Link>
  );
}
