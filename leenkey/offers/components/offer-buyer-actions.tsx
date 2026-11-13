"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InlineAlert } from "@/components/shared/inline-alert";
import { frOffer } from "@/lib/i18n/sections/offer";
import {
  startNewOffer,
  withdrawOffer,
  type StartNewOfferResult,
  type WithdrawOfferResult,
} from "../buyer-actions";
import { offerFormPath } from "../paths";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.followUp;

/**
 * What a buyer does with an offer sent (SPEC-V2 13, « Côté acquéreur : suivi
 * et retrait de l'offre »): « Retirer mon offre » while it waits, after a
 * confirmation; « Faire une nouvelle offre », which copies its content in a
 * new draft and opens the form. Never a withdrawal once accepted: the page
 * shows neither button then.
 */
export function OfferBuyerActions({
  offerId,
  canWithdraw,
  canRenew,
}: {
  offerId: string;
  /** Sent, not answered, not expired. */
  canWithdraw: boolean;
  /** The listing still takes an offer of this buyer. */
  canRenew: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [withdrawing, startWithdraw] = useTransition();
  const [renewing, startRenew] = useTransition();
  const busy = useRef(false);

  function withdraw() {
    setError(null);
    startWithdraw(async () => {
      let result: WithdrawOfferResult | null = null;
      try {
        result = await withdrawOffer(offerId);
      } catch (caught) {
        console.error("[offers] withdrawal failed", caught);
      }
      if (!result?.ok) {
        setError(
          result?.error === "auth"
            ? t.errors.signedOut
            : result?.error === "expired"
              ? t.errors.expired
              : result?.error === "answered"
                ? t.errors.answered
                : t.errors.generic,
        );
        // Answered or expired meanwhile: the page says what the offer is now.
        if (result?.error === "expired" || result?.error === "answered") router.refresh();
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function renew() {
    if (busy.current) return;
    busy.current = true;
    setRenewError(null);
    startRenew(async () => {
      let result: StartNewOfferResult | null = null;
      try {
        result = await startNewOffer(offerId);
      } catch (caught) {
        console.error("[offers] new offer failed", caught);
      }
      if (!result?.ok) {
        busy.current = false;
        setRenewError(
          result?.error === "auth"
            ? t.errors.signedOut
            : result?.error === "closed"
              ? t.errors.closed
              : t.errors.generic,
        );
        return;
      }
      // The first step, to read the content again from its start.
      router.push(offerFormPath(result.data.listingId, 1));
    });
  }

  if (!canWithdraw && !canRenew) return null;
  return (
    <div className="flex flex-col gap-3">
      {canRenew ? (
        <p className="text-lk-secondary text-lk-ink-2">
          {canWithdraw ? t.newOfferToChange : t.newOfferAgain}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2.5">
        {canRenew ? (
          <Button type="button" variant="secondary" loading={renewing} onClick={renew}>
            {t.newOffer}
          </Button>
        ) : null}
        {canWithdraw ? (
          <Button type="button" variant="danger" onClick={() => setOpen(true)}>
            {t.withdraw}
          </Button>
        ) : null}
      </div>
      {renewError ? <InlineAlert tone="danger">{renewError}</InlineAlert> : null}
      <ConfirmDialog
        open={open}
        title={t.withdrawDialog.title}
        description={t.withdrawDialog.description}
        confirmLabel={t.withdrawDialog.confirm}
        confirmVariant="danger"
        labels={{
          back: t.withdrawDialog.back,
          close: t.withdrawDialog.close,
          cancel: t.withdrawDialog.cancel,
        }}
        working={withdrawing}
        error={error}
        onConfirm={withdraw}
        onClose={() => {
          if (!withdrawing) setOpen(false);
        }}
      />
    </div>
  );
}
