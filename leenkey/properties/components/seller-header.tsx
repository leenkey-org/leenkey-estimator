import type { ReactNode } from "react";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { StatusBadge } from "@/components/shared/status-badge";
import { StepProgress } from "@/components/shared/step-progress";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { PropertySwitcher, type PropertyChoice } from "./property-switcher";
import type { Database } from "@/types/database";

type ListingStatus = Database["public"]["Enums"]["listing_status"];

const t = fr.saleDashboard;

export type HeaderProperty = {
  id: string;
  name: string;
  thumbSrc: string | null;
  /** « 350 000 € · publié le 18 sept. ». */
  figures: string | null;
  status: ListingStatus;
};

/**
 * The top of « Ma vente » (docs/DESIGN.md 10.4 SellerHeader, 12.3), on the
 * night of the charte: « Bonjour Camille », « Ma vente », the bell on a
 * phone; the menu of the properties of the seller; the card of the
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
  /** The properties of the seller, to choose from when two or more. */
  choices?: readonly PropertyChoice[];
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

      {choices && choices.length > 1 ? <PropertySwitcher choices={choices} /> : null}

      <div className="flex items-center gap-3 rounded-lk-xl bg-white/8 p-3">
        <PropertyThumb src={property.thumbSrc} className="size-14 rounded-lk-md" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="line-clamp-2 text-lk-compact font-semibold">{property.name}</p>
          {property.figures ? (
            <p className="truncate text-lk-caption tabular text-white/75">{property.figures}</p>
          ) : null}
          {/* Under the title on a phone, where « En attente de validation » would squeeze it. */}
          <StatusBadge status={property.status} className="mt-1 self-start md:hidden" />
        </div>
        <StatusBadge status={property.status} className="hidden shrink-0 md:inline-flex" />
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
