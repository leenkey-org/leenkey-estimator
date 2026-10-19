import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import type { PublicListing } from "../queries";
import type { ContactLinks } from "../presentation";
import { Button } from "@/components/shared/button";
import { ContactCard } from "@/components/shared/contact-card";
import { PriceBlock } from "@/components/shared/price-block";
import { fr } from "@/lib/i18n/fr";

const t = fr.listing.actions;

// Contact and visit (SPEC-V2 8.5): the first message to the seller (L1-21),
// about a visit for the second until the visits (L3); without a session,
// the sign-up first, then that message. « Faire une offre » comes with L2;
// the favourite (L1-18) is over the mobile gallery and next to the desktop
// price.

/** Mobile action bar, fixed at the bottom (docs/DESIGN.md 10.3). */
export function ActionBar({ links }: { links: ContactLinks }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-lk-line bg-lk-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3.5 lg:hidden">
      <Button asChild size="lg" className="flex-1">
        <Link href={links.contact} prefetch={false}>
          {t.contact}
        </Link>
      </Button>
      <Button asChild variant="secondary" size="lg" className="w-13 shrink-0 px-0 [&_svg]:size-5">
        <Link href={links.visit} prefetch={false} aria-label={t.visit}>
          <Calendar aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

/** Desktop price column, sticky 96 px from the top (docs/DESIGN.md 10.3, 12.8). */
export function PriceColumn({
  listing,
  links,
  favorite,
}: {
  listing: PublicListing;
  /** null: the preview of the seller before sending (L1-13), buttons inactive. */
  links: ContactLinks | null;
  /** The heart (FavoriteButton), on the right of the price. */
  favorite?: ReactNode;
}) {
  return (
    <div className="sticky top-24 flex flex-col gap-4 rounded-lk-md border border-lk-line bg-lk-surface p-5.5">
      <div className="flex items-start justify-between gap-3">
        <PriceBlock priceCents={listing.priceCents} surfaceM2={listing.surfaceM2} size="lg" />
        {favorite}
      </div>
      <ContactCard
        variant="tile"
        firstName={listing.sellerFirstName}
        accompanied={listing.accompanied}
      />
      {links ? (
        <>
          <Button asChild size="lg">
            <Link href={links.contact} prefetch={false}>
              {t.contact}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={links.visit} prefetch={false}>
              {t.visit}
            </Link>
          </Button>
        </>
      ) : (
        <>
          <Button size="lg" disabled>
            {t.contact}
          </Button>
          <Button variant="secondary" disabled>
            {t.visit}
          </Button>
        </>
      )}
      {links?.signedIn ? null : (
        <p className="text-center text-lk-micro text-lk-ink-3">
          {links ? t.accountRequired : t.inactive}
        </p>
      )}
    </div>
  );
}
