"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/shared/button";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Textarea } from "@/components/shared/textarea";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { ModerationInput } from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { moderateListing, type ModerationResult } from "../actions";

// Decisions of the back office on a listing (SPEC-V2 section 17): validate
// and publish, refuse with a motive, suspend with a motive, put back online.
// The outcome shows at the top of the page (ModerationFeedback), which stays
// when the row of the listing leaves a filtered list.

type ListingStatus = Database["public"]["Enums"]["listing_status"];
type Feedback = { id: number; tone: "success" | "warning" | "danger"; text: string };

const t = fr.adminListings;

const FeedbackContext = createContext<(feedback: Omit<Feedback, "id">) => void>(() => {});

/** Outcome of the last decision, above the list or the listing. */
export function ModerationFeedback({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  return (
    <FeedbackContext.Provider
      value={(next) => setFeedback((previous) => ({ ...next, id: (previous?.id ?? 0) + 1 }))}
    >
      {feedback ? (
        <InlineAlert key={feedback.id} tone={feedback.tone}>
          {feedback.text}
        </InlineAlert>
      ) : null}
      {children}
    </FeedbackContext.Provider>
  );
}

const DONE = {
  publish: t.result.published,
  reject: t.result.rejected,
  suspend: t.result.suspended,
  unsuspend: t.result.unsuspended,
} as const;

function feedbackFor(action: ModerationInput["action"], result: ModerationResult) {
  if (!result.ok) return { tone: "danger" as const, text: t.errors[ERROR[result.error]] };
  const { email } = result.data;
  if (email === null) return { tone: "success" as const, text: DONE[action] };
  if (email === "failed") {
    return { tone: "warning" as const, text: `${DONE[action]} ${t.result.emailFailed}` };
  }
  const note = email === "sent" ? t.result.emailSent : t.result.emailLogged;
  return { tone: "success" as const, text: `${DONE[action]} ${note}` };
}

const ERROR = {
  invalid: "invalid",
  forbidden: "forbidden",
  not_found: "notFound",
  conflict: "conflict",
  unavailable: "unavailable",
} as const;

export function ListingModeration({
  listingId,
  reference,
  status,
  size = "sm",
  compact = false,
  className,
}: {
  listingId: string;
  reference: string;
  status: ListingStatus;
  /** sm under a row of the list, md on the page of the listing. */
  size?: "sm" | "md";
  /** Mobile card: « Valider » and « Refuser », side by side across the card. */
  compact?: boolean;
  className?: string;
}) {
  const report = useContext(FeedbackContext);
  const [working, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"reject" | "suspend" | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const decide = (input: ModerationInput) =>
    startTransition(async () => {
      const result = await moderateListing(input);
      const feedback = feedbackFor(input.action, result);
      if (dialog && !result.ok) {
        setDialogError(feedback.text);
        return;
      }
      setDialog(null);
      report(feedback);
    });

  const open = (kind: "reject" | "suspend") => {
    setDialogError(null);
    setDialog(kind);
  };

  const wide = cn(compact && "flex-1");
  let buttons: ReactNode = null;
  if (status === "pending") {
    buttons = (
      <>
        <Button
          variant="secondary"
          size={size}
          disabled={working}
          onClick={() => open("reject")}
          className={wide}
        >
          {compact ? t.actions.rejectShort : t.actions.reject}
        </Button>
        <Button
          variant="success"
          size={size}
          disabled={working}
          onClick={() => decide({ action: "publish", listingId })}
          className={wide}
        >
          {compact ? t.actions.publishShort : t.actions.publish}
        </Button>
      </>
    );
  } else if (status === "published" || status === "paused") {
    buttons = (
      <Button
        variant="danger"
        size={size}
        disabled={working}
        onClick={() => open("suspend")}
        className={wide}
      >
        {t.actions.suspend}
      </Button>
    );
  } else if (status === "suspended") {
    buttons = (
      <Button
        variant="secondary"
        size={size}
        disabled={working}
        onClick={() => decide({ action: "unsuspend", listingId })}
        className={wide}
      >
        {t.actions.unsuspend}
      </Button>
    );
  }
  if (!buttons) return null;

  return (
    <div
      role="group"
      aria-label={t.actions.label(reference)}
      aria-busy={working || undefined}
      className={cn("flex items-center gap-2", compact ? "min-w-0 flex-1" : "flex-wrap", className)}
    >
      {buttons}
      <ReasonDialog
        kind={dialog}
        working={working}
        error={dialogError}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          if (dialog) decide({ action: dialog, listingId, reason });
        }}
      />
    </div>
  );
}

function ReasonDialog({
  kind,
  working,
  error,
  onClose,
  onConfirm,
}: {
  kind: "reject" | "suspend" | null;
  working: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  const copy = t.reasonDialog;
  const templates = kind === "suspend" ? t.suspendTemplates : t.rejectTemplates;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setInvalid(true);
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <DialogPrimitive.Root
      open={kind !== null}
      onOpenChange={(open) => {
        if (open || working) return;
        onClose();
        setReason("");
        setInvalid(false);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-lk-ink/40 duration-220",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            facadeScope,
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-4 overflow-y-auto rounded-t-lk-md bg-lk-surface p-5 shadow-sheet",
            "md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-140 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lk-md md:p-6 md:shadow-float",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <DialogPrimitive.Title className="text-lk-title font-semibold text-lk-ink">
              {kind === "suspend" ? copy.suspendTitle : copy.rejectTitle}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton
                icon={X}
                aria-label={copy.cancel}
                variant="transparent"
                size="sm"
                disabled={working}
              />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="text-lk-secondary text-lk-ink-2">
            {kind === "suspend" ? copy.suspendText : copy.rejectText}
          </DialogPrimitive.Description>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-lk-label font-semibold text-lk-ink">
                {copy.templates}
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
                    "rounded-lk-sm border-[1.5px] px-3.5 py-2.5 text-left text-lk-secondary transition-colors duration-140 ease-out-lk",
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
              label={copy.reason}
              help={copy.reasonHint}
              value={reason}
              maxLength={1000}
              required
              error={invalid ? t.errors.invalid : undefined}
              onChange={(event) => {
                setReason(event.target.value);
                if (invalid) setInvalid(false);
              }}
            />
            {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
            <div className="flex flex-col-reverse gap-2.5 md:flex-row md:justify-end">
              <DialogPrimitive.Close asChild>
                <Button variant="outline-ink" disabled={working}>
                  {copy.cancel}
                </Button>
              </DialogPrimitive.Close>
              <Button
                type="submit"
                variant={kind === "suspend" ? "danger" : "primary"}
                disabled={working}
              >
                {kind === "suspend" ? copy.confirmSuspend : copy.confirmReject}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
