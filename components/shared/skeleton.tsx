import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholder (docs/DESIGN.md 10.8): stone block with the radius of
 * the element it replaces, opacity pulse 0.6 → 1 in 1.2 s, still when motion
 * is reduced. Never a full-screen spinner. Decorative: the page announces the
 * loading itself (aria-busy).
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-lk-sm bg-lk-stone-2 motion-safe:animate-[lk-skeleton_1.2s_ease-in-out_infinite_alternate]",
        className,
      )}
      {...props}
    />
  );
}
