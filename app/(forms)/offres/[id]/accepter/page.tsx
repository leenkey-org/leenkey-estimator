import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { KeyFactsTable } from "@/components/shared/key-facts-table";
import { isUuid } from "@/leenkey/messaging/queries";
import { OfferAcceptForm } from "@/leenkey/offers/components/offer-seller-actions";
import { formatNumericDateTime, fullName } from "@/leenkey/offers/document";
import { offerPath } from "@/leenkey/offers/paths";
import { advisorLink, sellerOffer } from "@/leenkey/offers/seller";
import { CreationBody } from "@/leenkey/properties/components/creation-page";
import { formatPrice } from "@/lib/format";
import { frOffer } from "@/lib/i18n/sections/offer";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.seller.acceptScreen;

export const metadata: Metadata = { title: t.metaTitle };

type Props = { params: Promise<{ id: string }> };

// L2-04a: the acceptance screen of a seller (SPEC-V2 13, docs/DESIGN.md
// 13.3): a full screen, never a dialog, never an acceptance in one click.
// The recap, the warning of Cédric word for word, the box to tick, then
// « Confirmer mon acceptation ». An offer that no longer waits (expired,
// withdrawn, replaced, answered) goes back to its page, which says so.
export default async function OfferAcceptPage({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const found = await sellerOffer(id);
  if (found.ok && !found.data) notFound();
  if (!found.ok || !found.data) redirect(offerPath(id));
  const { offer } = found.data;
  if (offer.status !== "submitted" && offer.status !== "viewed") redirect(offerPath(id));
  const advisor = await advisorLink(found.data.propertyId);
  const buyers = [offer.buyer, ...offer.coBuyers].map(fullName).join(", ");
  return (
    <>
      <AppHeader
        title={t.header}
        titleAs="p"
        back={
          <Link
            href={offerPath(id)}
            aria-label={t.back}
            className={cn(
              iconButtonVariants({ variant: "stone" }),
              "inline-flex items-center justify-center",
            )}
          >
            <ChevronLeft aria-hidden="true" />
          </Link>
        }
      />
      <CreationBody>
        <div className="flex flex-col gap-5">
          <h1 className="text-lk-h2 font-bold text-wide text-pretty text-lk-ink">{t.title}</h1>
          <KeyFactsTable
            items={[
              { label: t.price, value: formatPrice(offer.priceCents ?? 0) },
              { label: t.buyer, value: buyers },
              {
                label: t.financing,
                value:
                  offer.financingMode === "loan"
                    ? offer.downPaymentCents > 0
                      ? t.financingLabels.loanAndDownPayment
                      : t.financingLabels.loan
                    : t.financingLabels.noLoan,
              },
              {
                label: t.validity,
                value: offer.validityUntil
                  ? t.until(formatNumericDateTime(offer.validityUntil))
                  : "",
              },
            ]}
          />
          {/* Part of the page, not news: read with it. */}
          <InlineAlert
            tone="warning"
            live={false}
            action={
              <Link
                href={advisor.href}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {advisor.advisor ? t.advisor : t.plans}
              </Link>
            }
          >
            {t.warning.join(" ")}
          </InlineAlert>
          <OfferAcceptForm offerId={offer.id} />
        </div>
      </CreationBody>
    </>
  );
}
