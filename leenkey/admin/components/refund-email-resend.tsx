"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { frAdminRefunds } from "@/lib/i18n/sections/adminRefunds";
import { resendRefundEmail } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminRefunds: frAdminRefunds } as const;

const t = fr.adminRefunds.creditNote.email;

/**
 * « Email de remboursement à envoyer » and its button (DECISIONS.md
 * 2026-11-26): a credit note exists but its email to the seller did not
 * leave (a failed send after the webhook). The result is said under the
 * button (a status region), then the page is read again.
 */
export function RefundEmailResend({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const resend = () => {
    setMessage(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof resendRefundEmail>> | null = null;
      try {
        result = await resendRefundEmail({ subscriptionId });
      } catch (caught) {
        console.error("[admin] refund email resend not sent", caught);
      }
      if (!result) {
        setMessage({ tone: "error", text: t.errors.unavailable });
        return;
      }
      if (!result.ok) {
        setMessage({ tone: "error", text: t.errors[result.error] });
        return;
      }
      const { sent, failed } = result.data;
      setMessage(
        failed > 0
          ? { tone: "error", text: t.failed }
          : { tone: "ok", text: sent > 0 ? t.sent(sent) : t.nothing },
      );
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-lk-caption font-semibold text-lk-warning-fg">{t.pending}</span>
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={resend}>
        {pending ? t.resending : t.resend}
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
