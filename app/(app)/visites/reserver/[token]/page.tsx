import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { IdentityDocumentCard } from "@/leenkey/buyers/components/identity-document-card";
import { buyerIdentity } from "@/leenkey/buyers/identity";
import { identityDeposited } from "@/leenkey/buyers/identity-status";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { BookingForm } from "@/leenkey/visits/components/booking-form";
import { groupByDay, visitRange } from "@/leenkey/visits/dates";
import { invitationForBooking } from "@/leenkey/visits/queries";
import { formatDate } from "@/lib/format";
import { frIdentityDocument } from "@/lib/i18n/sections/identityDocument";
import { frVisits } from "@/lib/i18n/sections/visits";
import { SpacePage } from "../../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { identityDocument: frIdentityDocument, visits: frVisits } as const;

const t = fr.visits.booking;

// The token of an invitation is in the address: never in a referrer, never indexed.
export const metadata: Metadata = {
  title: t.metaTitle,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }> };

// L3-02: « Réserver une visite » (SPEC-V2 14, docs/DESIGN.md 13.1, G5 short).
// The link of an invitation: its token, its expiry and the account are
// checked (an account that is not the invited buyer finds nothing), then the
// free slots grouped by day. The exact address comes with the confirmation.
// A buyer who has not deposited an identity document (DECISIONS.md
// 2026-11-23) deposits it here first, then chooses a slot: visit_book refuses
// the booking otherwise; the check of the team is never waited for.
export default async function BookVisitPage({ params }: Props) {
  const [{ token }, profile] = await Promise.all([params, requireProfile()]);
  const [result, identity] = await Promise.all([
    invitationForBooking(token, profile.id),
    buyerIdentity(profile.id),
  ]);
  const page = (children: React.ReactNode) => (
    <SpacePage title={t.title} roles={profile.roles} profileId={profile.id}>
      {children}
    </SpacePage>
  );
  if (!result.ok || !identity.ok) {
    return page(
      <InlineAlert tone="danger" className="mt-6">
        {t.loadError}
      </InlineAlert>,
    );
  }
  if (result.data === "none" || result.data === "offline") {
    const state = t[result.data];
    return page(
      <EmptyState
        className="mt-12"
        title={state.title}
        description={state.text}
        action={
          <Button asChild variant="secondary">
            <Link href={ROUTES.messages}>{t.writeToSeller}</Link>
          </Button>
        }
      />,
    );
  }
  const invitation = result.data;
  const now = new Date();
  const groups = groupByDay(invitation.slots, now).map((group) => ({
    day: group.day,
    label: group.label,
    slots: group.items.map((slot) => ({
      id: slot.id,
      range: visitRange(slot.startsAt, slot.endsAt),
    })),
  }));
  return page(
    <div className="mt-4 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        {invitation.listing ? (
          <p className="text-lk-body font-semibold text-lk-ink">
            {t.about(invitation.listing.title, invitation.listing.city)}
          </p>
        ) : null}
        <p className="text-lk-secondary text-pretty text-lk-ink-2">{t.intro}</p>
        <p className="text-lk-caption text-lk-ink-3">
          {t.validUntil(formatDate(invitation.expiresAt, now))}
        </p>
      </div>
      {invitation.bookedVisitId ? (
        <InlineAlert
          tone="info"
          action={
            <Link
              href={`/visites/${invitation.bookedVisitId}`}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              {t.already.action}
            </Link>
          }
        >
          {t.already.text}
        </InlineAlert>
      ) : groups.length === 0 ? (
        <InlineAlert
          tone="info"
          action={
            <Link
              href={ROUTES.messages}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              {t.writeToSeller}
            </Link>
          }
        >
          {t.empty}
        </InlineAlert>
      ) : !identityDeposited(identity.data.status) ? (
        <div className="flex flex-col gap-6">
          <InlineAlert tone="info">
            {[
              fr.identityDocument.booking.required,
              fr.identityDocument.booking.slots(invitation.slots.length),
            ]
              .filter(Boolean)
              .join(" ")}
          </InlineAlert>
          <IdentityDocumentCard initial={identity.data} />
        </div>
      ) : (
        <BookingForm token={token} groups={groups} />
      )}
    </div>,
  );
}
