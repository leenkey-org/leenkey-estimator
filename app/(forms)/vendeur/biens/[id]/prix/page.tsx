import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { ComingSoon } from "@/components/shared/coming-soon";
import { CreationHeader } from "@/leenkey/properties/components/creation-header";
import { CreationBody, CreationLoadError } from "@/leenkey/properties/components/creation-page";
import { propertyForCreation } from "@/leenkey/properties/load";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties;

export const metadata: Metadata = {
  title: t.creation.metaTitle(t.creation.steps.price),
};

type Props = { params: Promise<{ id: string }> };

// L1-11: step 3 of 4 comes with L1-13 (price, description, preview, review).
// Until then, the property stays a draft, resumed from « Ma vente ».
export default async function PropertyPricePage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForCreation(id);
  const header = (
    <CreationHeader
      step="price"
      back={{ href: `/vendeur/biens/${id}/caracteristiques`, label: t.creation.previousStep }}
      save={false}
    />
  );
  if (!property) {
    return (
      <>
        {header}
        <CreationLoadError href={`/vendeur/biens/${id}/prix`} />
      </>
    );
  }
  return (
    <>
      {header}
      <CreationBody>
        <ComingSoon
          title={t.nextStep.title}
          text={t.nextStep.text}
          action={
            <Button asChild>
              <Link href="/vendeur">{t.nextStep.action}</Link>
            </Button>
          }
        />
      </CreationBody>
    </>
  );
}
