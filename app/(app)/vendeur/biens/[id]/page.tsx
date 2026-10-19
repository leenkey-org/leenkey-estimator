import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InfoNote } from "@/components/shared/info-note";
import { KeyFactsTable } from "@/components/shared/key-facts-table";
import { editableOnceSent } from "@/leenkey/properties/creation";
import { SavedNotice } from "@/leenkey/properties/components/saved-notice";
import { SheetSection } from "@/leenkey/properties/components/sheet-section";
import { propertyForSheet } from "@/leenkey/properties/load";
import { editHref, propertyName, sellerFacts } from "@/leenkey/properties/sheet";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.sheet;
const edits = fr.properties.edit;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modifie?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await propertyForSheet((await params).id);
  return { title: t.metaTitle(property ? propertyName(property) : fr.properties.creation.title) };
}

// L1-14, tab Infos: the private address and the characteristics. A draft
// or a rejected listing changes through the steps of the creation; once
// sent, its characteristics change from here (L1-14b), its address no longer.
export default async function PropertyInfosPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const property = await propertyForSheet(id);
  if (!property) return null;
  const status = property.listingStatus;
  const facts = sellerFacts(property);
  const edit = (href: string | null, label: string) =>
    href ? (
      <Button asChild variant="ghost" size="sm">
        <Link href={href} aria-label={label}>
          {t.infos.edit}
        </Link>
      </Button>
    ) : null;
  return (
    <div className="flex flex-col gap-8">
      {query.modifie === "1" && editableOnceSent(status) ? (
        <SavedNotice text={edits.saved[status]} />
      ) : null}
      <SheetSection
        id="adresse"
        title={t.infos.address}
        action={edit(editHref(property, "address"), t.infos.editAddress)}
      >
        <p className="text-lk-body text-lk-ink">
          {property.address.line}
          <br />
          {property.address.postalCode} {property.address.city}
        </p>
        <InfoNote>
          <p>{t.infos.addressNote}</p>
          {/* While the rest changes; suspended or sold, nothing does. */}
          {editableOnceSent(status) ? (
            <p>
              {edits.addressLocked}{" "}
              <a
                href={`mailto:${fr.legal.contactEmail}`}
                className="font-semibold underline underline-offset-2"
              >
                {fr.legal.contactEmail}
              </a>
              .
            </p>
          ) : null}
        </InfoNote>
      </SheetSection>
      <SheetSection
        id="caracteristiques"
        title={t.infos.characteristics}
        action={edit(editHref(property, "characteristics"), t.infos.editCharacteristics)}
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
