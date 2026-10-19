import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InfoNote } from "@/components/shared/info-note";
import { KeyFactsTable } from "@/components/shared/key-facts-table";
import { inCreation } from "@/leenkey/properties/creation";
import { SheetSection } from "@/leenkey/properties/components/sheet-section";
import { propertyForSheet } from "@/leenkey/properties/load";
import { propertyName, sellerFacts } from "@/leenkey/properties/sheet";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.sheet;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await propertyForSheet((await params).id);
  return { title: t.metaTitle(property ? propertyName(property) : fr.properties.creation.title) };
}

// L1-14, tab Infos: the private address and the characteristics. A draft
// or a rejected listing changes through the steps of the creation.
export default async function PropertyInfosPage({ params }: Props) {
  const property = await propertyForSheet((await params).id);
  if (!property) return null;
  const editable = inCreation(property.listingStatus);
  const facts = sellerFacts(property);
  const edit = (href: string, label: string) =>
    editable ? (
      <Button asChild variant="ghost" size="sm">
        <Link href={href} aria-label={label}>
          {t.infos.edit}
        </Link>
      </Button>
    ) : null;
  return (
    <div className="flex flex-col gap-8">
      <SheetSection
        id="adresse"
        title={t.infos.address}
        action={edit(`/vendeur/biens/${property.id}/adresse`, t.infos.editAddress)}
      >
        <p className="text-lk-body text-lk-ink">
          {property.address.line}
          <br />
          {property.address.postalCode} {property.address.city}
        </p>
        <InfoNote>{t.infos.addressNote}</InfoNote>
      </SheetSection>
      <SheetSection
        id="caracteristiques"
        title={t.infos.characteristics}
        action={edit(`/vendeur/biens/${property.id}/caracteristiques`, t.infos.editCharacteristics)}
      >
        {facts ? (
          <KeyFactsTable items={facts} />
        ) : (
          <p className="text-lk-body text-lk-ink-2">{fr.properties.list.untitled}</p>
        )}
      </SheetSection>
    </div>
  );
}
