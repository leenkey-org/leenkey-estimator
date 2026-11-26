"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InlineAlert } from "@/components/shared/inline-alert";
import { frBilling } from "@/lib/i18n/sections/billing";
import { CONTACT_EMAIL } from "@/lib/i18n/sections/contact-email";
import { cn } from "@/lib/utils";
import { withdrawPlan, type WithdrawError } from "../actions";
import { legalDateTime, type WithdrawalScope } from "../withdrawal";
import type { WithdrawalChoice, WithdrawalView } from "../withdrawal-view";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { billing: frBilling, legal: { contactEmail: CONTACT_EMAIL } } as const;

const t = fr.billing.withdrawal;

const ERRORS: Record<WithdrawError, string> = {
  session: t.errors.session,
  invalid: t.errors.unavailable,
  not_found: t.errors.unavailable,
  over: t.errors.over,
  not_in_force: t.errors.notInForce,
  not_offered: t.errors.notOffered,
  unavailable: t.errors.unavailable,
};

export type WithdrawalPanelProps = WithdrawalView & {
  propertyName: string;
  /** « Prénom Nom »: who renounces (article D221-5). */
  name: string | null;
  email: string | null;
};

const choiceLabel = (choice: WithdrawalChoice) =>
  choice.scope === "upgrade" ? t.choice.upgrade(choice.keptName) : t.choice.full(choice.keptName);

/**
 * « Renoncer au contrat » (L1-40, SPEC-V2 section 11, code de la consommation
 * L221-18): visible on the page of the plan during the 14 days. After a
 * passage (DECISIONS.md 2026-11-26) the seller chooses what to renounce: the
 * passage alone (back to the plan it replaced) or both orders; once the first
 * order is past its own 14 days, the passage alone. The dialog names the
 * plan, the property and the date of the order, then says what stops at once,
 * what stays and what is refunded. A request recorded is said again, with its
 * refund and its deadline, until it is refunded.
 */
export function WithdrawalPanel({
  current,
  recorded,
  propertyName,
  name,
  email,
}: WithdrawalPanelProps) {
  const group = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<WithdrawalScope | null>(null);
  const [done, setDone] = useState<{ at: string; acknowledged: boolean } | null>(null);
  // Recorded now (not on load): the focus goes to the confirmation, the
  // dialog and its button being gone.
  const justDone = useRef(false);
  useEffect(() => {
    if (done && justDone.current) doneRef.current?.focus();
  }, [done]);

  const choices = current?.choices ?? [];
  const chosen = choices.find((choice) => choice.scope === scope) ?? choices[0] ?? null;

  const confirm = async () => {
    if (!current || !chosen) return;
    setWorking(true);
    setError(null);
    let result: Awaited<ReturnType<typeof withdrawPlan>> | null = null;
    try {
      result = await withdrawPlan({
        subscriptionId: current.subscriptionId,
        scope: chosen.scope,
      });
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
    setScope(null);
    setDone({ at: result.data.requestedAt, acknowledged: result.data.acknowledged });
  };

  // The request made now is said by its own confirmation, not twice.
  const earlier = recorded.filter(
    (request) => !done || Date.parse(request.requestedAt) !== Date.parse(done.at),
  );

  return (
    <div className="flex flex-col gap-3">
      {done ? (
        <div ref={doneRef} tabIndex={-1} className="outline-none">
          <InlineAlert tone="success">
            {done.acknowledged
              ? t.done(legalDateTime(done.at))
              : t.doneNoEmail(legalDateTime(done.at), fr.legal.contactEmail)}
          </InlineAlert>
        </div>
      ) : null}
      {earlier.map((request) => (
        <InlineAlert key={request.requestedAt} tone="success">
          {request.scope === "upgrade"
            ? t.pendingUpgrade(
                legalDateTime(request.requestedAt),
                request.amount,
                request.deadline,
                request.keptName,
              )
            : t.pendingFull(
                legalDateTime(request.requestedAt),
                request.amount,
                request.deadline,
                request.keptName,
              )}
        </InlineAlert>
      ))}
      {current && chosen ? (
        <section
          aria-labelledby="withdrawal-title"
          className="flex flex-col gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4 md:p-5"
        >
          <h2 id="withdrawal-title" className="text-lk-label font-semibold text-lk-ink">
            {t.title}
          </h2>
          {choices.length > 1 ? (
            <>
              <p className="text-lk-secondary text-lk-ink-2">{t.choice.intro}</p>
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">{t.choice.legend}</legend>
                {choices.map((choice) => {
                  const checked = choice.scope === chosen.scope;
                  return (
                    <label
                      key={choice.scope}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lk-sm border p-3",
                        "has-focus-visible:outline-solid has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-lk-brand-blue",
                        checked ? "border-lk-blue bg-lk-blue-tint" : "border-lk-line",
                      )}
                    >
                      <input
                        type="radio"
                        name={group}
                        value={choice.scope}
                        checked={checked}
                        onChange={() => setScope(choice.scope)}
                        className="mt-1 size-4 shrink-0 accent-lk-blue"
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-lk-secondary font-semibold text-lk-ink">
                          {choiceLabel(choice)}
                        </span>
                        <span className="text-lk-caption text-lk-ink-2">
                          {t.choice.detail(choice.refund, choice.lastDay)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </>
          ) : chosen.scope === "upgrade" ? (
            <>
              <p className="text-lk-secondary text-lk-ink-2">
                {t.choice.onlyUpgrade(current.planName, chosen.keptName)}
              </p>
              <p className="text-lk-caption text-lk-ink-2">
                {t.choice.detail(chosen.refund, chosen.lastDay)}
              </p>
            </>
          ) : (
            <p className="text-lk-secondary text-lk-ink-2">{t.text(chosen.lastDay)}</p>
          )}
          {current.earlyStart ? <p className="text-lk-caption text-lk-ink-2">{t.early}</p> : null}
          <div>
            <Button
              ref={triggerRef}
              type="button"
              variant="secondary"
              onClick={() => {
                justDone.current = false;
                setError(null);
                setOpen(true);
              }}
            >
              {t.action}
            </Button>
          </div>
          <ConfirmDialog
            open={open}
            title={
              chosen.scope === "upgrade" ? t.dialogTitleUpgrade(chosen.keptName) : t.dialogTitle
            }
            description={t.dialogText(current.planName, propertyName, current.orderedOn)}
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
            <div className="flex flex-col gap-3 text-lk-secondary text-lk-ink-2">
              {chosen.includes ? (
                <p>{t.dialogReplaced(chosen.includes.planName, chosen.includes.orderedOn)}</p>
              ) : null}
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-lk-ink">{t.stopsTitle}</p>
                {chosen.stops.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {chosen.stops.map((service) => (
                      <li key={service}>{service}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{t.stopsAll}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-lk-ink">{t.keepsTitle}</p>
                {chosen.scope === "upgrade" ? <p>{t.keepsPlan(chosen.keptName)}</p> : null}
                <p>{t.keeps}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-lk-ink">{t.refundTitle}</p>
                <p>{t.refund(chosen.refund)}</p>
              </div>
              {name ? <p>{t.dialogName(name)}</p> : null}
              {email ? <p>{t.dialogEmail(email)}</p> : null}
            </div>
          </ConfirmDialog>
        </section>
      ) : null}
    </div>
  );
}
