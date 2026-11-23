"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Select } from "@/components/shared/select";
import { Textarea } from "@/components/shared/textarea";
import { frAdvisorInterventions } from "@/lib/i18n/sections/advisorInterventions";
import {
  INTERVENTION_MESSAGE_MAX,
  INTERVENTION_MESSAGE_MIN,
  INTERVENTION_REASONS,
  type InterventionReason,
} from "@/lib/validations/advisor-intervention";
import { requestIntervention, type InterventionRequestResult } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { advisorInterventions: frAdvisorInterventions } as const;

const t = fr.advisorInterventions.seller.form;

const isReason = (value: string): value is InterventionReason =>
  (INTERVENTION_REASONS as readonly string[]).includes(value);

/**
 * « Demander une intervention » (DECISIONS.md 2026-11-23): a reason chosen in
 * a short list and what the seller wants to see with their adviser. Nothing
 * leaves before « Envoyer ma demande »; the request is then their message in
 * the conversation with the adviser, and the page is read again (the list of
 * their requests, the counter). An error of a field is said under it and the
 * focus goes to it (docs/DESIGN.md 15).
 */
export function InterventionRequestForm({
  propertyId,
  conversationHref,
  startsOn = null,
}: {
  propertyId: string;
  /** The conversation with the adviser, where the answer comes. */
  conversationHref: string | null;
  /**
   * « 18 nov. »: the day the adviser starts, while they wait for the end of
   * the withdrawal period (SPEC 11); no delay of answer is promised before.
   */
  startsOn?: string | null;
}) {
  const [reason, setReason] = useState<InterventionReason | "">("");
  const [message, setMessage] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const reasonField = useRef<HTMLSelectElement>(null);
  const messageField = useRef<HTMLTextAreaElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setSent(false);
    const missingReason = reason === "";
    const shortMessage = message.trim().length < INTERVENTION_MESSAGE_MIN;
    setReasonError(missingReason ? t.errors.reason : null);
    setMessageError(shortMessage ? t.errors.message(INTERVENTION_MESSAGE_MIN) : null);
    if (missingReason) {
      reasonField.current?.focus();
      return;
    }
    if (shortMessage) {
      messageField.current?.focus();
      return;
    }
    start(async () => {
      let result: InterventionRequestResult | null = null;
      try {
        result = await requestIntervention({ propertyId, reason, message });
      } catch (caught) {
        console.error("[advisor] intervention request failed", caught);
      }
      if (!result?.ok) {
        const code = result?.error ?? "unavailable";
        setError(code === "invalid" ? t.errors.message(INTERVENTION_MESSAGE_MIN) : t.errors[code]);
        return;
      }
      setReason("");
      setMessage("");
      setSent(true);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Select
        ref={reasonField}
        label={t.reason}
        placeholder={t.reasonPlaceholder}
        value={reason}
        error={reasonError ?? undefined}
        onChange={(event) => {
          const value = event.target.value;
          setReason(isReason(value) ? value : "");
          if (reasonError) setReasonError(null);
        }}
      >
        {INTERVENTION_REASONS.map((value) => (
          <option key={value} value={value}>
            {fr.advisorInterventions.reasons[value]}
          </option>
        ))}
      </Select>
      <Textarea
        ref={messageField}
        label={t.message}
        help={t.messageHelp}
        error={messageError ?? undefined}
        value={message}
        maxLength={INTERVENTION_MESSAGE_MAX}
        rows={4}
        // Read-only, not disabled, while it leaves: the focus stays in the field.
        readOnly={pending}
        onChange={(event) => {
          setMessage(event.target.value);
          if (messageError) setMessageError(null);
        }}
      />
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {sent ? (
        <InlineAlert
          tone="success"
          action={
            conversationHref ? (
              <Link
                href={conversationHref}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {t.conversation}
              </Link>
            ) : undefined
          }
        >
          {startsOn ? t.sentFrom(startsOn) : t.sent}
        </InlineAlert>
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <Button type="submit" loading={pending} className="md:shrink-0">
          {t.submit}
        </Button>
        <p className="text-lk-caption text-lk-ink-3">
          {startsOn ? t.delayFrom(startsOn) : t.delay}
        </p>
      </div>
    </form>
  );
}
