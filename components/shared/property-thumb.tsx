import { FacadeDrawing } from "./facade-drawing";
import { cn } from "@/lib/utils";

/**
 * Thumbnail of a property (docs/DESIGN.md 7.1: dashboard 56 × 56, admin
 * 56 × 44, radius 4): facade.svg on stone until the photos (L1-12).
 */
export function PropertyThumb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lk-sm bg-lk-stone-2",
        className,
      )}
    >
      <FacadeDrawing className="w-3/5 text-lk-ink-3" />
    </div>
  );
}
