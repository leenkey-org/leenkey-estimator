"use client";

import { useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, Sparkles, X } from "lucide-react";
import { AssistantSuggestion } from "@/components/shared/assistant-suggestion";
import { Button } from "@/components/shared/button";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Textarea } from "@/components/shared/textarea";
import { SuggestionErrorText, useSuggestion } from "@/leenkey/ai/components/use-suggestion";
import type { SuggestionResult } from "@/leenkey/ai/types";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { REASON_MIN, reasonLength } from "@/lib/validations/admin";

const t = fr.adminListings;

export type ReasonDialogCopy = {
  title: string;
  text: string;
  /** Name of the field: who reads the motive. */
  reason: string;
  confirm: string;
  /** danger: a suspension; primary: a refusal. */
  tone: "danger" | "primary";
  /** Frequent motives, buttons that fill the field. */
  templates: readonly string[];
  /** Help of the field (what becomes of the text); « envoyé tel quel » by default. */
  hint?: string;
};

/**
 * Motive of a decision of the back office (docs/DESIGN.md 10.8: refusal or
 * suspension of a listing, L1-19; suspension of an account, L1-30a): a full
 * screen with a back header on a phone, a dialog of 520 px from 768 px. The
 * frequent motives fill the field; at least 3 characters (REASON_MIN), the
 * focus goes to the field otherwise.
 */
export function ReasonDialog({
  open,
  copy,
  working,
  error,
  onClose,
  onConfirm,
  onCloseAutoFocus,
  draft,
}: {
  open: boolean;
  copy: ReasonDialogCopy;
  working: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  onCloseAutoFocus: (event: Event) => void;
  /**
   * « Rédiger avec l'assistant » (refusal of a listing, L1-30d): a motive
   * proposed from what the field holds, in an AssistantSuggestion under it;
   * « Utiliser » or « Modifier » put it in the field, nothing is sent.
   */
  draft?: (notes: string) => Promise<SuggestionResult>;
}) {
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const draftButton = useRef<HTMLButtonElement>(null);
  const { suggestion, ask, reset } = useSuggestion();
  const assistant = fr.assistant.suggestion;

  /** The proposal closes; the focus goes back to the button that asked for it. */
  const closeSuggestion = () => {
    reset();
    requestAnimationFrame(() => draftButton.current?.focus());
  };
  const fill = (text: string) => {
    setReason(text);
    setInvalid(false);
  };
  const labels = t.reasonDialog;
  const { templates } = copy;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (reasonLength(reason) < REASON_MIN) {
      // The error in the page first: the field gives it with its name.
      flushSync(() => setInvalid(true));
      field.current?.focus();
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(open) => {
        if (!open && !working) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-60 bg-lk-ink/40 duration-220",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            facadeScope,
            "fixed inset-0 z-60 flex flex-col overflow-y-auto bg-lk-surface outline-none",
            "md:top-1/2 md:right-auto md:bottom-auto md:left-1/2 md:max-h-[85vh] md:w-130 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lk-md md:shadow-float",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none",
          )}
        >
          {/* Phone: the AppHeader (back, title 15 px 600 centred); dialog: title 20 px 700 and a cross. */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-lk-line px-5 pt-5 pb-3.5 md:flex md:border-0 md:px-6 md:pt-6 md:pb-0">
            <DialogPrimitive.Close asChild>
              <IconButton
                icon={ChevronLeft}
                variant="stone"
                aria-label={labels.back}
                disabled={working}
                className="md:hidden"
              />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-center text-lk-title font-semibold text-lk-ink md:whitespace-normal md:text-left md:text-lk-h2 md:font-bold md:text-wide">
              {copy.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton
                icon={X}
                aria-label={labels.close}
                variant="transparent"
                size="sm"
                disabled={working}
                className="hidden md:inline-flex"
              />
            </DialogPrimitive.Close>
            <span aria-hidden="true" className="size-11 md:hidden" />
          </div>
          <div className="flex flex-col gap-4 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
            <DialogPrimitive.Description className="text-lk-secondary text-lk-ink-2">
              {copy.text}
            </DialogPrimitive.Description>
            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-lk-label font-semibold text-lk-ink">
                  {labels.templates}
                </legend>
                {templates.map((template) => (
                  <button
                    key={template}
                    type="button"
                    aria-pressed={reason === template}
                    onClick={() => {
                      setReason(template);
                      setInvalid(false);
                    }}
                    className={cn(
                      "min-h-11 rounded-lk-sm border-[1.5px] px-3.5 py-2.5 text-left text-lk-secondary transition-colors duration-140 ease-out-lk",
                      reason === template
                        ? "border-lk-blue bg-lk-blue-tint text-lk-navy"
                        : "border-lk-line bg-lk-surface text-lk-ink hover:bg-lk-stone-2",
                    )}
                  >
                    {template}
                  </button>
                ))}
              </fieldset>
              <Textarea
                ref={field}
                label={copy.reason}
                help={copy.hint ?? labels.reasonHint}
                value={reason}
                maxLength={1000}
                required
                error={invalid ? t.errors.invalid : undefined}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (invalid) setInvalid(false);
                }}
              />
              {draft && suggestion.state === "idle" ? (
                <div>
                  <Button
                    ref={draftButton}
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={working}
                    onClick={() => void ask(() => draft(reason))}
                  >
                    <Sparkles aria-hidden="true" />
                    {assistant.draftDescription}
                  </Button>
                </div>
              ) : null}
              {draft && suggestion.state !== "idle" ? (
                <AssistantSuggestion
                  title={assistant.descriptionTitle}
                  state={suggestion.state}
                  text={suggestion.state === "ready" ? suggestion.text : undefined}
                  error={
                    suggestion.state === "error" ? (
                      suggestion.error === "nothing" ? (
                        // Decided meanwhile (another tab, another admin): a retry would not help.
                        <p>{t.review.draftClosed}</p>
                      ) : (
                        <SuggestionErrorText error={suggestion.error} />
                      )
                    ) : null
                  }
                  loadingLabel={assistant.writing}
                  useLabel={assistant.use}
                  editLabel={assistant.edit}
                  dismissLabel={assistant.dismiss}
                  onUse={(text) => {
                    fill(text);
                    closeSuggestion();
                  }}
                  onEdit={(text) => {
                    flushSync(() => {
                      fill(text);
                      reset();
                    });
                    field.current?.focus();
                  }}
                  onDismiss={closeSuggestion}
                />
              ) : null}
              {/* In the page from the opening, so that the error is read; out of the layout while empty. */}
              <div aria-live="polite" className={cn(!error && "sr-only")}>
                {error ? (
                  <InlineAlert tone="danger" live={false}>
                    {error}
                  </InlineAlert>
                ) : null}
              </div>
              <div className="flex flex-col-reverse gap-2.5 md:flex-row md:justify-end">
                <DialogPrimitive.Close asChild>
                  <Button variant="outline-ink" disabled={working}>
                    {labels.cancel}
                  </Button>
                </DialogPrimitive.Close>
                <Button type="submit" variant={copy.tone} loading={working}>
                  {copy.confirm}
                </Button>
              </div>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
