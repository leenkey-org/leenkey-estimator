"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { ModerationAction, ModerationInput } from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { moderateListing, type ModerationResult } from "../actions";
import { withEmailNote, type Feedback } from "../feedback";
import { ReasonDialog } from "./reason-dialog";

// Decisions of the back office on a listing (SPEC-V2 section 17): validate
// and publish, refuse with a motive, suspend with a motive, put back online.
// The outcome shows at the top of the page (ModerationFeedback), which stays
// when the row of the listing leaves a filtered list, and takes the focus:
// the button clicked has left with its row, or changed with the status.

type ListingStatus = Database["public"]["Enums"]["listing_status"];
const t = fr.adminListings;

const FeedbackContext = createContext<(feedback: Feedback) => void>(() => {});

/** Reports the outcome of a decision in the ModerationFeedback around (listings, accounts). */
export const useModerationFeedback = () => useContext(FeedbackContext);

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
    if (feedback && !feedback.keepFocus) region.current?.focus();
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
  return withEmailNote(DONE[action], result.data.email, {
    sent: t.result.emailSent,
    failed: t.result.emailFailed,
  });
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
        open={dialog !== null}
        copy={
          dialog === "suspend"
            ? {
                title: t.reasonDialog.suspendTitle,
                text: t.reasonDialog.suspendText,
                reason: t.reasonDialog.reason,
                confirm: t.reasonDialog.confirmSuspend,
                tone: "danger",
                templates: t.suspendTemplates,
              }
            : {
                title: t.reasonDialog.rejectTitle,
                text: t.reasonDialog.rejectText,
                reason: t.reasonDialog.reason,
                confirm: t.reasonDialog.confirmReject,
                tone: "primary",
                templates: t.rejectTemplates,
              }
        }
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
