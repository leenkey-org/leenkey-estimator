import type { ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A message of a conversation (docs/DESIGN.md 10.5): 82 % of the thread at
 * most, padding 12 × 14, 14 px / 1.5, its line breaks kept and a long word
 * cut. Received: white, --lk-line border, radius 6 6 6 2; sent: blue, white
 * text, radius 6 6 2 6. Meta under it, 11 px --lk-ink-3: « Thomas · 9:12 »,
 * « Vous · 9:40 ».
 */
export function MessageBubble({
  mine,
  meta,
  children,
  className,
}: {
  /** Sent by the viewer: on the right, in blue. */
  mine: boolean;
  meta: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // 640 px at most: a line stays readable when the thread takes the
        // width of a large screen (L1-56).
        "flex max-w-[min(82%,40rem)] flex-col gap-1",
        mine ? "items-end self-end" : "items-start self-start",
        className,
      )}
    >
      <p
        className={cn(
          "rounded-lk-md px-3.5 py-3 text-lk-compact whitespace-pre-wrap wrap-anywhere",
          mine
            ? "rounded-br-lk-xs bg-lk-blue text-white"
            : "rounded-bl-lk-xs border border-lk-line bg-lk-surface text-lk-ink",
        )}
      >
        {children}
      </p>
      <p className="px-1 text-lk-micro text-lk-ink-3">{meta}</p>
    </div>
  );
}

/**
 * A message of the platform in the thread (visit, offer; docs/DESIGN.md
 * 10.5): full width, --lk-stone-2, radius 6, 13 px, icon on the left, an
 * action link after the text.
 */
export function SystemMessage({
  icon: Icon = Info,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2.5 rounded-lk-md bg-lk-stone-2 px-3.5 py-3 text-lk-secondary text-lk-ink",
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lk-ink-2" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="whitespace-pre-wrap wrap-anywhere">{children}</p>
        {action}
      </div>
    </div>
  );
}

/** Day of the messages that follow, centred, 11 px --lk-ink-3 (docs/DESIGN.md 10.5). */
export function MessageDate({ children }: { children: ReactNode }) {
  return <p className="text-center text-lk-micro text-lk-ink-3">{children}</p>;
}
