"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/shared/button";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Textarea } from "@/components/shared/textarea";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import {
  REASON_MIN,
  reasonLength,
  type ModerationAction,
  type ModerationInput,
} from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { moderateListing, type ModerationResult } from "../actions";

// Decisions of the back office on a listing (SPEC-V2 section 17): validate
// and publish, refuse with a motive, suspend with a motive, put back online.
// The outcome shows at the top of the page (ModerationFeedback), which stays
// when the row of the listing leaves a filtered list, and takes the focus:
// the button clicked has left with its row, or changed with the status.

type ListingStatus = Database["public"]["Enums"]["listing_status"];
/** reload: no answer from the server, the page may be out of date. */
type Feedback = { tone: "success" | "warning" | "danger"; text: string; reload?: boolean };

const t = fr.adminListings;

const FeedbackContext = createContext<(feedback: Feedback) => void>(() => {});

/**
 * Outcome of the last decision, above the list or the listing. Its live
 * region stays in the page, empty until a decision (a region inserted with
 * its text is not always read), out of the layout while empty (sr-only); the
 * outcome then takes the focus.
 */
export function ModerationFeedback({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<(Feedback & { id: number }) | null>(null);
  const region = useRef<HTMLDivElement>(null);
  const report = useCallback(
    (next: Feedback) => setFeedback((previous) => ({ ...next, id: (previous?.id ?? 0) + 1 })),
    [],
  );
  useEffect(() => {
    if (feedback) region.current?.focus();
  }, [feedback]);
  return (
    <FeedbackContext.Provider value={report}>
      <div
        ref={region}
        tabIndex={-1}
        role="status"
        className={cn("scroll-mt-24 outline-none", !feedback && "sr-only")}
      >
        {feedback ? (
          <InlineAlert
            key={feedback.id}
            tone={feedback.tone}
            live={false}
            action={
              feedback.reload ? (
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="font-semibold underline underline-offset-2 hover:no-underline"
                >
                  {t.errors.reload}
                </button>
              ) : undefined
            }
          >
            {feedback.text}
          </InlineAlert>
        ) : null}
      </div>
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

const ERROR = {
  invalid: "invalid",
  forbidden: "forbidden",
  not_found: "notFound",
  conflict: "conflict",
  unavailable: "unavailable",
} as const;

/** null: no answer (network, timeout, a deployment in between). */
function feedbackFor(action: ModerationAction, result: ModerationResult | null): Feedback {
  if (!result) return { tone: "danger", text: t.errors.network, reload: true };
  if (!result.ok) return { tone: "danger", text: t.errors[ERROR[result.error]] };
  const { email } = result.data;
  if (email === null) return { tone: "success", text: DONE[action] };
  if (email === "failed")
    return { tone: "warning", text: `${DONE[action]} ${t.result.emailFailed}` };
  const note = {
    sent: t.result.emailSent,
    test: t.result.emailTest,
    logged: t.result.emailLogged,
  }[email];
  return { tone: "success", text: `${DONE[action]} ${note}` };
}

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
  const router = useRouter();
  const [working, startTransition] = useTransition();
  const [pending, setPending] = useState<ModerationAction | null>(null);
  const [dialog, setDialog] = useState<"reject" | "suspend" | null>(null);
  // A new dialog at each opening: no motive left from the previous one.
  const [dialogKey, setDialogKey] = useState(0);
  const [dialogError, setDialogError] = useState<string | null>(null);
  // Where the focus goes back when the dialog closes without a decision.
  const opener = useRef<HTMLButtonElement | null>(null);
  const decided = useRef(false);

  const decide = (input: ModerationInput) => {
    setPending(input.action);
    startTransition(async () => {
      let result: ModerationResult | null = null;
      try {
        result = await moderateListing(input);
      } catch (error) {
        // The decision may have been saved all the same: the message says so.
        console.error("[admin] moderation request failed", error);
      }
      const feedback = feedbackFor(input.action, result);
      // The listing changed meanwhile: the page reads it again. Without an
      // answer, nothing is read again: the network may be down, and a reload
      // would leave the page (« Recharger la page » is offered instead).
      const stale =
        result?.ok === false && (result.error === "conflict" || result.error === "not_found");
      if (stale) router.refresh();
      // In the dialog, the motive stays: sent again, a decision already saved
      // comes back as a conflict.
      if (dialog && !result?.ok && !stale) {
        setDialogError(feedback.text);
        return;
      }
      decided.current = true;
      setDialog(null);
      report(feedback);
    });
  };

  const open = (kind: "reject" | "suspend", from: HTMLButtonElement) => {
    opener.current = from;
    decided.current = false;
    setDialogError(null);
    setDialogKey((key) => key + 1);
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
          onClick={(event) => open("reject", event.currentTarget)}
          className={wide}
        >
          {compact ? t.actions.rejectShort : t.actions.reject}
        </Button>
        <Button
          variant="success"
          size={size}
          disabled={working}
          loading={working && pending === "publish"}
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
        onClick={(event) => open("suspend", event.currentTarget)}
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
        loading={working && pending === "unsuspend"}
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
        key={dialogKey}
        kind={dialog}
        working={working}
        error={dialogError}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          if (dialog) decide({ action: dialog, listingId, reason });
        }}
        onCloseAutoFocus={(event) => {
          // After a decision, the outcome takes the focus (ModerationFeedback).
          event.preventDefault();
          if (!decided.current && opener.current?.isConnected) opener.current.focus();
        }}
      />
    </div>
  );
}

/**
 * Motive of a refusal or a suspension (docs/DESIGN.md 10.8): a full screen
 * with a back header on a phone, a dialog of 520 px from 768 px.
 */
function ReasonDialog({
  kind,
  working,
  error,
  onClose,
  onConfirm,
  onCloseAutoFocus,
}: {
  kind: "reject" | "suspend" | null;
  working: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const copy = t.reasonDialog;
  const templates = kind === "suspend" ? t.suspendTemplates : t.rejectTemplates;

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
      open={kind !== null}
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
                aria-label={copy.back}
                disabled={working}
                className="md:hidden"
              />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-center text-lk-title font-semibold text-lk-ink md:whitespace-normal md:text-left md:text-lk-h2 md:font-bold md:text-wide">
              {kind === "suspend" ? copy.suspendTitle : copy.rejectTitle}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton
                icon={X}
                aria-label={copy.close}
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
                    {copy.cancel}
                  </Button>
                </DialogPrimitive.Close>
                <Button
                  type="submit"
                  variant={kind === "suspend" ? "danger" : "primary"}
                  loading={working}
                >
                  {kind === "suspend" ? copy.confirmSuspend : copy.confirmReject}
                </Button>
              </div>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
