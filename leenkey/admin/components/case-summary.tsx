"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/shared/button";
import { IconButton } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Skeleton } from "@/components/shared/skeleton";
import { fr } from "@/lib/i18n/fr";
import { caseSummaryAction } from "../cases/actions";

const t = fr.adminCases.caseSummary;

type State =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; text: string }
  | {
      state: "error";
    };

/**
 * « Synthèse avant appel » on the sheet of a case (SPEC-V2 17, L1-30d): the
 * assistant prepares a summary for the team before a call, shown in a box
 * of the blue tint of the assistant (AssistantSuggestion, DESIGN 10.5)
 * that takes the focus and reads its text out; « Fermer » gives the focus
 * back to the button. Nothing is written on the case.
 */
export function CaseSummary({ caseId }: { caseId: string }) {
  const [summary, setSummary] = useState<State>({ state: "idle" });
  const [, start] = useTransition();
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLElement>(null);
  const request = useRef(0);

  useEffect(() => {
    if (summary.state === "loading") box.current?.focus();
  }, [summary.state]);

  function ask() {
    const id = ++request.current;
    setSummary({ state: "loading" });
    start(async () => {
      let result: Awaited<ReturnType<typeof caseSummaryAction>> | null = null;
      try {
        result = await caseSummaryAction({ caseId });
      } catch {
        // Network lost, or a page older than the last deployment.
      }
      if (id !== request.current) return;
      setSummary(result?.ok ? { state: "ready", text: result.data.text } : { state: "error" });
    });
  }

  function close() {
    request.current += 1;
    setSummary({ state: "idle" });
    requestAnimationFrame(() => button.current?.focus());
  }

  if (summary.state === "idle") {
    return (
      <div>
        <Button ref={button} type="button" variant="secondary" size="sm" onClick={ask}>
          <Sparkles aria-hidden="true" />
          {t.button}
        </Button>
      </div>
    );
  }
  return (
    <section
      ref={box}
      tabIndex={-1}
      aria-label={t.title}
      aria-busy={summary.state === "loading" || undefined}
      className="flex flex-col gap-2.5 rounded-lk-md border border-lk-blue-line bg-lk-blue-tint px-3.5 py-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-lk-caption font-semibold text-lk-blue">
          <Sparkles aria-hidden="true" className="size-4" />
          {t.title}
        </p>
        <IconButton icon={X} variant="transparent" size="sm" aria-label={t.close} onClick={close} />
      </div>
      <div aria-live="polite">
        {summary.state === "loading" ? (
          <div className="flex flex-col gap-2">
            <span className="sr-only">{t.writing}</span>
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-9/12" />
            <Skeleton className="h-3 w-10/12" />
          </div>
        ) : summary.state === "ready" ? (
          <p className="text-lk-secondary whitespace-pre-line text-lk-navy">{summary.text}</p>
        ) : (
          <InlineAlert tone="danger" live={false}>
            {t.error}
          </InlineAlert>
        )}
      </div>
      {summary.state === "ready" ? <p className="text-lk-caption text-lk-ink-3">{t.note}</p> : null}
      {summary.state !== "loading" ? (
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={ask}>
            {t.again}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
