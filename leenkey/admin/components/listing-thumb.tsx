import { FacadeDrawing } from "@/components/shared/facade-drawing";
import { cn } from "@/lib/utils";

/** Thumbnail of a listing in the back office: facade.svg on stone until the photos (L1-12). */
export function ListingThumb({ className }: { className?: string }) {
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
