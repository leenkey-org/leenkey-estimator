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
        "group flex min-h-35 flex-col gap-2.5 rounded-lk-xl border border-lk-line bg-lk-surface p-4 text-lk-ink md:gap-3.5 md:p-6",
        "transition-[box-shadow,border-color] duration-220 ease-out-lk hover:border-lk-blue-border hover:shadow-lk-hover",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-lk-lg bg-lk-blue-tint text-lk-blue md:size-12 md:rounded-[14px]">
        <Icon aria-hidden="true" strokeWidth={1.8} className="size-5.5 md:size-6" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-lk-body-lg font-bold leading-tight md:text-lk-lead-lg">{title}</span>
        <span className="text-lk-secondary text-lk-ink-2 md:text-lk-body">{text}</span>
      </span>
      <span className="mt-auto hidden items-center gap-1.5 text-lk-body font-bold text-lk-blue md:inline-flex">
        {action}
        <ArrowRight
          aria-hidden="true"
          className="size-4.5 transition-transform duration-220 ease-out-lk group-hover:translate-x-0.75"
        />
      </span>
    </Link>
  );
}
