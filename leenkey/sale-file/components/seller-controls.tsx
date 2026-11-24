"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Textarea } from "@/components/shared/textarea";
import type { DocumentType } from "@/lib/config/documents";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { EXEMPTION_REASON_MAX, EXEMPTION_REASON_MIN } from "@/lib/validations/sale-file";
import {
  answerAccessRequest,
  clearExemption,
  removeDocument,
  setExemption,
  shareDocuments,
  unshareAll,
} from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.seller;

/** « Retirer » a document, after a confirmation: the buyers it was shared with no longer read it. */
export function RemoveDocumentButton({
  propertyId,
  documentId,
  title,
  description = t.removeDialog.description,
}: {
  propertyId: string;
  documentId: string;
  title: string;
  /** What the removal does, when it is more than the document (a DDT: its lines). */
  description?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t.removeAbout(title)}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {t.remove}
      </Button>
      <ConfirmDialog
        open={open}
        title={t.removeDialog.title}
        description={description}
        confirmLabel={t.removeDialog.confirm}
        confirmVariant="danger"
        labels={t.removeDialog}
        working={pending}
        error={error}
        onConfirm={() =>
          start(async () => {
            const result = await removeDocument(propertyId, documentId).catch(() => null);
            if (!result?.ok) return setError(t.errors.generic);
            setOpen(false);
            router.refresh();
          })
        }
        onClose={() => {
          if (!pending) setOpen(false);
        }}
      />
    </>
  );
}

/** « Non concerné » for a document that does not apply, with its reason; or its cancelling. */
export function ExemptionButton({
  propertyId,
  type,
  exempt,
}: {
  propertyId: string;
  type: DocumentType;
  /** Already « Non concerné »: the button cancels it. */
  exempt: boolean;
}) {
  const router = useRouter();
  const label = fr.saleFile.types[type];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (exempt) {
    return (
      <span className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={pending}
          aria-label={t.exempt.undoAbout(label)}
          onClick={() =>
            start(async () => {
              setError(null);
              const result = await clearExemption(propertyId, type).catch(() => null);
              if (!result?.ok) return setError(t.errors.generic);
              router.refresh();
            })
          }
        >
          {t.exempt.undo}
        </Button>
        {error ? (
          <span role="alert" className="text-lk-caption text-lk-danger">
            {error}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t.exempt.actionAbout(label)}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {t.exempt.action}
      </Button>
      <ConfirmDialog
        open={open}
        title={t.exempt.title(label)}
        description={t.exempt.description}
        confirmLabel={t.exempt.confirm}
        labels={t.exempt}
        working={pending}
        error={error}
        onConfirm={() => {
          const trimmed = reason.trim();
          if (trimmed.length < EXEMPTION_REASON_MIN || trimmed.length > EXEMPTION_REASON_MAX) {
            return setError(t.exempt.reasonError);
          }
          start(async () => {
            const result = await setExemption({ propertyId, type, reason: trimmed }).catch(
              () => null,
            );
            if (!result?.ok) return setError(t.errors.generic);
            setOpen(false);
            setReason("");
            router.refresh();
          });
        }}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
      >
        <Textarea
          label={t.exempt.reasonLabel}
          help={t.exempt.reasonHelp}
          value={reason}
          maxLength={EXEMPTION_REASON_MAX}
          rows={3}
          onChange={(event) => setReason(event.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}

/**
 * « Accorder » or « Refuser » an access request. What came of it is given to
 * the list (AccessRequests), which keeps it: the request answered leaves the
 * page, and these buttons with it.
 */
export function RequestButtons({
  propertyId,
  requestId,
  name,
  onAnswered,
}: {
  propertyId: string;
  requestId: string;
  name: string;
  /** Answered: the confirmation to show in its place. */
  onAnswered: (text: string) => void;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const answer = (grant: boolean) =>
    start(async () => {
      setNotice(null);
      const result = await answerAccessRequest({ propertyId, requestId, grant }).catch(() => null);
      if (!result?.ok) {
        return setNotice({
          tone: "danger",
          text: t.requests.errors[result?.error ?? "unavailable"],
        });
      }
      onAnswered(grant ? t.requests.granted(result.data.shared) : t.requests.declined);
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          aria-label={t.requests.grantAbout(name)}
          onClick={() => answer(true)}
        >
          {t.requests.grant}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          aria-label={t.requests.declineAbout(name)}
          onClick={() => answer(false)}
        >
          {t.requests.decline}
        </Button>
      </div>
      {notice ? <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert> : null}
    </div>
  );
}

/** What a seller shares with one buyer: the whole file, the diagnostics, or nothing any more. */
export function ShareButtons({
  propertyId,
  buyerId,
  name,
  allIds,
  diagnosticIds,
  shared,
}: {
  propertyId: string;
  buyerId: string;
  name: string;
  allIds: string[];
  diagnosticIds: string[];
  /** How many documents are shared with this buyer. */
  shared: number;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const share = (documentIds: string[]) =>
    start(async () => {
      setNotice(null);
      const result = await shareDocuments({ propertyId, documentIds, buyerId }).catch(() => null);
      if (!result?.ok) {
        return setNotice({ tone: "danger", text: t.share.errors[result?.error ?? "unavailable"] });
      }
      setNotice({ tone: "success", text: t.share.done(result.data.shared, name) });
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {shared < allIds.length ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            aria-label={t.share.allAbout(name)}
            onClick={() => share(allIds)}
          >
            {t.share.all}
          </Button>
        ) : null}
        {diagnosticIds.length > 0 && shared < allIds.length ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            aria-label={t.share.diagnosticsAbout(name)}
            onClick={() => share(diagnosticIds)}
          >
            {t.share.diagnostics}
          </Button>
        ) : null}
        {shared > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-label={t.share.stopAbout(name)}
            onClick={() =>
              start(async () => {
                setNotice(null);
                const result = await unshareAll(propertyId, buyerId).catch(() => null);
                if (!result?.ok) return setNotice({ tone: "danger", text: t.errors.generic });
                setNotice({ tone: "success", text: t.share.stopped(name) });
                router.refresh();
              })
            }
          >
            {t.share.stop}
          </Button>
        ) : null}
      </div>
      {notice ? <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert> : null}
    </div>
  );
}
