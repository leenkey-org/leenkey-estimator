import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Actions of a form in steps (docs/DESIGN.md 9, G5): stuck to the bottom of
 * the screen on a phone (white, line border above, iOS safe area), at the
 * end of the form from 768 px. « Précédent » and « Continuer » side by side.
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
        "sticky bottom-0 z-20 -mx-5 mt-8 flex gap-3 border-t border-lk-line bg-lk-surface px-5 pt-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        "md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pb-0",
        "[&>*]:flex-1",
        className,
      )}
    >
      {children}
    </div>
  );
}
