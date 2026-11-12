import type { Metadata } from "next";
import { CharacteristicsStep } from "@/leenkey/properties/components/characteristics-step";
import { CreationHeader } from "@/leenkey/properties/components/creation-header";
import { CreationBody, CreationLoadError } from "@/leenkey/properties/components/creation-page";
import { getDpeSettings } from "@/leenkey/properties/dpe-rules";
import { propertyForCreation } from "@/leenkey/properties/load";
import { sellerPhotos } from "@/leenkey/properties/queries";
import { formatDate } from "@/lib/format";
import { frProperties } from "@/lib/i18n/sections/properties";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { properties: frProperties } as const;

const t = fr.properties.creation;

export const metadata: Metadata = { title: t.metaTitle(t.steps.characteristics) };

type Props = { params: Promise<{ id: string }> };

// L1-11, step 2 of 4: the characteristics and the photos (docs/DESIGN.md
// 12.2, L1-12). The back button saves the step, then goes to the address.
export default async function PropertyCharacteristicsPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForCreation(id);
  const [photos, dpe] = property
    ? await Promise.all([sellerPhotos(property.id), getDpeSettings()])
    : [null, null];
  if (!property || !photos?.ok || !dpe) {
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
          dpe={dpe}
          note={
            property.fromEstimation
              ? fr.properties.fromEstimation(formatDate(property.fromEstimation))
              : undefined
          }
        />
      </CreationBody>
    </>
  );
}
