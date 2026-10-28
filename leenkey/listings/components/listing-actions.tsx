import Link from "next/link";
import { Calendar } from "lucide-react";
import type { PublicListing } from "../queries";
import type { ContactLinks } from "../presentation";
import { Button } from "@/components/shared/button";
import { PriceBlock } from "@/components/shared/price-block";
import { fr } from "@/lib/i18n/fr";

const t = fr.listing.actions;

// Contact and visit (SPEC-V2 8.5): the first message to the seller (L1-21),
// about a visit for the second until the visits (L3); without a session,
// the sign-up first, then that message. « Faire une offre » comes with L2;
// the favourite (L1-18) is over the mobile gallery and next to the desktop
// price.

/**
 * Mobile action bar, fixed at the bottom (docs/DESIGN.md 10.3), in the way of
 * Airbnb since L1-60: the price and its price per m² on the left, the visit
 * and « Contacter » on the right.
 */
export function ActionBar({
  links,
  priceCents,
  surfaceM2,
}: {
  links: ContactLinks;
  priceCents: number;
  surfaceM2: number | null;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-lk-line bg-lk-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
      <PriceBlock
        priceCents={priceCents}
        surfaceM2={surfaceM2}
        size="sm"
        className="mr-auto min-w-0"
      />
      <Button asChild variant="secondary" size="lg" className="w-12 shrink-0 px-0 [&_svg]:size-5">
        <Link href={links.visit} prefetch={false} aria-label={t.visit}>
          <Calendar aria-hidden="true" />
        </Link>
      </Button>
      <Button asChild variant="cta" size="lg" className="shrink-0 px-6">
        <Link href={links.contact} prefetch={false} aria-label={t.contact}>
          {t.contactShort}
        </Link>
      </Button>
    </div>
  );
}

/**
 * Desktop price column, sticky 96 px from the top (docs/DESIGN.md 10.3,
 * 12.8), the booking card of Airbnb since L1-60: the price, the two actions
 * (« Contacter le vendeur » in the gradient), what an account is for. The
 * seller and the heart are beside the title now.
 */
export function PriceColumn({
  listing,
  links,
}: {
  listing: PublicListing;
  /** null: the preview of the seller before sending (L1-13), buttons inactive. */
  links: ContactLinks | null;
}) {
  return (
    <div className="sticky top-24 flex flex-col gap-4 rounded-lk-3xl border border-lk-line bg-lk-surface p-6 shadow-lk-d-block">
      <PriceBlock priceCents={listing.priceCents} surfaceM2={listing.surfaceM2} size="lg" />
      {links ? (
        <>
          <Button asChild variant="cta" size="lg" className="mt-1">
            <Link href={links.contact} prefetch={false}>
              {t.contact}
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={links.visit} prefetch={false}>
              {t.visit}
            </Link>
          </Button>
        </>
      ) : (
        <>
          <Button variant="cta" size="lg" disabled className="mt-1">
            {t.contact}
          </Button>
          <Button variant="secondary" size="lg" disabled>
            {t.visit}
          </Button>
        </>
      )}
      {links?.signedIn ? null : (
        <p className="text-center text-lk-caption text-lk-ink-3">
          {links ? t.accountRequired : t.inactive}
        </p>
      )}
    </div>
  );
}
