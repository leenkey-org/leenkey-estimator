"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InlineAlert } from "@/components/shared/inline-alert";
import { frBilling } from "@/lib/i18n/sections/billing";
import { CONTACT_EMAIL } from "@/lib/i18n/sections/contact-email";
import { withdrawPlan, type WithdrawError } from "../actions";
import { legalDateTime } from "../withdrawal";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { billing: frBilling, legal: { contactEmail: CONTACT_EMAIL } } as const;

const t = fr.billing.withdrawal;

const ERRORS: Record<WithdrawError, string> = {
  session: t.errors.session,
  invalid: t.errors.unavailable,
  not_found: t.errors.unavailable,
  over: t.errors.over,
  not_in_force: t.errors.notInForce,
  unavailable: t.errors.unavailable,
};

export type WithdrawalPanelProps = {
  subscriptionId: string;
  planName: string;
  propertyName: string;
  /** « 8 novembre 2026 » */
  orderedOn: string;
  /** « 23 novembre 2026 », the last day. */
  lastDay: string;
  earlyStart: boolean;
  /** « Prénom Nom »: who renounces (article D221-5). */
  name: string | null;
  /** The plan a passage replaced, still in its own period: renounced with it. */
  replaced: { planName: string; orderedOn: string } | null;
  email: string | null;
  /** The request already recorded, an ISO date; null until then. */
  requestedAt: string | null;
};

/**
 * « Renoncer au contrat » (L1-40, SPEC-V2 section 11, code de la consommation
 * L221-18): visible on the page of the plan during the 14 days; the dialog
 * names the plan, the property, the date of the order and where the
 * acknowledgment goes; once recorded, the date of the request.
 */
export function WithdrawalPanel({
  subscriptionId,
  planName,
  propertyName,
  orderedOn,
  lastDay,
  earlyStart,
  name,
  replaced,
  email,
  requestedAt,
}: WithdrawalPanelProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(requestedAt);
  const [acknowledged, setAcknowledged] = useState(true);
  // Recorded now (not on load): the focus goes to the confirmation, the
  // dialog and its button being gone.
  const justDone = useRef(false);
  useEffect(() => {
    if (done && justDone.current) doneRef.current?.focus();
  }, [done]);

  const confirm = async () => {
    setWorking(true);
    setError(null);
    let result: Awaited<ReturnType<typeof withdrawPlan>> | null = null;
    try {
      result = await withdrawPlan({ subscriptionId });
    } catch (caught) {
      // Network lost, or a page older than the last deployment.
      console.error("[billing] withdrawal not sent", caught);
    }
    setWorking(false);
    if (!result) {
      setError(t.errors.unavailable);
      return;
    }
    if (!result.ok) {
      setError(ERRORS[result.error]);
      return;
    }
    justDone.current = true;
    setOpen(false);
    setAcknowledged(result.data.acknowledged);
    setDone(result.data.requestedAt);
  };

  if (done) {
    return (
      <div ref={doneRef} tabIndex={-1} className="outline-none">
        <InlineAlert tone="success">
          {acknowledged
            ? t.done(legalDateTime(done))
            : t.doneNoEmail(legalDateTime(done), fr.legal.contactEmail)}
        </InlineAlert>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="withdrawal-title"
      className="flex flex-col gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4 md:p-5"
    >
      <h2 id="withdrawal-title" className="text-lk-label font-semibold text-lk-ink">
        {t.title}
      </h2>
      <p className="text-lk-secondary text-lk-ink-2">{t.text(lastDay)}</p>
      {earlyStart ? <p className="text-lk-caption text-lk-ink-2">{t.early}</p> : null}
      <div>
        <Button
          ref={triggerRef}
          type="button"
          variant="secondary"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          {t.action}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title={t.dialogTitle}
        description={t.dialogText(planName, propertyName, orderedOn)}
        confirmLabel={t.confirm}
        confirmVariant="danger"
        labels={t.labels}
        working={working}
        error={error}
        onConfirm={() => void confirm()}
        onClose={() => setOpen(false)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!justDone.current) triggerRef.current?.focus();
        }}
      >
        <div className="flex flex-col gap-2 text-lk-secondary text-lk-ink-2">
          {replaced ? <p>{t.dialogReplaced(replaced.planName, replaced.orderedOn)}</p> : null}
          {name ? <p>{t.dialogName(name)}</p> : null}
          {email ? <p>{t.dialogEmail(email)}</p> : null}
        </div>
      </ConfirmDialog>
    </section>
  );
}
