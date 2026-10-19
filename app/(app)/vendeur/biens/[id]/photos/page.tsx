import type { Metadata } from "next";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Photo } from "@/components/shared/photo";
import { photoAlt } from "@/leenkey/listings/presentation";
import { editableOnceSent } from "@/leenkey/properties/creation";
import { PhotoUploader } from "@/leenkey/properties/components/photo-uploader";
import { SheetSection } from "@/leenkey/properties/components/sheet-section";
import { propertyForSheet } from "@/leenkey/properties/load";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { sellerPhotos } from "@/leenkey/properties/queries";
import { photosEditable, propertyName } from "@/leenkey/properties/sheet";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.sheet;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await propertyForSheet((await params).id);
  const name = property ? propertyName(property) : fr.properties.creation.title;
  return { title: t.metaTitle(`${t.photos.title} · ${name}`) };
}

// L1-14, tab Photos: the photos in their order, the main one first. They
// change here as at step 2 (PhotoUploader), during the creation and once the
// listing is sent, which stays online (L1-14b); read only once suspended by
// Leenkey or sold.
export default async function PropertyPhotosPage({ params }: Props) {
  const property = await propertyForSheet((await params).id);
  if (!property) return null;
  const photos = await sellerPhotos(property.id);
  const status = property.listingStatus;
  if (photos.ok && photosEditable(status)) {
    return (
      <PhotoUploader
        propertyId={property.id}
        initial={photos.data}
        inSheet
        note={editableOnceSent(status) ? fr.properties.edit.note[status] : undefined}
      />
    );
  }
  const subject = {
    type: property.characteristics.type ?? "autre",
    rooms: property.characteristics.rooms ?? 0,
    city: property.address.city,
  };
  return (
    <SheetSection id="photos" title={t.photos.title}>
      {photos.ok && photos.data.length > 0 ? (
        <p className="-mt-2 text-lk-secondary text-lk-ink-3">
          {t.photos.count(photos.data.length)}
        </p>
      ) : null}
      {!photos.ok ? (
        <InlineAlert tone="danger">{t.loadError}</InlineAlert>
      ) : photos.data.length === 0 ? (
        <div className="rounded-lk-md border border-dashed border-lk-line p-5">
          <p className="text-lk-body text-lk-ink-2">{t.photos.empty}</p>
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
