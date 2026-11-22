"use client";

import { useContext, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InlineAlert } from "@/components/shared/inline-alert";
import { frAdminListings } from "@/lib/i18n/sections/adminListings";
import { adminListingsHref, type ComplianceInput } from "@/lib/validations/admin";
import { listingComplianceAction, type ComplianceError, type ComplianceResult } from "../actions";
import { useModerationFeedback } from "./listing-moderation";
import { ReasonDialog } from "./reason-dialog";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminListings: frAdminListings } as const;

const t = fr.adminListings;
const c = t.compliance;

// « Mise en conformité » of a listing in the back office (DECISIONS.md
// 2026-11-22): ask its seller to change it, with a reason and a deadline set
// by the base; lift the request or renew it; once the deadline passed
// without a change, delete the listing, by hand only (confirmation). The
// SQL functions decide; the outcome shows in ModerationFeedback.

export type ComplianceView = {
  reason: string;
  requestedAt: string;
  dueAt: string;
  remindedAt: string | null;
  changed: boolean;
  /** The deadline passed and nothing changed: the deletion is open. */
  deletable: boolean;
};

const ERRORS: Record<ComplianceError, string> = {
  invalid: t.errors.invalid,
  forbidden: t.errors.forbidden,
  not_found: t.errors.notFound,
  conflict: t.errors.conflict,
  unavailable: t.errors.unavailable,
  deadline: c.errors.deadline,
  changed: c.errors.changed,
  offers_waiting: c.errors.offersWaiting,
  offer_accepted: c.errors.offerAccepted,
};

export function ListingCompliance({
  listingId,
  reference,
  canRequest,
  compliance,
}: {
  listingId: string;
  reference: string;
  /** Online, paused or to correct: what the seller can still change. */
  canRequest: boolean;
  /** The request standing, its dates already written for the page. */
  compliance: ComplianceView | null;
}) {
  const report = useModerationFeedback();
  const router = useRouter();
  const [working, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"request" | "delete" | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const decided = useRef(false);

  if (!canRequest && !compliance) return null;

  const run = (input: ComplianceInput) => {
    startTransition(async () => {
      let result: ComplianceResult | null = null;
      try {
        result = await listingComplianceAction(input);
      } catch (error) {
        console.error("[admin] compliance request failed", error);
      }
      if (result?.ok && input.action === "delete") {
        // Its page is gone with it: the list of the listings.
        decided.current = true;
        setDialog(null);
        router.replace(adminListingsHref({}));
        return;
      }
      if (!result?.ok) {
        const text = result ? ERRORS[result.error] : t.errors.network;
        if (dialog) {
          setDialogError(text);
          return;
        }
        report({ tone: "danger", text, reload: !result });
        return;
      }
      decided.current = true;
      setDialog(null);
      report({
        tone: "success",
        text: input.action === "request" ? c.result.requested : c.result.cleared,
      });
    });
  };

  const open = (kind: "request" | "delete", from: HTMLButtonElement) => {
    opener.current = from;
    decided.current = false;
    setDialogError(null);
    setDialogKey((key) => key + 1);
    setDialog(kind);
  };

  const restoreFocus = (event: Event) => {
    event.preventDefault();
    if (!decided.current && opener.current?.isConnected) opener.current.focus();
  };

  return (
    <section
      aria-labelledby="mise-en-conformite"
      className="flex flex-col gap-3 border-t border-lk-line pt-4"
    >
      <h2 id="mise-en-conformite" className="text-lk-label font-semibold text-lk-ink">
        {c.title}
      </h2>
      {compliance ? (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-lk-caption text-lk-ink-3">{c.requestedAt}</dt>
              <dd className="text-lk-label font-semibold text-lk-ink">{compliance.requestedAt}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-lk-caption text-lk-ink-3">{c.dueAt}</dt>
              <dd className="text-lk-label font-semibold text-lk-ink">{compliance.dueAt}</dd>
            </div>
            {compliance.remindedAt ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-lk-caption text-lk-ink-3">{c.remindedAt}</dt>
                <dd className="text-lk-label font-semibold text-lk-ink">{compliance.remindedAt}</dd>
              </div>
            ) : null}
          </dl>
          <div className="rounded-lk-md bg-lk-warning-bg px-4 py-3 text-lk-warning-fg">
            <p className="text-lk-caption font-semibold">{c.reason}</p>
            <p className="text-lk-secondary whitespace-pre-line">{compliance.reason}</p>
          </div>
          <p className="text-lk-secondary text-lk-ink-2">
            {compliance.changed
              ? c.changed
              : compliance.deletable
                ? c.ready
                : c.waiting(compliance.dueAt)}
          </p>
        </>
      ) : (
        <p className="text-lk-secondary text-lk-ink-2">{c.intro}</p>
      )}
      <div
        role="group"
        aria-label={c.label(reference)}
        aria-busy={working || undefined}
        className="flex flex-wrap items-center gap-2"
      >
        {canRequest ? (
          <Button
            variant="secondary"
            size="md"
            disabled={working}
            onClick={(event) => open("request", event.currentTarget)}
          >
            {compliance ? c.renew : c.request}
          </Button>
        ) : null}
        {compliance ? (
          <>
            <Button
              variant="ghost"
              size="md"
              disabled={working}
              onClick={() => run({ action: "clear", listingId })}
            >
              {c.clear}
            </Button>
            <Button
              variant="danger"
              size="md"
              disabled={working || !compliance.deletable}
              onClick={(event) => open("delete", event.currentTarget)}
            >
              {c.delete}
            </Button>
          </>
        ) : null}
      </div>
      <ReasonDialog
        key={dialogKey}
        open={dialog === "request"}
        copy={{
          title: c.dialog.title,
          text: c.dialog.text,
          reason: c.dialog.reason,
          confirm: c.dialog.confirm,
          tone: "primary",
          templates: t.rejectTemplates,
        }}
        working={working}
        error={dialogError}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => run({ action: "request", listingId, reason })}
        onCloseAutoFocus={restoreFocus}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title={c.deleteDialog.title}
        description={c.deleteDialog.text}
        confirmLabel={c.deleteDialog.confirm}
        confirmVariant="danger"
        labels={t.reasonDialog}
        working={working}
        error={dialogError}
        onConfirm={() => run({ action: "delete", listingId })}
        onClose={() => setDialog(null)}
        onCloseAutoFocus={restoreFocus}
      />
    </section>
  );
}
