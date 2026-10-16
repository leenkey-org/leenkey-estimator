import type { ComponentProps } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "danger" | "warning" | "info" | "success";

const tones: Record<Tone, { className: string; icon: LucideIcon }> = {
  danger: { className: "bg-lk-danger-bg text-lk-danger-fg", icon: AlertCircle },
  warning: { className: "bg-lk-warning-bg text-lk-warning-fg", icon: TriangleAlert },
  info: { className: "bg-lk-blue-tint text-lk-blue", icon: Info },
  success: { className: "bg-lk-success-bg text-lk-success-fg", icon: CheckCircle2 },
};

export type InlineAlertProps = ComponentProps<"div"> & { tone?: Tone };

/**
 * Alert inline (docs/DESIGN.md 10.8): tinted block, 6 px radius, 14 px icon,
 * 13 px text in the matching dark colour. role="alert" for errors that must
 * be announced; status otherwise.
 */
export function InlineAlert({ tone = "info", className, children, ...props }: InlineAlertProps) {
  const { className: toneClassName, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lk-md px-3 py-2.5 text-lk-secondary",
        toneClassName,
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
