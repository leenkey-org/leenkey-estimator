"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import type { DocumentType } from "@/lib/config/documents";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { fileDdt, setDdtCoverage } from "../actions";
import { sendSaleFile } from "./send-file";

// The DDT filed at once (DECISIONS.md 2026-11-23, level A): the one file a
// diagnostician gives, filed once, and the diagnostics it holds, ticked by
// its seller among the diagnostic lines of the property.

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.seller.ddt;
type DdtError = keyof typeof t.errors;

/** The diagnostics a DDT holds, as boxes to tick. */
function CoverageBoxes({
  diagnostics,
  covers,
  disabled,
  onChange,
}: {
  diagnostics: readonly DocumentType[];
  covers: readonly DocumentType[];
  disabled: boolean;
  onChange: (covers: DocumentType[]) => void;
}) {
  const help = useId();
  return (
    <fieldset aria-describedby={help} className="flex flex-col gap-2">
      <legend className="text-lk-secondary font-semibold text-lk-ink">{t.covers}</legend>
      <p id={help} className="text-lk-caption text-pretty text-lk-ink-3">
        {t.coversHelp}
      </p>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        {diagnostics.map((type) => (
          <Checkbox
            key={type}
            label={fr.saleFile.types[type]}
            checked={covers.includes(type)}
            disabled={disabled}
            // A line of 44 px for the finger.
            containerClassName="min-h-11 justify-center"
            onChange={(event) =>
              onChange(
                // Kept in the order of the lines.
                diagnostics.filter((other) =>
                  other === type ? event.target.checked : covers.includes(other),
                ),
              )
            }
          />
        ))}
      </div>
    </fieldset>
  );
}

/**
 * « Déposer mon DDT (un seul fichier) »: the file, and the diagnostics it
 * holds (all ticked at first, one at least). Sent as every document of the
 * sale file: from the browser to the private bucket, then checked and filed
 * by the server.
 */
export function DdtUploadForm({
  propertyId,
  diagnostics,
}: {
  propertyId: string;
  /** The diagnostic lines of the property, in their order. */
  diagnostics: readonly DocumentType[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [covers, setCovers] = useState<DocumentType[]>([...diagnostics]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DdtError | null>(null);

  if (!open) {
    return (
      <Button type="button" className="self-start" onClick={() => setOpen(true)}>
        {t.action}
      </Button>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!file) return setError("invalid");
    if (covers.length === 0) return setError("none");
    setBusy(true);
    setError(null);
    try {
      const sent = await sendSaleFile(propertyId, file);
      if (!sent.ok) return setError(sent.error);
      const filed = await fileDdt({ propertyId, path: sent.path, covers });
      if (!filed.ok) return setError(filed.error);
      // The tab reads itself again: the DDT filed takes the place of this form.
      router.refresh();
    } catch (caught) {
      console.error("[sale-file] DDT not sent", caught);
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <h4 className="text-lk-secondary font-semibold text-lk-ink">{t.formTitle}</h4>
      <Input
        type="file"
        label={t.file}
        help={t.fileHelp}
        accept="application/pdf,image/jpeg,image/png"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          setError(null);
        }}
        className="h-auto py-2.5"
      />
      <CoverageBoxes
        diagnostics={diagnostics}
        covers={covers}
        disabled={busy}
        onChange={(next) => {
          setCovers(next);
          setError(null);
        }}
      />
      {error ? <InlineAlert tone="danger">{t.errors[error]}</InlineAlert> : null}
      {busy ? (
        <p role="status" className="text-lk-caption text-lk-ink-3">
          {t.sending}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {t.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setFile(null);
            setError(null);
          }}
        >
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

/** « Modifier les diagnostics couverts » of a DDT filed: the same boxes, saved at once. */
export function DdtCoverageEditor({
  propertyId,
  documentId,
  diagnostics,
  covers,
}: {
  propertyId: string;
  documentId: string;
  /** The diagnostic lines of the property, in their order. */
  diagnostics: readonly DocumentType[];
  /** What the DDT covers now. */
  covers: readonly DocumentType[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<DocumentType[]>([]);
  const [error, setError] = useState<DdtError | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <span className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setChosen(diagnostics.filter((type) => covers.includes(type)));
            setError(null);
            setSaved(false);
            setOpen(true);
          }}
        >
          {t.edit}
        </Button>
        {saved ? (
          <span role="status" className="px-3 text-lk-caption text-lk-ink-2">
            {t.saved}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <form
      noValidate
      className="flex w-full flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (chosen.length === 0) return setError("none");
        start(async () => {
          const result = await setDdtCoverage({ propertyId, documentId, covers: chosen }).catch(
            () => null,
          );
          if (!result?.ok) return setError(result?.error ?? "unavailable");
          setOpen(false);
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <CoverageBoxes
        diagnostics={diagnostics}
        covers={chosen}
        disabled={pending}
        onChange={(next) => {
          setChosen(next);
          setError(null);
        }}
      />
      {error ? <InlineAlert tone="danger">{t.errors[error]}</InlineAlert> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={pending}>
          {t.save}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
