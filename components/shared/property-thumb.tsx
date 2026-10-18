import { FacadeDrawing } from "./facade-drawing";
import { Photo } from "./photo";
import { cn } from "@/lib/utils";

/**
 * Thumbnail of a property (docs/DESIGN.md 7.1: dashboard 56 × 56, admin
 * 56 × 44, conversation 44 × 44, radius 4): its main photo, else facade.svg
 * on stone, 40 % of the width (7.3). Decorative: the row names the property.
 */
export function PropertyThumb({ src, className }: { src?: string | null; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lk-sm bg-lk-stone-2",
        className,
      )}
    >
      {src ? (
        <Photo src={src} alt="" sizes="72px" />
      ) : (
        <FacadeDrawing className="w-2/5 text-lk-ink-3" />
      )}
    </div>
  );
}
