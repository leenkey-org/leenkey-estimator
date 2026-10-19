import type { Metadata } from "next";
import { CharacteristicsStep } from "@/leenkey/properties/components/characteristics-step";
import { CreationBody, CreationLoadError } from "@/leenkey/properties/components/creation-page";
import { EditHeader } from "@/leenkey/properties/components/edit-header";
import { propertyForEdit } from "@/leenkey/properties/load";
import { savedHref, sheetHref } from "@/leenkey/properties/sheet";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.edit;

export const metadata: Metadata = { title: t.metaTitle(t.parts.characteristics) };

type Props = { params: Promise<{ id: string }> };

// L1-14b: the characteristics of a listing sent for review, online or
// paused, changed from the page of its property, which it stays as. Its
// photos change in their tab, its address no longer changes.
export default async function EditCharacteristicsPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForEdit(id, "caracteristiques");
  const back = sheetHref(id);
  return (
    <>
      <EditHeader backHref={back} />
      {property ? (
        <CreationBody>
          <CharacteristicsStep
            propertyId={property.id}
            initial={property.characteristics}
            photos={[]}
            note={t.note[property.listingStatus]}
            edit={{ cancelHref: back, doneHref: savedHref(id) }}
          />
        </CreationBody>
      ) : (
        <CreationLoadError href={`${back}/modifier/caracteristiques`} />
      )}
    </>
  );
}
