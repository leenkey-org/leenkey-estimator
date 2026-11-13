"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Textarea } from "@/components/shared/textarea";
import { formatInteger } from "@/lib/format";
import { frOffer } from "@/lib/i18n/sections/offer";
import { OFFER_ANSWER_MESSAGE_MAX } from "@/lib/validations/offer";
import { offerAcceptPath, offerPath } from "../paths";
import { answerOffer, markOfferViewed, type AnswerOfferResult } from "../seller-actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.seller;

type AnswerError = Extract<AnswerOfferResult, { ok: false }>["error"];

const errorText = (error: AnswerError | null): string =>
  error === "auth"
    ? t.errors.signedOut
    : error === "expired"
      ? t.errors.expired
      : error === "answered"
        ? t.errors.answered
        : error === "off_sale"
          ? t.errors.offSale
          : t.errors.generic;

/**
 * The first opening of an offer by its seller writes « Consultée » and tells
 * the buyer. Done by the page once shown, never by a prefetch of its link.
 */
export function MarkOfferViewed({ offerId }: { offerId: string }) {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markOfferViewed(offerId)
      .then((result) => {
        if (result.ok) router.refresh();
      })
      .catch((caught: unknown) => console.error("[offers] mark viewed failed", caught));
  }, [offerId, router]);
  return null;
}

/**
 * The three answers of a seller (SPEC-V2 13): « Accepter l'offre » leads to
 * the acceptance screen (never an acceptance in one click), « Refuser
 * l'offre » asks to confirm, with an optional message, « Discuter avec
 * l'acquéreur » opens their conversation.
 */
export function OfferSellerActions({
  offerId,
  reference,
  discussHref,
  full = false,
}: {
  offerId: string;
  /** Said to a screen reader after each action: a page may show several offers. */
  reference: string;
  discussHref: string;
  /** On the dashboard: the link to the whole offer. */
  full?: boolean;
}) {
  const about = <span className="sr-only"> ({t.about(reference)})</span>;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, startTransition] = useTransition();
  const count = message.trim().length;
  const tooLong = count > OFFER_ANSWER_MESSAGE_MAX;

  function decline() {
    if (tooLong) {
      setError(t.errors.tooLong);
      return;
    }
    setError(null);
    startTransition(async () => {
      let result: AnswerOfferResult | null = null;
      try {
        result = await answerOffer({ offerId, accept: false, confirmedRead: false, message });
      } catch (caught) {
        console.error("[offers] decline failed", caught);
      }
      if (!result?.ok) {
        setError(errorText(result?.error ?? null));
        // Expired or answered meanwhile: the page says what the offer is now.
        if (result?.error === "expired" || result?.error === "answered") router.refresh();
        return;
      }
      setOpen(false);
      router.push(offerPath(offerId));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5">
        <Button asChild>
          <Link href={offerAcceptPath(offerId)}>
            {t.accept}
            {about}
          </Link>
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {t.decline}
          {about}
        </Button>
        <Button asChild variant="ghost">
          <Link href={discussHref}>
            {t.discuss}
            {about}
          </Link>
        </Button>
      </div>
      {full ? (
        <Link
          href={offerPath(offerId)}
          className="self-start text-lk-secondary font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
        >
          {t.full}
          {about}
        </Link>
      ) : null}
      <ConfirmDialog
        open={open}
        title={t.declineDialog.title}
        description={t.declineDialog.description}
        confirmLabel={t.declineDialog.confirm}
        confirmVariant="danger"
        labels={{
          back: t.declineDialog.back,
          close: t.declineDialog.close,
          cancel: t.declineDialog.cancel,
        }}
        working={working}
        error={error}
        onConfirm={decline}
        onClose={() => {
          if (!working) setOpen(false);
        }}
      >
        <Textarea
          label={t.declineDialog.message}
          optional
          rows={4}
          value={message}
          help={t.declineDialog.count(
            formatInteger(count),
            formatInteger(OFFER_ANSWER_MESSAGE_MAX),
          )}
          error={tooLong ? t.errors.tooLong : undefined}
          onChange={(event) => {
            setMessage(event.target.value);
            setError(null);
          }}
        />
      </ConfirmDialog>
    </div>
  );
}

/**
 * The end of the acceptance screen (docs/DESIGN.md 13.3): the box « J'ai lu
 * l'intégralité de l'offre… », then « Confirmer mon acceptation », inactive
 * until it is ticked. The server checks again that the offer still waits.
 */
export function OfferAcceptForm({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [read, setRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, startTransition] = useTransition();
  const busy = useRef(false);
  const labels = t.acceptScreen;

  function accept() {
    if (busy.current || !read) return;
    busy.current = true;
    setError(null);
    startTransition(async () => {
      let result: AnswerOfferResult | null = null;
      try {
        result = await answerOffer({ offerId, accept: true, confirmedRead: true, message: "" });
      } catch (caught) {
        console.error("[offers] accept failed", caught);
      }
      if (!result?.ok) {
        busy.current = false;
        setError(errorText(result?.error ?? null));
        return;
      }
      // Accepted: the screen leaves no way back to it in the history.
      startTransition(() => router.replace(offerPath(offerId)));
    });
  }

  return (
    <>
      <Checkbox
        label={labels.confirmRead}
        checked={read}
        onChange={(event) => setRead(event.target.checked)}
      />
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {/* One under the other on a phone: the two labels do not fit side by side at 390 px. */}
      <FormActionBar className="flex-col-reverse md:mt-3 md:flex-row [&>*]:flex-none [&>*:last-child]:flex-none md:[&>*:last-child]:flex-1">
        <Button asChild variant="ghost">
          <Link href={offerPath(offerId)}>{labels.back}</Link>
        </Button>
        <Button type="button" loading={working} disabled={!read} onClick={accept}>
          {labels.confirm}
        </Button>
      </FormActionBar>
    </>
  );
}
