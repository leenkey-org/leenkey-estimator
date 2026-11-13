import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/shared/button";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { requireProfile } from "@/core/auth/session";
import { FinancingDocumentCard } from "@/leenkey/buyers/components/financing-document-card";
import { buyerProfile } from "@/leenkey/buyers/queries";
import { isUuid } from "@/leenkey/messaging/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { OfferDocumentView } from "@/leenkey/offers/components/offer-document-view";
import { OfferHeader } from "@/leenkey/offers/components/offer-header";
import {
  BuyerStep,
  ConditionsStep,
  DeclarationsStep,
  FinancingStep,
  PriceStep,
  ReviewActions,
  ValidityStep,
} from "@/leenkey/offers/components/offer-steps";
import { firstStepToFill, type OfferContent } from "@/leenkey/offers/content";
import { buildOfferDocument } from "@/leenkey/offers/document";
import {
  offerFormPath,
  offerPath,
  readOfferFormStep,
  type OfferFormStep,
} from "@/leenkey/offers/paths";
import {
  buyerDraft,
  offerAccess,
  offerListing,
  offerPrefill,
  type OfferListing,
} from "@/leenkey/offers/queries";
import { CreationBody } from "@/leenkey/properties/components/creation-page";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { formatSurface } from "@/lib/format";
import { frOffer } from "@/lib/i18n/sections/offer";
import { frPropertyType } from "@/lib/i18n/sections/propertyType";
import { validityDays } from "@/lib/validations/offer";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer, propertyType: frPropertyType } as const;

const t = fr.offer;

export const metadata: Metadata = { title: t.metaTitle };

type Props = { searchParams: Promise<{ listing?: string | string[]; etape?: string | string[] }> };

const EMPTY_IDENTITY = {
  lastName: "",
  firstName: "",
  birthDate: "",
  addressLine: "",
  postalCode: "",
  city: "",
  email: "",
  phone: "",
};
const EMPTY_SCI = { name: "", status: null, siren: "", seatAddress: "", representative: "" };

// L2-03: the offer form in seven steps, then its review (SPEC-V2 13,
// docs/DESIGN.md 13.3). « Faire une offre » of a listing leads here. The
// draft is created by the first step and read again at each step; a step is
// open once those before it are filled. A listing no longer online, or the
// buyer's own: a 404.
export default async function NewOfferPage({ searchParams }: Props) {
  const params = await searchParams;
  const listingId = typeof params.listing === "string" ? params.listing : null;
  if (!isUuid(listingId)) notFound();
  const profile = await requireProfile();
  const [listing, access] = await Promise.all([
    offerListing(listingId),
    offerAccess(profile, listingId),
  ]);
  if (listing.ok && !listing.data) notFound();
  if (!listing.ok || !listing.data || !access.ok) {
    return (
      <Blocked back={ROUTES.buyer} texts={t.blocked.unavailable} href={offerFormPath(listingId)} />
    );
  }
  const listingHref = `${ROUTES.listing}/${listing.data.slug}`;
  if (access.data.state === "closed") notFound();
  if (access.data.state === "undeclared") {
    return <Blocked back={listingHref} texts={t.blocked.undeclared} href={ROUTES.buyerProfile} />;
  }
  if (access.data.state === "accepted") {
    return (
      <Blocked
        back={listingHref}
        texts={t.blocked.accepted}
        href={offerPath(access.data.offerId)}
      />
    );
  }

  const draft = await buyerDraft(profile.id, listingId);
  if (!draft.ok) {
    return (
      <Blocked back={listingHref} texts={t.blocked.unavailable} href={offerFormPath(listingId)} />
    );
  }
  const offer = draft.data;
  const first = firstStepToFill(offer);
  const open: OfferFormStep = first === 8 ? "review" : (first as OfferFormStep);
  const requested = readOfferFormStep(typeof params.etape === "string" ? params.etape : undefined);
  // Without a step named: where the draft stops; the conditions, which have
  // nothing required, are shown before the validity.
  const step: OfferFormStep = requested ?? (open === 6 ? 5 : open);
  if (step === "review" ? open !== "review" : step > first) {
    redirect(offerFormPath(listingId, open));
  }

  const previous = (current: Exclude<OfferFormStep, 1>): { href: string; label: string } => ({
    href: offerFormPath(listingId, current === "review" ? 7 : ((current - 1) as OfferFormStep)),
    label: t.header.previousStep,
  });

  if (step === 1 || !offer) {
    const prefill = offer ? null : await offerPrefill(profile.id);
    return (
      <>
        <OfferHeader step={1} back={{ href: listingHref, label: t.header.backToListing }} />
        <CreationBody>
          <BuyerStep
            listingId={listingId}
            backHref={listingHref}
            note={access.data.inProgress ? t.replaces : undefined}
            initial={
              offer
                ? {
                    identity: offer.buyer,
                    coBuyers: offer.coBuyers,
                    acquisitionMode: offer.acquisitionMode,
                    acquisitionModeOther: offer.acquisitionModeOther,
                    sci: offer.sci ?? EMPTY_SCI,
                  }
                : {
                    identity: { ...EMPTY_IDENTITY, ...prefill?.identity },
                    coBuyers: [],
                    acquisitionMode: "own_name",
                    acquisitionModeOther: "",
                    sci: EMPTY_SCI,
                  }
            }
          />
        </CreationBody>
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <OfferHeader step={2} back={previous(2)} />
        <CreationBody>
          <PropertyStep listing={listing.data} listingId={listingId} />
        </CreationBody>
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <OfferHeader step={3} back={previous(3)} />
        <CreationBody>
          <PriceStep
            listingId={listingId}
            initialEuros={offer.priceCents === null ? null : offer.priceCents / 100}
            askingCents={listing.data.askingPriceCents}
          />
        </CreationBody>
      </>
    );
  }

  if (step === 4) {
    const [prefill, buyer] = await Promise.all([
      offer.financingMode === null ? offerPrefill(profile.id) : null,
      buyerProfile(profile.id),
    ]);
    const project = buyer.ok ? buyer.data : null;
    return (
      <>
        <OfferHeader step={4} back={previous(4)} />
        <CreationBody>
          <FinancingStep
            listingId={listingId}
            priceCents={offer.priceCents}
            isNewBuild={listing.data.isNewBuild}
            initial={
              prefill
                ? {
                    // The project declared on the profile, to confirm here.
                    mode:
                      prefill.loanNeeded === null ? null : prefill.loanNeeded ? "loan" : "no_loan",
                    downPaymentEuros: prefill.downPaymentEuros,
                    loanAmountEuros: prefill.loanAmountEuros,
                    loanDurationYears: null,
                    loanRateMaxPct: null,
                    lenderName: "",
                    progress: null,
                    progressOther: "",
                  }
                : {
                    mode: offer.financingMode,
                    downPaymentEuros:
                      offer.financingMode === "loan" ? offer.downPaymentCents / 100 : null,
                    loanAmountEuros:
                      offer.financingMode === "loan" ? offer.loanAmountCents / 100 : null,
                    loanDurationYears: offer.loanDurationYears,
                    loanRateMaxPct: offer.loanRateMaxPct,
                    lenderName: offer.lenderName,
                    progress: offer.financingProgress,
                    progressOther: offer.financingProgressOther,
                  }
            }
          >
            {/* The proof of the profile (L2-02): the offer takes the one in force when it is sent. */}
            {project ? (
              <FinancingDocumentCard
                initial={project.financingDocument}
                checkedAt={project.financingCheckedAt}
                declared={project.financingStatus !== "not_provided"}
              />
            ) : null}
          </FinancingStep>
        </CreationBody>
      </>
    );
  }

  if (step === 5) {
    // Reached once the financing is said (step 4).
    if (offer.financingMode === null) redirect(offerFormPath(listingId, 4));
    return (
      <>
        <OfferHeader step={5} back={previous(5)} />
        <CreationBody>
          <ConditionsStep
            listingId={listingId}
            financingMode={offer.financingMode}
            initial={{
              priorSale: offer.conditionPriorSale,
              authorization: offer.conditionAuthorization,
              other: offer.conditionOther,
              details: offer.conditionsDetails,
            }}
          />
        </CreationBody>
      </>
    );
  }

  if (step === 6) {
    const now = new Date();
    return (
      <>
        <OfferHeader step={6} back={previous(6)} />
        <CreationBody>
          <ValidityStep
            listingId={listingId}
            initialDays={validityDays(offer.validityUntil, now)}
            now={now.toISOString()}
          />
        </CreationBody>
      </>
    );
  }

  if (step === 7) {
    return (
      <>
        <OfferHeader step={7} back={previous(7)} />
        <CreationBody>
          <DeclarationsStep
            listingId={listingId}
            initial={{
              visited: offer.visited,
              accuracy: offer.declarations.accuracy,
              priceAndFinancingChecked: offer.declarations.priceAndFinancingChecked,
              legalEffectsUnderstood: offer.declarations.legalEffectsUnderstood,
              infoRead: offer.declarations.infoRead,
            }}
          />
        </CreationBody>
      </>
    );
  }

  return (
    <>
      <OfferHeader step="review" back={previous("review")} />
      <CreationBody>
        <Review offer={offer} listing={listing.data} />
      </CreationBody>
    </>
  );
}

/** Step 2: the property, read from the listing, nothing to type (DESIGN 13.3). */
function PropertyStep({ listing, listingId }: { listing: OfferListing; listingId: string }) {
  const labels = t.property;
  const rows: [string, string][] = [
    [labels.address, `${listing.postalCode} ${listing.city}`.trim()],
    [labels.type, fr.propertyType[listing.type]],
    [labels.surface, formatSurface(listing.surfaceM2)],
    [
      labels.annexes,
      listing.annexes.length > 0
        ? listing.annexes.map((annex) => labels.annex[annex]).join(", ")
        : labels.noAnnex,
    ],
    [labels.reference, listing.listingReference],
  ];
  return (
    <>
      <div className="flex flex-col gap-5">
        <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">{labels.title}</h2>
        <div className="flex flex-col gap-4 rounded-lk-md bg-lk-stone-2 p-4">
          <div className="flex items-center gap-3">
            <PropertyThumb
              src={listing.coverPath ? photoUrl(listing.coverPath, 400) : null}
              className="h-16 w-18 bg-lk-surface"
            />
            <p className="min-w-0 text-lk-body font-semibold text-pretty text-lk-ink">
              {listing.title}
            </p>
          </div>
          <dl className="flex flex-col gap-2 text-lk-secondary">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4">
                <dt className="text-lk-ink-2">{label}</dt>
                <dd className="text-right font-semibold text-lk-ink tabular">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-lk-caption text-lk-ink-3">{labels.note}</p>
        </div>
      </div>
      <FormActionBar className="md:mt-3">
        <Button asChild variant="secondary">
          <Link href={offerFormPath(listingId, 1)}>{t.previous}</Link>
        </Button>
        <Button asChild>
          <Link href={offerFormPath(listingId, 3)}>{t.next}</Link>
        </Button>
      </FormActionBar>
    </>
  );
}

/** The document as the seller will receive it, then « Envoyer mon offre au vendeur ». */
function Review({ offer, listing }: { offer: OfferContent; listing: OfferListing }) {
  const labels = t.review;
  return (
    <>
      <div className="flex flex-col gap-5">
        <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">{labels.title}</h2>
        <p className="text-lk-secondary text-pretty text-lk-ink-2">{labels.intro}</p>
        <OfferDocumentView document={buildOfferDocument(offer, listing)} />
      </div>
      <ReviewActions offerId={offer.id} listingId={offer.listingId} />
    </>
  );
}

/** What stops an offer before the form: why, and where to go. */
function Blocked({
  back,
  texts,
  href,
}: {
  back: string;
  texts: { title: string; text: string; action: string };
  href: string;
}) {
  return (
    <>
      <OfferHeader step={1} back={{ href: back, label: t.header.backToListing }} />
      <CreationBody>
        <div className="flex flex-col items-start gap-4">
          <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">{texts.title}</h2>
          <p className="text-lk-body text-pretty text-lk-ink-2">{texts.text}</p>
          <Button asChild>
            <Link href={href}>{texts.action}</Link>
          </Button>
        </div>
      </CreationBody>
    </>
  );
}
