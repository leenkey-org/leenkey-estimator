import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";
import { SectionTitle } from "@/components/shared/section-title";
import { cn } from "@/lib/utils";

// « Mon compte » (L1-39, DESIGN.md 13.1, G9): sections of bordered lists,
// rows of 56 px with a chevron.

export const accountRowClass =
  "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-brand-blue focus-visible:outline-solid";

export const accountListClass =
  "flex flex-col overflow-hidden rounded-lk-md border border-lk-line bg-lk-surface";

export function AccountSection({
  id,
  title,
  bare = false,
  children,
}: {
  id: string;
  title: string;
  /** The children bring their own list (and what goes under it). */
  bare?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-8 flex flex-col gap-3">
      <SectionTitle id={id}>{title}</SectionTitle>
      {bare ? children : <ul className={accountListClass}>{children}</ul>}
    </section>
  );
}

/** One fact of the account and the page that changes it. */
export function AccountRow({
  href,
  label,
  value,
  detail,
  download = false,
}: {
  href: string;
  label: string;
  value: string;
  /** A second line, e.g. an address waiting for its confirmation. */
  detail?: string | null;
  /**
   * A file to save (a route handler that sends it as an attachment): a plain
   * link, never prefetched; on a failure the route leads to a page instead.
   */
  download?: boolean;
}) {
  return (
    <li className="border-t border-lk-line first:border-t-0">
      {download ? (
        <a href={href} className={accountRowClass}>
          <AccountRowText label={label} value={value} detail={detail} />
          <Download aria-hidden="true" className="size-4 shrink-0 text-lk-ink-3" />
        </a>
      ) : (
        <Link href={href} className={accountRowClass}>
          <AccountRowText label={label} value={value} detail={detail} />
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-lk-ink-3" />
        </Link>
      )}
    </li>
  );
}

export function AccountRowText({
  label,
  value,
  detail,
  wrap = false,
}: {
  label: string;
  value: string;
  detail?: string | null;
  /** A sentence that goes to the line instead of a value cut short. */
  wrap?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-lk-label font-semibold text-lk-ink">{label}</span>
      <span className={cn("text-lk-caption text-lk-ink-3", !wrap && "truncate")}>{value}</span>
      {detail ? (
        <span className="text-lk-caption font-semibold text-lk-warning [overflow-wrap:anywhere]">
          {detail}
        </span>
      ) : null}
    </span>
  );
}
