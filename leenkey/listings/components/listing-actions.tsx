import Link from "next/link";
import { Calendar } from "lucide-react";
import type { PublicListing } from "../queries";
import { Button } from "@/components/shared/button";
import { ContactCard } from "@/components/shared/contact-card";
import { PriceBlock } from "@/components/shared/price-block";
import { fr } from "@/lib/i18n/fr";

const t = fr.listing.actions;

// Contact and visit (SPEC-V2 8.5): a buyer account is needed, so both lead
// to the sign-up with the return to the listing until the messaging (L1-21)
// and the visits (L3) exist. « Faire une offre » comes with L2, the
// favourite with L1-18.

/** Mobile action bar, fixed at the bottom (docs/DESIGN.md 10.3). */
export function ActionBar({ signUpHref }: { signUpHref: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-lk-line bg-lk-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3.5 lg:hidden">
      <Button asChild size="lg" className="flex-1">
        <Link href={signUpHref} prefetch={false}>
          {t.contact}
        </Link>
      </Button>
      <Button asChild variant="secondary" size="lg" className="w-13 shrink-0 px-0 [&_svg]:size-5">
        <Link href={signUpHref} prefetch={false} aria-label={t.visit}>
          <Calendar aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

/** Desktop price column, sticky 96 px from the top (docs/DESIGN.md 10.3, 12.8). */
export function PriceColumn({
  listing,
  signUpHref,
}: {
  listing: PublicListing;
  signUpHref: string;
}) {
  return (
    <div className="sticky top-24 flex flex-col gap-4 rounded-lk-md border border-lk-line bg-lk-surface p-5.5">
      <PriceBlock priceCents={listing.priceCents} surfaceM2={listing.surfaceM2} size="lg" />
      <ContactCard
        variant="tile"
        firstName={listing.sellerFirstName}
        accompanied={listing.accompanied}
      />
      <Button asChild size="lg">
        <Link href={signUpHref} prefetch={false}>
          {t.contact}
        </Link>
      </Button>
      <Button asChild variant="secondary">
        <Link href={signUpHref} prefetch={false}>
          {t.visit}
        </Link>
      </Button>
      <p className="text-center text-lk-micro text-lk-ink-3">{t.accountRequired}</p>
    </div>
  );
}
