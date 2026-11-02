import type { ReactNode } from "react";
import { Check, CircleAlert, Sparkles, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export type ConfirmActionState = "pending" | "confirmed" | "declined" | "superseded" | "error";

/**
 * ConfirmActionCard (docs/DESIGN.md 12, « Assistant »; SPEC-V2 section 12):
 * a change the assistant proposes, shown before anything is written: its
 * title, what it changes (before / after), « Confirmer » primary and
 * « Annuler » ghost. Once answered, a line says what became of it.
 */
export function ConfirmActionCard({
  title,
  children,
  state,
  busy = false,
  stateText,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  className,
}: {
  title: string;
  /** What changes: ChangeBlock before and after (nothing once answered, read again later). */
  children?: ReactNode;
  state: ConfirmActionState;
  /** The answer is on its way: both buttons wait. */
  busy?: boolean;
  /** Once answered: what became of the change. */
  stateText?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}) {
  const StateIcon = state === "confirmed" ? Check : state === "error" ? CircleAlert : X;
  return (
    <section
      aria-label={title}
      className={cn(
        "flex w-full flex-col gap-3 rounded-lk-lg border border-lk-blue-line bg-lk-surface p-4",
        className,
      )}
    >
      <h3 className="flex items-center gap-2 text-lk-compact font-semibold text-lk-ink">
        <Sparkles aria-hidden="true" className="size-4 shrink-0 text-lk-blue" />
        {title}
      </h3>
      {children ? <div className="flex flex-col gap-2.5">{children}</div> : null}
      {state === "pending" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
        </div>
      ) : (
        <p
          className={cn(
            "flex items-center gap-1.5 text-lk-caption font-semibold",
            state === "confirmed"
              ? "text-lk-success"
              : state === "error"
                ? "text-lk-danger"
                : "text-lk-ink-3",
          )}
        >
          <StateIcon aria-hidden="true" className="size-4 shrink-0" />
          {stateText}
        </p>
      )}
    </section>
  );
}

/** One side of a change: « Actuellement » (muted) or « Proposé » (blue tint). */
export function ChangeBlock({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "before" | "after";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lk-sm px-3 py-2.5",
        tone === "before" ? "bg-lk-stone-2" : "bg-lk-blue-tint",
      )}
    >
      <p className="text-lk-micro font-semibold text-lk-ink-3">{label}</p>
      <div
        className={cn(
          "text-lk-compact whitespace-pre-wrap wrap-anywhere",
          tone === "before" ? "text-lk-ink-2" : "text-lk-navy",
        )}
      >
        {children}
      </div>
    </div>
  );
}
