"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { Select } from "@/components/shared/select";
import { guessDocumentType, type DocumentType } from "@/lib/config/documents";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { DOCUMENT_TITLE_MAX } from "@/lib/validations/sale-file";
import { fileDocument } from "../actions";
import { sendSaleFile } from "./send-file";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.seller.upload;
type UploadError = keyof typeof t.errors;

/**
 * « Déposer un document » (SPEC-V2 15): a PDF, a JPEG or a PNG of 20 MB at
 * most, its type chosen at the sending (preselected from the name of the
 * file when it says it). The file goes from the browser to the private
 * bucket through a signed URL made by the server for this one file (a
 * server action carries 4 MB), then the server checks and files it.
 */
export function UploadForm({
  propertyId,
  types,
}: {
  propertyId: string;
  /** The types offered, the ones of the checklist first (never the DDT: it has its own deposit). */
  types: readonly DocumentType[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType | "">("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);
  const [added, setAdded] = useState(false);

  function choose(chosen: File | null) {
    setFile(chosen);
    setError(null);
    setAdded(false);
    if (!chosen) return;
    const guessed = guessDocumentType(chosen.name);
    if (guessed && types.includes(guessed)) {
      setType(guessed);
      if (!title.trim()) setTitle(fr.saleFile.types[guessed]);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setAdded(false);
    if (!file || !type || !title.trim()) return setError("invalid");
    setBusy(true);
    setError(null);
    try {
      const sent = await sendSaleFile(propertyId, file);
      if (!sent.ok) return setError(sent.error);
      const filed = await fileDocument({ propertyId, path: sent.path, type, title });
      if (!filed.ok) return setError(filed.error);
      setFile(null);
      setType("");
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      setAdded(true);
      router.refresh();
    } catch (caught) {
      console.error("[sale-file] document not sent", caught);
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <h3 className="text-lk-body font-semibold text-lk-ink">{t.title}</h3>
      <Input
        ref={fileRef}
        type="file"
        label={t.file}
        help={t.fileHelp}
        accept="application/pdf,image/jpeg,image/png"
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
        className="h-auto py-2.5"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label={t.type}
          placeholder={t.typePlaceholder}
          value={type}
          onChange={(event) => {
            const next = event.target.value as DocumentType | "";
            // The name follows the type while it is still the label of a type.
            const labels: readonly string[] = Object.values(fr.saleFile.types);
            if (next && (!title.trim() || labels.includes(title))) {
              setTitle(fr.saleFile.types[next]);
            }
            setType(next);
          }}
        >
          {types.map((value) => (
            <option key={value} value={value}>
              {fr.saleFile.types[value]}
            </option>
          ))}
        </Select>
        <Input
          label={t.name}
          help={t.nameHelp}
          value={title}
          maxLength={DOCUMENT_TITLE_MAX}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      {error ? <InlineAlert tone="danger">{t.errors[error]}</InlineAlert> : null}
      {added ? <InlineAlert tone="success">{t.added}</InlineAlert> : null}
      {busy ? (
        <p role="status" className="text-lk-caption text-lk-ink-3">
          {t.sending}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" loading={busy} className="self-start">
        {t.submit}
      </Button>
    </form>
  );
}
