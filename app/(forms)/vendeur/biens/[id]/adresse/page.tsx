import type { Metadata } from "next";
import { AddressStep } from "@/leenkey/properties/components/address-step";
import { CreationHeader } from "@/leenkey/properties/components/creation-header";
import { CreationBody, CreationLoadError } from "@/leenkey/properties/components/creation-page";
import { propertyForCreation } from "@/leenkey/properties/load";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.creation;

export const metadata: Metadata = { title: t.metaTitle(t.steps.address) };

type Props = { params: Promise<{ id: string }> };

// L1-11, step 1 of 4 for a draft: its address, to change.
export default async function PropertyAddressPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForCreation(id);
  const header = <CreationHeader step="address" back={{ href: "/vendeur", label: t.leave }} />;
  if (!property) {
    return (
      <>
        {header}
        <CreationLoadError href={`/vendeur/biens/${id}/adresse`} />
      </>
    );
  }
  const { line, postalCode, city } = property.address;
  return (
    <>
      {header}
      <CreationBody>
        <AddressStep propertyId={property.id} initial={`${line} ${postalCode} ${city}`} />
      </CreationBody>
    </>
  );
}
