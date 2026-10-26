import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/shared/button";
import { EndOfFlow } from "@/components/shared/end-of-flow";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { StatusBadge } from "@/components/shared/status-badge";
import { inCreation } from "@/leenkey/properties/creation";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { sellerProperty } from "@/leenkey/properties/queries";
import { sheetHref } from "@/leenkey/properties/sheet";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.sent;

export const metadata: Metadata = { title: t.metaTitle };

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// End of the creation (SPEC-V2 8.3, docs/DESIGN.md G8): « C'est envoyé. »
// on the blue flat, then, from 768 px, the listing sent under it. Only while
// the listing waits for the review: a draft goes back to its preview, a
// listing already reviewed to its page (L1-14).
export default async function PropertySentPage({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const result = await sellerProperty(id);
  if (result.ok && !result.data) notFound();
  const property = result.ok ? result.data : null;
  if (property && inCreation(property.listingStatus)) redirect(`/vendeur/biens/${id}/apercu`);
  if (property && property.listingStatus !== "pending") redirect(sheetHref(id));
  const listing = property?.listing ?? null;

  return (
    <>
      <EndOfFlow
        title={t.title}
        text={t.text}
        action={
          <Button asChild variant="inverse" size="lg">
            <Link href="/vendeur">{t.action}</Link>
          </Button>
        }
      />
      {property && listing ? (
        <section
          aria-labelledby="annonce-envoyee"
          className="lk-frame hidden flex-col gap-3 py-10 md:flex"
        >
          <h2 id="annonce-envoyee" className="text-lk-h3 font-semibold text-lk-ink">
            {t.recap}
          </h2>
          <div className="flex max-w-lk-form items-center gap-4 rounded-lk-md border border-lk-line bg-lk-surface p-4">
            <PropertyThumb
              src={property.coverPath ? photoUrl(property.coverPath) : null}
              className="size-14"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-lk-compact font-semibold text-lk-ink">{listing.title}</p>
              <p className="text-lk-caption text-lk-ink-3">
                {listing.reference} · {formatPrice(listing.priceCents)}
              </p>
            </div>
            <StatusBadge status="pending" />
          </div>
        </section>
      ) : null}
    </>
  );
}
