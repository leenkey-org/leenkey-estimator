"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InlineAlert } from "@/components/shared/inline-alert";
import { UnitInput } from "@/components/shared/unit-input";
import { fr } from "@/lib/i18n/fr";
import { LISTING_PRICE_MAX_EUROS } from "@/lib/validations/listing";
import { parseFrenchNumber } from "@/lib/validations/property";
import type { Database } from "@/types/database";
import { statusActions } from "../sheet";
import {
  deleteDraft,
  markListingSold,
  pauseListing,
  republishListing,
  type StatusError,
} from "../status-actions";

const t = fr.properties.sheet;

type ListingStatus = Database["public"]["Enums"]["listing_status"];
type Feedback = { tone: "success" | "danger"; text: string };
type Dialog = "sold" | "delete" | null;

const ERRORS: Record<StatusError, string> = {
  auth: t.errors.signedOut,
  invalid: t.errors.unavailable,
  not_found: t.errors.notFound,
  suspended: t.errors.suspended,
  conflict: t.errors.conflict,
  unavailable: t.errors.unavailable,
};

/** Whole euros typed in the price field; null when empty, undefined when not a price. */
function soldPrice(text: string): number | null | undefined {
  const value = parseFrenchNumber(text);
  if (value === null) return null;
  if (!Number.isInteger(value) || value <= 0 || value > LISTING_PRICE_MAX_EUROS) return undefined;
  return value;
}

/**
 * Actions of the status of a listing on the page of its property (L1-14,
 * SPEC-V2 8.3): resume or delete a draft, correct a rejected listing, pause
 * an online one or put it back, mark it as sold (confirmation, final price
 * optional). The SQL functions decide (status-actions.ts); the outcome is
 * read in the region under the buttons, and the page is read again.
 */
export function ListingStatusActions({
  propertyId,
  listingId,
  status,
  resumeHref,
  publicHref,
}: {
  propertyId: string;
  listingId: string | null;
  status: ListingStatus | null;
  /** The step where the creation resumes (draft, rejected). */
  resumeHref: string;
  /** Public page of the listing, when online. */
  publicHref: string | null;
}) {
  const router = useRouter();
  const [working, startTransition] = useTransition();
  const [running, setRunning] = useState<"pause" | "publish" | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [priceError, setPriceError] = useState<string | undefined>(undefined);
  const opener = useRef<HTMLButtonElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const actions = statusActions(status);
  // Sold: no action left, the outcome stays until the next visit.
  if (actions.length === 0 && !feedback) return null;

  const report = (next: Feedback) => {
    setFeedback(next);
    // After the page is read again: the outcome takes the focus.
    requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const failed = (error: StatusError | null) => {
    if (error === "conflict" || error === "suspended" || error === "not_found") router.refresh();
    return error ? ERRORS[error] : t.errors.unavailable;
  };

  const change = (action: "pause" | "publish") => {
    if (!listingId) return;
    setRunning(action);
    setFeedback(null);
    startTransition(async () => {
      const run = action === "pause" ? pauseListing : republishListing;
      const result = await run({ listingId }).catch(() => null);
      setRunning(null);
      if (result?.ok) {
        router.refresh();
        report({ tone: "success", text: action === "pause" ? t.done.paused : t.done.published });
        return;
      }
      report({ tone: "danger", text: failed(result?.ok === false ? result.error : null) });
    });
  };

  const open = (kind: "sold" | "delete", from: HTMLButtonElement) => {
    opener.current = from;
    setDialogError(null);
    setPrice("");
    setPriceError(undefined);
    setFeedback(null);
    setDialog(kind);
  };

  const confirmSold = () => {
    if (!listingId) return;
    const value = soldPrice(price);
    if (value === undefined) {
      setPriceError(t.errors.price);
      return;
    }
    startTransition(async () => {
      const result = await markListingSold({ listingId, soldPriceEuros: value }).catch(() => null);
      if (result?.ok) {
        setDialog(null);
        router.refresh();
        report({ tone: "success", text: t.done.sold });
        return;
      }
      setDialogError(failed(result?.ok === false ? result.error : null));
    });
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteDraft({ propertyId }).catch(() => null);
      if (result?.ok) {
        setDialog(null);
        router.replace("/vendeur");
        return;
      }
      setDialogError(failed(result?.ok === false ? result.error : null));
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {actions.length > 0 ? (
        <div
          role="group"
          aria-label={t.actions.label}
          aria-busy={working || undefined}
          className="flex flex-wrap gap-2.5"
        >
          {actions.map((action) => {
            switch (action) {
              case "resume":
              case "fix":
                return (
                  <Button key={action} asChild>
                    <Link href={resumeHref}>{t.actions[action]}</Link>
                  </Button>
                );
              case "view":
                return publicHref ? (
                  <Button key={action} asChild variant="secondary">
                    <Link href={publicHref}>{t.actions.view}</Link>
                  </Button>
                ) : null;
              case "pause":
              case "publish":
                return (
                  <Button
                    key={action}
                    variant={action === "publish" ? "primary" : "secondary"}
                    disabled={working}
                    loading={running === action}
                    onClick={() => change(action)}
                  >
                    {t.actions[action]}
                  </Button>
                );
              case "sold":
                return (
                  <Button
                    key={action}
                    variant="secondary"
                    disabled={working}
                    onClick={(event) => open("sold", event.currentTarget)}
                  >
                    {t.actions.sold}
                  </Button>
                );
              case "delete":
                return (
                  <Button
                    key={action}
                    variant="danger"
                    disabled={working}
                    onClick={(event) => open("delete", event.currentTarget)}
                  >
                    {t.actions.delete}
                  </Button>
                );
            }
          })}
        </div>
      ) : null}
      {/* In the page from the first render: an outcome inserted later is read. */}
      <div ref={feedbackRef} tabIndex={-1} aria-live="polite" className="outline-none">
        {feedback ? (
          <InlineAlert tone={feedback.tone} live={false}>
            {feedback.text}
          </InlineAlert>
        ) : null}
      </div>
      <ConfirmDialog
        open={dialog === "sold"}
        title={t.soldDialog.title}
        description={t.soldDialog.text}
        confirmLabel={t.soldDialog.confirm}
        labels={t.dialog}
        working={working}
        error={dialogError}
        onConfirm={confirmSold}
        onClose={() => setDialog(null)}
        onCloseAutoFocus={(event) => {
          // After a decision, the outcome takes the focus.
          if (feedback) event.preventDefault();
          else if (opener.current?.isConnected) {
            event.preventDefault();
            opener.current.focus();
          }
        }}
      >
        <UnitInput
          label={t.soldDialog.price}
          help={t.soldDialog.priceHelp}
          unit="€"
          inputMode="numeric"
          autoComplete="off"
          value={price}
          error={priceError}
          onChange={(event) => {
            setPrice(event.target.value);
            setPriceError(undefined);
          }}
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "delete"}
        title={t.deleteDialog.title}
        description={t.deleteDialog.text}
        confirmLabel={t.deleteDialog.confirm}
        confirmVariant="danger"
        labels={t.dialog}
        working={working}
        error={dialogError}
        onConfirm={confirmDelete}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
