import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export type ChoiceCardProps = {
  icon: LucideIcon;
  title: string;
  text: string;
  action: { href: string; label: string };
  /** The way recommended: its action is the primary button of the screen. */
  primary?: boolean;
  /** Level of the title, one below the heading of the page. */
  titleAs?: "h2" | "h3" | "h4";
  className?: string;
};

/**
 * One way to start, among two or three side by side (docs/DESIGN.md 10.2,
 * /vendre): white card, border, 6 px, padding 20 then 24 from 768 px; icon
 * tile 44 px on --lk-blue-tint; title 17 px 600; one sentence; its action at
 * the bottom, full width below 768 px. A list item: put it in a <ul>.
 */
export function ChoiceCard({
  icon: Icon,
  title,
  text,
  action,
  primary = false,
  titleAs: Title = "h2",
  className,
}: ChoiceCardProps) {
  return (
    <li
      className={cn(
        "flex flex-col gap-4 rounded-lk-md border border-lk-line bg-lk-surface p-5 md:p-6",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-blue">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex flex-1 flex-col gap-2">
        <Title className="text-lk-h3 font-semibold text-lk-ink">{title}</Title>
        <p className="text-lk-body text-lk-ink-2">{text}</p>
      </div>
      <Button asChild variant={primary ? "primary" : "secondary"} className="w-full md:w-auto">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </li>
  );
}
