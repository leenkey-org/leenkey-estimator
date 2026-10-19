import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { editableOnceSent } from "@/leenkey/properties/creation";
import { SavedNotice } from "@/leenkey/properties/components/saved-notice";
import { SheetSection } from "@/leenkey/properties/components/sheet-section";
import { propertyForSheet } from "@/leenkey/properties/load";
import { editHref, pricePerM2Cents, propertyName } from "@/leenkey/properties/sheet";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.sheet;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modifie?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await propertyForSheet((await params).id);
  const name = property ? propertyName(property) : fr.properties.creation.title;
  return { title: t.metaTitle(`${t.tabs.listing} · ${name}`) };
}

// L1-14, tab Annonce: price, title, description and reference, as the
// buyers read them. A draft or a rejected listing changes them at step 3;
// once sent, from here (L1-14b), and it stays online.
export default async function PropertyListingPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const property = await propertyForSheet(id);
  if (!property) return null;
  const { listing } = property;
  const status = property.listingStatus;
  const href = editHref(property, "listing");

  if (!listing) {
    return (
      <SheetSection id="annonce" title={t.tabs.listing}>
        <div className="flex flex-col items-start gap-3 rounded-lk-md border border-dashed border-lk-line p-5">
          <p className="text-lk-body text-lk-ink-2">{t.listing.empty}</p>
          {href ? (
            <Button asChild variant="secondary">
              <Link href={href}>{t.listing.write}</Link>
            </Button>
          ) : null}
        </div>
      </SheetSection>
    );
  }

  const perM2 = pricePerM2Cents(listing.priceCents, property.characteristics.surfaceM2);
  return (
    <div className="flex flex-col gap-8">
      {query.modifie === "1" && editableOnceSent(status) ? (
        <SavedNotice text={fr.properties.edit.saved[status]} />
      ) : null}
      <SheetSection
        id="annonce"
        title={t.tabs.listing}
        action={
          href ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={href}>{t.listing.edit}</Link>
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
    </div>
  );
}
