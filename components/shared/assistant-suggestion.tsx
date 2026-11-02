"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "./button";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export type AssistantSuggestionState = "loading" | "ready" | "error";

/**
 * AssistantSuggestion (docs/DESIGN.md 10.5; SPEC-V2 section 7: the only form
 * of a proposal of the assistant): blue tint, --lk-blue-line border, radius
 * of the D charter (16), padding 12 × 14, gap 10. Header: Sparkles 16 px and
 * its title in 12 px 600 blue (« Réponse suggérée par l'assistant »,
 * « Proposition de l'assistant »); the text 13 px navy; « Utiliser »
 * (primary sm, flex 1), « Modifier » (secondary sm, flex 1), « Ignorer »
 * (ghost, grey). While the assistant writes, lines of skeleton; when it
 * cannot, why, and « Ignorer » alone. The focus comes to it once its text
 * is there (the button that asked for it is gone). Its buttons never submit
 * the form around it (the price step).
 */
export function AssistantSuggestion({
  title,
  state,
  text,
  error,
  loadingLabel,
  useLabel,
  editLabel,
  dismissLabel,
  onUse,
  onEdit,
  onDismiss,
  className,
}: {
  title: string;
  state: AssistantSuggestionState;
  /** The text proposed (ready). */
  text?: string;
  /** Why there is none (error): a sentence, a link. */
  error?: ReactNode;
  /** « L'assistant rédige… », read while it writes. */
  loadingLabel: string;
  useLabel: string;
  editLabel: string;
  dismissLabel: string;
  onUse: (text: string) => void;
  onEdit: (text: string) => void;
  onDismiss: () => void;
  className?: string;
}) {
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    if (state !== "loading") box.current?.focus();
  }, [state]);

  return (
    <section
      ref={box}
      tabIndex={-1}
      aria-label={title}
      aria-busy={state === "loading" || undefined}
      className={cn(
        "flex flex-col gap-2.5 rounded-lk-md border border-lk-blue-line bg-lk-blue-tint px-3.5 py-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
        className,
      )}
    >
      {/* Named by its title (aria-label): the heading is not a section of the page. */}
      <p
        aria-hidden="true"
        className="flex items-center gap-2 text-lk-caption font-semibold text-lk-blue"
      >
        <Sparkles className="size-4 shrink-0" />
        {title}
      </p>
      <div aria-live="polite" className="flex flex-col gap-2.5">
        {state === "loading" ? (
          <div className="flex flex-col gap-1.5">
            <span className="sr-only">{loadingLabel}</span>
            <Skeleton className="h-3.5 w-full bg-lk-blue-line" />
            <Skeleton className="h-3.5 w-11/12 bg-lk-blue-line" />
            <Skeleton className="h-3.5 w-2/3 bg-lk-blue-line" />
          </div>
        ) : state === "error" ? (
          <div className="text-lk-secondary text-lk-navy">{error}</div>
        ) : (
          <p className="text-lk-secondary whitespace-pre-wrap text-lk-navy wrap-anywhere">{text}</p>
        )}
      </div>
      {state === "ready" && text ? (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" className="flex-1" onClick={() => onUse(text)}>
            {useLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => onEdit(text)}
          >
            {editLabel}
          </Button>
          <Button type="button" size="sm" variant="ghost" muted onClick={onDismiss}>
            {dismissLabel}
          </Button>
        </div>
      ) : state === "error" ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="ghost" muted onClick={onDismiss}>
            {dismissLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
