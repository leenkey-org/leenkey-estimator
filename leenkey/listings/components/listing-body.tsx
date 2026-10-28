import type { ReactNode } from "react";
import { User } from "lucide-react";
import { DpeBadge } from "@/components/shared/dpe-badge";
import { Gallery } from "@/components/shared/gallery";
import { KeyFactsGrid } from "@/components/shared/key-facts-table";
import { PriceBlock } from "@/components/shared/price-block";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { bySection, factsPreview, listingKeyFacts } from "../key-facts";
import {
  galleryPhotos,
  listingFactsLine,
  listingHighlights,
  listingOverview,
} from "../presentation";
import type { PublicListing } from "../queries";
import { FactsDialog } from "./facts-dialog";
import { ListingDescription } from "./listing-description";

const t = fr.listing;

/** Facts shown before « Afficher les N caractéristiques ». */
const FACTS_PREVIEW = 10;

/** A block of the listing, a line above it (the sections of Airbnb). */
function Block({
  id,
  title,
  level,
  children,
  className,
}: {
  id?: string;
  title?: string;
  level: "h2" | "h4";
  children: ReactNode;
  className?: string;
}) {
  const Heading = level;
  return (
    <section
      aria-labelledby={title ? id : undefined}
      className={cn("flex flex-col gap-4 border-t border-lk-line py-6 lg:py-8", className)}
    >
      {title ? (
        <Heading id={id} className="text-lk-h2 font-bold text-wide text-lk-ink lg:text-lk-h2-lg">
          {title}
        </Heading>
      ) : null}
      {children}
    </section>
  );
}

/**
 * The listing as its page shows it (SPEC-V2 8.5, docs/DESIGN.md 12.7, 12.8),
 * in the way of Airbnb since L1-60: the title and its actions over the
 * photos from 1024 px (under them on a phone, at the top of the sheet that
 * covers their bottom); then, a line between each block: the type, the place
 * and the facts in one line, the seller, the strong points, the description,
 * the first facts and all of them in a dialog, the map; the price column on
 * the right from 1024 px. The public page (L1-17) and the preview of the
 * seller before sending (L1-13) show the same one: what the seller checks is
 * what buyers will see. Under 1024 px the public page gives the price in its
 * bar at the bottom; the preview, without that bar, under the facts line.
 */
export function ListingBody({
  listing,
  actions,
  galleryTopLeft,
  galleryTopRight,
  aside,
  map,
  inlinePrice = false,
  level = 1,
  className,
}: {
  listing: PublicListing;
  /** Beside the title from 1024 px (« Enregistrer »). */
  actions?: ReactNode;
  /** Over the mobile photo (back link, favourite). */
  galleryTopLeft?: ReactNode;
  galleryTopRight?: ReactNode;
  /** The price column (PriceColumn), from 1024 px. */
  aside: ReactNode;
  /** The map of the area (L1-16), on the public page. */
  map?: ReactNode;
  /** The price under the facts line under 1024 px: the preview, without the bar of the page. */
  inlinePrice?: boolean;
  /**
   * Level of the title: 1 on the page of the listing; 3 in the preview, under
   * « Mon bien » and « Aperçu de votre annonce ». Its sections come one below.
   */
  level?: 1 | 3;
  className?: string;
}) {
  const Title = level === 1 ? "h1" : "h3";
  const section = level === 1 ? "h2" : "h4";
  const highlights = listingHighlights(listing);
  const facts = bySection(listingKeyFacts(listing));
  // A few facts: all of them, in their groups; more: the first ones, then the dialog.
  const preview = facts.length > FACTS_PREVIEW ? factsPreview(facts, FACTS_PREVIEW) : null;
  const firstName = listing.sellerFirstName?.trim();
  const factsHeading = level === 1 ? "h3" : "h5";

  return (
    <div className={cn("flex flex-col", className)}>
      {/* The title: over the photos from 1024 px, at the top of the sheet below. */}
      <div className="relative z-10 order-2 -mt-6 flex items-start justify-between gap-4 rounded-t-lk-3xl bg-lk-surface px-5 pt-6 lg:order-1 lg:mt-0 lg:items-end lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-2 lg:pb-5">
        <div className="flex min-w-0 flex-col gap-1">
          <Title className="text-lk-h2 font-bold text-wide text-balance text-lk-ink lg:text-lk-h1-lg">
            {listing.title}
          </Title>
        </div>
        {actions ? (
          <div className="hidden shrink-0 items-center gap-1 lg:flex">{actions}</div>
        ) : null}
      </div>

      <Gallery
        photos={galleryPhotos(listing)}
        topLeft={galleryTopLeft}
        topRight={galleryTopRight}
        className="order-1 lg:order-2"
      />

      <div className="order-3 px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:gap-14 lg:px-0 lg:pt-4 xl:gap-20">
        <div className="flex min-w-0 flex-col">
          {/* The type, the place and the facts in one line, the DPE beside them. */}
          <div className="flex items-start justify-between gap-3 pt-4 pb-6 lg:pt-4 lg:pb-8">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-lk-title font-semibold text-lk-ink lg:text-lk-h2">
                {listingOverview(listing)}
              </p>
              <p className="text-lk-compact text-lk-ink-2 lg:text-lk-body">
                {listingFactsLine(listing)}
              </p>
              {inlinePrice ? (
                <PriceBlock
                  priceCents={listing.priceCents}
                  surfaceM2={listing.surfaceM2}
                  className="mt-3 lg:hidden"
                />
              ) : null}
            </div>
            {listing.dpe ? <DpeBadge value={listing.dpe} className="shrink-0" /> : null}
          </div>

          {/* The seller: its initial in the gradient of the charte. */}
          <div className="flex items-center gap-4 border-t border-lk-line py-6">
            <span
              aria-hidden="true"
              className="lk-gradient flex size-12 shrink-0 items-center justify-center rounded-full text-lk-title font-semibold text-white"
            >
              {firstName ? (
                firstName.charAt(0).toLocaleUpperCase("fr-FR")
              ) : (
                <User strokeWidth={1.8} className="size-6" />
              )}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-lk-body font-semibold text-lk-ink">
                {firstName ? t.host.title(firstName) : t.host.unknown}
              </p>
              {/* « Propriétaire » under a first name only: « le propriétaire » says it already. */}
              {firstName || listing.accompanied ? (
                <p className="text-lk-compact text-lk-ink-3">
                  {[
                    firstName ? t.host.owner : null,
                    listing.accompanied ? t.contact.accompanied : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          </div>

          {highlights.length ? (
            <ul
              aria-label={t.highlights.label}
              className="flex flex-col gap-5 border-t border-lk-line py-6 lg:py-8"
            >
              {highlights.map(({ key, icon: Icon, title, text }) => (
                <li key={key} className="flex items-start gap-4">
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.7}
                    className="lk-icon-gradient mt-0.5 size-6 shrink-0"
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-lk-body font-semibold text-lk-ink">{title}</p>
                    <p className="text-lk-compact text-lk-ink-3">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <Block id="le-bien" title={t.description.title} level={section}>
            <ListingDescription text={listing.description} />
          </Block>

          <Block id="avant-visite" title={t.facts.title} level={section}>
            {preview ? (
              <>
                <KeyFactsGrid items={preview} headingLevel={factsHeading} />
                <FactsDialog count={facts.length} title={t.facts.title}>
                  <KeyFactsGrid items={facts} headingLevel="h3" />
                </FactsDialog>
              </>
            ) : (
              <KeyFactsGrid items={facts} headingLevel={factsHeading} />
            )}
          </Block>

          {map ? (
            <Block id="localisation" title={t.map.title} level={section}>
              {map}
            </Block>
          ) : null}
        </div>

        <aside className="hidden pt-4 lg:block">{aside}</aside>
      </div>
    </div>
  );
}
