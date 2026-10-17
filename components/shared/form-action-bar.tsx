import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Actions of a form in steps (docs/DESIGN.md 11, G5, and 10.1): at the bottom
 * of the screen on a phone, even under a short form (white, line border
 * above, iOS safe area), at the end of the form from 768 px. « Précédent »
 * (flex 1) and « Continuer », the last button (flex 1.4), 10 px apart.
 */
export function FormActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-5 mt-auto flex gap-2.5 border-t border-lk-line bg-lk-surface px-5 pt-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        "md:static md:mx-0 md:mt-8 md:border-0 md:bg-transparent md:px-0 md:pb-0",
        "[&>*]:flex-1 [&>*:last-child]:flex-[1.4]",
        className,
      )}
    >
      {children}
    </div>
  );
}
