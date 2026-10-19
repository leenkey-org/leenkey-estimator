import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Photo } from "@/components/shared/photo";
import { photoAlt } from "@/leenkey/listings/presentation";
import { inCreation } from "@/leenkey/properties/creation";
import { SheetSection } from "@/leenkey/properties/components/sheet-section";
import { propertyForSheet } from "@/leenkey/properties/load";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { sellerPhotos } from "@/leenkey/properties/queries";
import { propertyName } from "@/leenkey/properties/sheet";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.sheet;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await propertyForSheet((await params).id);
  const name = property ? propertyName(property) : fr.properties.creation.title;
  return { title: t.metaTitle(`${t.photos.title} · ${name}`) };
}

// L1-14, tab Photos: the photos in their order, the main one first and
// marked. A draft or a rejected listing changes them at step 2.
export default async function PropertyPhotosPage({ params }: Props) {
  const property = await propertyForSheet((await params).id);
  if (!property) return null;
  const photos = await sellerPhotos(property.id);
  const editable = inCreation(property.listingStatus);
  const stepHref = `/vendeur/biens/${property.id}/caracteristiques`;
  const subject = {
    type: property.characteristics.type ?? "autre",
    rooms: property.characteristics.rooms ?? 0,
    city: property.address.city,
  };
  return (
    <SheetSection
      id="photos"
      title={t.photos.title}
      action={
        editable && photos.ok && photos.data.length > 0 ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={stepHref}>{t.photos.manage}</Link>
          </Button>
        ) : null
      }
    >
      {photos.ok && photos.data.length > 0 ? (
        <p className="-mt-2 text-lk-secondary text-lk-ink-3">
          {t.photos.count(photos.data.length)}
        </p>
      ) : null}
      {!photos.ok ? (
        <InlineAlert tone="danger">{t.loadError}</InlineAlert>
      ) : photos.data.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lk-md border border-dashed border-lk-line p-5">
          <p className="text-lk-body text-lk-ink-2">{t.photos.empty}</p>
          {editable ? (
            <Button asChild variant="secondary">
              <Link href={stepHref}>{t.photos.add}</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.data.map((photo, index) => (
            <li key={photo.id} className="flex flex-col gap-1.5">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lk-md bg-lk-stone-2">
                <Photo
                  src={photoUrl(photo.path, 800)}
                  alt={photoAlt(subject, photo.caption, index, photos.data.length)}
                  sizes="(min-width: 768px) 220px, 50vw"
                />
                {photo.isCover ? (
                  <span className="absolute top-2 left-2 rounded-full bg-lk-ink/80 px-2 py-1 text-lk-micro font-semibold text-white">
                    {t.photos.cover}
                  </span>
                ) : null}
              </div>
              {photo.caption ? (
                <p className="truncate text-lk-caption text-lk-ink-2">{photo.caption}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SheetSection>
  );
}
