import type { Metadata } from "next";
import { CreationBody, CreationLoadError } from "@/leenkey/properties/components/creation-page";
import { EditHeader } from "@/leenkey/properties/components/edit-header";
import { PriceStep } from "@/leenkey/properties/components/price-step";
import { propertyForEdit } from "@/leenkey/properties/load";
import { savedHref, sheetHref } from "@/leenkey/properties/sheet";
import { valuationOf } from "@/leenkey/properties/valuation";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.edit;

export const metadata: Metadata = { title: t.metaTitle(t.parts.listing) };

type Props = { params: Promise<{ id: string }> };

// L1-14b: the price, title and description of a listing sent for review,
// online or paused, changed from the page of its property, which it stays
// as; the reminder of the analysis of value as at step 3.
export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForEdit(id, "prix");
  const back = sheetHref(id, "annonce");
  // Sent: its listing exists (listing_submit).
  const listing = property?.listing;
  return (
    <>
      <EditHeader backHref={back} />
      {property && listing ? (
        <CreationBody>
          <PriceStep
            propertyId={property.id}
            initial={{
              priceEuros: Math.round(listing.priceCents / 100),
              title: listing.title,
              description: listing.description,
            }}
            saved
            valuation={valuationOf(property.estimation)}
            note={t.note[property.listingStatus]}
            edit={{ cancelHref: back, doneHref: savedHref(id, "annonce") }}
          />
        </CreationBody>
      ) : (
        <CreationLoadError href={`${sheetHref(id)}/modifier/annonce`} />
      )}
    </>
  );
}
