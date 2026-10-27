import type { ReactNode } from "react";
import Link from "next/link";
import { PropertyThumb } from "./property-thumb";
import { cn } from "@/lib/utils";

/**
 * Header of a conversation (docs/DESIGN.md 10.5): white, bottom border,
 * padding 16 × 16 × 12. Back (IconButton stone), thumbnail of the property
 * 44 × 44, title 14 px 600 (the H1 of the page) and subtitle 12 px
 * --lk-ink-3, both cut on one line, then `action` (« Voir l'annonce ») and
 * the menu (MoreVertical) on the right. With `href`, the thumbnail and the
 * title lead to the property.
 */
export function ConversationHeader({
  back,
  thumbSrc,
  title,
  titleAs: Title = "h1",
  subtitle,
  href,
  action,
  menu,
  className,
}: {
  /** A link styled as an IconButton stone, with its accessible name. */
  back?: ReactNode;
  thumbSrc?: string | null;
  title: string;
  /** Another level where the page has its own H1 (/design). */
  titleAs?: "h1" | "h2" | "h3" | "h4";
  /** « Avec Thomas », « Avec Thomas · Justificatif vérifié ». */
  subtitle?: string;
  href?: string | null;
  /** A link beside the menu: what the conversation is about. */
  action?: ReactNode;
  menu?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center gap-3 border-b border-lk-line bg-lk-surface px-4 pt-4 pb-3",
        className,
      )}
    >
      {back}
      {/* The link covers the thumbnail and the texts: a 44 px target, and its
          focus ring is drawn around them (the cut title would hide it). */}
      <div className="relative flex min-w-0 flex-1 items-center gap-3">
        <PropertyThumb src={thumbSrc} className="size-11" />
        <div className="flex min-w-0 flex-col">
          <Title className="truncate text-lk-compact font-semibold text-lk-ink">
            {href ? (
              <Link
                href={href}
                className={cn(
                  "after:absolute after:inset-0 after:rounded-lk-sm hover:underline",
                  "focus-visible:outline-none focus-visible:after:outline-solid focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-lk-brand-blue",
                )}
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </Title>
          {subtitle ? <p className="truncate text-lk-caption text-lk-ink-3">{subtitle}</p> : null}
        </div>
      </div>
      {action}
      {menu}
    </header>
  );
}
