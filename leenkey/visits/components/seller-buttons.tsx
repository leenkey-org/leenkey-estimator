"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { frVisits } from "@/lib/i18n/sections/visits";
import {
  inviteToVisit,
  removeVisitSlot,
  type InviteResult,
  type RemoveSlotResult,
} from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.seller;

/** « Retirer » a free slot of the tab « Visites ». */
export function RemoveSlotButton({
  propertyId,
  slotId,
  label,
}: {
  propertyId: string;
  slotId: string;
  /** « samedi 21 novembre à 10 h 30 », for the name of the button. */
  label: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        loading={pending}
        aria-label={t.slots.removeAbout(label)}
        onClick={() => {
          setError(null);
          start(async () => {
            let result: RemoveSlotResult | null = null;
            try {
              result = await removeVisitSlot(propertyId, slotId);
            } catch (caught) {
              console.error("[visits] slot not removed", caught);
            }
            if (!result?.ok) {
              setError(t.slots.errors[result?.error ?? "unavailable"]);
              return;
            }
            router.refresh();
          });
        }}
      >
        {t.slots.remove}
      </Button>
      {error ? (
        <span role="alert" className="text-lk-caption text-lk-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}

/** « Inviter » a buyer in relation with the property (the list of the contacts). */
export function InviteButton({
  propertyId,
  buyerId,
  name,
  again,
  disabled,
}: {
  propertyId: string;
  buyerId: string;
  name: string;
  /** Already invited: a new link replaces the old one. */
  again: boolean;
  /** No free slot to offer. */
  disabled: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={pending}
        disabled={disabled}
        aria-label={t.contacts.inviteAbout(name)}
        onClick={() => {
          setNotice(null);
          start(async () => {
            let result: InviteResult | null = null;
            try {
              result = await inviteToVisit({ propertyId, buyerId });
            } catch (caught) {
              console.error("[visits] buyer not invited", caught);
            }
            if (!result?.ok) {
              setNotice({
                tone: "danger",
                text: t.contacts.errors[result?.error ?? "unavailable"],
              });
              return;
            }
            setNotice({ tone: "success", text: t.contacts.sent(name) });
            router.refresh();
          });
        }}
      >
        {again ? t.contacts.inviteAgain : t.contacts.invite}
      </Button>
      {notice ? <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert> : null}
    </div>
  );
}
