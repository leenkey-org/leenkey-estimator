import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * « Voir les 12 biens », « Toutes les questions » (docs/DESIGN.md 1): a 14 px
 * 600 link with the arrow icon, the one place an arrow follows a label; the
 * arrow moves forward on hover. Blue, or ink on stone, where the blue reaches
 * 4.4:1 only (DESIGN.md 2.1). 44 px high touch target.
 */
export function MoreLink({
  href,
  tone = "blue",
  children,
  className,
}: {
  href: string;
  tone?: "blue" | "ink";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-11 items-center gap-1.5 rounded-lk-sm text-lk-compact font-semibold",
        tone === "blue" ? "text-lk-blue" : "text-lk-ink",
        "underline-offset-2 hover:underline",
        "focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
        className,
      )}
    >
      {children}
      <ArrowRight
        aria-hidden="true"
        className="size-4 shrink-0 transition-transform duration-220 ease-out-lk group-hover:translate-x-0.5"
      />
    </Link>
  );
}
