import type { ReactNode } from "react";
import Link from "next/link";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { StatusBadge } from "@/components/shared/status-badge";
import { StepProgress } from "@/components/shared/step-progress";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type ListingStatus = Database["public"]["Enums"]["listing_status"];

const t = fr.saleDashboard;

export type HeaderProperty = {
  id: string;
  name: string;
  thumbSrc: string | null;
  /** « 350 000 € · publié le 18 sept. ». */
  figures: string | null;
  status: ListingStatus | "draft";
};

/**
 * The top of « Ma vente » (docs/DESIGN.md 10.4 SellerHeader, 12.3), on the
 * night of the charte: « Bonjour Camille », « Ma vente », the bell on a
 * phone; the other properties of the seller to choose from; the card of the
 * property (thumbnail, title, price and date of publication, status); its
 * step of the sale and its plan. Across the screen on a phone, a rounded
 * block from 768 px.
 */
export function SellerHeader({
  greeting,
  bell,
  choices,
  property,
  progress,
  className,
}: {
  greeting: string;
  /** The notifications, on a phone (in the top bar from 768 px). */
  bell?: ReactNode;
  /** The properties of the seller (two or more): `/vendeur?bien=`. */
  choices?: readonly { id: string; label: string; href: string; current: boolean }[];
  property: HeaderProperty;
  progress?: { current: number; total: number; label: string; plan: string } | null;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "lk-hero-bg flex flex-col gap-4 px-(--lk-gutter) pt-6 pb-7 text-white md:rounded-lk-3xl md:px-8 md:py-8",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-lk-compact text-white/75">{greeting}</p>
          <h1 className="text-lk-h1 font-bold text-wide lg:text-lk-h1-lg">{t.title}</h1>
        </div>
        {bell}
      </div>

      {choices && choices.length > 1 ? (
        <nav aria-label={t.choose} className="-mx-(--lk-gutter) md:mx-0">
          <ul className="flex gap-2 overflow-x-auto px-(--lk-gutter) [scrollbar-width:none] md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
            {choices.map((choice) => (
              <li key={choice.id} className="shrink-0">
                <Link
                  href={choice.href}
                  aria-current={choice.current ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 max-w-64 items-center rounded-full px-3.5 text-lk-label font-semibold",
                    "transition-colors duration-140 ease-out-lk focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid",
                    // 44 px of target (DESIGN.md 15).
                    "relative after:absolute after:inset-x-0 after:-inset-y-1",
                    choice.current
                      ? "bg-lk-surface text-lk-ink"
                      : "bg-white/10 text-white hover:bg-white/20",
                  )}
                >
                  <span className="truncate">{choice.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="flex items-center gap-3 rounded-lk-xl bg-white/8 p-3">
        <PropertyThumb src={property.thumbSrc} className="size-14 rounded-lk-md" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="line-clamp-2 text-lk-compact font-semibold">{property.name}</p>
          {property.figures ? (
            <p className="truncate text-lk-caption tabular text-white/75">{property.figures}</p>
          ) : null}
        </div>
        <StatusBadge status={property.status} className="shrink-0" />
      </div>

      {progress ? (
        <StepProgress
          tone="dark"
          current={progress.current}
          total={progress.total}
          label={progress.label}
          trailing={progress.plan}
        />
      ) : null}
    </header>
  );
}
