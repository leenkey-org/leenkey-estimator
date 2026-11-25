import type { ReactNode } from "react";
import Link from "next/link";
import { FacadeDrawing } from "@/components/shared/facade-drawing";
import { Photo } from "@/components/shared/photo";
import { StatusBadge } from "@/components/shared/status-badge";
import { StepProgress } from "@/components/shared/step-progress";
import { frBilling } from "@/lib/i18n/sections/billing";
import { frSaleDashboard } from "@/lib/i18n/sections/saleDashboard";
import { cn } from "@/lib/utils";
import { PropertySwitcher, type PropertyChoice } from "./property-switcher";
import type { Database } from "@/types/database";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { billing: frBilling, saleDashboard: frSaleDashboard } as const;

type ListingStatus = Database["public"]["Enums"]["listing_status"];

const t = fr.saleDashboard;

export type HeaderProperty = {
  id: string;
  name: string;
  /** The main photo (photo-files.ts), shown large; null: facade.svg. */
  photoSrc: string | null;
  /** « 350 000 € · publié le 18 sept. ». */
  figures: string | null;
  status: ListingStatus;
};

/**
 * The top of « Ma vente » (docs/DESIGN.md 10.4 SellerHeader, 12.3), on the
 * night of the charte: « Bonjour Camille », « Ma vente », the bell on a
 * phone; the menu of the properties of the seller; the main photo of the
 * property, large, its status on it (2026-11-25, Younes: « une vraie
 * touche design »); its name, price and date of publication; its step of
 * the sale, named in large type, and its plan. Across the screen on a
 * phone (the photo under the greeting), a rounded block from 768 px (the
 * photo on the right).
 */
export function SellerHeader({
  greeting,
  bell,
  choices,
  property,
  progress,
  planHref,
  className,
}: {
  greeting: string;
  /** The notifications, on a phone (in the top bar from 768 px). */
  bell?: ReactNode;
  /** The properties of the seller, to choose from when two or more. */
  choices?: readonly PropertyChoice[];
  property: HeaderProperty;
  progress?: {
    current: number;
    total: number;
    /** « Étape 3 sur 6 · Contacts et visites ». */
    label: string;
    /** « Contacts et visites ». */
    title: string;
    plan: string;
  } | null;
  /** The plans of the property (/vendeur/formule, L1-26), under the steps. */
  planHref?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "lk-hero-bg relative isolate overflow-hidden text-white md:rounded-lk-3xl",
        className,
      )}
    >
      {/* The dots of the charte, fading, behind the greeting. */}
      <div
        aria-hidden="true"
        className="lk-dots-white pointer-events-none absolute -top-6 -left-6 -z-10 h-40 w-72 opacity-15 mask-radial-from-0% mask-radial-to-70% mask-radial-at-top-left"
      />
      <div
        className={cn(
          "flex flex-col gap-5 px-(--lk-gutter) pt-6 pb-7",
          // From 768 px: the text on the left, the photo on the right across both rows.
          "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:grid-rows-[auto_1fr] md:gap-x-8 md:gap-y-6 md:p-8",
        )}
      >
        <div className="flex flex-col gap-3 md:col-start-1 md:row-start-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-lk-compact text-white/75">{greeting}</p>
              <h1 className="text-lk-h1 font-bold text-wide lg:text-lk-h1-lg">{t.title}</h1>
            </div>
            {bell}
          </div>
          {choices && choices.length > 1 ? <PropertySwitcher choices={choices} /> : null}
        </div>

        {/* The photo, second on a phone as in the page: decorative (the name says
            the property), its status on it. */}
        <div className="relative aspect-3/2 overflow-hidden rounded-lk-2xl bg-white/6 ring-1 ring-white/10 md:col-start-2 md:row-span-2 md:row-start-1 md:aspect-auto md:min-h-64">
          <div aria-hidden="true" className="absolute inset-0">
            {property.photoSrc ? (
              <Photo
                src={property.photoSrc}
                alt=""
                priority
                sizes="(min-width: 1280px) 360px, (min-width: 768px) 45vw, 100vw"
              />
            ) : (
              <span className="flex h-full items-center justify-center">
                <FacadeDrawing className="w-2/5 text-white/55" />
              </span>
            )}
            {/* A veil at the bottom: the photo melts into the night. */}
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-lk-night/55 to-transparent" />
          </div>
          <StatusBadge status={property.status} className="absolute top-3 left-3 shadow-lk-badge" />
        </div>
        <div className="flex flex-col gap-5 md:col-start-1 md:row-start-2 md:justify-end">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="line-clamp-2 text-lk-h3 font-semibold text-wide lg:text-lk-h3-lg">
              {property.name}
            </p>
            {property.figures ? (
              <p className="truncate text-lk-compact tabular text-lk-night-text">
                {property.figures}
              </p>
            ) : null}
          </div>
          {progress ? (
            <div className="rounded-lk-2xl border border-white/10 bg-white/6 p-4">
              <StepProgress
                tone="dark"
                current={progress.current}
                total={progress.total}
                label={progress.label}
                heading={{
                  position: t.stepOf(progress.current, progress.total),
                  title: progress.title,
                }}
                trailing={progress.plan}
              />
            </div>
          ) : null}
          {planHref ? (
            <Link
              href={planHref}
              className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border border-white/35 px-4 text-lk-caption font-semibold text-white transition-colors duration-140 ease-out-lk hover:bg-white/10 focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {fr.billing.entry}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
