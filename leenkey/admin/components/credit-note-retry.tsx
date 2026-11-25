"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { frAdminRefunds } from "@/lib/i18n/sections/adminRefunds";
import { retryCreditNote } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminRefunds: frAdminRefunds } as const;

const t = fr.adminRefunds.creditNote;

/**
 * « Avoir à créer » and its button (DECISIONS.md 2026-11-25): the credit
 * note of a refund whose creation failed after the webhook, asked again.
 * The result is said under the button (a status region), then the page is
 * read again.
 */
export function CreditNoteRetry({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const retry = () => {
    setMessage(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof retryCreditNote>> | null = null;
      try {
        result = await retryCreditNote({ subscriptionId });
      } catch (caught) {
        console.error("[admin] credit note retry not sent", caught);
      }
      if (!result) {
        setMessage({ tone: "error", text: t.errors.unavailable });
        return;
      }
      if (!result.ok) {
        setMessage({ tone: "error", text: t.errors[result.error] });
        return;
      }
      setMessage({ tone: "ok", text: result.data.created > 0 ? t.created : t.nothing });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-lk-caption font-semibold text-lk-warning-fg">{t.missing}</span>
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={retry}>
        {pending ? t.creating : t.create}
      </Button>
      <p
        role="status"
        className={
          message?.tone === "error"
            ? "text-lk-caption text-lk-danger-fg"
            : "text-lk-caption text-lk-ink-2"
        }
      >
        {message?.text ?? ""}
      </p>
    </div>
  );
}
