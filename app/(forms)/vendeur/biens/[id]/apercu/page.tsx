import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PriceColumn } from "@/leenkey/listings/components/listing-actions";
import { ListingBody } from "@/leenkey/listings/components/listing-body";
import { CreationHeader } from "@/leenkey/properties/components/creation-header";
import { CreationLoadError } from "@/leenkey/properties/components/creation-page";
import { SubmitListing } from "@/leenkey/properties/components/submit-listing";
import { creationStep } from "@/leenkey/properties/creation";
import { propertyForCreation } from "@/leenkey/properties/load";
import { sellerListingPreview } from "@/leenkey/properties/preview";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties;

export const metadata: Metadata = {
  title: t.creation.metaTitle(t.creation.steps.preview),
};

type Props = { params: Promise<{ id: string }> };

// L1-13, step 4 of 4 (SPEC-V2 8.3, docs/DESIGN.md 13 « aperçu = page annonce
// réelle dans un cadre bordé »): the listing as its page will show it, in a
// frame, with the contact buttons inactive; then « Envoyer en validation ».
// Without its price or its description, back to the step that asks for it.
// A listing refused by Leenkey shows the motive of the refusal above it.
export default async function PropertyPreviewPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForCreation(id);
  const header = (
    <CreationHeader
      step="preview"
      back={{ href: `/vendeur/biens/${id}/prix`, label: t.creation.previousStep }}
      save={false}
    />
  );
  const preview = property ? await sellerListingPreview(property.id) : null;
  if (!property || !preview?.ok || (preview.data === null && property.listing !== null)) {
    return (
      <>
        {header}
        <CreationLoadError href={`/vendeur/biens/${id}/apercu`} />
      </>
    );
  }
  const step = creationStep(property.characteristics, property.listing);
  if (step !== "apercu" || !preview.data) redirect(`/vendeur/biens/${id}/${step}`);
  const listing = preview.data;
  return (
    <>
      {header}
      <div className="flex flex-1 flex-col">
        <div className="lk-frame flex flex-col gap-1.5 pt-6 md:pt-10">
          <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.preview.title}</h2>
          <p className="max-w-lk-prose text-lk-secondary text-lk-ink-2">{t.preview.lead}</p>
          {property.listing?.status === "rejected" ? (
            <InlineAlert tone="warning" live={false} className="mt-3 max-w-lk-prose">
              <span className="block font-semibold">{t.preview.rejected}</span>
              {property.listing.rejectionReason ? (
                <span className="block whitespace-pre-line">
                  {property.listing.rejectionReason}
                </span>
              ) : null}
              <span className="block">{t.preview.rejectedNext}</span>
            </InlineAlert>
          ) : null}
        </div>
        <div className="mx-auto mt-5 w-full max-w-lk-frame md:lk-gutter">
          <ListingBody
            listing={listing}
            level={3}
            aside={<PriceColumn listing={listing} links={null} />}
            className="border-y border-lk-line bg-lk-surface pb-6 md:overflow-hidden md:rounded-lk-md md:border lg:px-8 lg:pb-8"
          />
        </div>
        <SubmitListing propertyId={property.id} />
      </div>
    </>
  );
}
