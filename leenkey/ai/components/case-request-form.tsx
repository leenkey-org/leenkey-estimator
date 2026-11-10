"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { Textarea } from "@/components/shared/textarea";
import { fr } from "@/lib/i18n/fr";
import { CASE_SUMMARY_MAX, CASE_SUMMARY_MIN } from "@/lib/validations/assistant";
import { sendCaseRequest } from "../actions";

const t = fr.assistant;

/**
 * « Écrire à un conseiller » (SPEC-V2 section 12, L1-31): once the daily
 * limit of the assistant is reached, the person writes their request
 * themselves; it becomes a case of the back office, read by the team, who
 * answers by email. Nothing leaves before « Envoyer ma demande »; while it
 * is open, it stands for the field of the conversation.
 */
export function CaseRequestForm({
  propertyId,
  initialMessage,
  onClose,
  onSent,
}: {
  /** The property the conversation is about, when there is one. */
  propertyId: string | null;
  /** The question the assistant could not take, kept in its field. */
  initialMessage: string;
  onClose: () => void;
  /** The request is a case of the back office: the conversation says so. */
  onSent: () => void;
}) {
  const [message, setMessage] = useState(() => initialMessage.slice(0, CASE_SUMMARY_MAX));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (sending) return;
    if (message.trim().length < CASE_SUMMARY_MIN) {
      setError(t.request.errors.invalid(CASE_SUMMARY_MIN));
      return;
    }
    setSending(true);
    setError(null);
    const result = await sendCaseRequest({ propertyId, message }).catch(() => null);
    setSending(false);
    if (result?.ok) {
      onSent();
      return;
    }
    const code = result?.error ?? "unavailable";
    setError(
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
        label={t.request.label}
        help={t.request.help}
        error={error ?? undefined}
        value={message}
        maxLength={CASE_SUMMARY_MAX}
        rows={4}
        autoFocus
        disabled={sending}
        onChange={(event) => setMessage(event.target.value)}
        className="min-h-24"
      />
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
