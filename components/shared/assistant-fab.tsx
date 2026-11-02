import { forwardRef, type ComponentProps } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AssistantFab (docs/DESIGN.md 10.5): the floating button of the assistant,
 * 24 px from the bottom right corner, 48 px high, white, 1.5 px ink border,
 * a pill as every button of the charte D (L1-58), shadow-float, the blue
 * Sparkles and « Assistant Leenkey » 14 px 600. Layer 40 (DESIGN.md 2.2).
 * From 768 px only: on a phone, the button of the header opens the page.
 */
export const AssistantFab = forwardRef<HTMLButtonElement, ComponentProps<"button">>(
  function AssistantFab({ className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "fixed right-6 bottom-6 z-40 hidden h-12 items-center gap-2 rounded-full border-[1.5px] border-lk-ink bg-lk-surface px-4.5 text-lk-compact font-semibold text-lk-ink shadow-float md:inline-flex",
          "transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
          className,
        )}
        {...props}
      >
        <Sparkles aria-hidden="true" className="size-5 text-lk-blue" />
        {children}
      </button>
    );
  },
);
