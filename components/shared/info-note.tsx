import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type InfoNoteProps = {
  /** First line, in 600 (« Votre analyse de valeur du 12 octobre 2026 »). */
  title?: string;
  children: ReactNode;
  /** For aria-describedby: the field it explains reads it on focus. */
  id?: string;
  className?: string;
};

/**
 * Information next to a form (docs/DESIGN.md 10.4): « Repris de votre analyse
 * de valeur… », the valuation at step 3 of the creation. Blue tint, 6 px,
 * padding 14 × 16, icon 18 px in blue, text 13 px in navy. No role: it is
 * part of the page, not news (InlineAlert announces).
 */
export function InfoNote({ title, children, id, className }: InfoNoteProps) {
  return (
    <div
      id={id}
      className={cn(
        "flex items-start gap-2.5 rounded-lk-md bg-lk-blue-tint px-4 py-3.5 text-lk-secondary text-lk-navy",
        className,
      )}
    >
      <Info aria-hidden="true" className="size-4.5 shrink-0 text-lk-blue" />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
