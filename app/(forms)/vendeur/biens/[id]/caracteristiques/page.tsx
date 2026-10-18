import type { Metadata } from "next";
import { CharacteristicsStep } from "@/leenkey/properties/components/characteristics-step";
import { CreationHeader } from "@/leenkey/properties/components/creation-header";
import { CreationBody, CreationLoadError } from "@/leenkey/properties/components/creation-page";
import { propertyForCreation } from "@/leenkey/properties/load";
import { sellerPhotos } from "@/leenkey/properties/queries";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.creation;

export const metadata: Metadata = { title: t.metaTitle(t.steps.characteristics) };

type Props = { params: Promise<{ id: string }> };

// L1-11, step 2 of 4: the characteristics and the photos (docs/DESIGN.md
// 12.2, L1-12). The back button saves the step, then goes to the address.
export default async function PropertyCharacteristicsPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForCreation(id);
  const photos = property ? await sellerPhotos(property.id) : null;
  if (!property || !photos?.ok) {
    return (
      <>
        <CreationHeader
          step="characteristics"
          back={{ href: "/vendeur", label: t.leave }}
          save={false}
        />
        <CreationLoadError href={`/vendeur/biens/${id}/caracteristiques`} />
      </>
    );
  }
  return (
    <>
      <CreationHeader step="characteristics" back="previous" />
      <CreationBody>
        <CharacteristicsStep
          propertyId={property.id}
          initial={property.characteristics}
          photos={photos.data}
        />
      </CreationBody>
    </>
  );
}
