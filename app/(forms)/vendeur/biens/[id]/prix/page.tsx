import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreationHeader } from "@/leenkey/properties/components/creation-header";
import { CreationBody, CreationLoadError } from "@/leenkey/properties/components/creation-page";
import { PriceStep } from "@/leenkey/properties/components/price-step";
import { suggestedTitle } from "@/leenkey/properties/creation";
import { propertyForCreation } from "@/leenkey/properties/load";
import { valuationOf } from "@/leenkey/properties/valuation";
import { fr } from "@/lib/i18n/fr";
import { missingCharacteristics } from "@/lib/validations/property";

const t = fr.properties;

export const metadata: Metadata = {
  title: t.creation.metaTitle(t.creation.steps.price),
};

type Props = { params: Promise<{ id: string }> };

// L1-13, step 3 of 4: price, title and description (SPEC-V2 8.3). The
// characteristics come first: without them, back to step 2.
export default async function PropertyPricePage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForCreation(id);
  if (!property) {
    return (
      <>
        <CreationHeader
          step="price"
          back={{ href: `/vendeur/biens/${id}/caracteristiques`, label: t.creation.previousStep }}
          save={false}
        />
        <CreationLoadError href={`/vendeur/biens/${id}/prix`} />
      </>
    );
  }
  if (missingCharacteristics(property.characteristics).length > 0) {
    redirect(`/vendeur/biens/${id}/caracteristiques`);
  }
  const { listing } = property;
  return (
    <>
      <CreationHeader step="price" back="previous" />
      <CreationBody>
        <PriceStep
          propertyId={property.id}
          initial={{
            priceEuros: listing ? Math.round(listing.priceCents / 100) : null,
            title:
              listing?.title ?? suggestedTitle(property.characteristics, property.address.city),
            description: listing?.description ?? "",
          }}
          saved={listing !== null}
          valuation={valuationOf(property.estimation)}
        />
      </CreationBody>
    </>
  );
}
