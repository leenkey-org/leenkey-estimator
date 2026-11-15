import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A text written by the assistant, shown as such (docs/DESIGN.md 10,
 * « AssistantNote »): its title says who wrote it. Plain text only.
 */
export function AssistantNote({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lk-md bg-lk-blue-tint px-4.5 py-4 text-lk-navy",
        className,
      )}
    >
      <Sparkles aria-hidden="true" className="size-5 shrink-0 text-lk-blue" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-lk-secondary font-semibold">{title}</p>
        <p className="text-lk-caption text-pretty">{children}</p>
      </div>
    </div>
  );
}
