"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { Textarea } from "@/components/shared/textarea";
import { frIdentityDocument } from "@/lib/i18n/sections/identityDocument";
import { IDENTITY_NOTE_MAX } from "@/lib/validations/admin";
import {
  checkIdentityDocument,
  deleteEndedIdentityFile,
  refuseIdentityDocument,
  type IdentityDecisionResult,
  type IdentityFileDeleteResult,
} from "../users/actions";
import { useModerationFeedback } from "./listing-moderation";
import { ReasonDialog } from "./reason-dialog";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { identityDocument: frIdentityDocument } as const;

const t = fr.identityDocument.admin;

// The identity document of a buyer, on the sheet of its account (DECISIONS.md
// 2026-11-23): an internal note, optional, then « Marquer comme vérifiée » or
// « Refuser », which asks for a reason its buyer reads. The outcome shows at
// the top of the sheet (ModerationFeedback). Never « Valider l'identité »:
// the team looks at a document, it guarantees nothing.

export function IdentityCheck({
  documentId,
  profileId,
}: {
  documentId: string;
  profileId: string;
}) {
  const report = useModerationFeedback();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [working, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const decided = useRef(false);
  const tooLong = note.trim().length > IDENTITY_NOTE_MAX;
  const count = t.noteHelp(String(note.trim().length), String(IDENTITY_NOTE_MAX));

  const decide = (reason: string | null) => {
    startTransition(async () => {
      let result: IdentityDecisionResult | null = null;
      try {
        result =
          reason === null
            ? await checkIdentityDocument({ documentId, profileId, note })
            : await refuseIdentityDocument({ documentId, profileId, reason, note });
      } catch (error) {
        console.error("[admin] identity decision request failed", error);
      }
      if (result?.ok) {
        decided.current = true;
        setOpen(false);
        report(
          result.data.fileDeleted
            ? { tone: "success", text: reason === null ? t.done : t.refusedDone }
            : { tone: "warning", text: t.doneFileKept },
        );
        return;
      }
      // A reason refused by the server: said in the dialog, which stays open.
      if (open && result?.error === "invalid") {
        setDialogError(t.invalid);
        return;
      }
      decided.current = true;
      setOpen(false);
      // Withdrawn, replaced or already decided since the page was shown.
      if (result?.error === "conflict" || result?.error === "not_found") {
        router.refresh();
        report({ tone: "warning", text: t.stale });
        return;
      }
      report({ tone: "danger", text: t.failed, reload: result === null });
    });
  };

  return (
    <div role="group" aria-label={t.actions} className="flex flex-col gap-3">
      <Textarea
        label={t.note}
        optional
        rows={3}
        placeholder={t.notePlaceholder}
        value={note}
        maxLength={IDENTITY_NOTE_MAX + 200}
        help={count}
        error={tooLong ? count : undefined}
        onChange={(event) => setNote(event.target.value)}
      />
      <p className="text-lk-caption text-lk-ink-3">{t.checkHelp}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => decide(null)} loading={working && !open} disabled={tooLong}>
          {t.check}
        </Button>
        <Button
          variant="secondary"
          disabled={working || tooLong}
          onClick={(event) => {
            opener.current = event.currentTarget;
            decided.current = false;
            setDialogError(null);
            setDialogKey((key) => key + 1);
            setOpen(true);
          }}
        >
          {t.refuse}
        </Button>
      </div>
      <ReasonDialog
        key={dialogKey}
        open={open}
        copy={{
          title: t.dialog.title,
          text: t.dialog.text,
          reason: t.dialog.reason,
          confirm: t.dialog.confirm,
          tone: "primary",
          templates: t.refuseTemplates,
        }}
        working={working}
        error={dialogError}
        onClose={() => setOpen(false)}
        onConfirm={(reason) => decide(reason)}
        onCloseAutoFocus={(event) => {
          // After a decision, the outcome takes the focus (ModerationFeedback).
          event.preventDefault();
          if (!decided.current && opener.current?.isConnected) opener.current.focus();
        }}
      />
    </div>
  );
}

/**
 * « Supprimer le fichier », on the line of a document checked, refused or
 * withdrawn whose file is still stored (a deletion that failed): the same
 * deletion, tried again. The outcome shows at the top of the sheet.
 */
export function IdentityFileDelete({
  documentId,
  profileId,
}: {
  documentId: string;
  profileId: string;
}) {
  const report = useModerationFeedback();
  const [working, startTransition] = useTransition();

  const remove = () => {
    startTransition(async () => {
      let result: IdentityFileDeleteResult | null = null;
      try {
        result = await deleteEndedIdentityFile({ documentId, profileId });
      } catch (error) {
        console.error("[admin] identity file deletion request failed", error);
      }
      report(
        result?.ok
          ? { tone: "success", text: t.fileDeletedDone }
          : { tone: "danger", text: t.fileDeleteFailed, reload: result === null },
      );
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-lk-caption text-lk-ink-3">{t.fileKept}</p>
      <Button variant="secondary" size="sm" onClick={remove} loading={working}>
        {t.deleteFile}
      </Button>
    </div>
  );
}
