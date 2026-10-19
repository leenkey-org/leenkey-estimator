import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { inCreation } from "@/leenkey/properties/creation";
import { SheetSection } from "@/leenkey/properties/components/sheet-section";
import { propertyForSheet } from "@/leenkey/properties/load";
import { pricePerM2Cents, propertyName } from "@/leenkey/properties/sheet";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.sheet;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await propertyForSheet((await params).id);
  const name = property ? propertyName(property) : fr.properties.creation.title;
  return { title: t.metaTitle(`${t.tabs.listing} · ${name}`) };
}

// L1-14, tab Annonce: price, title, description and reference, as the
// buyers read them. A draft or a rejected listing changes them at step 3.
export default async function PropertyListingPage({ params }: Props) {
  const property = await propertyForSheet((await params).id);
  if (!property) return null;
  const { listing } = property;
  const editable = inCreation(property.listingStatus);
  const stepHref = `/vendeur/biens/${property.id}/prix`;

  if (!listing) {
    return (
      <SheetSection id="annonce" title={t.tabs.listing}>
        <div className="flex flex-col items-start gap-3 rounded-lk-md border border-dashed border-lk-line p-5">
          <p className="text-lk-body text-lk-ink-2">{t.listing.empty}</p>
          {editable ? (
            <Button asChild variant="secondary">
              <Link href={stepHref}>{t.listing.write}</Link>
            </Button>
          ) : null}
        </div>
      </SheetSection>
    );
  }

  const perM2 = pricePerM2Cents(listing.priceCents, property.characteristics.surfaceM2);
  return (
    <SheetSection
      id="annonce"
      title={t.tabs.listing}
      action={
        editable ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={stepHref}>{t.listing.edit}</Link>
          </Button>
        ) : null
      }
    >
      <dl className="flex flex-col divide-y divide-lk-line rounded-lk-md border border-lk-line bg-lk-surface">
        <div className="flex flex-col gap-1 p-4">
          <dt className="text-lk-caption text-lk-ink-3">{t.listing.price}</dt>
          <dd className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lk-price font-bold text-wide tabular-nums text-lk-ink">
              {formatPrice(listing.priceCents)}
            </span>
            {perM2 !== null ? (
              <span className="text-lk-secondary text-lk-ink-3">
                {t.listing.pricePerM2(formatPrice(perM2))}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <dt className="text-lk-caption text-lk-ink-3">{t.listing.title}</dt>
          <dd className="text-lk-body font-semibold text-lk-ink">{listing.title}</dd>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <dt className="text-lk-caption text-lk-ink-3">{t.listing.description}</dt>
          <dd className="text-lk-body whitespace-pre-line text-pretty text-lk-ink-2">
            {listing.description.trim() || "—"}
          </dd>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <dt className="text-lk-caption text-lk-ink-3">{t.listing.reference}</dt>
          <dd className="text-lk-body tabular-nums text-lk-ink">{listing.reference}</dd>
        </div>
      </dl>
    </SheetSection>
  );
}
