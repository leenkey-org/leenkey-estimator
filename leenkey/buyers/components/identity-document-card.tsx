"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { IdCard } from "lucide-react";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { Select } from "@/components/shared/select";
import { reducePhoto } from "@/leenkey/properties/components/reduce-photo";
import { formatDay } from "@/lib/format";
import { frIdentityDocument } from "@/lib/i18n/sections/identityDocument";
import { todayInParis } from "@/lib/validations/buyer";
import {
  IDENTITY_DOCUMENT_TYPES,
  IDENTITY_UPLOAD_MAX_BYTES,
  type IdentityDocumentField,
} from "@/lib/validations/identity";
import {
  addIdentityDocument,
  removeIdentityDocument,
  type AddIdentityDocumentResult,
  type IdentityDocumentError,
} from "../identity-actions";
import type { BuyerIdentity } from "../identity-status";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { identityDocument: frIdentityDocument } as const;

const t = fr.identityDocument;

// The identity document of the buyer (DECISIONS.md 2026-11-23), on its
// project page and in the booking of a visit when it is missing: the
// document deposited (its type, « Voir le document », « Remplacer »,
// « Retirer ») or checked (no file left, no action); else the form: its
// type, a PDF or an image. A refusal of the team is said with its reason.
// The server keeps the state (the page reads it again).

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

const failure: Record<IdentityDocumentError, string> = {
  auth: t.errors.signedOut,
  invalid: t.errors.generic,
  unsupported: t.errors.unsupported,
  too_heavy: t.errors.tooHeavy,
  checked: t.errors.checked,
  unavailable: t.errors.generic,
};

/** The day in Paris of an instant, YYYY-MM-DD. */
const parisDay = (instant: string) => todayInParis(new Date(instant));

/** The file to send: a heavy image is redrawn lighter; a PDF goes as it is. */
async function fileToSend(file: File): Promise<Blob | "unsupported" | "too_heavy"> {
  if (file.type === "application/pdf") {
    return file.size > IDENTITY_UPLOAD_MAX_BYTES ? "too_heavy" : file;
  }
  const reduced = await reducePhoto(file);
  if (!reduced.ok) return reduced.error === "too_heavy" ? "too_heavy" : "unsupported";
  return reduced.blob.size > IDENTITY_UPLOAD_MAX_BYTES ? "too_heavy" : reduced.blob;
}

export function IdentityDocumentCard({
  initial,
  className,
}: {
  initial: BuyerIdentity;
  className?: string;
}) {
  const router = useRouter();
  const [identity, setIdentity] = useState(initial);
  const [replacing, setReplacing] = useState(false);
  const [type, setType] = useState("");
  const [errors, setErrors] = useState<Partial<Record<IdentityDocumentField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [working, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const noticeRef = useRef<HTMLParagraphElement | null>(null);

  // The page read again (a decision of the team, another tab).
  useEffect(() => setIdentity(initial), [initial]);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);
  // An error on a field: the first one takes the focus, its message is read with it.
  useEffect(() => {
    if (Object.values(errors).some(Boolean)) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [errors]);

  const { document } = identity;
  const checked = document?.checkedAt ?? null;
  const showForm = !document || (replacing && !checked);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInput.current?.files?.[0] ?? null;
    const found: Partial<Record<IdentityDocumentField, string>> = {};
    if (!type) found.type = t.errors.type;
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
      form.set("file", blob, "piece");
      let result: AddIdentityDocumentResult | null = null;
      try {
        result = await addIdentityDocument(form);
      } catch (cause) {
        console.error("[buyers] identity document request failed", cause);
      }
      if (!result?.ok) {
        const fields = result?.fields ?? [];
        if (result?.error === "invalid" && fields.length > 0) {
          setErrors({
            ...(fields.includes("type") ? { type: t.errors.type } : {}),
            ...(fields.includes("file") ? { file: t.errors.file } : {}),
          });
          return;
        }
        if (result?.error === "unsupported" || result?.error === "too_heavy") {
          setErrors({ file: failure[result.error] });
          return;
        }
        setError(failure[result?.error ?? "unavailable"]);
        if (result?.error === "checked") router.refresh();
        return;
      }
      setIdentity({ status: "provided", document: result.data.document, refusalReason: null });
      setReplacing(false);
      setType("");
      setNotice(t.added);
      router.refresh();
    });
  }

  function remove() {
    if (!document) return;
    startTransition(async () => {
      const result = await removeIdentityDocument(document.id).catch(() => null);
      if (!result?.ok) {
        setRemoveError(result?.error === "auth" ? t.errors.signedOut : t.errors.removeFailed);
        return;
      }
      setConfirming(false);
      setIdentity({ status: "not_provided", document: null, refusalReason: null });
      setReplacing(false);
      setNotice(t.removed);
      router.refresh();
    });
  }

  return (
    <section id="identite" aria-labelledby="identite-titre" className={className}>
      <div className="flex scroll-mt-24 flex-col gap-4">
        <h2 id="identite-titre" className="text-lk-h3 font-bold text-wide text-lk-ink">
          {t.title}
        </h2>
        {checked ? null : <p className="text-lk-secondary text-pretty text-lk-ink-2">{t.intro}</p>}
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

        {!document && identity.refusalReason ? (
          <InlineAlert tone="warning">
            {t.refused(identity.refusalReason)} {t.refusedNext}
          </InlineAlert>
        ) : null}

        {document ? (
          <div className="flex flex-col gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-blue">
                <IdCard aria-hidden="true" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-lk-label font-semibold text-lk-ink">{t.types[document.type]}</p>
                <p className="text-lk-caption text-lk-ink-3">
                  {t.filed(formatDay(parisDay(document.createdAt)))}
                </p>
                <p className="text-lk-secondary text-lk-ink-2">
                  {checked ? t.checked(formatDay(parisDay(checked))) : t.provided}
                </p>
                {document.fileDeleted ? (
                  <p className="text-lk-caption text-lk-ink-3">{t.fileDeleted}</p>
                ) : null}
              </div>
            </div>
            {/* Once checked: no file left to open, nothing to replace nor to withdraw. */}
            {checked ? null : (
              <div className="flex flex-wrap items-center gap-2">
                {document.fileDeleted ? null : (
                  <Button asChild variant="secondary" size="sm">
                    <a
                      href={`/documents/identite/${document.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {document.isPdf ? t.openPdf : t.open}
                    </a>
                  </Button>
                )}
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
            )}
          </div>
        ) : null}

        {showForm ? (
          <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4">
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
              {IDENTITY_DOCUMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t.types[value]}
                </option>
              ))}
            </Select>
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
      </div>

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
