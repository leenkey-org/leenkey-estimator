"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { frAdminReports } from "@/lib/i18n/sections/adminReports";
import type { ReportCommand } from "@/lib/validations/admin";
import { decideReport, type ReportCommandResult } from "../reports/actions";
import { reportFeedback } from "../feedback";
import { useModerationFeedback } from "./listing-moderation";
import { ReasonDialog, type ReasonDialogCopy } from "./reason-dialog";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminReports: frAdminReports } as const;

// The decisions on a report from its sheet (L1-30c, SPEC-V2 section 17):
// « Avertir » the other party (a message sent by email, nothing changes on
// the account) and « Clore le signalement » with what was done. Each asks for
// a text in the dialog of the back office (ReasonDialog); the outcome shows at
// the top of the sheet and takes the focus. The suspension of the account is
// AccountModeration (L1-30a), beside these.

const t = fr.adminReports;

type Dialog = "warn" | "resolve";

const COPY: Record<Dialog, ReasonDialogCopy> = {
  warn: { ...t.warnDialog, tone: "primary", templates: t.warnTemplates },
  resolve: { ...t.resolveDialog, tone: "primary", templates: t.resolveTemplates },
};

export function ReportDecisions({
  reportId,
  targetName,
  canWarn,
  closed,
}: {
  reportId: string;
  /** « Alice Martin », for the button of the warning; null: no name. */
  targetName: string | null;
  /** Someone to warn: an account that exists, not of the team. */
  canWarn: boolean;
  closed: boolean;
}) {
  const report = useModerationFeedback();
  const router = useRouter();
  const [working, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const decided = useRef(false);

  const decide = (command: ReportCommand) => {
    startTransition(async () => {
      let result: ReportCommandResult | null = null;
      try {
        result = await decideReport(command);
      } catch (error) {
        // The decision may have been saved all the same: the message says so.
        console.error("[admin] report decision request failed", error);
      }
      const feedback = reportFeedback(command.action, result);
      if (result?.ok === false && result.error === "not_found") router.refresh();
      if (!result?.ok) {
        setDialogError(feedback.text);
        return;
      }
      decided.current = true;
      setDialog(null);
      report(feedback);
    });
  };

  const open = (which: Dialog) => (event: React.MouseEvent<HTMLButtonElement>) => {
    opener.current = event.currentTarget;
    decided.current = false;
    setDialogError(null);
    setDialogKey((key) => key + 1);
    setDialog(which);
  };

  if (closed && !canWarn) return null;
  return (
    <div
      role="group"
      aria-label={t.actions.label}
      aria-busy={working || undefined}
      className="flex flex-wrap items-center gap-2"
    >
      {canWarn ? (
        <Button variant="secondary" disabled={working} onClick={open("warn")}>
          {t.actions.warn(targetName)}
        </Button>
      ) : null}
      {closed ? null : (
        <Button disabled={working} onClick={open("resolve")}>
          {t.actions.resolve}
        </Button>
      )}
      <ReasonDialog
        key={dialogKey}
        open={dialog !== null}
        copy={COPY[dialog ?? "resolve"]}
        working={working}
        error={dialogError}
        onClose={() => setDialog(null)}
        onConfirm={(text) =>
          decide(
            dialog === "warn"
              ? { action: "warn", reportId, reason: text }
              : { action: "resolve", reportId, note: text },
          )
        }
        onCloseAutoFocus={(event) => {
          // After a decision, the outcome takes the focus (ModerationFeedback).
          event.preventDefault();
          if (!decided.current && opener.current?.isConnected) opener.current.focus();
        }}
      />
    </div>
  );
}
