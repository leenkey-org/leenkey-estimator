"use client";

import type { FormEvent, ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "./button";
import { facadeScope } from "./facade-root";
import { IconButton } from "./icon-button";
import { InlineAlert } from "./inline-alert";
import { cn } from "@/lib/utils";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  /** Fields between the text and the actions (« Prix de vente final »). */
  children?: ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  labels: { back: string; close: string; cancel: string };
  working: boolean;
  /** Why the action failed, read in the dialog. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
};

/**
 * Dialog / confirmation screen (docs/DESIGN.md 10.8): a full screen with a
 * back header on a phone (title 15 px 600 centred), a dialog of 520 px in the
 * centre from 768 px (title 20 px 700 wide, a cross, actions on the right),
 * layer 60. Closed by Échap, the cross or « Annuler », never while the action
 * runs; an error stays in the dialog, in a region read when it appears.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  confirmVariant = "primary",
  labels,
  working,
  error,
  onConfirm,
  onClose,
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!working) onConfirm();
  };
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !working) onClose();
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
            {/* The whole question, on two lines if needed: never cut. */}
            <DialogPrimitive.Title className="min-w-0 flex-1 text-center text-lk-title font-semibold text-balance text-lk-ink md:text-left md:text-lk-h2 md:font-bold md:text-wide">
              {title}
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
          <form
            onSubmit={submit}
            noValidate
            className="flex flex-col gap-4 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6"
          >
            <DialogPrimitive.Description className="text-lk-secondary text-pretty text-lk-ink-2">
              {description}
            </DialogPrimitive.Description>
            {children}
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
                <Button type="button" variant="outline-ink" disabled={working}>
                  {labels.cancel}
                </Button>
              </DialogPrimitive.Close>
              <Button type="submit" variant={confirmVariant} loading={working}>
                {confirmLabel}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
