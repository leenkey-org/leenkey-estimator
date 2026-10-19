import { pillClassName } from "@/components/shared/status-badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type Stage = keyof typeof fr.site.invest.status;

// Colours of the status badges (docs/DESIGN.md 10.2): done like a success,
// ongoing in the blue tint, to come on stone.
const tone: Record<Stage, string> = {
  done: "bg-lk-success-bg text-lk-success-fg",
  ongoing: "bg-lk-blue-tint text-lk-blue",
  next: "bg-lk-stone-2 text-lk-ink-2",
};

/** Stage of a milestone of /investir: « Fait », « En cours » or « À venir », in words. */
export function StagePill({ stage, className }: { stage: Stage; className?: string }) {
  return (
    <span
      className={cn(
        pillClassName,
        "px-2.5 py-1.25 text-lk-micro font-semibold",
        tone[stage],
        className,
      )}
    >
      {fr.site.invest.status[stage]}
    </span>
  );
}
