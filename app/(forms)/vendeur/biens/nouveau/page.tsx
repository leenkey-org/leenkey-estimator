import type { Metadata } from "next";
import { AddressStep } from "@/leenkey/properties/components/address-step";
import { CreationHeader } from "@/leenkey/properties/components/creation-header";
import { CreationBody } from "@/leenkey/properties/components/creation-page";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.creation;

export const metadata: Metadata = { title: t.metaTitle };

// L1-11, step 1 of 4: the address of a new property (SPEC-V2 section 8.3).
// The property is saved as a draft with « Continuer » or « Enregistrer ».
export default function NewPropertyPage() {
  return (
    <>
      <CreationHeader step="address" back={{ href: "/vendeur", label: t.leave }} />
      <CreationBody>
        <AddressStep />
      </CreationBody>
    </>
  );
}
