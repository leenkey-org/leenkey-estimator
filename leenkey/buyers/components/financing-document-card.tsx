"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { Select } from "@/components/shared/select";
import { reducePhoto } from "@/leenkey/properties/components/reduce-photo";
import { formatDate } from "@/lib/format";
import { frFinancingDocument } from "@/lib/i18n/sections/financingDocument";
import {
  FINANCING_DOCUMENT_TYPES,
  FINANCING_UPLOAD_MAX_BYTES,
  isFinancingDocumentOld,
  todayInParis,
  type FinancingDocumentField,
} from "@/lib/validations/buyer";
import {
  addFinancingDocument,
  removeFinancingDocument,
  type AddFinancingDocumentResult,
  type FinancingDocumentError,
} from "../actions";
import type { FinancingDocumentView } from "../queries";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { financingDocument: frFinancingDocument } as const;

const t = fr.financingDocument;

// The proof of financing of the buyer, on its project page (L2-02, SPEC-V2
// 8.9): the document in force (its type, its date, « Voir le document », its
// check by Leenkey), « Remplacer » and « Retirer »; else the form: type, date
// of the document, a PDF or an image. A document older than three months is
// said so, never refused. The server keeps the state (the status of the
// file is read again by the page).

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

const failure: Record<FinancingDocumentError, string> = {
  auth: t.errors.signedOut,
  invalid: t.errors.generic,
  unsupported: t.errors.unsupported,
  too_heavy: t.errors.tooHeavy,
  too_many: t.errors.tooMany,
  unavailable: t.errors.generic,
};

/** The file to send: a heavy image is redrawn lighter; a PDF goes as it is. */
async function fileToSend(file: File): Promise<Blob | "unsupported" | "too_heavy"> {
  if (file.type === "application/pdf") {
    return file.size > FINANCING_UPLOAD_MAX_BYTES ? "too_heavy" : file;
  }
  const reduced = await reducePhoto(file);
  if (!reduced.ok) return reduced.error === "too_heavy" ? "too_heavy" : "unsupported";
  return reduced.blob.size > FINANCING_UPLOAD_MAX_BYTES ? "too_heavy" : reduced.blob;
}

export function FinancingDocumentCard({
  initial,
  checkedAt,
}: {
  initial: FinancingDocumentView | null;
  /** When Leenkey checked the document in force, null before. */
  checkedAt: string | null;
}) {
  const router = useRouter();
  const [document, setDocument] = useState(initial);
  const [checked, setChecked] = useState(checkedAt);
  const [replacing, setReplacing] = useState(false);
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FinancingDocumentField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [working, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const noticeRef = useRef<HTMLParagraphElement | null>(null);

  // The page read again (a check by the team, another tab).
  useEffect(() => {
    setDocument(initial);
    setChecked(checkedAt);
  }, [initial, checkedAt]);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const showForm = !document || replacing;
  const now = new Date();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInput.current?.files?.[0] ?? null;
    const found: Partial<Record<FinancingDocumentField, string>> = {};
    if (!type) found.type = t.errors.type;
    if (!date || date > todayInParis()) found.documentDate = t.errors.date;
    if (!file) found.file = t.errors.file;
    setErrors(found);
    setError(null);
    setNotice(null);
    if (!file || Object.keys(found).length > 0) return;
    startTransition(async () => {
      const blob = await fileToSend(file);
      if (typeof blob === "string") {
        setErrors({ file: blob === "too_heavy" ? t.errors.tooHeavy : t.errors.unsupported });
        return;
      }
      const form = new FormData();
      form.set("type", type);
      form.set("documentDate", date);
      form.set("file", blob, "justificatif");
      let result: AddFinancingDocumentResult | null = null;
      try {
        result = await addFinancingDocument(form);
      } catch (cause) {
        console.error("[buyers] financing document request failed", cause);
      }
      if (!result?.ok) {
        const fields = result?.fields ?? [];
        if (result?.error === "invalid" && fields.length > 0) {
          setErrors({
            ...(fields.includes("type") ? { type: t.errors.type } : {}),
            ...(fields.includes("documentDate") ? { documentDate: t.errors.date } : {}),
            ...(fields.includes("file") ? { file: t.errors.file } : {}),
          });
          return;
        }
        if (result?.error === "unsupported" || result?.error === "too_heavy") {
          setErrors({ file: failure[result.error] });
          return;
        }
        setError(failure[result?.error ?? "unavailable"]);
        return;
      }
      setDocument(result.data.document);
      setChecked(null);
      setReplacing(false);
      setType("");
      setDate("");
      setNotice(t.added);
      router.refresh();
    });
  }

  function remove() {
    if (!document) return;
    startTransition(async () => {
      const result = await removeFinancingDocument(document.id).catch(() => null);
      if (!result?.ok) {
        setRemoveError(result?.error === "auth" ? t.errors.signedOut : t.errors.removeFailed);
        return;
      }
      setConfirming(false);
      setDocument(null);
      setChecked(null);
      setReplacing(false);
      setNotice(t.removed);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="justificatif" className="mt-8 flex flex-col gap-4">
      <h2 id="justificatif" className="text-lk-h3 font-bold text-wide text-lk-ink">
        {t.title}
      </h2>
      <p className="text-lk-secondary text-pretty text-lk-ink-2">{t.accepted}</p>
      <InfoNote>
        <p>{t.privacy}</p>
      </InfoNote>

      {notice ? (
        <p
          ref={noticeRef}
          tabIndex={-1}
          role="status"
          className="rounded-lk-md bg-lk-success-bg px-4 py-3 text-lk-secondary font-semibold text-lk-success-fg outline-none"
        >
          {notice}
        </p>
      ) : null}

      {document ? (
        <div className="flex flex-col gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-blue">
              <FileText aria-hidden="true" className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-lk-label font-semibold text-lk-ink">{t.types[document.type]}</p>
              <p className="text-lk-caption text-lk-ink-3">
                {t.documentDate(formatDate(`${document.documentDate}T12:00:00Z`, now))}
              </p>
              <p className="text-lk-secondary text-lk-ink-2">
                {checked ? t.checked(formatDate(checked, now)) : t.provided}
              </p>
            </div>
          </div>
          {!checked && isFinancingDocumentOld(document.documentDate, now) ? (
            <InlineAlert tone="warning">{t.old}</InlineAlert>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <a
                href={`/documents/financement/${document.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {document.isPdf ? t.openPdf : t.open}
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={working}
              onClick={() => {
                setReplacing((value) => !value);
                setErrors({});
                setError(null);
              }}
            >
              {replacing ? t.cancel : t.replace}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={working}
              onClick={() => {
                setRemoveError(null);
                setConfirming(true);
              }}
            >
              {t.remove}
            </Button>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
          <Select
            label={t.type}
            placeholder={t.typePlaceholder}
            value={type}
            error={errors.type}
            onChange={(event) => {
              setType(event.target.value);
              setErrors((current) => ({ ...current, type: undefined }));
            }}
          >
            {FINANCING_DOCUMENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {t.types[value]}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            label={t.date}
            help={t.dateHelp}
            max={todayInParis()}
            value={date}
            error={errors.documentDate}
            onChange={(event) => {
              setDate(event.target.value);
              setErrors((current) => ({ ...current, documentDate: undefined }));
            }}
          />
          {date && date <= todayInParis() && isFinancingDocumentOld(date, now) ? (
            <InlineAlert tone="warning">{t.old}</InlineAlert>
          ) : null}
          <Input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            label={t.file}
            help={t.fileHelp}
            error={errors.file}
            onChange={() => setErrors((current) => ({ ...current, file: undefined }))}
          />
          <div>
            <Button type="submit" loading={working}>
              {t.submit}
            </Button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title={t.removeDialog.title}
        description={t.removeDialog.description}
        confirmLabel={t.removeDialog.confirm}
        confirmVariant="danger"
        labels={{
          back: t.removeDialog.back,
          close: t.removeDialog.close,
          cancel: t.removeDialog.cancel,
        }}
        working={working}
        error={removeError}
        onConfirm={remove}
        onClose={() => setConfirming(false)}
      />
    </section>
  );
}
