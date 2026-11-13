"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { InlineAlert } from "@/components/shared/inline-alert";
import type { NotificationPreferences } from "@/lib/validations/notifications";
import { frNotifications } from "@/lib/i18n/sections/notifications";
import { updateNotificationPreferences } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { notifications: frNotifications } as const;

const t = fr.notifications.preferences;

/**
 * The email preferences of the account (L1-22): the new messages, the offers
 * (L2-04a); the alerts come with their emails. The emails of the listing
 * always leave (a line says so to a seller).
 */
export function NotificationPreferencesForm({
  initial,
  seller,
}: {
  initial: NotificationPreferences;
  /** The account sells: the emails of its listing are named. */
  seller: boolean;
}) {
  const [messages, setMessages] = useState(initial.email_messages);
  const [offers, setOffers] = useState(initial.email_offers);
  const [result, setResult] = useState<"saved" | "error" | null>(null);
  const [saving, startSaving] = useTransition();

  return (
    <form
      className="mt-6 flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setResult(null);
        startSaving(async () => {
          const saved = await updateNotificationPreferences({
            email_messages: messages,
            email_offers: offers,
          }).catch(() => null);
          setResult(saved?.ok ? "saved" : "error");
        });
      }}
    >
      <fieldset>
        <legend className="mb-3 text-lk-title font-semibold text-lk-ink">{t.legend}</legend>
        <div className="flex flex-col gap-4 rounded-lk-md border border-lk-line bg-lk-surface p-5">
          <Checkbox
            name="email_messages"
            checked={messages}
            onChange={(event) => {
              setMessages(event.target.checked);
              setResult(null);
            }}
            label={
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-lk-ink">{t.messages.label}</span>
                <span>{t.messages.hint}</span>
              </span>
            }
          />
          <Checkbox
            name="email_offers"
            checked={offers}
            onChange={(event) => {
              setOffers(event.target.checked);
              setResult(null);
            }}
            label={
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-lk-ink">{t.offers.label}</span>
                <span>{t.offers.hint}</span>
              </span>
            }
          />
          {seller ? <p className="text-lk-caption text-lk-ink-3">{t.always}</p> : null}
        </div>
      </fieldset>
      <div aria-live="polite">
        {result === "saved" ? (
          <InlineAlert tone="success" live={false}>
            {t.saved}
          </InlineAlert>
        ) : result === "error" ? (
          <InlineAlert tone="danger" live={false}>
            {t.error}
          </InlineAlert>
        ) : null}
      </div>
      <Button type="submit" loading={saving} className="self-start">
        {t.save}
      </Button>
    </form>
  );
}
