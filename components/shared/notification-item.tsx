import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type NotificationTone = "blue" | "success" | "warning" | "stone";

export type NotificationItemProps = {
  icon: LucideIcon;
  /** Background of the round visual, after the type of the event. */
  tone: NotificationTone;
  title: string;
  detail?: string | null;
  /** « Il y a 12 min », « Mardi ». */
  time: string;
  /** The moment itself, for the <time> element. */
  dateTime: string;
  unread: boolean;
  /** Where it leads; none: a line of text. */
  href?: string | null;
  /** On the way there (marks it read, closes the panel). */
  onSelect?: () => void;
};

const VISUAL: Record<NotificationTone, string> = {
  blue: "border-[1.5px] border-lk-blue bg-lk-blue-tint text-lk-blue",
  success: "bg-lk-success-bg text-lk-success-fg",
  warning: "bg-lk-warning-bg text-lk-warning-fg",
  stone: "bg-lk-stone-2 text-lk-ink",
};

/**
 * A line of the notifications panel (docs/DESIGN.md 10.7): padding 14 × 16,
 * gap 12, line below. Round 40 px visual on the tint of the event, title
 * 13 px 600, detail 12 px --lk-ink-2, time 11 px --lk-ink-3. Unread: on
 * --lk-blue-tint, line --lk-blue-line and an 8 px blue dot on the right,
 * read « non lue » by screen readers.
 */
export function NotificationItem({
  icon: Icon,
  tone,
  title,
  detail,
  time,
  dateTime,
  unread,
  href,
  onSelect,
}: NotificationItemProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          VISUAL[tone],
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span className="text-lk-label font-semibold break-words text-lk-ink">
          {title}
          {unread ? <span className="sr-only">{`, ${fr.notifications.unread}`}</span> : null}
        </span>
        {detail ? (
          <span className="text-lk-caption break-words text-lk-ink-2">{detail}</span>
        ) : null}
        <time dateTime={dateTime} className="text-lk-micro text-lk-ink-3">
          {time}
        </time>
      </span>
      {unread ? (
        <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-lk-blue" />
      ) : null}
    </>
  );
  const frame = cn(
    "flex gap-3 border-b px-4 py-3.5 text-left",
    unread ? "border-lk-blue-line bg-lk-blue-tint" : "border-lk-line bg-lk-surface",
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          onClick={onSelect}
          className={cn(
            frame,
            "transition-colors duration-140 ease-out-lk",
            unread ? "hover:bg-lk-blue-line" : "hover:bg-lk-stone-2",
            "focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lk-blue",
          )}
        >
          {content}
        </Link>
      ) : (
        <div className={frame}>{content}</div>
      )}
    </li>
  );
}
