import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type InlineAlertProps = {
  tone?: "danger" | "warning" | "info" | "success";
  children: ReactNode;
  /** A link or a button after the text (« Réessayer »). */
  action?: ReactNode;
  /**
   * false: no role, inside a live region already in the page (an alert
   * inserted with its text is not always read).
   */
  live?: boolean;
  className?: string;
};

const tones = {
  danger: { box: "bg-lk-danger-bg text-lk-danger-fg", icon: AlertCircle },
  warning: { box: "bg-lk-warning-bg text-lk-warning-fg", icon: AlertTriangle },
  info: { box: "bg-lk-blue-tint text-lk-navy", icon: Info },
  success: { box: "bg-lk-success-bg text-lk-success-fg", icon: CheckCircle2 },
} as const;

/**
 * Inline alert (docs/DESIGN.md 10.8): tinted box, 6 px, icon 14 px, text in
 * the -fg colour of its tone. role="alert" for an error, status otherwise.
 */
export function InlineAlert({
  tone = "info",
  children,
  action,
  live = true,
  className,
}: InlineAlertProps) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      className={cn(
        "flex items-start gap-2 rounded-lk-md px-3 py-2.5 text-lk-secondary",
        box,
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
        <p>{children}</p>
        {action}
      </div>
    </div>
  );
}
