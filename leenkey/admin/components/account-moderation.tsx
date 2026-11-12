"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { frAdminUsers } from "@/lib/i18n/sections/adminUsers";
import type { AccountDecisionInput } from "@/lib/validations/admin";
import { decideAccount, type AccountDecisionResult } from "../users/actions";
import { accountFeedback } from "../feedback";
import { useModerationFeedback } from "./listing-moderation";
import { ReasonDialog } from "./reason-dialog";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminUsers: frAdminUsers } as const;

// Suspension of an account from its sheet (SPEC-V2 section 17, L1-30a):
// « Suspendre le compte » asks for a motive, sent to its owner by email;
// « Réactiver le compte » lifts it at once. The outcome shows at the top of
// the sheet (ModerationFeedback) and takes the focus. Never one's own account
// nor an account of the team (the page shows neither button; the SQL refuses).

const t = fr.adminUsers;

export function AccountModeration({
  profileId,
  name,
  suspended,
}: {
  profileId: string;
  /** « Chloé Dubois », for the name of the group. */
  name: string;
  suspended: boolean;
}) {
  const report = useModerationFeedback();
  const router = useRouter();
  const [working, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const decided = useRef(false);

  const decide = (input: AccountDecisionInput) => {
    startTransition(async () => {
      let result: AccountDecisionResult | null = null;
      try {
        result = await decideAccount(input);
      } catch (error) {
        // The decision may have been saved all the same: the message says so.
        console.error("[admin] account decision request failed", error);
      }
      const feedback = accountFeedback(input.action, result);
      if (result?.ok === false && result.error === "not_found") router.refresh();
      if (open && !result?.ok) {
        setDialogError(feedback.text);
        return;
      }
      decided.current = true;
      setOpen(false);
      report(feedback);
    });
  };

  return (
    <div
      role="group"
      aria-label={t.actions.label(name)}
      aria-busy={working || undefined}
      className="flex flex-wrap items-center gap-2"
    >
      {suspended ? (
        <Button
          variant="secondary"
          loading={working}
          onClick={() => decide({ action: "unsuspend", profileId })}
        >
          {t.actions.unsuspend}
        </Button>
      ) : (
        <Button
          variant="danger"
          disabled={working}
          onClick={(event) => {
            opener.current = event.currentTarget;
            decided.current = false;
            setDialogError(null);
            setDialogKey((key) => key + 1);
            setOpen(true);
          }}
        >
          {t.actions.suspend}
        </Button>
      )}
      <ReasonDialog
        key={dialogKey}
        open={open}
        copy={{
          title: t.dialog.title,
          text: t.dialog.text,
          reason: t.dialog.reason,
          confirm: t.dialog.confirm,
          tone: "danger",
          templates: t.suspendTemplates,
        }}
        working={working}
        error={dialogError}
        onClose={() => setOpen(false)}
        onConfirm={(reason) => decide({ action: "suspend", profileId, reason })}
        onCloseAutoFocus={(event) => {
          // After a decision, the outcome takes the focus (ModerationFeedback).
          event.preventDefault();
          if (!decided.current && opener.current?.isConnected) opener.current.focus();
        }}
      />
    </div>
  );
}
