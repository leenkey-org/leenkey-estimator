"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { fr } from "@/lib/i18n/fr";
import { KNOWLEDGE_FILE_MAX } from "@/lib/validations/admin-assistant";
import { embedKnowledge, importKnowledgeFile, type KnowledgeImportResult } from "../actions";

const t = fr.adminAssistant.faq;

type Outcome = { tone: "success" | "warning" | "danger"; text: string } | null;

function importOutcome(result: KnowledgeImportResult | null): Outcome {
  if (!result) return { tone: "danger", text: t.errors.unavailable };
  if (!result.ok) {
    const errors = t.import.errors;
    const text =
      result.error === "metadata"
        ? errors.metadata(result.question ?? "")
        : result.error === "empty"
          ? errors.empty
          : result.error === "fileName"
            ? errors.fileName
            : result.error === "invalid"
              ? errors.invalid
              : result.error === "auth"
                ? t.errors.auth
                : t.errors.unavailable;
    return { tone: "danger", text };
  }
  const { fileName, inserted, updated, removed, unchanged, embedding } = result.data;
  const done = t.import.done(fileName, inserted, updated, removed, unchanged);
  return !embedding || embedding.remaining
    ? { tone: "warning", text: `${done} ${t.import.embedLater}` }
    : { tone: "success", text: done };
}

/**
 * « Importer un fichier » of /admin/assistant (L1-30d): a Markdown file of
 * the FAQ, read in the browser, imported by the server (the base checks each
 * card), then the cards without an embedding computed.
 */
export function KnowledgeImport() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [working, start] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) {
      setOutcome({ tone: "danger", text: t.import.errors.noFile });
      input.current?.focus();
      return;
    }
    if (file.size > KNOWLEDGE_FILE_MAX) {
      setOutcome({ tone: "danger", text: t.import.errors.tooLarge });
      return;
    }
    start(async () => {
      let result: KnowledgeImportResult | null = null;
      try {
        result = await importKnowledgeFile({ fileName: file.name, content: await file.text() });
      } catch {
        // Network lost, or a page older than the last deployment.
      }
      setOutcome(importOutcome(result));
      if (result?.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-lk-label font-semibold text-lk-ink">
          {t.import.file}
          <input
            ref={input}
            type="file"
            accept=".md,text/markdown,text/plain"
            className="min-h-11 rounded-lk-sm border border-lk-line-strong bg-lk-surface px-3 py-2 text-lk-secondary font-normal text-lk-ink-2 file:mr-3 file:rounded-full file:border-0 file:bg-lk-stone-2 file:px-3 file:py-1.5 file:font-semibold file:text-lk-ink"
          />
        </label>
        <Button type="submit" variant="secondary" className="h-11" loading={working}>
          {working ? t.import.importing : t.import.submit}
        </Button>
      </div>
      <div aria-live="polite">
        {outcome ? (
          <InlineAlert tone={outcome.tone} live={false}>
            {outcome.text}
          </InlineAlert>
        ) : null}
      </div>
    </form>
  );
}

/**
 * « Calculer les fiches manquantes »: what an import or the seed left to
 * compute. Always in the page: once nothing is missing, the button goes but
 * its outcome stays, and takes the focus the button had.
 */
export function EmbedButton({ missing }: { missing: number }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [working, start] = useTransition();
  const message = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      {missing > 0 ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={working}
          onClick={() =>
            start(async () => {
              let result: Awaited<ReturnType<typeof embedKnowledge>> | null = null;
              try {
                result = await embedKnowledge();
              } catch {
                // The message below.
              }
              setOutcome(
                result?.ok
                  ? result.data.remaining
                    ? { tone: "warning", text: t.embedMore(result.data.embedded) }
                    : { tone: "success", text: t.embedDone(result.data.embedded) }
                  : {
                      tone: "danger",
                      text: result?.error === "auth" ? t.errors.auth : t.errors.unavailable,
                    },
              );
              if (result?.ok) {
                router.refresh();
                if (!result.data.remaining) requestAnimationFrame(() => message.current?.focus());
              }
            })
          }
        >
          {working ? t.embedding : t.embed}
        </Button>
      ) : null}
      <div ref={message} tabIndex={-1} aria-live="polite" className="outline-none">
        {outcome ? (
          <InlineAlert tone={outcome.tone} live={false}>
            {outcome.text}
          </InlineAlert>
        ) : null}
      </div>
    </div>
  );
}
