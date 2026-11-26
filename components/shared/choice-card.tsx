import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export type ChoiceCardProps = {
  icon: LucideIcon;
  title: string;
  text: string;
  action: { href: string; label: string };
  /** A short line above the action (« Gratuit · 2 minutes · … »). */
  note?: ReactNode;
  /** The way recommended: the outline of the gradient, the main action of the screen. */
  primary?: boolean;
  /** Level of the title, one below the heading of the page. */
  titleAs?: "h2" | "h3" | "h4";
  className?: string;
};

/**
 * One way to start, among two or three side by side (docs/DESIGN.md 10.2,
 * /vendre), in the charte D: white card of radius 18 px, padding 20, 24 then 28
 * from 1 024 px; its icon in the gradient on a soft tile (as a ShortcutCard);
 * title, one sentence, a short line if any, then its action at the bottom,
 * full width below 1 024 px. The way recommended wears the outline of the
 * gradient and its violet shadow. Hovered, or its action focused, the card rises a
 * little (never with reduced motion). A list item: put it in a <ul>.
 */
export function ChoiceCard({
  icon: Icon,
  title,
  text,
  action,
  note,
  primary = false,
  titleAs: Title = "h2",
  className,
}: ChoiceCardProps) {
  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-lk-d-card p-5 md:gap-5 md:p-6 lg:p-7",
        "transition-[box-shadow,border-color,translate] duration-220 ease-out-lk",
        "motion-safe:focus-within:-translate-y-0.5 motion-safe:hover:-translate-y-0.5",
        primary
          ? "lk-gradient-border shadow-lk-d-featured"
          : "border border-lk-line bg-lk-surface shadow-lk-d-field focus-within:border-lk-indigo-line focus-within:shadow-lk-d-hover hover:border-lk-indigo-line hover:shadow-lk-d-hover",
        className,
      )}
    >
      <span className="lk-gradient-soft flex size-11 items-center justify-center rounded-lk-lg md:size-12.5 md:rounded-[0.875rem]">
        <Icon
          aria-hidden="true"
          strokeWidth={1.9}
          className="lk-icon-gradient size-5.5 md:size-6"
        />
      </span>
      <div className="flex flex-1 flex-col gap-2">
        <Title className="text-lk-h3 font-bold text-lk-ink md:text-lk-c-card-lg">{title}</Title>
        <p className="text-lk-body text-pretty text-lk-ink-2">{text}</p>
      </div>
      {note ? <p className="text-lk-secondary text-lk-ink-2 md:text-lk-compact">{note}</p> : null}
      <Button
        asChild
        variant={primary ? "cta" : "secondary"}
        size="lg"
        trailingIcon={ArrowRight}
        className="w-full md:max-lg:px-3 md:max-lg:text-lk-button-md lg:w-auto lg:self-start"
      >
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </li>
  );
}
