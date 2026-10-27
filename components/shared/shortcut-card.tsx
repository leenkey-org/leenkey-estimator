import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shortcut card of direction C (docs/design-handoff/SPECS.md 2): white, a
 * border, radius 16 px; its icon in a blue tint tile (40 then 48 px), a title,
 * one sentence, and from 768 px its action in blue with an arrow. The whole
 * card is the link; hovered, a light blue shadow and a soft blue border.
 */
export function ShortcutCard({
  href,
  icon: Icon,
  title,
  text,
  action,
  className,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  text: string;
  /** « Valoriser », « Publier »…: the end of the card from 768 px. */
  action: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-34 flex-col gap-2.5 rounded-[1.125rem] border border-lk-line bg-lk-surface p-4 text-lk-ink md:gap-3.5 md:p-6",
        "transition-[box-shadow,border-color] duration-220 ease-out-lk hover:border-lk-indigo-line hover:shadow-lk-hover",
        className,
      )}
    >
      <span className="lk-gradient-soft flex size-10.5 items-center justify-center rounded-lk-lg md:size-12.5 md:rounded-[0.875rem]">
        <Icon
          aria-hidden="true"
          strokeWidth={1.9}
          className="lk-icon-gradient size-5.5 md:size-6"
        />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-lk-title leading-tight font-semibold md:text-[1.0625rem]">
          {title}
        </span>
        <span className="text-lk-caption leading-snug text-lk-ink-2 md:text-lk-compact">
          {text}
        </span>
      </span>
      <span className="mt-auto hidden items-center gap-1.5 text-lk-compact font-semibold text-lk-blue md:inline-flex">
        {action}
        <ArrowRight
          aria-hidden="true"
          className="size-4.5 transition-transform duration-220 ease-out-lk group-hover:translate-x-0.75"
        />
      </span>
    </Link>
  );
}
