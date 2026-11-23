"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { StatusBadge } from "@/components/shared/status-badge";
import { Textarea } from "@/components/shared/textarea";
import { InterventionStatusPill } from "@/leenkey/advisor/components/intervention-status";
import type { InterventionStatus } from "@/leenkey/advisor/interventions";
import { frAdvisorInterventions } from "@/lib/i18n/sections/advisorInterventions";
import {
  INTERVENTION_NOTE_MAX,
  type InterventionCommand,
} from "@/lib/validations/advisor-intervention";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";
import { interventionFeedback } from "../feedback";
import { changeIntervention, type InterventionCommandResult } from "../interventions/actions";
import { useModerationFeedback } from "./listing-moderation";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { advisorInterventions: frAdvisorInterventions } as const;

const t = fr.advisorInterventions.admin;

type Action = Exclude<InterventionStatus, "requested">;

/** An entry of the list, as the page words it (the server reads, this component acts). */
export type InterventionListItem = {
  key: string;
  /** Null: the initial appointment of the property, with no row yet. */
  id: string | null;
  propertyId: string;
  status: InterventionStatus;
  statusLabel: string;
  seller: string;
  /** « LK-0001 · Appartement 3 p · Savigny-sur-Orge ». */
  property: string;
  coverSrc: string | null;
  plan: Database["public"]["Enums"]["plan_code"];
  /** « 2 interventions utilisées sur 4 »; null once the plan sells none. */
  counter: string | null;
  reason: string;
  /** What the seller wrote, or what the initial appointment is. */
  message: string;
  /** Written by the seller: shown as their words. */
  quoted: boolean;
  /** « Demandée le 23 nov. », « Faite le 24 nov. par Cédric ». */
  date: string | null;
  note: string | null;
  conversationHref: string | null;
  actions: readonly Action[];
  /** The initial appointment: never counted. */
  initial: boolean;
};

const VARIANT = { scheduled: "secondary", done: "success", cancelled: "ghost" } as const;

/**
 * The interventions of the adviser, for the team (DECISIONS.md 2026-11-23,
 * docs/DESIGN.md G7, on the model of the shared inbox): one entry each, the
 * seller and the property, the plan and its counter, the reason and the
 * words of the seller, then « Planifiée », « Faite », « Annulée ». Each
 * action is confirmed in a dialog that takes an optional internal note; its
 * outcome shows at the top of the page (ModerationFeedback).
 */
export function InterventionList({ items }: { items: readonly InterventionListItem[] }) {
  const report = useModerationFeedback();
  const router = useRouter();
  const [working, startTransition] = useTransition();
  const [pending, setPending] = useState<{ item: InterventionListItem; status: Action } | null>(
    null,
  );
  const [note, setNote] = useState("");
  const opener = useRef<HTMLButtonElement | null>(null);

  const confirm = () => {
    if (!pending) return;
    const { item, status } = pending;
    const command: InterventionCommand | null = item.id
      ? { action: "status", interventionId: item.id, status, note }
      : status === "cancelled"
        ? null
        : { action: "initial", propertyId: item.propertyId, status, note };
    if (!command) return;
    startTransition(async () => {
      let result: InterventionCommandResult | null = null;
      try {
        result = await changeIntervention(command);
      } catch (error) {
        // The change may have been saved all the same: the message says so.
        console.error("[admin] advisor intervention request failed", error);
      }
      // Changed meanwhile (another admin, another tab): the list is read again.
      if (result?.ok === false && (result.error === "conflict" || result.error === "not_found")) {
        router.refresh();
      }
      setPending(null);
      setNote("");
      report(interventionFeedback(status, result));
    });
  };

  const copy = pending ? t.dialog[pending.status] : null;
  const description =
    pending?.status === "done"
      ? pending.item.initial
        ? t.dialog.done.initialText
        : pending.item.counter
          ? t.dialog.done.text(pending.item.counter)
          : t.dialog.done.plainText
      : (copy?.text as string | undefined);

  return (
    <>
      <ul
        aria-label={t.list}
        aria-busy={working || undefined}
        className="flex flex-col divide-y divide-lk-line overflow-hidden rounded-lk-md border border-lk-line bg-lk-surface lg:max-w-3xl"
      >
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-3 px-4 py-4">
            <PropertyThumb src={item.coverSrc} className="size-11" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-lk-compact font-semibold text-lk-ink">
                    {item.seller}
                  </p>
                  <InterventionStatusPill
                    status={item.status}
                    label={item.statusLabel}
                    className="shrink-0"
                  />
                </div>
                <p className="truncate text-lk-caption text-lk-ink-3">{item.property}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusBadge plan={item.plan} />
                  {item.counter ? (
                    <span className="text-lk-caption font-semibold text-lk-ink-2 tabular">
                      {item.counter}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lk-secondary font-semibold text-lk-ink">{item.reason}</p>
                <p
                  className={cn(
                    "text-lk-secondary whitespace-pre-line wrap-anywhere",
                    item.quoted ? "text-lk-ink-2" : "text-lk-ink-3",
                  )}
                >
                  {item.message}
                </p>
                {item.date ? <p className="text-lk-caption text-lk-ink-3">{item.date}</p> : null}
              </div>
              {item.note ? (
                <p className="rounded-lk-sm bg-lk-stone-2 px-3 py-2 text-lk-caption whitespace-pre-line text-lk-ink-2 wrap-anywhere">
                  {t.note(item.note)}
                </p>
              ) : null}
              <div
                role="group"
                aria-label={t.actions.label(item.seller)}
                className="flex flex-wrap items-center gap-2"
              >
                {item.actions.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={VARIANT[status]}
                    muted={status === "cancelled"}
                    disabled={working}
                    onClick={(event) => {
                      opener.current = event.currentTarget;
                      setNote("");
                      setPending({ item, status });
                    }}
                  >
                    {t.actions[status]}
                  </Button>
                ))}
                {item.conversationHref ? (
                  <Link
                    href={item.conversationHref}
                    className="inline-flex min-h-11 items-center px-1 text-lk-secondary font-semibold text-lk-blue underline-offset-2 hover:underline"
                  >
                    {t.write}
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={pending !== null}
        title={copy?.title ?? ""}
        description={description ?? ""}
        confirmLabel={copy?.confirm ?? ""}
        labels={t.dialog.labels}
        working={working}
        onConfirm={confirm}
        onClose={() => {
          if (!working) setPending(null);
        }}
        // Back to the button that opened it (it may have left the list: then nothing).
        onCloseAutoFocus={(event) => {
          if (opener.current?.isConnected) {
            event.preventDefault();
            opener.current.focus();
          }
        }}
      >
        <Textarea
          label={t.dialog.note}
          optional
          help={t.dialog.noteHelp}
          value={note}
          maxLength={INTERVENTION_NOTE_MAX}
          rows={3}
          readOnly={working}
          onChange={(event) => setNote(event.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}
