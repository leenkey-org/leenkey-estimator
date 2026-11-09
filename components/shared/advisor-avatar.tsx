import { cn } from "@/lib/utils";

/**
 * The Leenkey adviser in place of a property (docs/DESIGN.md 13.1, SPEC-V2
 * 8.6 and 13): « LK » in white on --lk-blue, round, 44 × 44 in a
 * conversation. Decorative: the row or the header names the adviser.
 */
export function AdvisorAvatar({ label, className }: { label: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-lk-blue text-lk-compact font-bold text-white",
        className,
      )}
    >
      {label}
    </div>
  );
}
