"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Textarea } from "@/components/shared/textarea";
import { fr } from "@/lib/i18n/fr";
import { ASSISTANT_MESSAGE_MAX, CASE_SUMMARY_MIN } from "@/lib/validations/assistant";
import { sendCaseRequest } from "../actions";

const t = fr.assistant;

/**
 * « Écrire à un conseiller » (SPEC-V2 section 12, L1-31): once the daily
 * limit of the assistant is reached, the person writes their request
 * themselves; it becomes a case of the back office, read by the team, who
 * answers by email. Nothing leaves before « Envoyer ma demande »; while it
 * is open, it stands for the field of the conversation. A property whose
 * plan has an adviser: the person is sent to them, their text kept.
 */
export function CaseRequestForm({
  conversationId,
  propertyId,
  initialMessage,
  onClose,
  onSent,
}: {
  /** The conversation, whose property the server reads; null before the first message. */
  conversationId: string | null;
  /** The property of the page, for a conversation not begun yet. */
  propertyId: string | null;
  /** The question the assistant could not take, kept in its field. */
  initialMessage: string;
  onClose: () => void;
  /** The request is a case of the back office: the conversation says so. */
  onSent: () => void;
}) {
  const [message, setMessage] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The adviser of the plan, in the messaging: where the request belongs. */
  const [advisorHref, setAdvisorHref] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  /** Said under the field, and read: the focus goes back to it (DESIGN.md 15). */
  function fail(text: string) {
    flushSync(() => {
      setSending(false);
      setError(text);
    });
    field.current?.focus();
  }

  async function send() {
    if (sending) return;
    if (message.trim().length < CASE_SUMMARY_MIN) {
      fail(t.request.errors.invalid(CASE_SUMMARY_MIN));
      return;
    }
    setSending(true);
    setError(null);
    setAdvisorHref(null);
    const result = await sendCaseRequest({ conversationId, propertyId, message }).catch(() => null);
    if (result?.ok) {
      onSent();
      return;
    }
    if (result?.error === "advisor") {
      setSending(false);
      setAdvisorHref(result.href);
      return;
    }
    const code = result?.error ?? "unavailable";
    fail(
      code === "invalid"
        ? t.request.errors.invalid(CASE_SUMMARY_MIN)
        : code === "limit"
          ? t.request.errors.limit
          : code === "auth"
            ? t.errors.auth
            : code === "conditions"
              ? t.errors.conditions
              : t.request.errors.unavailable,
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <Textarea
        ref={field}
        label={t.request.label}
        help={t.request.help}
        error={error ?? undefined}
        value={message}
        maxLength={ASSISTANT_MESSAGE_MAX}
        rows={4}
        autoFocus
        // Read-only, not disabled, while it leaves: the focus stays in the field.
        readOnly={sending}
        onChange={(event) => setMessage(event.target.value)}
        className="min-h-24"
      />
      {advisorHref ? (
        <InlineAlert
          tone="info"
          action={
            <Link
              href={advisorHref}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              {t.request.advisorLink}
            </Link>
          }
        >
          {t.request.advisor}
        </InlineAlert>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={sending} onClick={onClose}>
          {t.request.cancel}
        </Button>
        <Button type="submit" size="sm" loading={sending}>
          {t.request.send}
        </Button>
      </div>
    </form>
  );
}
